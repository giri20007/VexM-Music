const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');
const fs = require('fs');
const path = require('path');
const { getOverride, getArtwork } = require('../services/cacheService');

const err = (message, status, extra = {}) => Object.assign(new Error(message), { status }, extra);
const SESSION_FILE = process.env.SESSION_FILE_PATH || path.join(__dirname, '..', 'data', 'spx-session.txt');
const CHUNK = 512 * 1024; // Telegram-friendly aligned request size

let clientP = null;
let chatP = null;
const docs = new Map(); // id -> { doc, mime, size, item, photoMedia }
const photoCache = new Map(); // msgId -> photoBuffer / location
const trackToPhotoMap = new Map(); // trackId -> photoMsgId

let connectionStatus = {
  connected: false,
  connecting: false,
  lastConnected: null,
  lastError: null,
  channelTitle: null,
  discoveredCount: 0,
};

const wrap = e => {
  if (e.status) return e;
  const m = String(e.errorMessage || e.message || '');
  if (/FLOOD/.test(m)) return err('Telegram rate limit, retry shortly', 429, { retryAfter: e.seconds });
  if (/MESSAGE_ID_INVALID|MEDIA_EMPTY/.test(m)) return err('Audio file unavailable', 404);
  return err('Telegram connection unavailable', 502);
};

function formatQuality(mimeType = '', fileName = '', audioAttr = null, fileSize = 0) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  let format = 'MP3';
  let bitrate = 320;
  let sampleRate = 44100;
  let bitDepth = 16;
  let isLossless = false;

  const durationSec = audioAttr?.duration || 0;
  let calculatedBitrate = 0;
  if (fileSize > 0 && durationSec > 0) {
    calculatedBitrate = Math.round((fileSize * 8) / (durationSec * 1000));
  }

  if (ext === 'flac' || mimeType.includes('flac')) {
    format = 'FLAC';
    isLossless = true;
    if (calculatedBitrate > 1100 || fileSize > 30 * 1024 * 1024) {
      sampleRate = 48000;
      bitDepth = 24;
      bitrate = calculatedBitrate || 1450;
    } else {
      sampleRate = 44100;
      bitDepth = 16;
      bitrate = calculatedBitrate || 850;
    }
  } else if (ext === 'wav' || mimeType.includes('wav')) {
    format = 'WAV';
    isLossless = true;
    sampleRate = 44100;
    bitDepth = 16;
    bitrate = calculatedBitrate || 1411;
  } else if (ext === 'm4a' || ext === 'aac' || mimeType.includes('aac') || mimeType.includes('mp4')) {
    format = 'AAC';
    isLossless = false;
    sampleRate = 44100;
    bitDepth = 16;
    if (calculatedBitrate) {
      bitrate = calculatedBitrate >= 280 ? 320 : calculatedBitrate >= 220 ? 256 : calculatedBitrate >= 160 ? 192 : 128;
    } else {
      bitrate = 256;
    }
  } else if (ext === 'opus' || ext === 'ogg' || mimeType.includes('opus') || mimeType.includes('ogg')) {
    format = 'OPUS';
    isLossless = false;
    sampleRate = 48000;
    bitDepth = 16;
    bitrate = calculatedBitrate ? Math.min(320, calculatedBitrate) : 160;
  } else {
    format = 'MP3';
    isLossless = false;
    sampleRate = 44100;
    bitDepth = 16;
    if (calculatedBitrate) {
      bitrate = calculatedBitrate >= 280 ? 320 : calculatedBitrate >= 220 ? 256 : calculatedBitrate >= 160 ? 192 : 128;
    } else {
      bitrate = 320;
    }
  }

  return { format, bitrate, sampleRate, bitDepth, isLossless, calculatedBitrate };
}

async function getClient() {
  if (clientP) return clientP;
  const { TELEGRAM_API_ID: id, TELEGRAM_API_HASH: hash, TELEGRAM_BOT_TOKEN: token } = process.env;
  if (!id || !hash || !token) {
    connectionStatus.lastError = 'Telegram environment credentials missing (TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN)';
    throw err('Telegram is not configured', 503);
  }

  connectionStatus.connecting = true;
  clientP = (async () => {
    let saved = '';
    try {
      if (fs.existsSync(SESSION_FILE)) {
        saved = fs.readFileSync(SESSION_FILE, 'utf8');
      }
    } catch { /* first start */ }

    const c = new TelegramClient(new StringSession(saved), +id, hash, {
      connectionRetries: 5,
      autoReconnect: true,
    });
    c.setLogLevel('error');
    await c.start({ botAuthToken: token });

    // Save session string safely
    try {
      const sessDir = path.dirname(SESSION_FILE);
      if (!fs.existsSync(sessDir)) fs.mkdirSync(sessDir, { recursive: true });
      fs.writeFileSync(SESSION_FILE, c.session.save(), 'utf8');
    } catch (saveErr) {
      console.warn('Could not persist session file:', saveErr.message);
    }

    connectionStatus.connected = true;
    connectionStatus.connecting = false;
    connectionStatus.lastConnected = new Date().toISOString();
    connectionStatus.lastError = null;

    // Attach real-time update listener for new channel uploads
    try {
      c.addEventHandler(async update => {
        try {
          const msg = update?.message;
          if (msg) {
            const item = toItem(msg);
            if (item) {
              const { updateItemInMemory } = require('../routes/library');
              updateItemInMemory(item.id, item);
            }
          }
        } catch { /* ignore */ }
      });
    } catch (e) {
      console.warn('Real-time handler note:', e.message);
    }

    return c;
  })().catch(e => {
    console.error('Telegram login failed:', e.errorMessage || e.message);
    connectionStatus.connected = false;
    connectionStatus.connecting = false;
    connectionStatus.lastError = e.errorMessage || e.message;
    clientP = null;
    throw err('Telegram connection unavailable', 502);
  });

  return clientP;
}

function getChat() {
  if (!chatP) {
    chatP = getClient()
      .then(async c => {
        const raw = process.env.TELEGRAM_CHAT_ID || '';
        if (!raw) {
          throw err('TELEGRAM_CHAT_ID environment variable is missing', 503);
        }
        const entity = await c.getInputEntity(/^-?\d+$/.test(raw) ? Number(raw) : raw);
        try {
          const fullChat = await c.getEntity(entity);
          connectionStatus.channelTitle = fullChat.title || fullChat.username || raw;
        } catch {
          connectionStatus.channelTitle = raw;
        }
        return entity;
      })
      .catch(e => {
        chatP = null;
        if (e.status === 503) throw e;
        console.error('Channel lookup failed:', e.errorMessage || e.message);
        connectionStatus.lastError = e.errorMessage || e.message;
        throw err('Channel not found. Check TELEGRAM_CHAT_ID', 502);
      });
  }
  return chatP;
}

// Clean and extract album metadata from photo captions
function parseAlbumCaption(caption = '') {
  if (!caption) return null;
  // Examples:
  // "Karuppu (2026) (Sai Abhyankkar) (Think Music) [24bit-48kHz]"
  // "Leo (2023) - Anirudh Ravichander"
  const lines = caption.split('\n').filter(Boolean);
  const firstLine = lines[0] || '';
  const clean = firstLine.replace(/\[.*?\]/g, '').replace(/#\w+/g, '').trim();

  let album = '';
  let artist = '';

  const matchParen = clean.match(/^([^(]+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?/);
  if (matchParen) {
    album = (matchParen[1] || '').trim();
    artist = (matchParen[2] || '').trim();
  } else {
    const parts = clean.split(/[-–]/);
    album = (parts[0] || '').trim();
    artist = (parts[1] || '').trim();
  }

  return {
    album: album || 'Unknown Album',
    artist: artist || 'Unknown Artist',
  };
}

const { CoverDetector, isImageMessage, isAudioMessage } = require('./coverDetector');

function toItem(m, currentCover = null) {
  const doc = m.media?.document;
  if (!doc) return null;
  const attrs = doc.attributes || [];
  const au = attrs.find(a => a.className === 'DocumentAttributeAudio' || a.duration !== undefined);
  const fileName = attrs.find(a => a.className === 'DocumentAttributeFilename')?.fileName || '';
  const mime = doc.mimeType || '';

  // Only consider audio files (ignore images/videos/generic docs)
  if (!isAudioMessage(m)) {
    return null;
  }

  const id = String(m.id);
  const fileSize = Number(doc.size) || 0;
  const rawDuration = Number(au?.duration) || 0;
  const quality = formatQuality(mime, fileName, au, fileSize);

  // Derive album and artist
  let artist = au?.performer || '';
  let album = '';
  let title = au?.title || '';

  if (!title && fileName) {
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    const parts = nameWithoutExt.split(/[-–]/);
    if (parts.length > 1) {
      if (!artist) artist = parts[0].replace(/^\d+\s*/, '').trim();
      title = parts[1].trim();
    } else {
      title = nameWithoutExt.replace(/^\d+\s*[-–.]?\s*/, '').trim();
    }
  }

  if (!artist && currentCover?.artist && currentCover.artist !== 'Unknown Artist') {
    artist = currentCover.artist;
  }

  if (!album && currentCover?.album && currentCover.album !== 'Unknown Album') {
    album = currentCover.album;
  }

  const rawItem = {
    id,
    messageId: m.id,
    fileId: id,
    title: title || 'Untitled Track',
    artist: artist || 'Unknown Artist',
    album: album || 'Single / Unknown Album',
    albumArtist: artist || 'Unknown Artist',
    fileName,
    duration: rawDuration,
    size: fileSize,
    mimeType: mime || 'audio/mpeg',
    format: quality.format,
    bitrate: quality.bitrate,
    sampleRate: quality.sampleRate,
    bitDepth: quality.bitDepth,
    isLossless: quality.isLossless,
    date: m.date,
    hasTelegramDoc: true,
  };

  // Determine most confident Telegram artwork
  const artworkMeta = CoverDetector.determineArtwork(rawItem, doc, m);
  rawItem.artwork = artworkMeta;
  rawItem.thumbnail = artworkMeta.artworkUrl || `/api/artwork/${id}`;

  if (artworkMeta.photoMsgId) {
    trackToPhotoMap.set(id, artworkMeta.photoMsgId);
  }

  // Merge admin overrides if any
  const override = getOverride(id);
  const customArt = getArtwork(id);
  const item = {
    ...rawItem,
    ...(override || {}),
    thumbnail: customArt || (override?.artworkUrl || rawItem.thumbnail),
  };

  docs.set(id, { doc, mime: item.mimeType, size: item.size, item, message: m });
  return item;
}

// Fetch audio tracks and pair with album cover images
async function listAudio(minId = 0, limit = 1000) {
  try {
    const c = await getClient();
    const chat = await getChat();
    const items = [];
    let maxId = minId;

    // Reset detector for full scan
    if (minId === 0) {
      CoverDetector.clear();
    }

    // Strategy 1: Use getMessages with limit (fastest and returns newest 100-300 messages)
    try {
      const recentMessages = await c.getMessages(chat, { limit: 300 });
      if (recentMessages && recentMessages.length > 0) {
        const sorted = [...recentMessages].sort((a, b) => a.id - b.id);

        // Pass 1: Ingest and register all cover candidates
        for (const m of sorted) {
          if (!m || !m.id) continue;
          if (m.id > maxId) maxId = m.id;
          CoverDetector.registerMessage(m);
          if (isImageMessage(m)) {
            photoCache.set(`msg_${m.id}`, m.media || m);
          }
        }

        // Pass 2: Ingest audio tracks with high-confidence artwork matching
        for (const m of sorted) {
          if (!m || !m.id) continue;
          const it = toItem(m);
          if (it) items.push(it);
        }

        if (items.length > 0) {
          connectionStatus.discoveredCount = items.length;
          return { items, maxId };
        }
      }
    } catch (e1) {
      console.warn('getMessages limit strategy note:', e1.message);
    }

    // Strategy 2: iterMessages
    try {
      const fetched = [];
      for await (const m of c.iterMessages(chat, { limit, minId })) {
        if (!m || !m.id) continue;
        if (m.id > maxId) maxId = m.id;
        fetched.push(m);
      }
      const sorted = [...fetched].sort((a, b) => a.id - b.id);
      for (const m of sorted) {
        CoverDetector.registerMessage(m);
        if (isImageMessage(m)) {
          photoCache.set(`msg_${m.id}`, m.media || m);
        }
      }
      for (const m of sorted) {
        const it = toItem(m);
        if (it) items.push(it);
      }
      connectionStatus.discoveredCount = items.length;
      return { items, maxId };
    } catch (e2) {
      if (!/BOT_METHOD_INVALID/.test(String(e2.errorMessage || e2.message))) throw e2;
    }

    // Strategy 3: Bot ID scan with high tolerance (checks up to 3,000 message IDs)
    items.length = 0;
    maxId = minId;
    let start = Math.max(1, minId);
    let emptyBatches = 0;
    const allMsgs = [];

    while (emptyBatches < 30 && start < 25000) {
      const ids = Array.from({ length: 100 }, (_, i) => start + i);
      const msgs = await c.getMessages(chat, { ids });
      let foundAny = false;

      for (const m of msgs) {
        if (!m || !m.id) continue;
        foundAny = true;
        if (m.id > maxId) maxId = m.id;
        allMsgs.push(m);
      }

      emptyBatches = foundAny ? 0 : emptyBatches + 1;
      start += 100;
    }

    const sorted = [...allMsgs].sort((a, b) => a.id - b.id);
    for (const m of sorted) {
      CoverDetector.registerMessage(m);
      if (isImageMessage(m)) {
        photoCache.set(`msg_${m.id}`, m.media || m);
      }
    }
    for (const m of sorted) {
      const it = toItem(m);
      if (it) items.push(it);
    }

    connectionStatus.discoveredCount = items.length;
    return { items, maxId };
  } catch (e) {
    console.error('Library scan failed:', e.errorMessage || e.message);
    connectionStatus.lastError = e.errorMessage || e.message;
    throw wrap(e);
  }
}

// Rescan artwork relationships without re-downloading audio files
async function rescanArtwork(existingItems = []) {
  try {
    const c = await getClient();
    const chat = await getChat();
    CoverDetector.clear();

    const recent = await c.getMessages(chat, { limit: 300 });
    const sorted = [...(recent || [])].sort((a, b) => a.id - b.id);

    for (const m of sorted) {
      CoverDetector.registerMessage(m);
      if (isImageMessage(m)) {
        photoCache.set(`msg_${m.id}`, m.media || m);
      }
    }

    let updatedCount = 0;
    const updatedItems = existingItems.map(item => {
      const entry = docs.get(String(item.id));
      const newArtwork = CoverDetector.determineArtwork(item, entry?.doc, entry?.message);
      if (newArtwork.photoMsgId) {
        trackToPhotoMap.set(String(item.id), newArtwork.photoMsgId);
      }
      if (newArtwork.source !== item.artwork?.source || newArtwork.artworkUrl !== item.thumbnail) {
        updatedCount++;
      }
      return {
        ...item,
        artwork: newArtwork,
        thumbnail: newArtwork.artworkUrl || item.thumbnail,
      };
    });

    return {
      success: true,
      updatedCount,
      health: CoverDetector.getArtworkHealth(updatedItems),
      items: updatedItems,
    };
  } catch (e) {
    console.error('Rescan artwork failed:', e.message);
    throw wrap(e);
  }
}

async function getDoc(id, fresh = false) {
  if (!fresh && docs.has(id)) return docs.get(id);
  try {
    const c = await getClient();
    const chat = await getChat();
    const [m] = await c.getMessages(chat, { ids: [Number(id)] });
    if (!m || !toItem(m)) throw err('Audio file unavailable', 404);
    return docs.get(id);
  } catch (e) {
    throw wrap(e);
  }
}

// Yields exactly bytes [start..end] without buffering the entire file
async function* streamRange(doc, start, end, docRefreshFn = null) {
  const c = await getClient();
  const aStart = start - (start % CHUNK);
  let pos = aStart;
  let currentDoc = doc;

  const createLocation = d => new Api.InputDocumentFileLocation({
    id: d.id,
    accessHash: d.accessHash,
    fileReference: d.fileReference,
    thumbSize: '',
  });

  let location = createLocation(currentDoc);
  let attempts = 0;

  while (pos <= end && attempts < 3) {
    try {
      const remainingLimit = Math.ceil((end - pos + 1) / CHUNK);
      for await (const chunk of c.iterDownload({
        file: location,
        offset: bigInt(pos),
        limit: remainingLimit,
        requestSize: CHUNK,
        dcId: currentDoc.dcId,
      })) {
        const from = Math.max(start - pos, 0);
        const to = Math.min(end - pos + 1, chunk.length);
        if (to > from) yield chunk.subarray(from, to);
        pos += chunk.length;
        if (pos > end) return;
      }
      break;
    } catch (e) {
      attempts++;
      const msg = String(e.errorMessage || e.message || '');
      if (/FILEREF_UPGRADE_NEEDED|FILE_REFERENCE_EXPIRED/.test(msg) && docRefreshFn) {
        console.warn('Refreshing expired Telegram document reference during stream:', msg);
        try {
          const refreshed = await docRefreshFn();
          if (refreshed?.doc) {
            currentDoc = refreshed.doc;
            location = createLocation(currentDoc);
            continue;
          }
        } catch (refreshErr) {
          console.error('Failed to refresh document reference:', refreshErr.message);
        }
      }
      if (attempts >= 3) {
        console.error('Telegram streamRange failed after retries:', e.errorMessage || e.message);
        throw e;
      }
    }
  }
}

// Download thumbnail or cover photo from Telegram
async function downloadThumbnail(docOrMedia) {
  if (!docOrMedia) return null;
  const c = await getClient();

  try {
    // 1. If document with thumbs or MessageMediaDocument
    if (docOrMedia.thumbs && docOrMedia.thumbs.length > 0) {
      const buf = await c.downloadMedia(docOrMedia, { thumb: -1 });
      if (buf && buf.length > 0) return buf;
    }

    // 2. If photo message media or Photo
    if (docOrMedia.photo || docOrMedia.className === 'MessageMediaPhoto' || docOrMedia.className === 'Photo') {
      const buf = await c.downloadMedia(docOrMedia, { thumb: -1 });
      if (buf && buf.length > 0) return buf;
      return await c.downloadMedia(docOrMedia);
    }

    // 3. If Message object
    if (docOrMedia.media || docOrMedia.className === 'Message') {
      const buf = await c.downloadMedia(docOrMedia, { thumb: -1 });
      if (buf && buf.length > 0) return buf;
      return await c.downloadMedia(docOrMedia);
    }

    // 4. Fallback directly to downloadMedia
    const buf = await c.downloadMedia(docOrMedia, { thumb: -1 });
    if (buf && buf.length > 0) return buf;
    return await c.downloadMedia(docOrMedia);
  } catch (e) {
    console.error('Thumbnail download error:', e.errorMessage || e.message);
    return null;
  }
}

// Download cover photo by message ID
async function downloadPhotoByMsgId(msgId) {
  try {
    const key = `msg_${msgId}`;
    let media = photoCache.get(key);
    const c = await getClient();

    if (!media) {
      const chat = await getChat();
      const [m] = await c.getMessages(chat, { ids: [Number(msgId)] });
      if (m) {
        media = m.media || m;
        photoCache.set(key, media);
      }
    }
    if (media) {
      const buf = await c.downloadMedia(media, { thumb: -1 });
      if (buf && buf.length > 0) return buf;
      return await c.downloadMedia(media);
    }
    return null;
  } catch (e) {
    console.warn('Failed to download photo for msg', msgId, e.message);
    return null;
  }
}

async function testConnection() {
  try {
    const c = await getClient();
    const chat = await getChat();
    const me = await c.getMe();
    return {
      success: true,
      botUsername: me?.username || 'Bot',
      botId: me?.id?.toString(),
      channel: connectionStatus.channelTitle || process.env.TELEGRAM_CHAT_ID,
      connectedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      success: false,
      error: e.errorMessage || e.message,
    };
  }
}

// Read only the first N bytes (e.g. 512 KB) of an audio file for metadata/lyrics inspection
async function readPartialAudioChunk(doc, maxBytes = 512 * 1024) {
  if (!doc) return null;
  const targetEnd = Math.min(Number(doc.size || maxBytes) - 1, maxBytes - 1);
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of streamRange(doc, 0, targetEnd)) {
    chunks.push(chunk);
    totalBytes += chunk.length;
    if (totalBytes >= maxBytes) break;
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : null;
}

function getConnectionStatus() {
  return {
    ...connectionStatus,
    configured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_BOT_TOKEN),
    chatId: process.env.TELEGRAM_CHAT_ID || null,
  };
}

module.exports = {
  listAudio,
  rescanArtwork,
  CoverDetector,
  getDoc,
  streamRange,
  readPartialAudioChunk,
  downloadThumbnail,
  downloadPhotoByMsgId,
  testConnection,
  getConnectionStatus,
  trackToPhotoMap,
  photoCache,
  wrap,
};
