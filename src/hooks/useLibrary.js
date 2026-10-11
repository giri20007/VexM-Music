import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { fetchLibrary, BASE_URL } from '../utils/api';
import { getTrackArtworkUrl, getArtistAvatarUrl, getArtworkSrc } from '../utils/artworkGenerator';
import { useAudioStore } from '../store/useAudioStore';

export function splitArtists(artistStr) {
  if (!artistStr || typeof artistStr !== 'string') return ['Unknown Artist'];
  const cleaned = artistStr.trim();
  if (!cleaned || cleaned.toLowerCase() === 'unknown' || cleaned.toLowerCase() === 'unknown artist') {
    return ['Unknown Artist'];
  }

  // Split on delimiters like: feat., ft., featuring, with, vs., &, ;, /, or comma
  const parts = cleaned
    .split(/(?:\s+(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+|\s+&\s+|\s*;\s*|\s*\/\s*|,\s*)/i)
    .map(p => p.trim())
    .filter(p => p.length > 0 && p.toLowerCase() !== 'various artists' && p.toLowerCase() !== 'unknown');

  return parts.length > 0 ? Array.from(new Set(parts)) : [cleaned];
}

export function useLibrary() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('connecting'); // connecting | ready | error
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('recent');
  const [filterFormat, setFilterFormat] = useState('all');
  const [newTracksNotification, setNewTracksNotification] = useState(null);

  const isInitialLoad = useRef(true);
  const previousIdsRef = useRef(new Set());

  const load = useCallback(async (refresh = false, silent = false) => {
    if (!silent) {
      setState('connecting');
      setError('');
      setRetry(0);
    }
    try {
      const data = await fetchLibrary(refresh, silent ? null : setRetry);
      const rawItems = data.items || [];

      // Ensure every item has a reliable thumbnail and absolute URL
      const processed = rawItems.map(t => {
        let thumb = t.thumbnail || '';
        if (thumb && thumb.startsWith('/')) {
          thumb = `${BASE_URL}${thumb}`;
        }
        return {
          ...t,
          thumbnail: thumb || getTrackArtworkUrl(t),
        };
      });

      // Detect newly discovered tracks from Telegram
      if (!isInitialLoad.current && previousIdsRef.current.size > 0) {
        const newlyAdded = processed.filter(t => !previousIdsRef.current.has(String(t.id)));
        if (newlyAdded.length > 0) {
          setNewTracksNotification({
            count: newlyAdded.length,
            tracks: newlyAdded,
            timestamp: Date.now(),
          });
        }
      }

      // Update known track ID cache
      previousIdsRef.current = new Set(processed.map(t => String(t.id)));
      setItems(processed);
      setState('ready');
    } catch (e) {
      if (!silent) {
        setError(e.message || 'Could not load library collection');
        setState('error');
      }
    } finally {
      isInitialLoad.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    load(false, false);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [query]);

  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const playHistory = useAudioStore(s => s.playHistory);

  // Filtered & Sorted Tracks
  const visible = useMemo(() => {
    let result = [...items];

    if (filterFormat === 'favorites') {
      const likedSet = new Set((likedTrackIds || []).map(String));
      result = result.filter(i => likedSet.has(String(i.id)));
    } else if (filterFormat === 'mostPlayed') {
      const countMap = new Map((playHistory || []).map(h => [String(h.id), h.playCount || 0]));
      result = result
        .filter(i => (countMap.get(String(i.id)) || 0) > 0)
        .sort((a, b) => (countMap.get(String(b.id)) || 0) - (countMap.get(String(a.id)) || 0));
    } else if (filterFormat === 'recent') {
      result.sort((a, b) => (b.date || b.id || 0) - (a.date || a.id || 0));
    } else if (filterFormat !== 'all') {
      result = result.filter(i => i.format?.toLowerCase() === filterFormat.toLowerCase());
    }

    if (debounced) {
      result = result.filter(i =>
        `${i.title} ${i.artist} ${i.album} ${i.fileName} ${i.genre || ''}`
          .toLowerCase()
          .includes(debounced)
      );
    }

    if (filterFormat !== 'mostPlayed' && filterFormat !== 'recent') {
      const sorters = {
        recent: (a, b) => (b.date || 0) - (a.date || 0),
        alpha: (a, b) => (a.title || '').localeCompare(b.title || ''),
        artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
        duration: (a, b) => (b.duration || 0) - (a.duration || 0),
        size: (a, b) => (b.size || 0) - (a.size || 0),
      };

      return result.sort(sorters[sort] || sorters.recent);
    }

    return result;
  }, [items, debounced, sort, filterFormat, likedTrackIds, playHistory]);

  // Derived collections for Albums & Artists
  const albums = useMemo(() => {
    const map = new Map();
    items.forEach(t => {
      const name = t.album && t.album !== 'Unknown Album' ? t.album : 'Singles & Unknown';
      if (!map.has(name)) {
        map.set(name, {
          name,
          artist: t.albumArtist || t.artist || 'Various Artists',
          tracks: [],
          year: t.year || null,
          thumbnail: t.thumbnail || getTrackArtworkUrl(t),
        });
      }
      const entry = map.get(name);
      entry.tracks.push(t);
    });
    return Array.from(map.values()).sort((a, b) => b.tracks.length - a.tracks.length);
  }, [items]);

  const artists = useMemo(() => {
    const map = new Map();
    items.forEach(t => {
      const rawArtist = t.artist || t.albumArtist || 'Unknown Artist';
      const parsedArtists = splitArtists(rawArtist);

      parsedArtists.forEach(name => {
        const canonicalKey = name.toLowerCase();
        if (!map.has(canonicalKey)) {
          map.set(canonicalKey, {
            name,
            tracks: [],
            albumsMap: new Map(),
            thumbnail: null,
            artworkConfidence: 0,
          });
        }
        const entry = map.get(canonicalKey);

        if (!entry.tracks.some(existing => existing.id === t.id)) {
          entry.tracks.push(t);
        }

        const albumName = t.album && t.album !== 'Unknown Album' ? t.album : null;
        if (albumName && !entry.albumsMap.has(albumName)) {
          entry.albumsMap.set(albumName, {
            name: albumName,
            artist: t.albumArtist || name,
            year: t.year || null,
            thumbnail: t.thumbnail || getTrackArtworkUrl(t),
            tracks: [],
          });
        }
        if (albumName && entry.albumsMap.has(albumName)) {
          entry.albumsMap.get(albumName).tracks.push(t);
        }

        const trackConfidence = t.artworkConfidence || (t.thumbnail?.startsWith('http') ? 70 : 10);
        if (trackConfidence > entry.artworkConfidence) {
          entry.artworkConfidence = trackConfidence;
          entry.thumbnail = t.thumbnail || getArtworkSrc(t, 400);
        }
      });
    });

    return Array.from(map.values())
      .map(artist => ({
        ...artist,
        albums: Array.from(artist.albumsMap.values()),
        thumbnail: artist.thumbnail || getArtistAvatarUrl(artist.name),
      }))
      .sort((a, b) => b.tracks.length - a.tracks.length);
  }, [items]);

  return {
    items: visible,
    allItems: items,
    albums,
    artists,
    total: items.length,
    state,
    error,
    retry,
    query,
    setQuery,
    sort,
    setSort,
    filterFormat,
    setFilterFormat,
    newTracksNotification,
    dismissNewTracksNotification: () => setNewTracksNotification(null),
    playNewTracks: () => {
      if (newTracksNotification?.tracks?.length > 0) {
        useAudioStore.getState().playTrack(newTracksNotification.tracks[0], newTracksNotification.tracks);
        setNewTracksNotification(null);
      }
    },
    refresh: () => load(true, false),
  };
}
