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
const docs = new Map(); // id -> { doc, mime, size, item }

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

function formatQuality(mimeType, fileName, audioAttr) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  let format = 'MP3';
  let bitrate = 320;
  let sampleRate = 44100;
  let bitDepth = 16;
  let isLossless = false;

  if (ext === 'flac' || mimeType.includes('flac')) {
    format = 'FLAC';
    isLossless = true;
    sampleRate = 48000;
    bitDepth = 24;
    bitrate = null;
  } else if (ext === 'wav' || mimeType.includes('wav')) {
    format = 'WAV';
    isLossless = true;
    sampleRate = 44100;
    bitDepth = 16;
    bitrate = null;
  } else if (ext === 'm4a' || ext === 'aac' || mimeType.includes('aac') || mimeType.includes('mp4')) {
    format = 'AAC';
    bitrate = 256;
  } else if (ext === 'opus' || ext === 'ogg' || mimeType.includes('opus') || mimeType.includes('ogg')) {
    format = 'OPUS';
    bitrate = 160;
  }

  return { format, bitrate, sampleRate, bitDepth, isLossless };
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

function toItem(m) {
  const doc = m.media?.document;
  if (!doc) return null;
  const attrs = doc.attributes || [];
  const au = attrs.find(a => a.className === 'DocumentAttributeAudio');
  const fileName = attrs.find(a => a.className === 'DocumentAttributeFilename')?.fileName || '';
  const mime = doc.mimeType || '';
  if (!au && !mime.startsWith('audio/')) return null;

  const id = String(m.id);
  const quality = formatQuality(mime, fileName, au);

  // Extract thumbnail if available
  let hasThumbnail = false;
  if (doc.thumbs && doc.thumbs.length > 0) {
    hasThumbnail = true;
  }

  // Base extracted item
  const rawItem = {
    id,
    messageId: m.id,
    fileId: id,
    title: au?.title || fileName.replace(/\.[^.]+$/, '') || 'Untitled',
    artist: au?.performer || 'Unknown Artist',
    album: 'Unknown Album',
    albumArtist: au?.performer || 'Unknown Artist',
    fileName,
    duration: au?.duration || 0,
    size: Number(doc.size),
    mimeType: mime || 'audio/mpeg',
    format: quality.format,
    bitrate: quality.bitrate,
    sampleRate: quality.sampleRate,
    bitDepth: quality.bitDepth,
    isLossless: quality.isLossless,
    thumbnail: hasThumbnail ? `/api/artwork/${id}` : null,
    date: m.date,
    hasTelegramDoc: true,
  };

  // Merge admin overrides if any
  const override = getOverride(id);
  const customArt = getArtwork(id);
  const item = {
    ...rawItem,
    ...(override || {}),
    thumbnail: customArt || (override?.artworkUrl || rawItem.thumbnail),
  };

  docs.set(id, { doc, mime: item.mimeType, size: item.size, item });
  return item;
}

// minId > 0 fetches only newer messages
async function listAudio(minId = 0, limit = 1000) {
  try {
    const c = await getClient();
    const chat = await getChat();
    const items = [];
    let maxId = minId;

    // Normal path: read channel history
    try {
      for await (const m of c.iterMessages(chat, { limit, minId })) {
        if (m.id > maxId) maxId = m.id;
        const it = toItem(m);
        if (it) items.push(it);
      }
      connectionStatus.discoveredCount = Math.max(connectionStatus.discoveredCount, items.length);
      return { items, maxId };
    } catch (e) {
      if (!/BOT_METHOD_INVALID/.test(String(e.errorMessage || e.message))) throw e;
    }

    // Bot-friendly path: fetch messages by ID in batches of 100
    items.length = 0;
    maxId = minId;
    let start = minId + 1;
    let empty = 0;
    while (empty < 2 && start < 20000) {
      const ids = Array.from({ length: 100 }, (_, i) => start + i);
      const msgs = await c.getMessages(chat, { ids });
      let found = false;
      for (const m of msgs) {
        if (!m || !m.id) continue;
        found = true;
        if (m.id > maxId) maxId = m.id;
        const it = toItem(m);
        if (it) items.push(it);
      }
      empty = found ? 0 : empty + 1;
      start += 100;
    }
    connectionStatus.discoveredCount = Math.max(connectionStatus.discoveredCount, items.length);
    return { items, maxId };
  } catch (e) {
    console.error('Library scan failed:', e.errorMessage || e.message);
    connectionStatus.lastError = e.errorMessage || e.message;
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
async function* streamRange(doc, start, end) {
  const c = await getClient();
  const aStart = start - (start % CHUNK);
  const limit = Math.ceil((end - aStart + 1) / CHUNK);
  let pos = aStart;
  const location = new Api.InputDocumentFileLocation({
    id: doc.id,
    accessHash: doc.accessHash,
    fileReference: doc.fileReference,
    thumbSize: '',
  });

  try {
    for await (const chunk of c.iterDownload({
      file: location,
      offset: bigInt(aStart),
      limit,
      requestSize: CHUNK,
      dcId: doc.dcId,
    })) {
      const from = Math.max(start - pos, 0);
      const to = Math.min(end - pos + 1, chunk.length);
      if (to > from) yield chunk.subarray(from, to);
      pos += chunk.length;
      if (pos > end) return;
    }
  } catch (e) {
    console.error('Telegram download error:', e.errorMessage || e.message);
    throw e;
  }
}

async function downloadThumbnail(doc) {
  if (!doc.thumbs || doc.thumbs.length === 0) return null;
  const c = await getClient();
  const thumb = doc.thumbs[doc.thumbs.length - 1]; // largest thumbnail
  const location = new Api.InputDocumentFileLocation({
    id: doc.id,
    accessHash: doc.accessHash,
    fileReference: doc.fileReference,
    thumbSize: thumb.type || 'm',
  });

  try {
    const buffer = await c.downloadMedia(location);
    return buffer;
  } catch (e) {
    console.error('Thumbnail download error:', e.errorMessage || e.message);
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

function getConnectionStatus() {
  return {
    ...connectionStatus,
    configured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_BOT_TOKEN),
    chatId: process.env.TELEGRAM_CHAT_ID || null,
  };
}

module.exports = {
  listAudio,
  getDoc,
  streamRange,
  downloadThumbnail,
  testConnection,
  getConnectionStatus,
  wrap,
};
