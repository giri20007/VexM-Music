const router = require('express').Router();
const { getLyrics, setLyrics, parseLRC } = require('../services/lyricsService');
const { extractLyricsFromBuffer } = require('../services/lyricsExtractor');
const { getItem } = require('./library');
const tg = require('../utils/telegramApi');

// Memory cache for online lyrics lookups (key: clean title + artist)
const onlineLyricsCache = new Map();

function cleanQueryString(str = '') {
  return str
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(feat\.|ft\.|official|video|audio|remastered|lyric video|version)\b.*/gi, '')
    .replace(/[^\w\s\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function synthesizeTimedLines(rawText, duration = 180) {
  if (!rawText) return [];
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const totalDur = Number(duration) > 20 ? Number(duration) : 180;
  const startSec = Math.min(8, totalDur * 0.04);
  const endSec = Math.max(startSec + 20, totalDur - 10);
  const span = endSec - startSec;
  const step = span / lines.length;

  return lines.map((text, i) => {
    const start = Number((startSec + i * step).toFixed(2));
    const nextStart = i < lines.length - 1 ? Number((startSec + (i + 1) * step).toFixed(2)) : totalDur;
    return {
      start,
      time: start,
      end: nextStart,
      text,
    };
  });
}

function extractSearchCandidates(title = '', artist = '') {
  let cleaned = (title || '')
    .replace(/\(.*?(?:video|official|audio|remaster|lyric|4k|hd|feat|from|full|ost|theme).*?\)/gi, '')
    .replace(/\[.*?(?:video|official|audio|remaster|lyric|4k|hd|feat|from|full|ost|theme).*?\]/gi, '')
    .trim();

  const labelsRegex = /t-series|tseries|sony music|zee music|think music|saregama|aditya music|tips|lahari|yrf|speed records|sun pictures|sun tv|times music|speed audio|muzik247/i;
  const junkWords = /^(video|audio|lyric|lyrical|song|full video|teaser|trailer|official|music video|lyric video)$/i;

  const rawSegments = cleaned.split(/[\-\|•—:]/).map(s => s.trim()).filter(Boolean);
  const segments = rawSegments.filter(s => !labelsRegex.test(s) && !junkWords.test(s));

  const songName = segments[0]?.replace(/\blyric(?:al)?\b/gi, '').trim() || cleaned || title;
  const secondary = segments[1]?.replace(/\blyric(?:al)?\b/gi, '').trim() || '';
  const third = segments[2]?.replace(/\blyric(?:al)?\b/gi, '').trim() || '';

  const cleanArtist = artist && !labelsRegex.test(artist) ? artist.trim() : '';

  const queries = [];
  if (songName) {
    if (cleanArtist) queries.push(`${songName} ${cleanArtist}`);
    if (secondary) queries.push(`${songName} ${secondary}`);
    if (third) queries.push(`${songName} ${third}`);
    queries.push(songName);
  }
  return {
    songName,
    cleanArtist,
    queries: [...new Set(queries.filter(Boolean))],
  };
}

async function fetchFromLRCLIB(title, artist, album, duration) {
  const { songName, cleanArtist, queries } = extractSearchCandidates(title, artist);
  if (!songName) return null;

  // 1. Try exact match
  try {
    const params = new URLSearchParams({
      track_name: cleanQueryString(songName),
    });
    if (cleanArtist) params.set('artist_name', cleanQueryString(cleanArtist));
    if (album) params.set('album_name', album);
    if (duration > 0) params.set('duration', String(Math.round(duration)));

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'VexM-Music-App/2.0' },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics && data.syncedLyrics.trim()) {
        return {
          raw: data.syncedLyrics,
          isSynced: true,
          source: 'lrclib',
        };
      }
      if (data.plainLyrics && data.plainLyrics.trim()) {
        return {
          raw: data.plainLyrics,
          isSynced: false,
          source: 'lrclib',
        };
      }
    }
  } catch {}

  // 2. Try candidate search queries
  for (const q of queries) {
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'VexM-Music-App/2.0' },
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const syncedMatch = list.find(item => item.syncedLyrics && item.syncedLyrics.trim());
          if (syncedMatch) {
            return {
              raw: syncedMatch.syncedLyrics,
              isSynced: true,
              source: 'lrclib',
            };
          }
          const plainMatch = list.find(item => item.plainLyrics && item.plainLyrics.trim()) || list[0];
          if (plainMatch?.plainLyrics) {
            return {
              raw: plainMatch.plainLyrics,
              isSynced: false,
              source: 'lrclib',
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

async function fetchFromJioSaavn(saavnId, title, artist) {
  // Direct saavnId lookup
  let rawId = saavnId;
  if (!rawId && title) {
    const { queries } = extractSearchCandidates(title, artist);
    try {
      const { search } = require('../services/jioSaavn');
      for (const q of queries) {
        const results = await search(q, 4);
        if (results && results.length > 0) {
          const match = results.find(t => t.hasLyrics) || results[0];
          if (match && match.hasLyrics) {
            rawId = match.saavnId || (match.id || '').replace(/^saavn_/, '');
            break;
          } else if (match && !rawId) {
            rawId = match.saavnId || (match.id || '').replace(/^saavn_/, '');
          }
        }
      }
    } catch {}
  }

  if (!rawId) return null;

  try {
    const url = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&lyrics_id=${encodeURIComponent(rawId)}&_format=json&_marker=0&ctx=web6dot0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.lyrics) {
        const text = data.lyrics
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .trim();
        if (text.length > 10) {
          return {
            raw: text,
            isSynced: false,
            source: 'jiosaavn',
          };
        }
      }
    }
  } catch {}

  return null;
}

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const title = (req.query.title || '').trim();
  const artist = (req.query.artist || '').trim();
  const album = (req.query.album || '').trim();
  const duration = Number(req.query.duration) || 0;
  const saavnId = req.query.saavnId || (id.startsWith('saavn_') ? id.slice(6) : null);

  const localTrack = getItem(id);
  const effTitle = title || localTrack?.title || '';
  const effArtist = artist || localTrack?.artist || '';
  const effDuration = duration || localTrack?.duration || 0;

  // 1. Check in-memory/disk cached lyrics by ID
  let lyrics = getLyrics(id);

  // 2. Check title+artist cache
  const cacheKey = `${effTitle.toLowerCase()}:::${effArtist.toLowerCase()}`;
  if (!lyrics && effTitle && onlineLyricsCache.has(cacheKey)) {
    lyrics = onlineLyricsCache.get(cacheKey);
  }

  // 3. Online Search: Priority 1 - LRCLIB (Millisecond Synced Lyrics)
  if (!lyrics && effTitle) {
    const lrcResult = await fetchFromLRCLIB(effTitle, effArtist, album, effDuration);
    if (lrcResult) {
      if (lrcResult.isSynced) {
        const lines = parseLRC(lrcResult.raw, effDuration);
        lyrics = {
          available: true,
          trackId: id,
          title: effTitle,
          artist: effArtist,
          type: 'synced',
          synced: true,
          source: lrcResult.source,
          language: '',
          lines,
          raw: lrcResult.raw,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const lines = synthesizeTimedLines(lrcResult.raw, effDuration);
        lyrics = {
          available: true,
          trackId: id,
          title: effTitle,
          artist: effArtist,
          type: 'synced',
          synced: true,
          source: lrcResult.source,
          language: '',
          lines,
          raw: lrcResult.raw,
          updatedAt: new Date().toISOString(),
        };
      }
      setLyrics(id, lrcResult.raw, 'synced', lrcResult.source, '', effDuration);
      onlineLyricsCache.set(cacheKey, lyrics);
    }
  }

  // 4. Online Search: Priority 2 - JioSaavn (Bollywood, Tamil, Indian Regional)
  if (!lyrics && (saavnId || effTitle)) {
    const saavnResult = await fetchFromJioSaavn(saavnId, effTitle, effArtist);
    if (saavnResult) {
      const lines = synthesizeTimedLines(saavnResult.raw, effDuration);
      lyrics = {
        available: true,
        trackId: id,
        title: effTitle,
        artist: effArtist,
        type: 'synced',
        synced: true,
        source: saavnResult.source,
        language: '',
        lines,
        raw: saavnResult.raw,
        updatedAt: new Date().toISOString(),
      };
      setLyrics(id, saavnResult.raw, 'synced', saavnResult.source, '', effDuration);
      onlineLyricsCache.set(cacheKey, lyrics);
    }
  }

  // 5. Telegram local audio inspection (fallback for self-hosted audio)
  if (!lyrics && /^\d{1,12}$/.test(id)) {
    try {
      const entry = await tg.getDoc(id);
      if (entry && entry.doc) {
        const headerChunk = await tg.readPartialAudioChunk(entry.doc, 512 * 1024);
        if (headerChunk && headerChunk.length > 0) {
          const extracted = await extractLyricsFromBuffer(
            headerChunk,
            entry.mime || entry.item?.mimeType,
            entry.item?.fileName
          );
          if (extracted && extracted.raw) {
            const isSynced = extracted.type === 'synced';
            const lines = isSynced
              ? parseLRC(extracted.raw, effDuration)
              : synthesizeTimedLines(extracted.raw, effDuration);
            lyrics = {
              available: true,
              trackId: id,
              title: effTitle,
              artist: effArtist,
              type: 'synced',
              synced: true,
              source: 'embedded',
              language: extracted.language || '',
              lines,
              raw: extracted.raw,
              updatedAt: new Date().toISOString(),
            };
            setLyrics(id, extracted.raw, 'synced', 'embedded', extracted.language, effDuration);
          }
        }
      }
    } catch (err) {
      console.warn(`Embedded lyrics extraction note for track #${id}:`, err.message);
    }
  }

  if (!lyrics) {
    return res.status(404).json({
      error: true,
      available: false,
      code: 'LYRICS_NOT_FOUND',
      message: 'No lyrics were found for this track.',
    });
  }

  const isSynced = lyrics.type === 'synced' || (lyrics.lines && lyrics.lines.length > 0);

  res.set('Cache-Control', 'public, max-age=7200').json({
    available: true,
    trackId: id,
    title: effTitle || lyrics.title || '',
    artist: effArtist || lyrics.artist || '',
    type: isSynced ? 'synced' : 'plain',
    synced: isSynced,
    source: lyrics.source || 'online',
    language: lyrics.language || '',
    lines: lyrics.lines || [],
    raw: lyrics.raw || '',
    updatedAt: lyrics.updatedAt || new Date().toISOString(),
  });
});

module.exports = router;
