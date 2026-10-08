const fs = require('fs');
const path = require('path');
const { logActivity } = require('./activityLog');

const DATA_DIR = path.join(__dirname, '..', 'data');
const METADATA_FILE = path.join(DATA_DIR, 'metadata_overrides.json');
const LIBRARY_CACHE_FILE = path.join(DATA_DIR, 'library_cache.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err.message);
  }
}

// In-memory stores
let metadataOverrides = new Map(); // trackId -> { title, artist, album, albumArtist, genre, year, trackNumber, discNumber, artworkUrl, updatedAt }
let customArtwork = new Map(); // trackId -> custom artwork url / base64

function loadLocalData() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      metadataOverrides = new Map(Object.entries(data.overrides || {}));
      customArtwork = new Map(Object.entries(data.artwork || {}));
    }
  } catch (err) {
    console.error('Error loading metadata overrides:', err.message);
  }
}

function saveLocalData() {
  try {
    const payload = {
      overrides: Object.fromEntries(metadataOverrides),
      artwork: Object.fromEntries(customArtwork),
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(METADATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving metadata overrides:', err.message);
  }
}

loadLocalData();

function getOverride(trackId) {
  return metadataOverrides.get(String(trackId)) || null;
}

function setOverride(trackId, updates) {
  const id = String(trackId);
  const existing = metadataOverrides.get(id) || {};
  const merged = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  metadataOverrides.set(id, merged);
  saveLocalData();
  logActivity('TRACK_METADATA_UPDATED', { trackId: id, updates });
  return merged;
}

function removeOverride(trackId) {
  const id = String(trackId);
  const deleted = metadataOverrides.delete(id);
  customArtwork.delete(id);
  if (deleted) saveLocalData();
  return deleted;
}

function setArtwork(trackId, artworkUrl) {
  const id = String(trackId);
  if (artworkUrl) {
    customArtwork.set(id, artworkUrl);
  } else {
    customArtwork.delete(id);
  }
  saveLocalData();
  logActivity('ARTWORK_UPDATED', { trackId: id, hasArtwork: Boolean(artworkUrl) });
}

function getArtwork(trackId) {
  return customArtwork.get(String(trackId)) || null;
}

function getCacheStats() {
  return {
    metadataOverridesCount: metadataOverrides.size,
    customArtworkCount: customArtwork.size,
    lastSaved: fs.existsSync(METADATA_FILE) ? fs.statSync(METADATA_FILE).mtime : null,
  };
}

function clearCache(target = 'all') {
  let cleared = [];
  if (target === 'all' || target === 'metadata') {
    metadataOverrides.clear();
    cleared.push('metadata');
  }
  if (target === 'all' || target === 'artwork') {
    customArtwork.clear();
    cleared.push('artwork');
  }
  saveLocalData();
  logActivity('CACHE_CLEARED', { target, cleared });
  return { success: true, cleared };
}

function exportMetadata() {
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    overrides: Object.fromEntries(metadataOverrides),
    artwork: Object.fromEntries(customArtwork),
  };
}

function importMetadata(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid metadata format');
  }
  let importedCount = 0;
  if (data.overrides && typeof data.overrides === 'object') {
    for (const [id, val] of Object.entries(data.overrides)) {
      if (val && typeof val === 'object') {
        metadataOverrides.set(String(id), {
          title: typeof val.title === 'string' ? val.title : undefined,
          artist: typeof val.artist === 'string' ? val.artist : undefined,
          album: typeof val.album === 'string' ? val.album : undefined,
          albumArtist: typeof val.albumArtist === 'string' ? val.albumArtist : undefined,
          genre: typeof val.genre === 'string' ? val.genre : undefined,
          year: val.year ? Number(val.year) : undefined,
          trackNumber: val.trackNumber ? Number(val.trackNumber) : undefined,
          discNumber: val.discNumber ? Number(val.discNumber) : undefined,
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      }
    }
  }
  if (data.artwork && typeof data.artwork === 'object') {
    for (const [id, val] of Object.entries(data.artwork)) {
      if (typeof val === 'string') {
        customArtwork.set(String(id), val);
      }
    }
  }
  saveLocalData();
  logActivity('METADATA_IMPORTED', { count: importedCount });
  return { success: true, importedCount };
}

module.exports = {
  getOverride,
  setOverride,
  removeOverride,
  setArtwork,
  getArtwork,
  getCacheStats,
  clearCache,
  exportMetadata,
  importMetadata,
};
