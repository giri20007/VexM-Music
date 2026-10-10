const fs = require('fs');
const path = require('path');
const { logActivity } = require('./activityLog');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LYRICS_FILE = path.join(DATA_DIR, 'lyrics_cache.json');

let lyricsStore = new Map(); // trackId -> { type: 'synced'|'plain', source: 'embedded'|'admin', raw: string, lines: Array<{start: number, end: number, time: number, text: string}>, language: string, updatedAt: string }
const negativeCache = new Map(); // trackId -> timestamp checked

/**
 * Parse LRC / SRT-style timestamped lyrics and normalize start & end times
 */
function parseLRC(rawLrc, trackDuration = 0) {
  if (!rawLrc || typeof rawLrc !== 'string') return [];
  const rawEntries = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  let globalOffsetMs = 0;

  const rawLines = rawLrc.split('\n');
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for [offset:+/-xxx] tag
    const offsetMatch = trimmed.match(/^\[offset:\s*([+-]?\d+)\s*\]/i);
    if (offsetMatch) {
      globalOffsetMs = parseInt(offsetMatch[1], 10) || 0;
      continue;
    }

    // Skip non-timed metadata tags like [ar:...], [ti:...], [al:...]
    if (/^\[(ar|ti|al|by|length|re|ve|la):.*\]/i.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        let ms = 0;
        if (m[3]) {
          ms = m[3].length === 2 ? parseInt(m[3], 10) * 10 : parseInt(m[3], 10);
        }
        let totalSecs = mins * 60 + secs + (ms / 1000) + (globalOffsetMs / 1000);
        if (totalSecs < 0) totalSecs = 0;
        rawEntries.push({
          start: Number(totalSecs.toFixed(3)),
          text: text || '♪',
        });
      }
    }
  }

  rawEntries.sort((a, b) => a.start - b.start);

  // Calculate duration-bounded end times
  const normalizedLines = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const current = rawEntries[i];
    let end = 0;
    if (i < rawEntries.length - 1) {
      end = rawEntries[i + 1].start;
    } else {
      end = trackDuration > current.start ? trackDuration : current.start + 5.0;
    }

    normalizedLines.push({
      start: current.start,
      end: Number(end.toFixed(3)),
      time: current.start, // backward compatibility
      text: current.text,
    });
  }

  return normalizedLines;
}

function loadLyricsData() {
  try {
    if (fs.existsSync(LYRICS_FILE)) {
      const data = JSON.parse(fs.readFileSync(LYRICS_FILE, 'utf8'));
      lyricsStore = new Map(Object.entries(data || {}));
    }
  } catch (err) {
    console.error('Error loading lyrics cache:', err.message);
  }
}

function saveLyricsData() {
  try {
    const payload = Object.fromEntries(lyricsStore);
    fs.writeFileSync(LYRICS_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving lyrics cache:', err.message);
  }
}

loadLyricsData();

function getLyrics(trackId) {
  return lyricsStore.get(String(trackId)) || null;
}

function isNegativeCached(trackId) {
  const ts = negativeCache.get(String(trackId));
  if (!ts) return false;
  // Negative cache valid for 2 hours
  if (Date.now() - ts < 2 * 60 * 60 * 1000) {
    return true;
  }
  negativeCache.delete(String(trackId));
  return false;
}

function setNegativeCached(trackId) {
  negativeCache.set(String(trackId), Date.now());
}

function setLyrics(trackId, rawContent, type = 'auto', source = 'admin', language = '', trackDuration = 0) {
  const id = String(trackId);
  negativeCache.delete(id);

  if (!rawContent || !rawContent.trim()) {
    lyricsStore.delete(id);
    saveLyricsData();
    logActivity('LYRICS_REMOVED', { trackId: id });
    return null;
  }

  const parsedLines = parseLRC(rawContent, trackDuration);
  const isSynced = type === 'synced' || (type === 'auto' && parsedLines.length > 0);

  const entry = {
    available: true,
    type: isSynced ? 'synced' : 'plain',
    synced: isSynced,
    source: source || 'admin',
    language: language || '',
    raw: rawContent.trim(),
    lines: isSynced ? parsedLines : [],
    updatedAt: new Date().toISOString(),
  };

  lyricsStore.set(id, entry);
  saveLyricsData();
  logActivity('LYRICS_UPDATED', { trackId: id, type: entry.type, source: entry.source, lineCount: entry.lines.length });
  return entry;
}

function deleteLyrics(trackId) {
  const id = String(trackId);
  negativeCache.delete(id);
  const removed = lyricsStore.delete(id);
  if (removed) {
    saveLyricsData();
    logActivity('LYRICS_DELETED', { trackId: id });
  }
  return removed;
}

function clearLyricsCache() {
  lyricsStore.clear();
  negativeCache.clear();
  saveLyricsData();
  logActivity('CACHE_CLEARED', { target: 'lyrics' });
  return { success: true };
}

module.exports = {
  getLyrics,
  setLyrics,
  deleteLyrics,
  parseLRC,
  isNegativeCached,
  setNegativeCached,
  clearLyricsCache,
  getLyricsCount: () => lyricsStore.size,
};
