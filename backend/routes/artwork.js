const router = require('express').Router();
const { getDoc, downloadThumbnail, downloadPhotoByMsgId } = require('../utils/telegramApi');
const { getArtwork } = require('../services/cacheService');

const ID = /^(msg_\d{1,12}|\d{1,12})$/;
const memoryThumbCache = new Map(); // id -> buffer

const PALETTES = [
  { from: '#f43f5e', to: '#fb7185', bg: '#2b1016' },
  { from: '#8b5cf6', to: '#c084fc', bg: '#1c102b' },
  { from: '#06b6d4', to: '#38bdf8', bg: '#0d222b' },
  { from: '#f59e0b', to: '#fbbf24', bg: '#2b200d' },
  { from: '#10b981', to: '#34d399', bg: '#0d2b1b' },
  { from: '#ff7b72', to: '#ffa198', bg: '#2e1512' },
];

function stringHash(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generatePlaceholderSvg(title = 'SPiDEYxFLASH', artist = '') {
  const hash = stringHash(`${title}_${artist}`);
  const pal = PALETTES[hash % PALETTES.length];
  const initial = (title[0] || '♪').toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.bg}"/>
        <stop offset="100%" stop-color="#0e0807"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${pal.from}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.9"/>
      </radialGradient>
    </defs>
    <rect width="500" height="500" rx="36" fill="url(#bg)"/>
    <circle cx="250" cy="250" r="160" fill="url(#glow)" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
    <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
    <circle cx="250" cy="250" r="80" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <circle cx="250" cy="250" r="45" fill="${pal.from}" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
    <circle cx="250" cy="250" r="12" fill="#0e0807"/>
    <text x="250" y="258" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
}

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const title = req.query.title || 'SPiDEYxFLASH';
  const artist = req.query.artist || '';

  if (!ID.test(id)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(generatePlaceholderSvg(title, artist));
  }

  // Check in-memory image buffer cache
  if (memoryThumbCache.has(id)) {
    const buffer = memoryThumbCache.get(id);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  }

  // 1. If this is a direct Telegram Photo message cover (`msg_1234`)
  if (id.startsWith('msg_')) {
    const photoMsgId = id.replace('msg_', '');
    try {
      const buffer = await downloadPhotoByMsgId(photoMsgId);
      if (buffer && buffer.length > 0) {
        memoryThumbCache.set(id, buffer);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    } catch (err) {
      // Continue to fallback
    }
  }

  // 2. Check custom artwork override
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

  // 3. Check Telegram audio document thumbnail or paired album photo
  try {
    const { trackToPhotoMap } = require('../utils/telegramApi');
    const entry = await getDoc(id);
    if (entry) {
      // 3a. Try embedded document thumb
      if (entry.doc) {
        const thumbBuffer = await downloadThumbnail(entry.doc);
        if (thumbBuffer && thumbBuffer.length > 0) {
          memoryThumbCache.set(id, thumbBuffer);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(thumbBuffer);
        }
      }

      // 3b. Try message object directly
      if (entry.message) {
        const msgThumbBuffer = await downloadThumbnail(entry.message);
        if (msgThumbBuffer && msgThumbBuffer.length > 0) {
          memoryThumbCache.set(id, msgThumbBuffer);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(msgThumbBuffer);
        }
      }

      // 3c. Try paired album photo message
      const pairedPhotoId = trackToPhotoMap.get(id);
      if (pairedPhotoId) {
        const photoBuf = await downloadPhotoByMsgId(pairedPhotoId);
        if (photoBuf && photoBuf.length > 0) {
          memoryThumbCache.set(id, photoBuf);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(photoBuf);
        }
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 4. Fallback high-res SVG
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(generatePlaceholderSvg(title, artist));
});

module.exports = router;
