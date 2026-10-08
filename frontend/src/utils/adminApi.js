import { BASE_URL } from './api';

export function getAdminToken() {
  return (
    localStorage.getItem('spx_user_token') ||
    localStorage.getItem('spx_admin_jwt') ||
    ''
  );
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem('spx_admin_jwt', token);
    localStorage.setItem('spx_user_token', token);
  } else {
    localStorage.removeItem('spx_admin_jwt');
    localStorage.removeItem('spx_user_token');
  }
}

async function adminRequest(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Includes HTTP-only cookie automatically
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.message || body.error || 'Admin request failed');
    error.status = res.status;
    error.code = body.code;
    throw error;
  }
  return body;
}

export const adminLogin = async (username, password) => {
  const data = await adminRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.token) {
    setAdminToken(data.token);
  }
  return data;
};

export const adminLogout = async () => {
  try {
    await adminRequest('/api/admin/logout', { method: 'POST' });
  } finally {
    setAdminToken('');
  }
};

export const adminGetMe = () => adminRequest('/api/admin/me');
export const adminGetStats = () => adminRequest('/api/admin/stats');
export const adminGetLibrary = ({ q = '', sort = 'recent', page = 1, limit = 50 } = {}) => {
  const query = new URLSearchParams({ q, sort, page: String(page), limit: String(limit) });
  return adminRequest(`/api/admin/library?${query}`);
};
export const adminSyncLibrary = () => adminRequest('/api/admin/library/sync', { method: 'POST' });
export const adminRefreshLibrary = () => adminRequest('/api/admin/library/refresh', { method: 'POST' });
export const adminUpdateTrack = (id, updates) =>
  adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
export const adminRemoveTrack = id =>
  adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const adminGetLyrics = id => adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}/lyrics`);
export const adminSaveLyrics = (id, content, type = 'auto', language = '') =>
  adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}/lyrics`, {
    method: 'POST',
    body: JSON.stringify({ content, type, language }),
  });
export const adminDeleteLyrics = id =>
  adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}/lyrics`, { method: 'DELETE' });

export const adminSaveArtwork = (id, artworkUrl) =>
  adminRequest(`/api/admin/tracks/${encodeURIComponent(id)}/artwork`, {
    method: 'POST',
    body: JSON.stringify({ artworkUrl }),
  });

export const adminGetTelegramStatus = () => adminRequest('/api/admin/telegram/status');
export const adminTestTelegram = () => adminRequest('/api/admin/telegram/test', { method: 'POST' });

export const adminGetCacheStats = () => adminRequest('/api/admin/cache/stats');
export const adminClearCache = (target = 'all') =>
  adminRequest('/api/admin/cache/clear', {
    method: 'POST',
    body: JSON.stringify({ target }),
  });

export const adminGetSystem = () => adminRequest('/api/admin/system');
export const adminGetLogs = (limit = 100) => adminRequest(`/api/admin/logs?limit=${limit}`);
export const adminClearLogs = () => adminRequest('/api/admin/logs', { method: 'DELETE' });

export const adminExportUrl = () => `${BASE_URL}/api/admin/export`;
export const adminImportMetadata = data =>
  adminRequest('/api/admin/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Section 100-110: Telegram Artwork Diagnostic & Pipeline Admin API
export const adminGetArtworkHealth = () => adminRequest('/api/admin/artwork/health');
export const adminRescanArtwork = () => adminRequest('/api/admin/artwork/rescan', { method: 'POST' });
export const adminGetArtworkDiagnostics = id =>
  adminRequest(`/api/admin/artwork/diagnostics/${encodeURIComponent(id)}`);
export const adminOverrideArtwork = (id, coverType, coverSource) =>
  adminRequest(`/api/admin/artwork/override/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ coverType, coverSource }),
  });
