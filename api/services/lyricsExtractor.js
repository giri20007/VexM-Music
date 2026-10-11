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
    .replace(/^\uFEFF/, '') // remove UTF-8 / UTF-16 BOM
    .trim();
}

// Binary scanner for ID3v2 USLT / SYLT / Vorbis / MP4 atoms
function scanBinaryForLyrics(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) return null;

  try {
    // 1. Search for USLT frame (ID3v2)
    let usltIndex = 0;
    while ((usltIndex = buffer.indexOf('USLT', usltIndex)) !== -1) {
      if (usltIndex + 10 < buffer.length) {
        let size = buffer.readUInt32BE(usltIndex + 4);
        const syncsafeSize =
          ((buffer[usltIndex + 4] & 0x7f) << 21) |
          ((buffer[usltIndex + 5] & 0x7f) << 14) |
          ((buffer[usltIndex + 6] & 0x7f) << 7) |
          (buffer[usltIndex + 7] & 0x7f);

        if (size > buffer.length - usltIndex || size === 0) {
          size = syncsafeSize;
        }

        if (size > 0) {
          const frameData = buffer.subarray(usltIndex + 10, Math.min(buffer.length, usltIndex + 10 + size));
          if (frameData.length > 4) {
            const encoding = frameData[0]; // 0: ISO-8859-1, 1: UTF-16 with BOM, 2: UTF-16BE, 3: UTF-8
            const lang = frameData.subarray(1, 4).toString('latin1');
            const rest = frameData.subarray(4);
            let descriptor = '';
            let lyricsText = '';

            if (encoding === 0) {
              // ISO-8859-1
              const nullIdx = rest.indexOf(0x00);
              if (nullIdx !== -1) {
                descriptor = rest.subarray(0, nullIdx).toString('latin1');
                lyricsText = rest.subarray(nullIdx + 1).toString('latin1');
              } else {
                lyricsText = rest.toString('latin1');
              }
            } else if (encoding === 3) {
              // UTF-8
              const nullIdx = rest.indexOf(0x00);
              if (nullIdx !== -1) {
                descriptor = rest.subarray(0, nullIdx).toString('utf8');
                lyricsText = rest.subarray(nullIdx + 1).toString('utf8');
              } else {
                lyricsText = rest.toString('utf8');
              }
            } else if (encoding === 1 || encoding === 2) {
              // UTF-16
              let nullIdx = -1;
              for (let i = 0; i < rest.length - 1; i += 2) {
                if (rest[i] === 0x00 && rest[i + 1] === 0x00) {
                  nullIdx = i;
                  break;
                }
              }
              if (nullIdx !== -1) {
                descriptor = rest.subarray(0, nullIdx).toString('utf16le');
                lyricsText = rest.subarray(nullIdx + 2).toString('utf16le');
              } else {
                lyricsText = rest.toString('utf16le');
              }
            }

            lyricsText = cleanUnicodeString(lyricsText);
            descriptor = cleanUnicodeString(descriptor);

            if (lyricsText && lyricsText.length > 3) {
              return { lyrics: lyricsText, language: descriptor || lang, descriptor };
            }
            if (descriptor && (descriptor.includes('\n') || descriptor.length > 25)) {
              return { lyrics: descriptor, language: lang, descriptor: '' };
            }
          }
        }
      }
      usltIndex += 4;
    }

    // 2. Search for Vorbis LYRICS= or UNSYNCEDLYRICS=
    const vorbisMarkers = [
      Buffer.from('LYRICS=', 'utf8'),
      Buffer.from('lyrics=', 'utf8'),
      Buffer.from('UNSYNCEDLYRICS=', 'utf8'),
      Buffer.from('unsyncedlyrics=', 'utf8'),
      Buffer.from('SYNCEDLYRICS=', 'utf8'),
      Buffer.from('syncedlyrics=', 'utf8'),
    ];

    for (const marker of vorbisMarkers) {
      const idx = buffer.indexOf(marker);
      if (idx !== -1 && idx + marker.length < buffer.length) {
        const textChunk = buffer.subarray(idx + marker.length, Math.min(buffer.length, idx + marker.length + 65536));
        let endIdx = textChunk.indexOf(0x00);
        if (endIdx === -1) endIdx = Math.min(textChunk.length, 8192);
        const text = cleanUnicodeString(textChunk.subarray(0, endIdx).toString('utf8'));
        if (text && text.length > 5) {
          return { lyrics: text, language: '', descriptor: '' };
        }
      }
    }

    // 3. Search for MP4 ©lyr atom
    const lyrMarker = Buffer.from([0xa9, 0x6c, 0x79, 0x72]); // ©lyr
    const lyrIdx = buffer.indexOf(lyrMarker);
    if (lyrIdx !== -1 && lyrIdx + 16 < buffer.length) {
      const textChunk = buffer.subarray(lyrIdx + 8, Math.min(buffer.length, lyrIdx + 8 + 32768));
      const dataIdx = textChunk.indexOf('data');
      if (dataIdx !== -1 && dataIdx + 12 < textChunk.length) {
        const text = cleanUnicodeString(textChunk.subarray(dataIdx + 12).toString('utf8'));
        if (text && text.length > 5) {
          return { lyrics: text, language: '', descriptor: '' };
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
  let language = '';

  // Method 1: Use music-metadata parser
  try {
    const metadata = await mm.parseBuffer(
      buffer,
      {
        mimeType: mimeType || undefined,
        size: buffer.length,
      },
      {
        skipCovers: true,
        skipPostHeaders: false,
      }
    );

    if (metadata) {
      // 1. Check common.lyrics
      if (metadata.common && metadata.common.lyrics) {
        if (Array.isArray(metadata.common.lyrics) && metadata.common.lyrics.length > 0) {
          for (const item of metadata.common.lyrics) {
            if (typeof item === 'string' && item.trim().length > 3) {
              rawLyrics = item;
              break;
            } else if (item && typeof item === 'object') {
              if (item.text && item.text.trim().length > 3) {
                rawLyrics = item.text;
                language = item.description || item.descriptor || '';
                break;
              }
              if (Array.isArray(item.syncText) && item.syncText.length > 0) {
                rawLyrics = item.syncText
                  .map(st => {
                    const mins = Math.floor(st.timestamp / 60000);
                    const secs = Math.floor((st.timestamp % 60000) / 1000);
                    const ms = Math.floor((st.timestamp % 1000) / 10);
                    return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}] ${st.text}`;
                  })
                  .join('\n');
                break;
              }
            }
          }
        } else if (typeof metadata.common.lyrics === 'string' && metadata.common.lyrics.trim().length > 3) {
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
              if (typeof tag.value === 'string' && tag.value.trim().length > 3) {
                rawLyrics = tag.value;
                break;
              } else if (tag.value && typeof tag.value === 'object') {
                if (tag.value.text && tag.value.text.trim().length > 3) {
                  rawLyrics = tag.value.text;
                  language = tag.value.description || tag.value.descriptor || tag.value.language || '';
                  break;
                }
                if (Array.isArray(tag.value.syncText) && tag.value.syncText.length > 0) {
                  rawLyrics = tag.value.syncText
                    .map(st => {
                      const ts = st.timestamp || 0;
                      const mins = Math.floor(ts / 60000);
                      const secs = Math.floor((ts % 60000) / 1000);
                      const ms = Math.floor((ts % 1000) / 10);
                      return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}] ${st.text}`;
                    })
                    .join('\n');
                  break;
                }
                // If text was not set, only take description if it actually contains multiline lyrics
                if (
                  tag.value.description &&
                  (tag.value.description.includes('\n') || tag.value.description.length > 25)
                ) {
                  rawLyrics = tag.value.description;
                  break;
                }
              }
            }
          }
          if (rawLyrics) break;
        }
      }
    }
  } catch (err) {
    // Partial header or unsupported container - fallback to binary scanner
  }

  // Method 2: Binary Scanner fallback
  if (!rawLyrics || typeof rawLyrics !== 'string' || !rawLyrics.trim()) {
    const scanned = scanBinaryForLyrics(buffer);
    if (scanned && scanned.lyrics) {
      rawLyrics = scanned.lyrics;
      if (!language && scanned.language) {
        language = scanned.language;
      }
    }
  }

  if (!rawLyrics || typeof rawLyrics !== 'string' || !rawLyrics.trim()) {
    return null;
  }

  const cleaned = cleanUnicodeString(rawLyrics);
  if (!cleaned || cleaned.length < 3) return null;

  // Verify that cleaned is not just a single language tag like "Tamil"
  if (!cleaned.includes('\n') && cleaned.length < 15 && /^(tamil|english|hindi|telugu|kannada|malayalam|lyrics|uslt)$/i.test(cleaned)) {
    return null;
  }

  const parsedLines = parseLRC(cleaned);
  const isSynced = parsedLines.length > 0;

  return {
    raw: cleaned,
    language: language || '',
    type: isSynced ? 'synced' : 'plain',
    lines: isSynced ? parsedLines : [],
    source: 'embedded',
  };
}

module.exports = {
  extractLyricsFromBuffer,
  cleanUnicodeString,
};

