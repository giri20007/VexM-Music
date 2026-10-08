import React, { useEffect, useState, useRef } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { fetchTrackLyrics } from '../../utils/api';
import { parseLrc, findActiveLyricIndex } from '../../utils/lrcParser';
import { seek } from '../../hooks/usePlayer';
import { Minus, Plus, RefreshCw, Music2, Copy, Check, Sparkles, FileAudio, RotateCcw } from 'lucide-react';

export function LyricsView({ track }) {
  const currentTime = useAudioStore(s => s.currentTime);
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const syncLyrics = useSettingsStore(s => s.syncLyrics);
  const autoScroll = useSettingsStore(s => s.autoScroll);
  const fontSize = useSettingsStore(s => s.lyricsFontSize);
  const offsetMs = useSettingsStore(s => s.lyricsOffsetMs);
  const adjustLyricsOffset = useSettingsStore(s => s.adjustLyricsOffset);

  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;
    setLoading(true);

    fetchTrackLyrics(track.id)
      .then(res => {
        if (cancelled) return;
        if (res && (res.lines?.length || res.raw)) {
          setLyricsData(res);
        } else {
          setLyricsData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLyricsData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  const parsedLines = lyricsData?.lines?.length
    ? lyricsData.lines
    : lyricsData?.raw
    ? parseLrc(lyricsData.raw)
    : [];

  const isSynced = syncLyrics && parsedLines.length > 0;
  const activeIndex = isSynced
    ? findActiveLyricIndex(parsedLines, currentTime, offsetMs)
    : -1;

  // Auto-scroll to active line
  useEffect(() => {
    if (!autoScroll || !isSynced || activeIndex < 0 || !activeLineRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;
    const offsetTop = activeEl.offsetTop - container.offsetTop;
    const targetScroll = offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  }, [activeIndex, autoScroll, isSynced]);

  const handleLineClick = lineTime => {
    if (Number.isFinite(lineTime)) {
      seek(Math.max(0, lineTime - offsetMs / 1000));
    }
  };

  const handleCopyLyrics = async () => {
    const textToCopy = parsedLines.length > 0
      ? parsedLines.map(l => l.text).join('\n')
      : lyricsData?.raw || '';
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const hasLyrics = parsedLines.length > 0 || !!lyricsData?.raw;
  const isEmbedded = lyricsData?.source === 'embedded';

  return (
    <div className="flex flex-col h-full select-none font-sans">
      {/* Top Header: Source Badge & Tuning Bar */}
      {hasLyrics && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 text-xs text-warm-muted gap-2 flex-wrap">
          {/* Source Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {isEmbedded ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-bold text-accent">
                <FileAudio className="w-3 h-3" />
                <span>Embedded in Audio</span>
              </span>
            ) : isSynced ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Synced Lyrics</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-warm-muted">
                <span>Text Lyrics</span>
              </span>
            )}

            {lyricsData?.language && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-warm-muted uppercase tracking-wider">
                {lyricsData.language}
              </span>
            )}

            {/* Copy button */}
            <button
              onClick={handleCopyLyrics}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md hover:bg-white/10 text-warm-muted hover:text-white text-[11px] transition"
              title="Copy lyrics to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Timing offset bar (- 0 ms +) */}
          {isSynced && (
            <div className="flex items-center gap-1.5 bg-bg-card px-2.5 py-1 rounded-full border border-white/5">
              <button
                onClick={() => adjustLyricsOffset(-100)}
                className="p-1 hover:text-white transition"
                title="Delay lyrics 100ms (-100ms)"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span
                onClick={() => adjustLyricsOffset(-offsetMs)}
                className="tabular-nums font-mono text-[11px] min-w-[52px] text-center text-warm-white cursor-pointer hover:text-accent transition"
                title="Click to reset offset to 0ms"
              >
                {offsetMs >= 0 ? `+${offsetMs}` : offsetMs} ms
              </span>
              <button
                onClick={() => adjustLyricsOffset(100)}
                className="p-1 hover:text-white transition"
                title="Advance lyrics 100ms (+100ms)"
              >
                <Plus className="w-3 h-3" />
              </button>
              {offsetMs !== 0 && (
                <button
                  onClick={() => adjustLyricsOffset(-offsetMs)}
                  className="p-1 text-warm-muted hover:text-accent transition"
                  title="Reset to 0ms"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lyrics Content Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar scroll-smooth antialiased"
        style={{ fontSize: `${fontSize}px` }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-warm-muted space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <p className="text-xs">Loading lyrics...</p>
          </div>
        ) : parsedLines.length > 0 ? (
          parsedLines.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={line.id || idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => handleLineClick(line.time)}
                className={`transition-all duration-300 cursor-pointer font-bold leading-relaxed break-words ${
                  isActive
                    ? 'text-accent scale-105 origin-left glow-text font-black'
                    : 'text-warm-muted/50 hover:text-warm-muted'
                }`}
              >
                {line.text || '♪'}
              </p>
            );
          })
        ) : lyricsData?.raw ? (
          <div className="space-y-2 py-2">
            {lyricsData.raw.split('\n').map((line, i) => (
              <p key={i} className="text-warm-white/90 leading-relaxed font-semibold text-sm sm:text-base break-words">
                {line.trim() || '\u00A0'}
              </p>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-12 text-warm-muted/60 text-center">
            <Music2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-medium text-warm-white/70">Lyrics unavailable</p>
            <p className="text-xs text-warm-muted/60 mt-1 max-w-xs">
              Synchronized lyrics can be added or edited via the SPiDEYxFLASH Admin panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

