const router = require('express').Router();
const { once } = require('events');
const { getDoc, streamRange, wrap } = require('../utils/telegramApi');

const ID = /^\d{1,12}$/;
const MIME = {
  flac: 'audio/flac', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
  wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
};

function contentType(entry) {
  const ext = (entry.item?.fileName || '').split('.').pop().toLowerCase();
  return MIME[ext] || entry.mime || 'audio/mpeg';
}

function parseRange(h, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(h || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') { start = Math.max(size - Number(m[2]), 0); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  return start <= end && start < size ? { start, end } : 'bad';
}

router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!ID.test(id)) return res.status(400).json({ error: 'Invalid audio source' });
  try {
    let entry = await getDoc(id);
    const size = entry.size;
    const r = req.headers.range ? parseRange(req.headers.range, size) : null;
    if (r === 'bad') return res.status(416).set('Content-Range', `bytes */${size}`).end();
    const start = r ? r.start : 0, end = r ? r.end : size - 1;

    // pull first chunk before sending headers so an expired file reference can be retried once
    let gen = streamRange(entry.doc, start, end), first;
    try { first = await gen.next(); }
    catch (e1) {
      console.error('Stream first attempt failed:', e1.errorMessage || e1.message);
      entry = await getDoc(id, true);
      gen = streamRange(entry.doc, start, end);
      first = await gen.next();
    }

    const headers = {
      'Content-Type': contentType(entry), 'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1, 'Cache-Control': 'private, max-age=3600',
    };
    if (r) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    res.writeHead(r ? 206 : 200, headers);

    let closed = false;
    res.on('close', () => { closed = true; });
    while (!first.done && !closed) {
      if (!res.write(first.value)) await Promise.race([once(res, 'drain'), once(res, 'close')]);
      first = await gen.next();
    }
    await gen.return?.();
    res.end();
  } catch (e) {
    console.error('Stream failed:', e.errorMessage || e.message);
    if (res.headersSent) return res.destroy();
    next(wrap(e));
  }
});

module.exports = router;
