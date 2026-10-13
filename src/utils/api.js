export const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const STREAM_SERVER_URL = (import.meta.env.VITE_STREAM_URL || '').replace(/\/+$/, '');

export const streamUrl = id =>
  STREAM_SERVER_URL ? `${STREAM_SERVER_URL}/stream/${encodeURIComponent(id)}` : `${BASE_URL}/api/stream/${encodeURIComponent(id)}`;
export const artworkUrl = (id, title = '') =>
  `${BASE_URL}/api/artwork/${encodeURIComponent(id)}${title ? `?title=${encodeURIComponent(title)}` : ''}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Timeout + limited exponential backoff retries for serverless cold starts
export async function request(path, { retries = 3, onRetry, ...fetchOptions } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();
      const body = await res.json().catch(() => ({}));
      const e = new Error(body.message || body.error || 'Request failed');
      e.status = res.status;
      e.code = body.code;
      if (res.status < 500 && res.status !== 429) throw e;
      lastErr = e;
    } catch (e) {
      clearTimeout(timer);
      if (e.status && e.status < 500 && e.status !== 429) throw e;
      lastErr = e.status
        ? e
        : Object.assign(
            new Error(e.name === 'AbortError' ? 'Backend is waking up, please wait...' : 'Network connection error'),
            { status: 0 }
          );
    }
    if (i < retries) {
      onRetry?.(i + 1);
      await sleep(2500 * (i + 1));
    }
  }
  throw lastErr;
}

export const fetchLibrary = (refresh, onRetry) =>
  request(`/api/library${refresh ? '?refresh=1' : ''}`, { onRetry });

export const fetchTrackLyrics = (id, track = {}) => {
  const query = new URLSearchParams();
  if (track.title) query.set('title', track.title);
  if (track.artist) query.set('artist', track.artist);
  if (track.album) query.set('album', track.album);
  if (track.duration) query.set('duration', String(track.duration));
  if (track.saavnId) query.set('saavnId', String(track.saavnId));
  const qs = query.toString();
  return request(`/api/lyrics/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`, { retries: 1 }).catch(() => null);
};

export const fetchTrackMetadata = id =>
  request(`/api/metadata/${encodeURIComponent(id)}`, { retries: 1 }).catch(() => null);

export const checkHealth = () =>
  request('/api/health', { retries: 1 });

export const searchYouTube = (query, limit = 25) =>
  request(`/api/yt/search?q=${encodeURIComponent(query)}&limit=${limit}`, { retries: 1 })
    .then(r => r?.items || [])
    .catch(() => []);

export const fetchYouTubeTrending = (limit = 25) =>
  request(`/api/yt/trending?limit=${limit}`, { retries: 1 })
    .then(r => r?.items || [])
    .catch(() => []);

export const fetchYouTubeSuggestions = query =>
  request(`/api/yt/suggest?q=${encodeURIComponent(query)}`, { retries: 0 })
    .then(r => r?.suggestions || [])
    .catch(() => []);

// JioSaavn (320 kbps Studio Quality)
export const searchSaavn = (query, limit = 20) =>
  request(`/api/saavn/search?q=${encodeURIComponent(query)}&limit=${limit}`, { retries: 1 })
    .then(r => r?.items || [])
    .catch(() => []);

export const fetchSaavnTrending = (lang = 'tamil', limit = 20) =>
  request(`/api/saavn/trending?lang=${encodeURIComponent(lang)}&limit=${limit}`, { retries: 1 })
    .then(r => r?.items || [])
    .catch(() => []);

// High-resolution artist portrait & metadata fetcher with direct CDN fallback
export const fetchArtistInfo = async artistName => {
  const clean = (artistName || '').trim();
  if (!clean) return null;

  // 1. Try server endpoint
  try {
    const data = await request(`/api/saavn/artist-info?name=${encodeURIComponent(clean)}`, { retries: 0 });
    if (data?.image) return data;
  } catch {}

  // 2. Direct client fallback to JioSaavn API
  try {
    const res = await fetch(
      `https://www.jiosaavn.com/api.php?__call=search.getArtistResults&_format=json&_marker=0&cc=in&p=1&n=5&q=${encodeURIComponent(clean)}`
    );
    if (res.ok) {
      const d = await res.json();
      const results = d.results || [];
      if (results.length > 0) {
        const match = results.find(r => r.name.toLowerCase() === clean.toLowerCase()) || results[0];
        const image = (match.image || '')
          .replace(/(?:50x50|150x150)\.jpg/, '500x500.jpg')
          .replace('http://', 'https://');
        return {
          name: match.name,
          image,
          id: match.id,
          listeners: match.ctr ? `${(match.ctr * 2420).toLocaleString()} monthly audience` : null,
        };
      }
    }
  } catch {}

  return null;
};

// Unified Multi-Engine Search: JioSaavn (320 kbps) + YouTube Music + OwnTg Cloud Storage
export const searchUnified = async (query, limit = 25, source = 'all', localTracks = []) => {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ) return [];

  // 1. If OwnTg selected, search local Telegram storage exclusively
  if (source === 'owntg') {
    return localTracks
      .filter(t => `${t.title} ${t.artist} ${t.album || ''}`.toLowerCase().includes(cleanQ))
      .slice(0, limit);
  }

  // 2. If JioSaavn selected exclusively
  if (source === 'saavn') {
    return searchSaavn(query, limit);
  }

  // 3. If YouTube selected exclusively
  if (source === 'youtube') {
    return searchYouTube(query, limit);
  }

  // 4. Default 'all': Match local OwnTg tracks first, then JioSaavn 320k, then YouTube
  const localMatches = (localTracks || [])
    .filter(t => `${t.title} ${t.artist} ${t.album || ''}`.toLowerCase().includes(cleanQ))
    .slice(0, 5);

  const [saavnResults, ytResults] = await Promise.allSettled([
    searchSaavn(query, limit),
    searchYouTube(query, Math.floor(limit / 2)),
  ]);

  const saavn = saavnResults.status === 'fulfilled' ? saavnResults.value : [];
  const yt = ytResults.status === 'fulfilled' ? ytResults.value : [];

  const seenTitles = new Set(localMatches.map(t => t.title.toLowerCase()));
  const combined = [...localMatches];

  for (const track of saavn) {
    if (!seenTitles.has(track.title.toLowerCase())) {
      seenTitles.add(track.title.toLowerCase());
      combined.push(track);
    }
  }

  for (const track of yt) {
    // Ignore any YouTube track that is a movie (> 11 mins) or contains junk
    if (track.duration > 660) continue;
    const lowerTitle = (track.title || '').toLowerCase();
    if (lowerTitle.includes('full movie') || lowerTitle.includes('jukebox') || lowerTitle.includes('reaction')) continue;

    if (!seenTitles.has(track.title.toLowerCase())) {
      seenTitles.add(track.title.toLowerCase());
      combined.push(track);
    }
  }

  return combined.slice(0, limit);
};

// Fetch Full Official Studio Album with 320k tracks
export const fetchAlbumDetails = idOrName => {
  const clean = (idOrName || '').trim();
  if (!clean) return Promise.resolve(null);
  return request(`/api/saavn/album?name=${encodeURIComponent(clean)}`, { retries: 1 })
    .then(r => r || null)
    .catch(() => null);
};
