const router = require('express').Router();
const os = require('os');
const path = require('path');
const fs = require('fs');
const {
  authenticateAdmin,
  verifyCredentials,
  generateToken,
  ADMIN_USERNAME,
} = require('../middleware/auth');
const { loginLimiter, adminApiLimiter } = require('../middleware/rateLimiter');
const userService = require('../services/userService');
const {
  getAllItems,
  getItem,
  addItemToMemory,
  updateItemInMemory,
  removeItemFromMemory,
  forceSyncLibrary,
  getLibraryStats,
  getLastSync,
} = require('./library');
const {
  setOverride,
  removeOverride,
  setArtwork,
  getCacheStats,
  clearCache,
  exportMetadata,
  importMetadata,
  setArtistAlias,
  getArtistAlias,
  getAllArtistAliases,
  removeArtistAlias,
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
      message: 'Invalid administrator credentials.',
    });
  }

  const userPayload = {
    id: 'owner_spidey',
    username: 'Spidey',
    displayName: 'Spidey (Owner)',
    role: 'OWNER',
    isOwner: true,
    isAdmin: true,
    telegramId: '5216415651',
  };

  const token = generateToken(userPayload);
  const isProd = process.env.NODE_ENV === 'production';

  // Set HTTP-Only secure cookie
  res.cookie('spx_admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  logActivity('ADMIN_LOGIN_SUCCESS', { username: 'Spidey' }, req.ip);
  res.json({
    success: true,
    token,
    user: userPayload,
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

// 5. Admin Library Listing (with search, filter, pagination, and tracks alias)
const handleLibraryList = async (req, res) => {
  try {
    if (!getLastSync() || (getAllItems() && getAllItems().length === 0)) {
      await forceSyncLibrary(false).catch(e => console.warn('[ADMIN AUTO-SYNC NOTICE]', e.message));
    }
    const { q = '', sort = 'recent', page = 1, limit = 50 } = req.query;
    let items = (getAllItems() || []).map(i => ({
      id: String(i.id || ''),
      title: i.title || 'Untitled Track',
      artist: i.artist || 'Unknown Artist',
      album: i.album || 'Single',
      albumArtist: i.albumArtist || i.artist || 'Unknown Artist',
      genre: i.genre || 'Various',
      year: i.year || null,
      trackNumber: i.trackNumber || null,
      discNumber: i.discNumber || null,
      duration: i.duration || 0,
      size: i.size || 0,
      format: i.format || (i.audioUrl?.endsWith('.flac') ? 'FLAC' : 'MP3'),
      thumbnail: i.thumbnail || null,
      artworkUrl: i.thumbnail || null,
      coverUrl: i.thumbnail || null,
      audioUrl: i.audioUrl || i.streamUrl || '',
      streamUrl: i.streamUrl || i.audioUrl || '',
      date: i.date || Date.now(),
      hidden: Boolean(i.hidden),
    }));

    if (q) {
      const query = q.toLowerCase().trim();
      items = items.filter(i =>
        `${i.title} ${i.artist} ${i.album} ${i.genre} ${i.id}`.toLowerCase().includes(query)
      );
    }

    const sorters = {
      recent: (a, b) => (b.date || 0) - (a.date || 0),
      alpha: (a, b) => (a.title || '').localeCompare(b.title || ''),
      artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
      album: (a, b) => (a.album || '').localeCompare(b.album || ''),
      duration: (a, b) => (b.duration || 0) - (a.duration || 0),
      size: (a, b) => (b.size || 0) - (a.size || 0),
    };
    items.sort(sorters[sort] || sorters.recent);

    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const total = items.length;
    const paginated = items.slice((p - 1) * lim, p * lim);

    res.json({
      success: true,
      items: paginated,
      tracks: paginated,
      total,
      page: p,
      limit: lim,
      totalPages: Math.ceil(total / lim) || 1,
    });
  } catch (err) {
    console.error('[ADMIN LIBRARY ERROR]', err);
    res.status(500).json({ error: true, code: 'LIBRARY_FETCH_FAILED', message: 'Failed to retrieve tracks from library', details: err.message });
  }
};

router.get('/library', handleLibraryList);
router.get('/tracks', handleLibraryList);

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

// 8b. Create / Add New Track to Library
router.post('/tracks', (req, res) => {
  const { title, artist, audioUrl, artworkUrl, genre, album, albumArtist, year, duration } = req.body || {};

  if (!title || !artist) {
    return res.status(400).json({ error: true, code: 'MISSING_FIELDS', message: 'Track title and artist are required' });
  }

  const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const newTrack = {
    id: trackId,
    title: String(title).trim(),
    artist: String(artist).trim(),
    album: album ? String(album).trim() : 'Singles',
    albumArtist: albumArtist ? String(albumArtist).trim() : String(artist).trim(),
    genre: genre ? String(genre).trim() : 'Various',
    year: year ? Number(year) : new Date().getFullYear(),
    duration: duration ? Number(duration) : 210,
    audioUrl: audioUrl ? String(audioUrl).trim() : '',
    streamUrl: audioUrl ? String(audioUrl).trim() : '',
    thumbnail: artworkUrl ? String(artworkUrl).trim() : '',
    date: Date.now(),
    format: (audioUrl && audioUrl.toLowerCase().endsWith('.flac')) ? 'FLAC' : 'MP3',
  };

  const added = addItemToMemory(newTrack);
  if (artworkUrl) {
    setArtwork(trackId, String(artworkUrl).trim());
  }
  setOverride(trackId, {
    title: newTrack.title,
    artist: newTrack.artist,
    album: newTrack.album,
    genre: newTrack.genre,
    year: newTrack.year,
    audioUrl: newTrack.audioUrl,
  });

  logActivity('TRACK_CREATED_MANUALLY', { trackId, title: newTrack.title, artist: newTrack.artist });

  res.status(201).json({
    success: true,
    message: 'Track added to library successfully',
    track: added || newTrack,
  });
});

// 9. Update Track Metadata
router.patch('/tracks/:id', (req, res) => {
  const { id } = req.params;
  const existing = getItem(id);
  if (!existing) return res.status(404).json({ error: true, code: 'TRACK_NOT_FOUND', message: 'Track not found' });

  const { title, artist, album, albumArtist, genre, year, trackNumber, discNumber, language, audioUrl, artworkUrl } = req.body;
  const updates = {};
  if (typeof title === 'string') updates.title = title.trim();
  if (typeof artist === 'string') updates.artist = artist.trim();
  if (typeof album === 'string') updates.album = album.trim();
  if (typeof albumArtist === 'string') updates.albumArtist = albumArtist.trim();
  if (typeof genre === 'string') updates.genre = genre.trim();
  if (typeof language === 'string') updates.language = language.trim();
  if (typeof audioUrl === 'string') {
    updates.audioUrl = audioUrl.trim();
    updates.streamUrl = audioUrl.trim();
  }
  if (typeof artworkUrl === 'string') {
    updates.thumbnail = artworkUrl.trim();
    setArtwork(id, artworkUrl.trim());
  }
  if (year !== undefined) updates.year = year ? Number(year) : null;
  if (trackNumber !== undefined) updates.trackNumber = trackNumber ? Number(trackNumber) : null;
  if (discNumber !== undefined) updates.discNumber = discNumber ? Number(discNumber) : null;

  setOverride(id, updates);
  const updatedTrack = updateItemInMemory(id, updates);

  logActivity('TRACK_UPDATED', { trackId: id, updates });

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
  const { content, type, language } = req.body || {};
  const track = getItem(id);
  const lyrics = setLyrics(id, content, type, 'admin', language || '', track?.duration || 0);
  res.json({ success: true, lyrics });
});

router.delete('/tracks/:id/lyrics', (req, res) => {
  deleteLyrics(req.params.id);
  res.json({ success: true, message: 'Lyrics deleted' });
});

// 12. Custom Artwork & Artwork Management
router.post('/tracks/:id/artwork', (req, res) => {
  const { id } = req.params;
  const { artworkUrl } = req.body || {};
  setArtwork(id, artworkUrl || null);
  res.json({ success: true, artworkUrl: artworkUrl || null });
});

router.get('/artwork/health', (req, res) => {
  const { CoverDetector } = require('../utils/telegramApi');
  const items = getAllItems();
  const health = CoverDetector ? CoverDetector.getArtworkHealth(items) : { totalTracks: items.length };
  res.json(health);
});

router.get('/artwork/diagnostics/:id', (req, res) => {
  const { CoverDetector } = require('../utils/telegramApi');
  const diagnostics = CoverDetector ? CoverDetector.getArtworkDiagnostics(req.params.id) : { trackId: req.params.id, confidence: 0 };
  res.json(diagnostics);
});

router.post('/artwork/rescan', async (req, res, next) => {
  try {
    const { rescanArtwork } = require('../utils/telegramApi');
    const items = getAllItems();
    const result = await rescanArtwork(items);
    logActivity('ARTWORK_RESCAN_COMPLETED', { updatedCount: result.updatedCount });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/artwork/override/:id', (req, res) => {
  const { id } = req.params;
  const { source, customUrl } = req.body || {};
  if (source === 'custom' && customUrl) {
    setArtwork(id, customUrl);
  } else if (source === 'automatic') {
    setArtwork(id, null);
  }
  logActivity('ARTWORK_OVERRIDE_SET', { trackId: id, source, customUrl });
  res.json({ success: true, message: `Artwork source updated to ${source}` });
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

// 18. Artist Management & Deduplication
router.get('/artists', (req, res) => {
  const items = getAllItems();
  const artistMap = new Map(); // name -> { name, trackCount, albums: Set, sampleTrack }

  items.forEach(item => {
    const name = item.artist || 'Unknown Artist';
    if (!artistMap.has(name)) {
      artistMap.set(name, {
        name,
        trackCount: 0,
        albums: new Set(),
        sampleTrack: item,
      });
    }
    const entry = artistMap.get(name);
    entry.trackCount++;
    if (item.album) entry.albums.add(item.album);
  });

  const list = Array.from(artistMap.values()).map(a => ({
    name: a.name,
    trackCount: a.trackCount,
    albumCount: a.albums.size,
    thumbnail: a.sampleTrack?.thumbnail,
  }));

  list.sort((a, b) => b.trackCount - a.trackCount);
  res.json({ artists: list, aliases: getAllArtistAliases() });
});

router.get('/artists/duplicates', (req, res) => {
  const items = getAllItems();
  const rawNames = Array.from(new Set(items.map(i => i.artist).filter(Boolean)));
  const duplicateGroups = [];

  // Group by simplified name (lowercase, no extra spaces, punctuation stripped)
  const normMap = new Map();
  rawNames.forEach(raw => {
    const simplified = raw.toLowerCase().replace(/[^\w]/g, '').trim();
    if (!normMap.has(simplified)) {
      normMap.set(simplified, []);
    }
    normMap.get(simplified).push(raw);
  });

  normMap.forEach(group => {
    if (group.length > 1) {
      duplicateGroups.push({
        canonical: group[0],
        variations: group,
      });
    }
  });

  res.json({ duplicates: duplicateGroups });
});

router.post('/artists/merge', (req, res) => {
  const { sourceArtist, targetArtist } = req.body || {};
  if (!sourceArtist || !targetArtist) {
    return res.status(400).json({ error: true, message: 'sourceArtist and targetArtist required' });
  }

  setArtistAlias(sourceArtist, targetArtist);

  // Update all existing items in memory
  const items = getAllItems();
  let updatedCount = 0;
  items.forEach(item => {
    if (item.artist === sourceArtist) {
      updateItemInMemory(item.id, { artist: targetArtist });
      setOverride(item.id, { artist: targetArtist });
      updatedCount++;
    }
  });

  logActivity('ARTIST_MERGED', { sourceArtist, targetArtist, updatedCount });
  res.json({ success: true, message: `Merged "${sourceArtist}" into "${targetArtist}"`, updatedCount });
});

router.post('/artists/rename', (req, res) => {
  const { oldName, newName } = req.body || {};
  if (!oldName || !newName) {
    return res.status(400).json({ error: true, message: 'oldName and newName required' });
  }

  const items = getAllItems();
  let count = 0;
  items.forEach(item => {
    if (item.artist === oldName) {
      updateItemInMemory(item.id, { artist: newName });
      setOverride(item.id, { artist: newName });
      count++;
    }
  });

  logActivity('ARTIST_RENAMED', { oldName, newName, count });
  res.json({ success: true, message: `Renamed artist to "${newName}" across ${count} tracks` });
});

// 19. Artwork Candidate Search & Picker
router.get('/artwork/candidates/:id', (req, res) => {
  const { id } = req.params;
  const track = getItem(id);
  if (!track) return res.status(404).json({ error: true, message: 'Track not found' });

  const candidates = [];

  // 1. Current assigned artwork
  candidates.push({
    source: 'current',
    url: track.thumbnail || `/api/artwork/${track.id}`,
    label: 'Currently Active Artwork',
    confidence: 100,
  });

  // 2. Telegram audio file thumbnail
  candidates.push({
    source: 'telegram_embedded',
    url: `/api/artwork/${track.id}?src=doc`,
    label: 'Telegram Embedded Audio Cover',
    confidence: 85,
  });

  // 3. Album match candidate if same album exists
  if (track.album && track.album !== 'Unknown Album') {
    candidates.push({
      source: 'album_match',
      url: `/api/artwork/album_${encodeURIComponent(track.album.toLowerCase())}`,
      label: `Matching Album Artwork (${track.album})`,
      confidence: 90,
    });
  }

  // 4. Look for other tracks in the same album
  const allItems = getAllItems();
  const sameAlbumTracks = allItems.filter(
    t => t.id !== track.id && t.album && t.album === track.album && t.thumbnail
  );
  sameAlbumTracks.slice(0, 3).forEach(other => {
    candidates.push({
      source: 'sibling_track',
      url: other.thumbnail,
      label: `Album Sibling: ${other.title}`,
      confidence: 75,
    });
  });

  res.json({ trackId: id, title: track.title, artist: track.artist, candidates });
});

// 20. Active Sessions & Auth Logs
router.get('/sessions', (req, res) => {
  const logs = getLogs(50);
  const authLogs = logs.filter(l => l.action?.includes('AUTH') || l.action?.includes('LOGIN'));
  res.json({
    activeAdmin: req.adminUser,
    recentAuthActivity: authLogs,
  });
});

// 21. Track Hide & Restore
router.post('/tracks/:id/hide', (req, res) => {
  const { id } = req.params;
  const item = getItem(id);
  if (!item) return res.status(404).json({ error: true, message: 'Track not found' });

  updateItemInMemory(id, { hidden: true });
  setOverride(id, { hidden: true });
  logActivity('TRACK_HIDDEN', { trackId: id, title: item.title });
  res.json({ success: true, message: `Track "${item.title}" hidden` });
});

router.post('/tracks/:id/restore', (req, res) => {
  const { id } = req.params;
  const item = getItem(id);
  if (!item) return res.status(404).json({ error: true, message: 'Track not found' });

  updateItemInMemory(id, { hidden: false });
  setOverride(id, { hidden: false });
  logActivity('TRACK_RESTORED', { trackId: id, title: item.title });
  res.json({ success: true, message: `Track "${item.title}" restored` });
});

// 22. User Management (Persistent Database Operations)
router.get('/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (err) {
    console.error('[ADMIN GET USERS ERROR]', err);
    res.status(500).json({ error: true, message: 'Failed to retrieve users', details: err.message });
  }
});

router.post('/users', async (req, res) => {
  const { username, password, displayName, role = 'USER', email } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: true, message: 'Username and password required' });
  }

  // Prevent creating duplicate Owner or promoting without permission
  if (role === 'OWNER' && !req.adminUser?.isOwner) {
    return res.status(403).json({ error: true, message: 'Only the system Owner can assign the OWNER role' });
  }

  try {
    const user = await userService.createUser({
      username: username.trim(),
      password: password.trim(),
      displayName: displayName ? displayName.trim() : username.trim(),
      email: email ? email.trim() : null,
      role: role.toUpperCase(),
    });

    logActivity('USER_CREATED_BY_ADMIN', { username: user.username, role: user.role });
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('[ADMIN CREATE USER ERROR]', err);
    res.status(400).json({ error: true, message: err.message || 'Failed to create user' });
  }
});

router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { status, role, displayName } = req.body || {};

  try {
    const targetUser = await userService.findUserById(id) || await userService.findUserByTelegramId(id);
    if (!targetUser) return res.status(404).json({ error: true, message: 'User not found' });

    // Protect Owner role and status from modification
    if (targetUser.role === 'OWNER' && (status === 'disabled' || (role && role !== 'OWNER'))) {
      return res.status(403).json({ error: true, message: 'Cannot modify Owner status or role' });
    }

    if (role === 'OWNER' && !req.adminUser?.isOwner) {
      return res.status(403).json({ error: true, message: 'Only the system Owner can assign the OWNER role' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (role) updates.role = role.toUpperCase();
    if (displayName) updates.displayName = displayName.trim();

    const updated = await userService.updateUser(targetUser.id, updates);
    logActivity('USER_UPDATED', { userId: id, updates });
    res.json({ success: true, user: userService.toSafeUser(updated) });
  } catch (err) {
    console.error('[ADMIN UPDATE USER ERROR]', err);
    res.status(500).json({ error: true, message: 'Failed to update user', details: err.message });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: true, message: 'New password must be at least 4 characters' });
  }

  try {
    const targetUser = await userService.findUserById(id) || await userService.findUserByTelegramId(id);
    if (!targetUser) return res.status(404).json({ error: true, message: 'User not found' });

    await userService.resetUserPassword(targetUser.id, newPassword);
    logActivity('USER_PASSWORD_RESET_BY_ADMIN', { userId: id, username: targetUser.username });
    res.json({ success: true, message: `Password reset successfully for ${targetUser.username}` });
  } catch (err) {
    console.error('[ADMIN RESET PASSWORD ERROR]', err);
    res.status(500).json({ error: true, message: 'Failed to reset password', details: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await userService.findUserById(id) || await userService.findUserByTelegramId(id);
    if (!targetUser) return res.status(404).json({ error: true, message: 'User not found' });

    if (targetUser.role === 'OWNER') {
      return res.status(403).json({ error: true, message: 'Cannot delete system Owner account' });
    }

    await userService.deleteUser(targetUser.id);
    logActivity('USER_DELETED', { userId: id, username: targetUser.username });
    res.json({ success: true, message: `User ${targetUser.username} deleted permanently` });
  } catch (err) {
    console.error('[ADMIN DELETE USER ERROR]', err);
    res.status(500).json({ error: true, message: 'Failed to delete user', details: err.message });
  }
});

router.post('/users/:id/revoke', async (req, res) => {
  const { id } = req.params;
  try {
    const targetUser = await userService.findUserById(id) || await userService.findUserByTelegramId(id);
    if (!targetUser) return res.status(404).json({ error: true, message: 'User not found' });

    logActivity('USER_SESSION_REVOKED', { userId: id, username: targetUser.username });
    res.json({ success: true, message: `Session revoked for user ${targetUser.username}` });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Failed to revoke session' });
  }
});

// 23. Album Management
router.get('/albums', (req, res) => {
  const items = getAllItems();
  const albumMap = new Map();

  items.forEach(item => {
    const alb = item.album || 'Unknown Album';
    if (!albumMap.has(alb)) {
      albumMap.set(alb, {
        name: alb,
        artist: item.artist,
        year: item.year || null,
        tracks: [],
        thumbnail: item.thumbnail || null,
        trackCount: 0,
      });
    }
    const entry = albumMap.get(alb);
    entry.tracks.push(item);
    entry.trackCount++;
    if (!entry.thumbnail && item.thumbnail) {
      entry.thumbnail = item.thumbnail;
    }
  });

  res.json({ albums: Array.from(albumMap.values()) });
});

router.patch('/albums/:name', (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName, artist, artworkUrl } = req.body || {};

  const items = getAllItems();
  let count = 0;

  items.forEach(item => {
    if (item.album === oldName) {
      const updates = {};
      if (newName) updates.album = newName;
      if (artist) updates.artist = artist;
      if (artworkUrl) updates.artworkUrl = artworkUrl;

      updateItemInMemory(item.id, updates);
      setOverride(item.id, updates);
      count++;
    }
  });

  logActivity('ALBUM_UPDATED', { oldName, newName, count });
  res.json({ success: true, message: `Album "${oldName}" updated across ${count} tracks` });
});

router.delete('/albums/:name', (req, res) => {
  const albName = decodeURIComponent(req.params.name);
  const items = getAllItems();
  let count = 0;

  items.forEach(item => {
    if (item.album === albName) {
      updateItemInMemory(item.id, { album: 'Single' });
      setOverride(item.id, { album: 'Single' });
      count++;
    }
  });

  logActivity('ALBUM_DELETED', { album: albName, count });
  res.json({ success: true, message: `Album "${albName}" disassociated from ${count} tracks` });
});

// 24. Playlist Management
const PLAYLISTS_FILE = path.join(__dirname, '../data/playlists.json');

function readPlaylists() {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'favorites',
      name: 'Featured Playlist',
      createdAt: Date.now(),
      trackIds: [],
    },
  ];
}

function writePlaylists(playlists) {
  try {
    const dir = path.dirname(PLAYLISTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
  } catch (err) {
    console.error('Playlist save error:', err.message);
  }
}

router.get('/playlists', (req, res) => {
  res.json({ playlists: readPlaylists() });
});

router.post('/playlists', (req, res) => {
  const { name, trackIds = [] } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: true, message: 'Name is required' });

  const playlists = readPlaylists();
  const newPl = {
    id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim(),
    createdAt: Date.now(),
    trackIds,
  };
  playlists.push(newPl);
  writePlaylists(playlists);

  logActivity('PLAYLIST_CREATED', { name: newPl.name, id: newPl.id });
  res.json({ success: true, playlist: newPl });
});

router.patch('/playlists/:id', (req, res) => {
  const { id } = req.params;
  const { name, trackIds } = req.body || {};
  const playlists = readPlaylists();
  const idx = playlists.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: true, message: 'Playlist not found' });

  if (name) playlists[idx].name = name.trim();
  if (Array.isArray(trackIds)) playlists[idx].trackIds = trackIds;
  writePlaylists(playlists);

  logActivity('PLAYLIST_UPDATED', { id, name: playlists[idx].name });
  res.json({ success: true, playlist: playlists[idx] });
});

router.delete('/playlists/:id', (req, res) => {
  const { id } = req.params;
  let playlists = readPlaylists();
  const target = playlists.find(p => p.id === id);
  playlists = playlists.filter(p => p.id !== id);
  writePlaylists(playlists);

  logActivity('PLAYLIST_DELETED', { id, name: target?.name });
  res.json({ success: true, message: 'Playlist deleted' });
});

module.exports = router;
