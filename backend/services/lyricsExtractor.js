const mm = require('music-metadata');
const { parseLRC } = require('./lyricsService');

// Robust binary & tag extractor for embedded lyrics across audio formats:
// ID3v2 (USLT, SYLT, ULT, TXXX:LYRICS), FLAC/Vorbis (LYRICS, UNSYNCEDLYRICS), MP4/M4A (©lyr)

function cleanUnicodeString(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\0/g, '') // remove null bytes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Fallback binary scanner for ID3v2 USLT / SYLT / Vorbis / MP4 atoms
function scanBinaryForLyrics(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) return null;

  try {
    // 1. Search for USLT frame (ID3v2)
    const usltIndex = buffer.indexOf('USLT');
    if (usltIndex !== -1 && usltIndex + 10 < buffer.length) {
      // Read frame size (ID3v2.3: 4 bytes big-endian; ID3v2.4: 4 bytes syncsafe)
      const size = buffer.readUInt32BE(usltIndex + 4);
      const frameData = buffer.subarray(usltIndex + 10, Math.min(buffer.length, usltIndex + 10 + size));
      if (frameData.length > 4) {
        const encoding = frameData[0]; // 0: ISO-8859-1, 1: UTF-16 with BOM, 2: UTF-16BE, 3: UTF-8
        let text = '';
        if (encoding === 3) {
          text = frameData.subarray(4).toString('utf8');
        } else if (encoding === 1 || encoding === 2) {
          text = frameData.subarray(4).toString('utf16le');
        } else {
          text = frameData.subarray(4).toString('latin1');
        }
        text = cleanUnicodeString(text);
        if (text && text.length > 5) {
          return text;
        }
      }
    }

    // 2. Search for Vorbis LYRICS= or UNSYNCEDLYRICS=
    const vorbisMarkers = [
      Buffer.from('LYRICS=', 'utf8'),
      Buffer.from('lyrics=', 'utf8'),
      Buffer.from('UNSYNCEDLYRICS=', 'utf8'),
      Buffer.from('unsyncedlyrics=', 'utf8'),
    ];

    for (const marker of vorbisMarkers) {
      const idx = buffer.indexOf(marker);
      if (idx !== -1 && idx + marker.length < buffer.length) {
        // Read until next control character or standard vorbis comment separator
        const textChunk = buffer.subarray(idx + marker.length, Math.min(buffer.length, idx + marker.length + 32768));
        // Find end of comment (usually null byte or end of metadata block)
        let endIdx = textChunk.indexOf(0x00);
        if (endIdx === -1) endIdx = Math.min(textChunk.length, 4096);
        const text = cleanUnicodeString(textChunk.subarray(0, endIdx).toString('utf8'));
        if (text && text.length > 5) {
          return text;
        }
      }
    }

    // 3. Search for MP4 ©lyr atom
    const lyrMarker = Buffer.from([0xa9, 0x6c, 0x79, 0x72]); // ©lyr
    const lyrIdx = buffer.indexOf(lyrMarker);
    if (lyrIdx !== -1 && lyrIdx + 16 < buffer.length) {
      const textChunk = buffer.subarray(lyrIdx + 8, Math.min(buffer.length, lyrIdx + 8 + 16384));
      // In MP4, data atom precedes actual text: 'data' (4 bytes) + type (4 bytes) + locale (4 bytes)
      const dataIdx = textChunk.indexOf('data');
      if (dataIdx !== -1 && dataIdx + 12 < textChunk.length) {
        const text = cleanUnicodeString(textChunk.subarray(dataIdx + 12).toString('utf8'));
        if (text && text.length > 5) {
          return text;
        }
      }
    }
  } catch (err) {
    console.warn('scanBinaryForLyrics error:', err.message);
  }

  return null;
}

async function extractLyricsFromBuffer(buffer, mimeType = '', fileName = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  let rawLyrics = null;

  // Method 1: Use music-metadata parser
  try {
    const metadata = await mm.parseBuffer(buffer, {
      mimeType: mimeType || undefined,
      size: buffer.length,
    }, {
      skipCovers: true,
      skipPostHeaders: false,
    });

    if (metadata) {
      // 1. Check common.lyrics
      if (metadata.common && metadata.common.lyrics) {
        if (Array.isArray(metadata.common.lyrics) && metadata.common.lyrics.length > 0) {
          const item = metadata.common.lyrics[0];
          rawLyrics = typeof item === 'string' ? item : item.text || item.syncText || '';
        } else if (typeof metadata.common.lyrics === 'string') {
          rawLyrics = metadata.common.lyrics;
        }
      }

      // 2. Check native tags
      if (!rawLyrics && metadata.native) {
        for (const tagList of Object.values(metadata.native)) {
          if (!Array.isArray(tagList)) continue;
          for (const tag of tagList) {
            const id = (tag.id || '').toUpperCase();
            if (
              id === 'USLT' ||
              id === 'SYLT' ||
              id === 'ULT' ||
              id === '©LYR' ||
              id === 'LYRICS' ||
              id === 'UNSYNCEDLYRICS' ||
              id === 'UNSYNCED LYRICS'
            ) {
              if (typeof tag.value === 'string') {
                rawLyrics = tag.value;
                break;
              } else if (tag.value && typeof tag.value === 'object') {
                rawLyrics = tag.value.text || tag.value.syncText || tag.value.description || '';
                if (rawLyrics) break;
              }
            }
          }
          if (rawLyrics) break;
        }
      }
    }
  } catch (err) {
    // If partial header was too short for full stream parsing, proceed to binary scanner
  }

  // Method 2: Binary Scanner fallback
  if (!rawLyrics || typeof rawLyrics !== 'string' || !rawLyrics.trim()) {
    rawLyrics = scanBinaryForLyrics(buffer);
  }

  if (!rawLyrics || typeof rawLyrics !== 'string' || !rawLyrics.trim()) {
    return null;
  }

  const cleaned = cleanUnicodeString(rawLyrics);
  if (!cleaned || cleaned.length < 3) return null;

  const parsedLines = parseLRC(cleaned);
  const isSynced = parsedLines.length > 0;

  return {
    raw: cleaned,
    type: isSynced ? 'synced' : 'plain',
    lines: isSynced ? parsedLines : [],
    source: 'embedded',
  };
}

module.exports = {
  extractLyricsFromBuffer,
  cleanUnicodeString,
};
