const router = require('express').Router();
const { getItem } = require('./library');
const { probe } = require('../utils/ffmpegUtils');

const ID = /^\d{1,12}$/;

router.get('/:id', async (req, res, next) => {
  try {
    if (!ID.test(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    const item = getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Track not found' });
    // Telegram metadata first; ffprobe only on request, only if duration is missing
    if (req.query.probe === '1' && !item.duration && !item.probed) {
      item.probed = true;
      const m = await probe(`http://127.0.0.1:${process.env.PORT || 10000}/api/stream/${item.id}`);
      if (m) Object.assign(item, { duration: m.duration, title: m.title || item.title, artist: m.artist || item.artist, album: m.album || item.album });
    }
    res.set('Cache-Control', 'private, max-age=3600').json(item);
  } catch (e) { next(e); }
});

module.exports = router;
