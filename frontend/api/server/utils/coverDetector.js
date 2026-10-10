// Comprehensive Telegram Cover Artwork & Release Association Pipeline
// Implements Sections 100-121 of SPiDEYxFLASH Specification

const COVER_PATTERNS = /(?:cover|poster|artwork|album\s*art|uhd\s*cover|official\s*cover|front|folder)\b/i;
const CLEAN_TAGS = /\[.*?\]|\(.*?\b(?:24bit|16bit|48khz|44\.1khz|flac|mp3|kbps|lossless|digitaldl|ost|tamil|telugu|hindi|malayalam|kannada)\b.*?\]|#\w+/gi;

function normalizeString(str = '') {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReleaseCaption(caption = '', fileName = '') {
  const text = (caption || fileName || '').trim();
  if (!text) return null;

  const lines = text.split('\n').filter(Boolean);
  const titleLine = lines[0] || '';

  // Extract year: (2026), [2023], 2024
  let year = null;
  const yearMatch = titleLine.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = Number(yearMatch[1]);
  }

  // Clean title
  let clean = titleLine.replace(CLEAN_TAGS, '').trim();

  let album = '';
  let artist = '';

  const matchParen = clean.match(/^([^(]+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?/);
  if (matchParen) {
    album = (matchParen[1] || '').trim();
    artist = (matchParen[2] || '').trim();
  } else {
    const parts = clean.split(/[-–—:]/);
    album = (parts[0] || '').trim();
    artist = (parts[1] || '').trim();
  }

  // If filename looks like "Karuppu (2026) - Cover.png"
  if (!album && fileName) {
    const fnClean = fileName.replace(/\.[^.]+$/, '').replace(COVER_PATTERNS, '').trim();
    const fnParts = fnClean.split(/[-–—]/);
    album = (fnParts[0] || '').trim();
  }

  return {
    album: album || 'Unknown Album',
    artist: artist || 'Unknown Artist',
    year,
    raw: text,
  };
}

function isImageMessage(m) {
  if (!m || !m.media) return false;
  if (m.media.photo || m.media.className === 'MessageMediaPhoto') return true;
  const doc = m.media.document || (m.media.className === 'MessageMediaDocument' && m.media.document);
  if (doc) {
    const mime = doc.mimeType || '';
    const fn = doc.attributes?.find(a => a.className === 'DocumentAttributeFilename')?.fileName || '';
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(fn)) {
      return true;
    }
  }
  return false;
}

function isAudioMessage(m) {
  if (!m || !m.media) return false;
  const doc = m.media.document || (m.media.className === 'MessageMediaDocument' && m.media.document);
  if (!doc) return false;
  const attrs = doc.attributes || [];
  const au = attrs.find(a => a.className === 'DocumentAttributeAudio');
  const fn = attrs.find(a => a.className === 'DocumentAttributeFilename')?.fileName || '';
  const mime = doc.mimeType || '';
  return Boolean(au || mime.startsWith('audio/') || /\.(mp3|flac|m4a|aac|wav|ogg|opus|wma|alac|aiff|ape|dsf|dff)$/i.test(fn));
}

class CoverDetector {
  constructor() {
    this.coverCandidates = []; // Array of { msgId, media, album, artist, year, groupedId, fileName, caption, date }
    this.albumArtworkMap = new Map(); // normalizedAlbum -> { photoMsgId, album, artist, year, confidence, source }
    this.mediaGroupMap = new Map(); // groupedId -> photoMsgId
    this.trackAssociations = new Map(); // trackId -> artworkMetadata
  }

  clear() {
    this.coverCandidates = [];
    this.albumArtworkMap.clear();
    this.mediaGroupMap.clear();
    this.trackAssociations.clear();
  }

  // Ingest Telegram messages in ascending order (earliest to latest)
  registerMessage(msg) {
    if (!msg || !msg.id) return;

    if (isImageMessage(msg)) {
      const doc = msg.media?.document;
      const attrs = doc?.attributes || [];
      const fileName = attrs.find(a => a.className === 'DocumentAttributeFilename')?.fileName || '';
      const caption = msg.message || '';
      const parsed = parseReleaseCaption(caption, fileName);

      const candidate = {
        msgId: msg.id,
        media: msg.media,
        album: parsed?.album || '',
        artist: parsed?.artist || '',
        year: parsed?.year || null,
        groupedId: msg.groupedId ? String(msg.groupedId) : null,
        fileName,
        caption,
        date: msg.date,
        isExplicitCover: COVER_PATTERNS.test(fileName) || COVER_PATTERNS.test(caption),
      };

      this.coverCandidates.push(candidate);

      if (candidate.groupedId) {
        this.mediaGroupMap.set(candidate.groupedId, candidate.msgId);
      }

      if (candidate.album && candidate.album !== 'Unknown Album') {
        const key = normalizeString(candidate.album);
        this.albumArtworkMap.set(key, {
          photoMsgId: candidate.msgId,
          album: candidate.album,
          artist: candidate.artist,
          year: candidate.year,
          confidence: candidate.isExplicitCover ? 95 : 90,
          source: 'telegram_cover',
        });
      }
    }
  }

  // Associate a track with the most confident Telegram cover candidate
  determineArtwork(track, doc, message) {
    const trackId = String(track.id || message?.id);
    const trackAlbum = track.album || '';
    const trackArtist = track.artist || '';
    const trackTitle = track.title || '';
    const trackFileName = track.fileName || '';
    const groupedId = message?.groupedId ? String(message.groupedId) : null;
    const msgId = message?.id ? Number(message.id) : 0;
    const hasEmbeddedThumb = Boolean(
      (doc?.thumbs && doc.thumbs.length > 0) ||
      (message?.media?.thumbs && message?.media?.thumbs?.length > 0) ||
      (message?.media?.document?.thumbs && message?.media?.document?.thumbs?.length > 0)
    );

    let bestArtwork = null;

    // 1. Same Media Group (Confidence = 100)
    if (groupedId && this.mediaGroupMap.has(groupedId)) {
      const photoMsgId = this.mediaGroupMap.get(groupedId);
      bestArtwork = {
        source: 'telegram',
        confidence: 100,
        reason: 'Same Telegram media group',
        photoMsgId: String(photoMsgId),
        mediaGroupId: groupedId,
        artworkUrl: `/api/artwork/msg_${photoMsgId}`,
        albumArtworkId: `msg_${photoMsgId}`,
      };
    }

    // 2. Explicit Album Match from known cover candidates (Confidence = 95)
    if (!bestArtwork && trackAlbum && trackAlbum !== 'Unknown Album' && trackAlbum !== 'Single / Unknown Album') {
      const normAlbum = normalizeString(trackAlbum);
      if (normAlbum.length >= 3 && this.albumArtworkMap.has(normAlbum)) {
        const albInfo = this.albumArtworkMap.get(normAlbum);
        bestArtwork = {
          source: 'telegram',
          confidence: albInfo.confidence || 95,
          reason: `Matched album release: "${albInfo.album}"`,
          photoMsgId: String(albInfo.photoMsgId),
          mediaGroupId: groupedId,
          artworkUrl: `/api/artwork/msg_${albInfo.photoMsgId}`,
          albumArtworkId: `msg_${albInfo.photoMsgId}`,
        };
      }
    }

    // 3. Embedded Audio Artwork (Confidence = 90 - genuine embedded ID3 track artwork)
    if (!bestArtwork && hasEmbeddedThumb) {
      bestArtwork = {
        source: 'embedded',
        confidence: 90,
        reason: 'Embedded ID3 audio thumbnail',
        photoMsgId: null,
        mediaGroupId: null,
        artworkUrl: `/api/artwork/${trackId}`,
        albumArtworkId: `track_${trackId}`,
      };
    }

    // 4. Strict match from filename/caption of candidates (Confidence = 80)
    if (!bestArtwork && (trackTitle || trackFileName || trackAlbum)) {
      const normTitle = normalizeString(trackTitle);
      const normFn = normalizeString(trackFileName);
      const normAlb = normalizeString(trackAlbum);

      for (const cand of this.coverCandidates) {
        if (!cand.album || cand.album === 'Unknown Album') continue;
        const candNorm = normalizeString(cand.album);
        if (candNorm.length < 3) continue;

        if (
          (normAlb && normAlb.length >= 3 && (normAlb.includes(candNorm) || candNorm.includes(normAlb))) ||
          (normFn && normFn.length >= 4 && normFn.includes(candNorm)) ||
          (normTitle && normTitle.length >= 4 && normTitle.includes(candNorm))
        ) {
          bestArtwork = {
            source: 'telegram',
            confidence: 80,
            reason: `Cover candidate match: "${cand.album}"`,
            photoMsgId: String(cand.msgId),
            mediaGroupId: cand.groupedId,
            artworkUrl: `/api/artwork/msg_${cand.msgId}`,
            albumArtworkId: `msg_${cand.msgId}`,
          };
          break;
        }
      }
    }

    // 5. Preceding nearby Telegram cover photo ONLY if immediately adjacent (<= 2 msgs) with artist/title match
    if (!bestArtwork && msgId > 0 && this.coverCandidates.length > 0) {
      const immediate = this.coverCandidates
        .filter(c => c.msgId < msgId && msgId - c.msgId <= 2)
        .sort((a, b) => b.msgId - a.msgId);

      if (immediate.length > 0) {
        const cand = immediate[0];
        const candArtist = normalizeString(cand.artist);
        const trArtist = normalizeString(trackArtist);
        if (
          (candArtist && trArtist && candArtist.length >= 3 && (candArtist.includes(trArtist) || trArtist.includes(candArtist))) ||
          (cand.isExplicitCover && msgId - cand.msgId === 1)
        ) {
          bestArtwork = {
            source: 'telegram',
            confidence: 70,
            reason: `Adjacent release cover (Message #${cand.msgId})`,
            photoMsgId: String(cand.msgId),
            mediaGroupId: cand.groupedId,
            artworkUrl: `/api/artwork/msg_${cand.msgId}`,
            albumArtworkId: `msg_${cand.msgId}`,
          };
        }
      }
    }

    // 6. Fallback (Confidence = 0)
    if (!bestArtwork) {
      bestArtwork = {
        source: 'fallback',
        confidence: 0,
        reason: 'No matching Telegram cover photo or embedded thumbnail found',
        photoMsgId: null,
        mediaGroupId: null,
        artworkUrl: `/api/artwork/${trackId}`,
        albumArtworkId: `fallback_${trackId}`,
      };
    }

    this.trackAssociations.set(trackId, bestArtwork);
    return bestArtwork;
  }

  getArtworkForTrack(trackId) {
    return this.trackAssociations.get(String(trackId)) || null;
  }

  getArtworkDiagnostics(trackId) {
    const assoc = this.trackAssociations.get(String(trackId));
    if (!assoc) {
      return {
        trackId,
        selectedArtwork: 'fallback',
        confidence: 0,
        reason: 'Track not evaluated or unavailable',
        source: 'fallback',
        fallbacksChecked: ['Telegram cover', 'Media group', 'Embedded thumbnail'],
      };
    }
    return {
      trackId,
      selectedArtwork: assoc.source,
      confidence: assoc.confidence,
      reason: assoc.reason,
      telegramSource: assoc.photoMsgId ? `Message #${assoc.photoMsgId}` : 'None',
      mediaGroupId: assoc.mediaGroupId || 'None',
      artworkUrl: assoc.artworkUrl,
      fallbacksChecked: ['Telegram media group', 'Album release match', 'Nearby cover photo', 'Embedded ID3 thumbnail'],
    };
  }

  getArtworkHealth(items = []) {
    let telegramCount = 0;
    let embeddedCount = 0;
    let fallbackCount = 0;
    let missingCount = 0;

    items.forEach(t => {
      const art = this.trackAssociations.get(String(t.id));
      if (!art || art.source === 'fallback') {
        fallbackCount++;
      } else if (art.source === 'telegram') {
        telegramCount++;
      } else if (art.source === 'embedded') {
        embeddedCount++;
      } else {
        missingCount++;
      }
    });

    return {
      totalTracks: items.length,
      telegramArtwork: telegramCount,
      embeddedArtwork: embeddedCount,
      fallbackArtwork: fallbackCount,
      missingArtwork: missingCount,
      totalCoverCandidates: this.coverCandidates.length,
      totalDiscoveredAlbums: this.albumArtworkMap.size,
    };
  }
}

module.exports = {
  CoverDetector: new CoverDetector(),
  parseReleaseCaption,
  isImageMessage,
  isAudioMessage,
  normalizeString,
};
