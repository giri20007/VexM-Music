const router = require('express').Router();
const { getLyrics, setLyrics, isNegativeCached, setNegativeCached } = require('../services/lyricsService');
const { extractLyricsFromBuffer } = require('../services/lyricsExtractor');
const { getItem } = require('./library');
const tg = require('../utils/telegramApi');

const ID = /^\d{1,12}$/;

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID.test(id)) {
    return res.status(400).json({ error: true, code: 'INVALID_ID', message: 'Invalid track ID' });
  }

  const track = getItem(id);

  // 1. Priority 1 & 2: Check in-memory/disk cache
  let lyrics = getLyrics(id);

  // 2. If not cached, inspect audio file for embedded lyrics
  if (!lyrics && !isNegativeCached(id)) {
    try {
      const entry = await tg.getDoc(id);
      if (entry && entry.doc) {
        // Read only first 512 KB header of audio file (no full download)
        const headerChunk = await tg.readPartialAudioChunk(entry.doc, 512 * 1024);
        if (headerChunk && headerChunk.length > 0) {
          const extracted = await extractLyricsFromBuffer(
            headerChunk,
            entry.mime || entry.item?.mimeType,
            entry.item?.fileName
          );

          if (extracted && extracted.raw) {
            lyrics = setLyrics(
              id,
              extracted.raw,
              extracted.type,
              'embedded',
              extracted.language,
              track?.duration || 0
            );
          }
        }
      }
    } catch (err) {
      console.warn(`Embedded lyrics extraction note for track #${id}:`, err.message);
    }

    // If still no lyrics after inspecting header, mark in negative cache
    if (!lyrics) {
      setNegativeCached(id);
    }
  }

  if (!lyrics) {
    return res.status(404).json({
      error: true,
      available: false,
      code: 'LYRICS_NOT_FOUND',
      message: 'Lyrics unavailable for this track',
    });
  }

  const isSynced = lyrics.type === 'synced' || (lyrics.lines && lyrics.lines.length > 0);

  res.set('Cache-Control', 'public, max-age=3600').json({
    available: true,
    trackId: id,
    title: track?.title || '',
    artist: track?.artist || '',
    type: isSynced ? 'synced' : 'plain',
    synced: isSynced,
    source: lyrics.source || 'embedded',
    language: lyrics.language || '',
    lines: isSynced ? lyrics.lines : [],
    raw: lyrics.raw,
    updatedAt: lyrics.updatedAt,
  });
});

module.exports = router;
