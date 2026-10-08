const router = require('express').Router();
const { getLyrics } = require('../services/lyricsService');
const { getItem } = require('./library');

const ID = /^\d{1,12}$/;

router.get('/:id', (req, res) => {
  const { id } = req.params;
  if (!ID.test(id)) {
    return res.status(400).json({ error: true, code: 'INVALID_ID', message: 'Invalid track ID' });
  }

  const track = getItem(id);
  const lyrics = getLyrics(id);

  if (!lyrics) {
    return res.status(404).json({
      error: true,
      code: 'LYRICS_NOT_FOUND',
      message: 'Lyrics unavailable for this track',
    });
  }

  res.set('Cache-Control', 'public, max-age=3600').json({
    trackId: id,
    title: track?.title || '',
    artist: track?.artist || '',
    type: lyrics.type,
    raw: lyrics.raw,
    lines: lyrics.lines,
    updatedAt: lyrics.updatedAt,
  });
});

module.exports = router;
