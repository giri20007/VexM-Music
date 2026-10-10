const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { getDoc, downloadThumbnail, downloadPhotoByMsgId, trackToPhotoMap, CoverDetector } = require('../utils/telegramApi');
const { getArtwork } = require('../services/cacheService');

const memoryThumbCache = new Map(); // cacheKey -> Buffer
const DISK_CACHE_DIR = path.join(__dirname, '..', 'data', 'artwork_cache');

try {
  if (!fs.existsSync(DISK_CACHE_DIR)) {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
} catch { /* ignore */ }

const PALETTES = [
  { from: '#ff7b72', to: '#ffa198', bg: '#2e1512' },
  { from: '#f43f5e', to: '#fb7185', bg: '#2b1016' },
  { from: '#8b5cf6', to: '#c084fc', bg: '#1c102b' },
  { from: '#06b6d4', to: '#38bdf8', bg: '#0d222b' },
  { from: '#f59e0b', to: '#fbbf24', bg: '#2b200d' },
  { from: '#10b981', to: '#34d399', bg: '#0d2b1b' },
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
        <stop offset="0%" stop-color="${pal.from}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.9"/>
      </radialGradient>
    </defs>
    <rect width="500" height="500" rx="40" fill="url(#bg)"/>
    <circle cx="250" cy="250" r="160" fill="url(#glow)" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
    <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
    <circle cx="250" cy="250" r="80" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <circle cx="250" cy="250" r="48" fill="${pal.from}" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
    <circle cx="250" cy="250" r="14" fill="#0e0807"/>
    <text x="250" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
}

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const title = req.query.title || 'SPiDEYxFLASH';
  const artist = req.query.artist || '';
  const size = req.query.size || null;

  const cacheKey = `${id}_${size || 'orig'}`;

  // 1. Fast in-memory cache check
  if (memoryThumbCache.has(cacheKey)) {
    const buffer = memoryThumbCache.get(cacheKey);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.send(buffer);
  }

  // 2. Local disk cache check
  try {
    const diskPath = path.join(DISK_CACHE_DIR, `${cacheKey.replace(/[^\w-]/g, '_')}.jpg`);
    if (fs.existsSync(diskPath)) {
      const buf = fs.readFileSync(diskPath);
      memoryThumbCache.set(cacheKey, buf);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.send(buf);
    }
  } catch { /* ignore */ }

  // 3. Custom artwork override check
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

  // Helper to store buffer and send
  const sendAndCache = buffer => {
    if (buffer && buffer.length > 0) {
      memoryThumbCache.set(cacheKey, buffer);
      try {
        const diskPath = path.join(DISK_CACHE_DIR, `${cacheKey.replace(/[^\w-]/g, '_')}.jpg`);
        fs.writeFileSync(diskPath, buffer);
      } catch { /* ignore */ }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.send(buffer);
    }
    return false;
  };

  // 4. If direct Telegram Photo message cover (`msg_1234`)
  if (id.startsWith('msg_')) {
    const photoMsgId = id.replace('msg_', '');
    try {
      const buffer = await downloadPhotoByMsgId(photoMsgId);
      if (sendAndCache(buffer)) return;
    } catch { /* continue */ }
  }

  // 5. If album key (`album_xxx`)
  if (id.startsWith('album_')) {
    const normAlbum = id.replace('album_', '').toLowerCase();
    const candidate = CoverDetector?.albumArtworkMap?.get(normAlbum);
    if (candidate && candidate.photoMsgId) {
      try {
        const buffer = await downloadPhotoByMsgId(candidate.photoMsgId);
        if (sendAndCache(buffer)) return;
      } catch { /* continue */ }
    }
  }

  // 6. Look up track in CoverDetector or trackToPhotoMap
  const pairedPhotoId = trackToPhotoMap.get(id);
  if (pairedPhotoId) {
    try {
      const buffer = await downloadPhotoByMsgId(pairedPhotoId);
      if (sendAndCache(buffer)) return;
    } catch { /* continue */ }
  }

  // 7. Check Telegram audio document embedded thumbnail
  try {
    const entry = await getDoc(id);
    if (entry) {
      if (entry.doc) {
        const thumbBuffer = await downloadThumbnail(entry.doc);
        if (sendAndCache(thumbBuffer)) return;
      }
      if (entry.message) {
        const msgThumb = await downloadThumbnail(entry.message);
        if (sendAndCache(msgThumb)) return;
      }
    }
  } catch { /* continue */ }

  // 8. Fallback SVG
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(generatePlaceholderSvg(title, artist));
});

module.exports = router;

