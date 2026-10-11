const router = require('express').Router();
const { search, getTrending, getSuggestions } = require('../services/youtubeMusic');

router.get('/search', async (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 50);

  if (!query) {
    return res.json({ items: [], total: 0 });
  }

  try {
    const items = await search(query, limit);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min client cache
    res.json({
      items,
      total: items.length,
      query,
    });
  } catch (err) {
    console.error('[Route /yt/search error]:', err.message);
    res.status(500).json({ error: true, message: 'Search failed' });
  }
});

router.get('/trending', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  try {
    const items = await getTrending(limit);
    res.setHeader('Cache-Control', 'public, max-age=900'); // 15 min client cache
    res.json({
      items,
      total: items.length,
    });
  } catch (err) {
    console.error('[Route /yt/trending error]:', err.message);
    res.status(500).json({ error: true, message: 'Trending fetch failed' });
  }
});

router.get('/suggest', async (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  if (!query) return res.json({ suggestions: [] });

  try {
    const suggestions = await getSuggestions(query);
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

module.exports = router;
