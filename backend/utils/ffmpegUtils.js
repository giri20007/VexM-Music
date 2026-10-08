const { execFile } = require('child_process');

exports.probe = url => new Promise(resolve => {
  execFile('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', url], { timeout: 15000 }, (e, out) => {
    if (e) return resolve(null);
    try {
      const f = JSON.parse(out).format || {};
      const t = f.tags || {};
      resolve({ duration: Math.round(+f.duration) || 0, title: t.title || t.TITLE, artist: t.artist || t.ARTIST, album: t.album || t.ALBUM });
    } catch { resolve(null); }
  });
});
