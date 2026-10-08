const router = require('express').Router();
const { getDoc, downloadThumbnail } = require('../utils/telegramApi');
const { getArtwork } = require('../services/cacheService');

const ID = /^\d{1,12}$/;

// Fallback SVG generator for tracks with no thumbnail
function generatePlaceholderSvg(title = 'SPiDEYxFLASH') {
  const initial = (title[0] || 'S').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38231a"/>
        <stop offset="100%" stop-color="#18100d"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" rx="32" fill="url(#grad)"/>
    <circle cx="200" cy="200" r="90" fill="#ff7b72" fill-opacity="0.12" stroke="#ff7b72" stroke-width="2" stroke-opacity="0.3"/>
    <text x="200" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#ff7b72" text-anchor="middle">${initial}</text>
  </svg>`;
}

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID.test(id)) {
    return res.status(400).json({ error: 'Invalid track ID' });
  }

  // 1. Check custom artwork
  const custom = getArtwork(id);
  if (custom) {
    if (custom.startsWith('http://') || custom.startsWith('https://')) {
      return res.redirect(302, custom);
    }
    if (custom.startsWith('data:image/')) {
      const parts = custom.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const buffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
  }

  // 2. Check Telegram document thumbnail
  try {
    const entry = await getDoc(id);
    if (entry && entry.doc) {
      const thumbBuffer = await downloadThumbnail(entry.doc);
      if (thumbBuffer) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(thumbBuffer);
      }
    }
  } catch (err) {
    // Continue to placeholder
  }

  // 3. Fallback placeholder SVG
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(generatePlaceholderSvg(req.query.title || 'S'));
});

module.exports = router;
