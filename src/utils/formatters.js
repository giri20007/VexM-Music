export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const totalSeconds = Math.floor(sec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatQualityBadge(track) {
  if (!track) return null;

  if (track.is320k || track.isSaavn || track.source === 'jiosaavn_320k' || track.bitrate === 320) {
    return {
      label: '320 kbps HQ',
      fullLabel: '320 kbps Studio AAC',
      isLossless: false,
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10',
    };
  }

  if (track.isYouTube || (track.videoId && !track.audioUrl)) {
    return {
      label: 'YouTube HQ',
      fullLabel: 'YouTube Premium HQ Stream',
      isLossless: false,
      color: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
  }

  if (track.isOwnTg || track.isTelegram || track.source === 'owntg') {
    const isFlac = (track.format || '').toUpperCase() === 'FLAC';
    return {
      label: isFlac ? 'OwnTg FLAC' : 'OwnTg Cloud',
      fullLabel: isFlac ? 'OwnTg Telegram Lossless FLAC' : 'OwnTg Telegram Cloud Storage',
      isLossless: isFlac,
      color: isFlac
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/10',
    };
  }

  const format = (track.format || 'MP3').toUpperCase();
  const bitrate = track.bitrate;
  const bitDepth = track.bitDepth || (track.isLossless ? 24 : 16);
  const sampleRate = track.sampleRate || 44100;
  const srFormatted = (sampleRate / 1000).toFixed(1).replace(/\.0$/, '');

  if (format === 'FLAC') {
    if (bitDepth === 24 || sampleRate >= 48000) {
      return {
        label: `Hi-Res FLAC ${bitDepth}/${srFormatted}k`,
        fullLabel: `FLAC 24-bit / ${sampleRate / 1000}kHz`,
        isLossless: true,
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10',
      };
    }
    return {
      label: `FLAC ${bitDepth}/${srFormatted}k`,
      fullLabel: `FLAC 16-bit / 44.1kHz (CD)`,
      isLossless: true,
      color: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    };
  }

  if (format === 'WAV') {
    return {
      label: `WAV ${bitDepth}/${srFormatted}k`,
      fullLabel: `WAV Lossless ${bitDepth}-bit / ${srFormatted}kHz`,
      isLossless: true,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  if (format === 'AAC' || format === 'M4A') {
    return {
      label: `AAC ${bitrate ? bitrate + 'k' : '256k'}`,
      fullLabel: `AAC ${bitrate || 256} kbps`,
      isLossless: false,
      color: 'bg-accent/15 text-accent border-accent/30',
    };
  }

  if (format === 'OPUS' || format === 'OGG') {
    return {
      label: `OPUS ${bitrate ? bitrate + 'k' : '160k'}`,
      fullLabel: `OPUS ${bitrate || 160} kbps`,
      isLossless: false,
      color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  }

  // MP3 or generic
  const mp3Bitrate = bitrate ? `${bitrate}k` : '320k';
  return {
    label: `MP3 ${mp3Bitrate}`,
    fullLabel: `MP3 ${mp3Bitrate}`,
    isLossless: false,
    color: 'bg-white/10 text-warm-white border-white/15',
  };
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000 || timestamp);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
