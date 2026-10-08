const fs = require('fs');
const path = require('path');
const { logActivity } = require('./activityLog');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LYRICS_FILE = path.join(DATA_DIR, 'lyrics_cache.json');

let lyricsStore = new Map(); // trackId -> { type: 'synced'|'plain', content: string, lines: Array<{time: number, text: string}>, updatedAt: string }

function parseLRC(rawLrc) {
  if (!rawLrc || typeof rawLrc !== 'string') return [];
  const lines = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  const rawLines = rawLrc.split('\n');
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? (m[3].length === 2 ? parseInt(m[3], 10) * 10 : parseInt(m[3], 10)) : 0;
        const totalSecs = mins * 60 + secs + ms / 1000;
        lines.push({ time: totalSecs, text });
      }
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
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

function setLyrics(trackId, rawContent, type = 'auto') {
  const id = String(trackId);
  if (!rawContent || !rawContent.trim()) {
    lyricsStore.delete(id);
    saveLyricsData();
    logActivity('LYRICS_REMOVED', { trackId: id });
    return null;
  }

  const parsedLines = parseLRC(rawContent);
  const isSynced = type === 'synced' || (type === 'auto' && parsedLines.length > 0);

  const entry = {
    type: isSynced ? 'synced' : 'plain',
    raw: rawContent.trim(),
    lines: isSynced ? parsedLines : [],
    updatedAt: new Date().toISOString(),
  };

  lyricsStore.set(id, entry);
  saveLyricsData();
  logActivity('LYRICS_UPDATED', { trackId: id, type: entry.type, lineCount: entry.lines.length });
  return entry;
}

function deleteLyrics(trackId) {
  const id = String(trackId);
  const removed = lyricsStore.delete(id);
  if (removed) {
    saveLyricsData();
    logActivity('LYRICS_DELETED', { trackId: id });
  }
  return removed;
}

function clearLyricsCache() {
  lyricsStore.clear();
  saveLyricsData();
  logActivity('CACHE_CLEARED', { target: 'lyrics' });
  return { success: true };
}

module.exports = {
  getLyrics,
  setLyrics,
  deleteLyrics,
  parseLRC,
  clearLyricsCache,
  getLyricsCount: () => lyricsStore.size,
};
