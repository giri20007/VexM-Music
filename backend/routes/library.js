const router = require('express').Router();
const tg = require('../utils/telegramApi');
const { getOverride, getArtwork, getArtistAlias } = require('../services/cacheService');
const { logActivity } = require('../services/activityLog');

const TTL = 30 * 1000; // Fast 30-second cache TTL for instant sync
const items = new Map(); // id -> item
const removedIds = new Set(); // ids hidden from library
let maxId = 0;
let lastSync = 0;
let syncing = null;

function applyOverrides(item) {
  const override = getOverride(item.id);
  const customArt = getArtwork(item.id);
  const canonicalArtist = getArtistAlias(override?.artist || item.artist);
  return {
    ...item,
    ...(override || {}),
    artist: canonicalArtist || override?.artist || item.artist,
    thumbnail: customArt || (override?.artworkUrl || item.thumbnail),
  };
}

async function sync(full = false) {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const startTime = Date.now();
      const r = await tg.listAudio(full ? 0 : maxId);
      if (full) {
        items.clear();
      }

      let added = 0;
      let updated = 0;

      r.items.forEach(raw => {
        if (removedIds.has(raw.id)) return;
        const processed = applyOverrides(raw);
        if (items.has(raw.id)) {
          updated++;
        } else {
          added++;
        }
        items.set(raw.id, processed);
      });

      maxId = Math.max(maxId, r.maxId);
      lastSync = Date.now();
      const elapsed = Date.now() - startTime;

      if (added > 0 || full) {
        logActivity('LIBRARY_SYNC_COMPLETED', {
          full,
          totalItems: items.size,
          added,
          updated,
          elapsedMs: elapsed,
        });
      }

      return {
        total: items.size,
        added,
        updated,
        maxId,
        lastSync,
      };
    } catch (e) {
      console.warn('Auto-sync notice:', e.message);
      throw e;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

// Background auto-discovery every 20 seconds
setInterval(() => {
  sync(false).catch(() => {});
}, 20 * 1000);

// Public Library Listing
router.get('/', async (req, res, next) => {
  try {
    const full = req.query.refresh === '1';
    if (full || !lastSync || Date.now() - lastSync > TTL) {
      await sync(full);
    }
    const list = [...items.values()]
      .filter(i => !removedIds.has(i.id))
      .map(applyOverrides)
      .sort((a, b) => (b.date || 0) - (a.date || 0));

    res.set('Cache-Control', 'private, max-age=10').json({
      items: list,
      total: list.length,
      lastSync,
    });
  } catch (e) {
    next(e);
  }
});

// Public Single Track Lookup
router.get('/:id', (req, res) => {
  const it = items.get(req.params.id);
  if (!it || removedIds.has(req.params.id)) {
    return res.status(404).json({ error: true, code: 'TRACK_NOT_FOUND', message: 'Track not found' });
  }
  res.json(applyOverrides(it));
});

module.exports = {
  router,
  getAllItems: () => {
    return [...items.values()]
      .filter(i => !removedIds.has(String(i.id)))
      .map(applyOverrides);
  },
  getItem: id => {
    if (removedIds.has(String(id))) return null;
    const it = items.get(String(id));
    return it ? applyOverrides(it) : null;
  },
  addItemToMemory: item => {
    const sId = String(item.id || Date.now());
    removedIds.delete(sId);
    const processed = applyOverrides({ ...item, id: sId });
    items.set(sId, processed);
    return processed;
  },
  updateItemInMemory: (id, updates) => {
    const sId = String(id);
    if (removedIds.has(sId)) return null;
    const existing = items.get(sId);
    const updated = applyOverrides({ ...(existing || {}), ...updates, id: sId });
    items.set(sId, updated);
    return updated;
  },
  removeItemFromMemory: id => {
    const sId = String(id);
    removedIds.add(sId);
    return items.delete(sId);
  },
  forceSyncLibrary: full => sync(full),
  getLastSync: () => lastSync,
  getLibraryStats: () => {
    const all = [...items.values()].filter(i => !removedIds.has(i.id));
    const albums = new Set(all.map(i => i.album).filter(Boolean));
    const artists = new Set(all.map(i => i.artist).filter(Boolean));
    const totalDuration = all.reduce((sum, i) => sum + (i.duration || 0), 0);
    const totalSize = all.reduce((sum, i) => sum + (i.size || 0), 0);
    return {
      trackCount: all.length,
      albumCount: albums.size,
      artistCount: artists.size,
      totalDuration,
      totalSize,
      lastSync,
    };
  },
};
