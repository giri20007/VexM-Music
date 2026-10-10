const router = require('express').Router();
const { once } = require('events');
const { getDoc, streamRange, wrap } = require('../utils/telegramApi');
const { getItem } = require('./library');

const MIME = {
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
};

function contentType(entry, item) {
  const fileName = entry?.item?.fileName || item?.fileName || '';
  const ext = fileName.split('.').pop().toLowerCase();
  return MIME[ext] || entry?.mime || item?.mimeType || 'audio/mpeg';
}

function parseRange(h, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(h || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : 'bad';
}

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  const item = getItem(id);

  // If item has a custom external audio URL, redirect directly
  if (item && item.audioUrl && (item.audioUrl.startsWith('http://') || item.audioUrl.startsWith('https://'))) {
    return res.redirect(302, item.audioUrl);
  }

  try {
    let entry = await getDoc(id);
    if (!entry || !entry.doc) {
      return res.status(404).json({ error: true, code: 'AUDIO_NOT_FOUND', message: 'Audio stream unavailable' });
    }

    const size = Number(entry.size) || 0;
    const etag = `"spx-${id}-${size}"`;

    // 304 Cache validation for full requests
    if (req.headers['if-none-match'] === etag && !req.headers.range) {
      return res.status(304).end();
    }

    const r = req.headers.range ? parseRange(req.headers.range, size) : null;
    if (r === 'bad') {
      return res.status(416).set({
        'Content-Range': `bytes */${size}`,
        'Accept-Ranges': 'bytes',
      }).end();
    }

    const start = r ? r.start : 0;
    const end = r ? r.end : size - 1;
    const mimeType = contentType(entry, item);
    const origin = req.headers.origin || '*';

    // Pull first chunk before sending headers with document refresh capability
    const refreshDoc = () => getDoc(id, true);
    let gen = streamRange(entry.doc, start, end, refreshDoc);
    let first;
    try {
      first = await gen.next();
    } catch (e1) {
      console.warn('Stream initial attempt failed, refreshing Telegram doc:', e1.errorMessage || e1.message);
      entry = await refreshDoc();
      gen = streamRange(entry.doc, start, end, refreshDoc);
      first = await gen.next();
    }

    const headers = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': 'public, max-age=86400, immutable',
      'ETag': etag,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, Cookie',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Duration, X-Content-Duration, ETag',
      'Vary': 'Origin, Range',
    };

    if (item && Number.isFinite(item.duration) && item.duration > 0) {
      headers['X-Content-Duration'] = String(item.duration);
      headers['Content-Duration'] = String(item.duration);
    }

    if (r) {
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }

    res.writeHead(r ? 206 : 200, headers);

    let closed = false;
    const cleanup = () => {
      if (!closed) {
        closed = true;
        gen.return?.().catch(() => {});
      }
    };

    res.on('close', cleanup);
    res.on('error', cleanup);

    while (!first.done && !closed) {
      const ok = res.write(first.value);
      if (closed) break;
      if (!ok) {
        await Promise.race([once(res, 'drain'), once(res, 'close')]);
      }
      if (closed) break;
      first = await gen.next();
    }

    cleanup();
    if (!res.writableEnded && !closed) {
      res.end();
    }
  } catch (e) {
    console.error('Stream failed for ID', id, e.errorMessage || e.message);
    if (res.headersSent) {
      return res.destroy();
    }
    next(wrap(e));
  }
});

module.exports = router;
