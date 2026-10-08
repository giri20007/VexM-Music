import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLibrary } from '../utils/api';

export function useLibrary() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('connecting'); // connecting | ready | error
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('recent');
  const [filterFormat, setFilterFormat] = useState('all');

  const load = useCallback(async refresh => {
    setState('connecting');
    setError('');
    setRetry(0);
    try {
      const data = await fetchLibrary(refresh, setRetry);
      setItems(data.items || []);
      setState('ready');
    } catch (e) {
      setError(
        e.status === 503
          ? 'Telegram connection unavailable. Check credentials on Render.'
          : e.message || 'Could not reach SPiDEYxFLASH backend'
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    load(false);
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
          thumbnail: t.thumbnail,
        });
      }
      const entry = map.get(name);
      entry.tracks.push(t);
      if (!entry.thumbnail && t.thumbnail) entry.thumbnail = t.thumbnail;
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
          thumbnail: t.thumbnail,
        });
      }
      const entry = map.get(name);
      entry.tracks.push(t);
      if (!entry.thumbnail && t.thumbnail) entry.thumbnail = t.thumbnail;
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
    refresh: () => load(true),
  };
}
