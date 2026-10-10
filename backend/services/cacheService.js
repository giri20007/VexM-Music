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
let metadataOverrides = new Map(); // trackId -> { title, artist, album, albumArtist, genre, language, year, trackNumber, discNumber, artworkUrl, updatedAt }
let customArtwork = new Map(); // trackId -> custom artwork url / base64
let verifiedArtwork = new Set(); // trackIds with manually verified artwork
let artistAliases = new Map(); // normalizedAlias -> canonicalName

function loadLocalData() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      metadataOverrides = new Map(Object.entries(data.overrides || {}));
      customArtwork = new Map(Object.entries(data.artwork || {}));
      verifiedArtwork = new Set(Array.isArray(data.verifiedArtwork) ? data.verifiedArtwork : []);
      artistAliases = new Map(Object.entries(data.artistAliases || {}));
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
      verifiedArtwork: Array.from(verifiedArtwork),
      artistAliases: Object.fromEntries(artistAliases),
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
  verifiedArtwork.delete(id);
  if (deleted) saveLocalData();
  return deleted;
}

function setArtwork(trackId, artworkUrl, isVerified = true) {
  const id = String(trackId);
  if (artworkUrl) {
    customArtwork.set(id, artworkUrl);
    if (isVerified) {
      verifiedArtwork.add(id);
    }
  } else {
    customArtwork.delete(id);
    verifiedArtwork.delete(id);
  }
  saveLocalData();
  logActivity('ARTWORK_UPDATED', { trackId: id, hasArtwork: Boolean(artworkUrl), isVerified });
}

function getArtwork(trackId) {
  return customArtwork.get(String(trackId)) || null;
}

function isArtworkVerified(trackId) {
  return verifiedArtwork.has(String(trackId));
}

function setArtistAlias(alias, canonical) {
  if (!alias || !canonical) return;
  const key = alias.trim().toLowerCase();
  artistAliases.set(key, canonical.trim());
  saveLocalData();
  logActivity('ARTIST_ALIAS_SET', { alias, canonical });
}

function getArtistAlias(name) {
  if (!name) return null;
  return artistAliases.get(name.trim().toLowerCase()) || null;
}

function getAllArtistAliases() {
  return Object.fromEntries(artistAliases);
}

function removeArtistAlias(alias) {
  if (!alias) return;
  const deleted = artistAliases.delete(alias.trim().toLowerCase());
  if (deleted) saveLocalData();
  return deleted;
}

function getCacheStats() {
  return {
    metadataOverridesCount: metadataOverrides.size,
    customArtworkCount: customArtwork.size,
    verifiedArtworkCount: verifiedArtwork.size,
    artistAliasesCount: artistAliases.size,
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
    verifiedArtwork.clear();
    cleared.push('artwork');
  }
  if (target === 'all' || target === 'artists') {
    artistAliases.clear();
    cleared.push('artists');
  }
  saveLocalData();
  logActivity('CACHE_CLEARED', { target, cleared });
  return { success: true, cleared };
}

function exportMetadata() {
  return {
    version: '1.2',
    exportDate: new Date().toISOString(),
    overrides: Object.fromEntries(metadataOverrides),
    artwork: Object.fromEntries(customArtwork),
    verifiedArtwork: Array.from(verifiedArtwork),
    artistAliases: Object.fromEntries(artistAliases),
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
          language: typeof val.language === 'string' ? val.language : undefined,
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
  if (Array.isArray(data.verifiedArtwork)) {
    data.verifiedArtwork.forEach(id => verifiedArtwork.add(String(id)));
  }
  if (data.artistAliases && typeof data.artistAliases === 'object') {
    for (const [alias, canonical] of Object.entries(data.artistAliases)) {
      if (typeof canonical === 'string') {
        artistAliases.set(alias.toLowerCase(), canonical);
      }
    }
  }
  saveLocalData();
  logActivity('METADATA_IMPORTED', { count: importedCount });
  return { success: true, importedCount };
}

function getLibraryCache() {
  try {
    if (fs.existsSync(LIBRARY_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(LIBRARY_CACHE_FILE, 'utf8'));
      if (Array.isArray(data.items)) {
        return { items: data.items, maxId: data.maxId || 0, savedAt: data.savedAt };
      }
    }
  } catch (err) {
    console.warn('Error reading library cache file:', err.message);
  }
  return null;
}

function saveLibraryCache(items, maxId) {
  try {
    const payload = {
      items: Array.isArray(items) ? items : Array.from(items.values()),
      maxId: Number(maxId) || 0,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(LIBRARY_CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error saving library cache file:', err.message);
  }
}

module.exports = {
  getOverride,
  setOverride,
  removeOverride,
  setArtwork,
  getArtwork,
  isArtworkVerified,
  setArtistAlias,
  getArtistAlias,
  getAllArtistAliases,
  removeArtistAlias,
  getCacheStats,
  clearCache,
  exportMetadata,
  importMetadata,
  getLibraryCache,
  saveLibraryCache,
};

