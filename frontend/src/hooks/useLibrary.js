import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { fetchLibrary, BASE_URL } from '../utils/api';
import { getTrackArtworkUrl, getArtistAvatarUrl, getArtworkSrc } from '../utils/artworkGenerator';
import { useAudioStore } from '../store/useAudioStore';

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
        setError(
          e.status === 503
            ? 'Telegram connection unavailable. Check credentials on Render.'
            : e.message || 'Could not reach SPiDEYxFLASH backend'
        );
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

  // Background Auto-Discovery: Check for new Telegram tracks every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      load(false, true); // Silent background poll
    }, 20 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        load(false, true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Filtered & Sorted Tracks
  const visible = useMemo(() => {
    let result = [...items];

    if (filterFormat !== 'all') {
      result = result.filter(i => i.format?.toLowerCase() === filterFormat.toLowerCase());
    }

    if (debounced) {
      result = result.filter(i =>
        `${i.title} ${i.artist} ${i.album} ${i.fileName} ${i.genre || ''}`
          .toLowerCase()
          .includes(debounced)
      );
    }

    const sorters = {
      recent: (a, b) => (b.date || 0) - (a.date || 0),
      alpha: (a, b) => (a.title || '').localeCompare(b.title || ''),
      artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
      duration: (a, b) => (b.duration || 0) - (a.duration || 0),
      size: (a, b) => (b.size || 0) - (a.size || 0),
    };

    return result.sort(sorters[sort] || sorters.recent);
  }, [items, debounced, sort, filterFormat]);

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
      const name = t.artist && t.artist !== 'Unknown Artist' ? t.artist : 'Unknown Artist';
      if (!map.has(name)) {
        map.set(name, {
          name,
          tracks: [],
          thumbnail: getArtistAvatarUrl(name),
        });
      }
      const entry = map.get(name);
      entry.tracks.push(t);
    });
    return Array.from(map.values()).sort((a, b) => b.tracks.length - a.tracks.length);
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
