export const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const STREAM_SERVER_URL = (import.meta.env.VITE_STREAM_URL || 'https://dl.fxsmovies.live').replace(/\/+$/, '');

export const streamUrl = id => `${STREAM_SERVER_URL}/stream/${encodeURIComponent(id)}`;
export const artworkUrl = (id, title = '') =>
  `${BASE_URL}/api/artwork/${encodeURIComponent(id)}${title ? `?title=${encodeURIComponent(title)}` : ''}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Timeout + limited exponential backoff retries for waking Render free tier
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

export const fetchTrackLyrics = id =>
  request(`/api/lyrics/${encodeURIComponent(id)}`, { retries: 1 }).catch(() => null);

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
