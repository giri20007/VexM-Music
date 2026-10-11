import { BASE_URL } from './api';

// High-performance dynamic SVG artwork & artist avatar generator
// Generates beautiful gradients, vinyl discs, and typography so images NEVER break

const PALETTES = [
  { from: '#f43f5e', to: '#fb7185', bg: '#2b1016', accent: '#fda4af' }, // Rose / Coral
  { from: '#8b5cf6', to: '#c084fc', bg: '#1c102b', accent: '#e9d5ff' }, // Violet
  { from: '#06b6d4', to: '#38bdf8', bg: '#0d222b', accent: '#bae6fd' }, // Cyan
  { from: '#f59e0b', to: '#fbbf24', bg: '#2b200d', accent: '#fef3c7' }, // Amber
  { from: '#10b981', to: '#34d399', bg: '#0d2b1b', accent: '#d1fae5' }, // Emerald
  { from: '#ec4899', to: '#f472b6', bg: '#2b0d1e', accent: '#fbcfe8' }, // Pink
  { from: '#6366f1', to: '#818cf8', bg: '#13152b', accent: '#e0e7ff' }, // Indigo
  { from: '#ff7b72', to: '#ffa198', bg: '#2e1512', accent: '#ffdcd7' }, // Spidey Coral
];

export function getArtworkSrc(track, size = null) {
  if (!track) return '';
  const sizeParam = size ? `?size=${size}` : '';
  const thumb = track.thumbnail || track.artwork?.artworkUrl;
  if (thumb) {
    if (thumb.startsWith('http://') || thumb.startsWith('https://') || thumb.startsWith('data:')) {
      return thumb;
    }
    if (thumb.startsWith('/')) {
      const sep = thumb.includes('?') ? '&' : '?';
      return `${BASE_URL}${thumb}${size ? `${sep}size=${size}` : ''}`;
    }
    return `${BASE_URL}/api/artwork/${track.id}${sizeParam}`;
  }
  const ytId = track.videoId || (track.id && String(track.id).startsWith('yt_') ? String(track.id).replace('yt_', '') : null);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }
  if (track.id && !String(track.id).startsWith('yt_')) {
    return `${BASE_URL}/api/artwork/${track.id}${sizeParam}`;
  }
  return getTrackArtworkUrl(track, size || 400);
}

export function getArtistArtworkSrc(artist, size = null) {
  if (!artist) return '';
  const name = typeof artist === 'string' ? artist : (artist.name || 'Unknown Artist');
  const thumb = typeof artist === 'object' ? artist.thumbnail : null;

  if (thumb) {
    if (thumb.startsWith('http://') || thumb.startsWith('https://') || thumb.startsWith('data:')) {
      return thumb;
    }
    if (thumb.startsWith('/')) {
      const sep = thumb.includes('?') ? '&' : '?';
      return `${BASE_URL}${thumb}${size ? `${sep}size=${size}` : ''}`;
    }
  }

  if (typeof artist === 'object' && artist.tracks?.length > 0) {
    const trackWithArt = artist.tracks.find(t => t.thumbnail || t.id);
    if (trackWithArt) {
      return getArtworkSrc(trackWithArt, size || 400);
    }
  }

  return getArtistAvatarUrl(name, size || 300);
}

function stringHash(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTrackArtworkUrl(track, size = 400) {
  if (track?.thumbnail && track.thumbnail.startsWith('http')) {
    return track.thumbnail;
  }

  const title = track?.title || 'Track';
  const artist = track?.artist || 'Unknown';
  const hash = stringHash(`${title}_${artist}_${track?.id || ''}`);
  const pal = PALETTES[hash % PALETTES.length];
  const initial = (title[0] || '♪').toUpperCase();
  const subInitial = (artist[0] || '').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.bg}"/>
        <stop offset="100%" stop-color="#0e0807"/>
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.from}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${pal.to}" stop-opacity="0.4"/>
      </linearGradient>
      <radialGradient id="discShine" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${pal.accent}" stop-opacity="0.25"/>
        <stop offset="70%" stop-color="#000000" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.95"/>
      </radialGradient>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="400" rx="32" fill="url(#bgGrad)"/>
    
    <!-- Ambient Glow Orbs -->
    <circle cx="280" cy="120" r="140" fill="${pal.from}" opacity="0.2" filter="blur(40px)"/>
    <circle cx="120" cy="290" r="120" fill="${pal.to}" opacity="0.15" filter="blur(30px)"/>
    
    <!-- Vinyl Disc Graphic -->
    <circle cx="200" cy="200" r="130" fill="url(#discShine)" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
    <circle cx="200" cy="200" r="105" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
    <circle cx="200" cy="200" r="80" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
    <circle cx="200" cy="200" r="55" fill="url(#glowGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
    <circle cx="200" cy="200" r="14" fill="#0e0807" stroke="${pal.accent}" stroke-width="2"/>
    
    <!-- Waveform Accent lines -->
    <path d="M 60 330 Q 130 300 200 330 T 340 330" fill="none" stroke="${pal.from}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <path d="M 80 345 Q 140 325 200 345 T 320 345" fill="none" stroke="${pal.to}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    
    <!-- Center Initial -->
    <text x="200" y="208" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getArtistAvatarUrl(artistName = 'Unknown', size = 300) {
  const hash = stringHash(artistName);
  const pal = PALETTES[hash % PALETTES.length];
  const initials = artistName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'AR';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="artGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.from}"/>
        <stop offset="100%" stop-color="${pal.to}"/>
      </linearGradient>
      <radialGradient id="stageLight" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.7"/>
      </radialGradient>
    </defs>
    
    <!-- Background Circle -->
    <rect width="300" height="300" fill="#130c0a"/>
    <circle cx="150" cy="150" r="140" fill="url(#artGrad)"/>
    <circle cx="150" cy="150" r="140" fill="url(#stageLight)"/>
    
    <!-- Outer Ring -->
    <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
    
    <!-- Artist Silhouette / Initials -->
    <circle cx="150" cy="120" r="45" fill="rgba(255,255,255,0.25)"/>
    <path d="M 65 245 C 65 190, 235 190, 235 245" fill="rgba(255,255,255,0.25)"/>
    <text x="150" y="132" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
