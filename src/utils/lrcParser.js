export function parseLrc(lrcContent, trackDuration = 0) {
  if (!lrcContent || typeof lrcContent !== 'string') return [];
  const rawEntries = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

  const rawLines = lrcContent.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = rawLine.replace(timeRegex, '').trim();
      for (const m of matches) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const ms = m[3] ? (m[3].length === 2 ? parseInt(m[3], 10) * 10 : parseInt(m[3], 10)) : 0;
        const totalSecs = mins * 60 + secs + ms / 1000;
        rawEntries.push({ id: `line_${i}_${totalSecs}`, start: totalSecs, time: totalSecs, text: text || '♪' });
      }
    }
  }

  rawEntries.sort((a, b) => a.start - b.start);

  // Compute end timestamps
  const lines = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const cur = rawEntries[i];
    let end = 0;
    if (i < rawEntries.length - 1) {
      end = rawEntries[i + 1].start;
    } else {
      end = trackDuration > cur.start ? trackDuration : cur.start + 5.0;
    }
    lines.push({
      ...cur,
      end: Number(end.toFixed(3)),
    });
  }

  return lines;
}

export function findActiveLyricIndex(lines, currentTime, offsetMs = 0) {
  if (!lines || lines.length === 0) return -1;
  // +0.20s lead-in lookahead aligns visual lyric activation right as vocal onset starts
  const adjustedTime = Math.max(0, currentTime + 0.20 + offsetMs / 1000);

  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const lineStart = lines[i].start !== undefined ? lines[i].start : lines[i].time;
    if (lineStart <= adjustedTime) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}

export function formatTimeTag(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
}
