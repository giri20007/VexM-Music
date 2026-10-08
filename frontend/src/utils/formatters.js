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
  if (track.format === 'FLAC') {
    const sr = track.sampleRate ? `${(track.sampleRate / 1000).toFixed(1)}k` : '48.0k';
    return {
      label: `FLAC ${sr}`,
      isLossless: true,
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (track.format === 'WAV') {
    return {
      label: 'WAV LOSSLESS',
      isLossless: true,
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (track.format === 'AAC') {
    return {
      label: 'AAC 256k',
      isLossless: false,
      color: 'bg-accent/15 text-accent border-accent/30',
    };
  }
  if (track.format === 'OPUS') {
    return {
      label: 'OPUS',
      isLossless: false,
      color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    };
  }
  return {
    label: `${track.format || 'MP3'} ${track.bitrate ? track.bitrate + 'k' : '320k'}`,
    isLossless: false,
    color: 'bg-white/10 text-warm-white border-white/10',
  };
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000 || timestamp);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
