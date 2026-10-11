const router = require('express').Router();
const { search, getTrending, getArtistInfo } = require('../services/jioSaavn');

/**
 * GET /api/saavn/artist-info?name=<name>
 */
router.get('/artist-info', async (req, res) => {
  const name = (req.query.name || req.query.q || '').trim();
  if (!name) {
    return res.status(400).json({ error: true, message: 'Artist name required' });
  }

  try {
    const info = await getArtistInfo(name);
    if (!info) {
      return res.status(404).json({ error: true, message: 'Artist not found' });
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: true, message: 'Failed to fetch artist details' });
  }
});

/**
 * GET /api/saavn/search?q=<query>&limit=<limit>
 */
router.get('/search', async (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  if (!query) {
    return res.json({ items: [], total: 0 });
  }

  try {
    const items = await search(query, limit);
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 min cache
    res.json({
      items,
      total: items.length,
      query,
    });
  } catch (err) {
    console.error('[Route /saavn/search error]:', err.message);
    res.status(500).json({ error: true, message: 'JioSaavn search failed' });
  }
});

/**
 * GET /api/saavn/trending?lang=<language>&limit=<limit>
 */
router.get('/trending', async (req, res) => {
  const language = (req.query.lang || req.query.language || 'tamil').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  try {
    const items = await getTrending(language, limit);
    res.setHeader('Cache-Control', 'public, max-age=1200'); // 20 min cache
    res.json({
      items,
      total: items.length,
      language,
    });
  } catch (err) {
    console.error('[Route /saavn/trending error]:', err.message);
    res.status(500).json({ error: true, message: 'JioSaavn trending fetch failed' });
  }
});

module.exports = router;
