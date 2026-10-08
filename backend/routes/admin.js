const router = require('express').Router();
const os = require('os');
const {
  authenticateAdmin,
  verifyCredentials,
  generateToken,
  ADMIN_USERNAME,
} = require('../middleware/auth');
const { loginLimiter, adminApiLimiter } = require('../middleware/rateLimiter');
const {
  getAllItems,
  getItem,
  updateItemInMemory,
  removeItemFromMemory,
  forceSyncLibrary,
  getLibraryStats,
} = require('./library');
const {
  setOverride,
  removeOverride,
  setArtwork,
  getCacheStats,
  clearCache,
  exportMetadata,
  importMetadata,
} = require('../services/cacheService');
const {
  getLyrics,
  setLyrics,
  deleteLyrics,
  clearLyricsCache,
  getLyricsCount,
} = require('../services/lyricsService');
const {
  testConnection,
  getConnectionStatus,
} = require('../utils/telegramApi');
const { logActivity, getLogs, clearLogs } = require('../services/activityLog');

// 1. Admin Login (Strictly Rate Limited)
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: true, code: 'MISSING_FIELDS', message: 'Username and password required' });
  }

  const isValid = await verifyCredentials(username, password);
  if (!isValid) {
    logActivity('ADMIN_LOGIN_FAILED', { username }, req.ip);
    return res.status(401).json({
      error: true,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  const token = generateToken({ username, role: 'admin' });
  const isProd = process.env.NODE_ENV === 'production';

  // Set HTTP-Only secure cookie
  res.cookie('spx_admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  logActivity('ADMIN_LOGIN_SUCCESS', { username }, req.ip);
  res.json({
    success: true,
    token, // Also returned for Authorization header fallback in cross-origin environments
    user: {
      username,
      role: 'admin',
    },
  });
});

// 2. Admin Logout
router.post('/logout', (req, res) => {
  res.clearCookie('spx_admin_token', { path: '/' });
  logActivity('ADMIN_LOGOUT', {}, req.ip);
  res.json({ success: true, message: 'Logged out successfully' });
});

// All subsequent routes require Admin authentication
router.use(authenticateAdmin);
router.use(adminApiLimiter);

// 3. Admin Profile verification
router.get('/me', (req, res) => {
  res.json({
    authenticated: true,
    user: req.adminUser,
  });
});

// 4. Admin Dashboard Statistics
router.get('/stats', (req, res) => {
  const libStats = getLibraryStats();
  const tgStatus = getConnectionStatus();
  const cacheStats = getCacheStats();

  res.json({
    tracks: libStats.trackCount,
    albums: libStats.albumCount,
    artists: libStats.artistCount,
    totalDuration: libStats.totalDuration,
    totalSize: libStats.totalSize,
    lyricsCount: getLyricsCount(),
    telegram: {
      connected: tgStatus.connected,
      channel: tgStatus.channelTitle || tgStatus.chatId || 'Not set',
      lastConnected: tgStatus.lastConnected,
      lastError: tgStatus.lastError,
    },
    system: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
    cache: cacheStats,
    lastSync: libStats.lastSync,
  });
});

// 5. Admin Library Listing (with search, filter, pagination)
router.get('/library', (req, res) => {
  const { q = '', sort = 'recent', page = 1, limit = 50 } = req.query;
  let items = getAllItems();

  if (q) {
    const query = q.toLowerCase();
    items = items.filter(i =>
      `${i.title} ${i.artist} ${i.album} ${i.fileName} ${i.id}`.toLowerCase().includes(query)
    );
  }

  const sorters = {
    recent: (a, b) => (b.date || 0) - (a.date || 0),
    alpha: (a, b) => (a.title || '').localeCompare(b.title || ''),
    duration: (a, b) => (b.duration || 0) - (a.duration || 0),
    size: (a, b) => (b.size || 0) - (a.size || 0),
  };
  items.sort(sorters[sort] || sorters.recent);

  const p = Math.max(1, parseInt(page, 10));
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const total = items.length;
  const paginated = items.slice((p - 1) * lim, p * lim);

  res.json({
    items: paginated,
    total,
    page: p,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  });
});

// 6. Admin Library Full Sync
router.post('/library/sync', async (req, res, next) => {
  try {
    const result = await forceSyncLibrary(true);
    res.json({
      success: true,
      message: 'Full library synchronization completed',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Admin Library Quick Refresh
router.post('/library/refresh', async (req, res, next) => {
  try {
    const result = await forceSyncLibrary(false);
    res.json({
      success: true,
      message: 'Library refreshed',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// 8. Track Detail
router.get('/tracks/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: true, code: 'TRACK_NOT_FOUND', message: 'Track not found' });
  const lyrics = getLyrics(req.params.id);
  res.json({ track: item, lyrics });
});

// 9. Update Track Metadata
router.patch('/tracks/:id', (req, res) => {
  const { id } = req.params;
  const existing = getItem(id);
  if (!existing) return res.status(404).json({ error: true, code: 'TRACK_NOT_FOUND', message: 'Track not found' });

  const { title, artist, album, albumArtist, genre, year, trackNumber, discNumber } = req.body;
  const updates = {};
  if (typeof title === 'string') updates.title = title.trim();
  if (typeof artist === 'string') updates.artist = artist.trim();
  if (typeof album === 'string') updates.album = album.trim();
  if (typeof albumArtist === 'string') updates.albumArtist = albumArtist.trim();
  if (typeof genre === 'string') updates.genre = genre.trim();
  if (year !== undefined) updates.year = year ? Number(year) : null;
  if (trackNumber !== undefined) updates.trackNumber = trackNumber ? Number(trackNumber) : null;
  if (discNumber !== undefined) updates.discNumber = discNumber ? Number(discNumber) : null;

  setOverride(id, updates);
  const updatedTrack = updateItemInMemory(id, updates);

  res.json({
    success: true,
    track: updatedTrack || getItem(id),
  });
});

// 10. Remove Track from Application (Leaves Telegram file intact)
router.delete('/tracks/:id', (req, res) => {
  const { id } = req.params;
  removeOverride(id);
  removeItemFromMemory(id);
  logActivity('TRACK_REMOVED_FROM_LIBRARY', { trackId: id });
  res.json({
    success: true,
    message: 'Track removed from SPiDEYxFLASH library. Telegram file remains intact.',
  });
});

// 11. Lyrics Endpoints
router.get('/tracks/:id/lyrics', (req, res) => {
  const lyrics = getLyrics(req.params.id);
  res.json({ lyrics: lyrics || null });
});

router.post('/tracks/:id/lyrics', (req, res) => {
  const { id } = req.params;
  const { content, type } = req.body || {};
  const lyrics = setLyrics(id, content, type);
  res.json({ success: true, lyrics });
});

router.delete('/tracks/:id/lyrics', (req, res) => {
  deleteLyrics(req.params.id);
  res.json({ success: true, message: 'Lyrics deleted' });
});

// 12. Custom Artwork
router.post('/tracks/:id/artwork', (req, res) => {
  const { id } = req.params;
  const { artworkUrl } = req.body || {};
  setArtwork(id, artworkUrl || null);
  res.json({ success: true, artworkUrl: artworkUrl || null });
});

// 13. Telegram Diagnostics & Connection Tester
router.get('/telegram/status', (req, res) => {
  res.json(getConnectionStatus());
});

router.post('/telegram/test', async (req, res) => {
  const result = await testConnection();
  logActivity('TELEGRAM_TEST_RUN', result);
  res.json(result);
});

// 14. Cache Management
router.get('/cache/stats', (req, res) => {
  res.json(getCacheStats());
});

router.post('/cache/clear', (req, res) => {
  const { target = 'all' } = req.body || {};
  if (target === 'lyrics') {
    clearLyricsCache();
    return res.json({ success: true, cleared: ['lyrics'] });
  }
  const result = clearCache(target);
  res.json(result);
});

// 15. System Status
router.get('/system', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    freeMemoryMb: Math.round(os.freemem() / 1048576),
    totalMemoryMb: Math.round(os.totalmem() / 1048576),
    processMemory: {
      rssMb: Math.round(mem.rss / 1048576),
      heapTotalMb: Math.round(mem.heapTotal / 1048576),
      heapUsedMb: Math.round(mem.heapUsed / 1048576),
    },
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    telegramStatus: getConnectionStatus(),
  });
});

// 16. Admin Audit Logs
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  res.json({ logs: getLogs(limit) });
});

router.delete('/logs', (req, res) => {
  clearLogs();
  res.json({ success: true, message: 'Logs cleared' });
});

// 17. Backup Export & Import
router.get('/export', (req, res) => {
  const data = exportMetadata();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=spideyxflash_metadata_${Date.now()}.json`);
  res.send(JSON.stringify(data, null, 2));
});

router.post('/import', (req, res) => {
  try {
    const result = importMetadata(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
});

module.exports = router;
