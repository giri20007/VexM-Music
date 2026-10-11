import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { fetchTrackLyrics } from '../../utils/api';
import { parseLrc, findActiveLyricIndex } from '../../utils/lrcParser';
import { seek } from '../../hooks/usePlayer';
import {
  Minus,
  Plus,
  RefreshCw,
  Music2,
  Copy,
  Check,
  FileAudio,
  RotateCcw,
  Sparkles,
  Mic2,
  AlignLeft,
  Radio,
} from 'lucide-react';

export function LyricsView({ track, isCompact = false }) {
  const currentTime = useAudioStore(s => s.currentTime);
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const resumeTimeoutRef = useRef(null);

  const syncLyrics = useSettingsStore(s => s.syncLyrics);
  const autoScroll = useSettingsStore(s => s.autoScroll);
  const fontSize = useSettingsStore(s => s.lyricsFontSize || 18);
  const setLyricsFontSize = useSettingsStore(s => s.setLyricsFontSize);
  const offsetMs = useSettingsStore(s => s.lyricsOffsetMs || 0);
  const adjustLyricsOffset = useSettingsStore(s => s.adjustLyricsOffset);
  const lyricsStyle = useSettingsStore(s => s.lyricsStyle || 'fluid');
  const setLyricsStyle = useSettingsStore(s => s.setLyricsStyle);

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

  // Auto-scroll to keep active line vertically centered
  const scrollToActive = useCallback(() => {
    if (!containerRef.current || !activeLineRef.current) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;
    const offsetTop = activeEl.offsetTop - container.offsetTop;
    const targetScroll = offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    if (!autoScroll || !isSynced || activeIndex < 0 || userInteracted) return;
    scrollToActive();
  }, [activeIndex, autoScroll, isSynced, userInteracted, scrollToActive]);

  // Handle user manual scroll
  const handleUserScroll = () => {
    if (!userInteracted && isSynced) {
      setUserInteracted(true);
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    // Auto-resume sync scrolling after 4 seconds of idle
    resumeTimeoutRef.current = setTimeout(() => {
      setUserInteracted(false);
    }, 4000);
  };

  const handleResumeSync = () => {
    setUserInteracted(false);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    scrollToActive();
  };

  const handleLineClick = lineTime => {
    if (Number.isFinite(lineTime)) {
      seek(Math.max(0, lineTime - offsetMs / 1000));
      setUserInteracted(false);
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
      // ignore clipboard error
    }
  };

  const hasLyrics = parsedLines.length > 0 || !!lyricsData?.raw;
  const isEmbedded = lyricsData?.source === 'embedded';

  return (
    <div className="flex flex-col h-full select-none font-sans relative overflow-hidden">
      {/* Dynamic Ambient Glow Behind Lyrics */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 transition-opacity duration-1000"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-accent/15 blur-[100px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[240px] sm:w-[360px] h-[240px] sm:h-[360px] rounded-full bg-violet-600/10 blur-[90px] pointer-events-none" />
      </div>

      {/* Top Lyrics Controls & Timing Offset Bar */}
      {hasLyrics && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/8 text-xs text-warm-muted gap-2.5 flex-wrap flex-shrink-0 z-10">
          {/* Left: Source Badges & Style Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {isEmbedded ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-bold text-accent shadow-sm">
                <FileAudio className="w-3 h-3" />
                <span>Embedded ID3</span>
              </span>
            ) : isSynced ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Synced LRC</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-warm-muted">
                <span>Text Lyrics</span>
              </span>
            )}

            {/* Visual Style Selector Pills */}
            {isSynced && (
              <div className="flex items-center bg-black/40 backdrop-blur-md p-0.5 rounded-lg border border-white/10 shadow-inner">
                <button
                  onClick={() => setLyricsStyle('fluid')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition ${
                    lyricsStyle === 'fluid'
                      ? 'bg-accent text-dark-base shadow-sm font-extrabold'
                      : 'text-warm-muted hover:text-white'
                  }`}
                  title="Apple Music Fluid Glow Mode"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Fluid Glow</span>
                </button>
                <button
                  onClick={() => setLyricsStyle('karaoke')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition ${
                    lyricsStyle === 'karaoke'
                      ? 'bg-accent text-dark-base shadow-sm font-extrabold'
                      : 'text-warm-muted hover:text-white'
                  }`}
                  title="Karaoke Sweep Animation Mode"
                >
                  <Mic2 className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Karaoke</span>
                </button>
                <button
                  onClick={() => setLyricsStyle('zen')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition ${
                    lyricsStyle === 'zen'
                      ? 'bg-accent text-dark-base shadow-sm font-extrabold'
                      : 'text-warm-muted hover:text-white'
                  }`}
                  title="Minimal Zen Clean Typography"
                >
                  <AlignLeft className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Minimal Zen</span>
                </button>
              </div>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopyLyrics}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-warm-muted hover:text-white text-[11px] transition shadow-sm"
              title="Copy lyrics to clipboard"
              aria-label="Copy lyrics"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Right: Font Size & Timing Offset */}
          <div className="flex items-center gap-2">
            {/* Font Size Controls (A- / A+) */}
            <div className="flex items-center bg-black/40 backdrop-blur-md px-1 py-0.5 rounded-lg border border-white/10 shadow-sm text-warm-muted">
              <button
                onClick={() => setLyricsFontSize(Math.max(14, fontSize - 2))}
                className="px-1.5 py-0.5 hover:text-white transition font-bold text-[11px]"
                title="Decrease font size"
                aria-label="Decrease font size"
              >
                A-
              </button>
              <span className="text-[10px] font-mono text-warm-white/60 px-1 border-x border-white/10">
                {fontSize}px
              </span>
              <button
                onClick={() => setLyricsFontSize(Math.min(32, fontSize + 2))}
                className="px-1.5 py-0.5 hover:text-white transition font-bold text-[11px]"
                title="Increase font size"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>

            {/* Timing Offset (- 0 ms +) */}
            {isSynced && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 shadow-sm">
                <button
                  onClick={() => adjustLyricsOffset(-100)}
                  className="p-0.5 hover:text-white transition"
                  title="Delay lyrics 100ms (-100ms)"
                  aria-label="Delay lyrics"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span
                  onClick={() => adjustLyricsOffset(-offsetMs)}
                  className="tabular-nums font-mono text-[10px] min-w-[46px] text-center text-warm-white cursor-pointer hover:text-accent transition font-semibold"
                  title="Click to reset offset to 0ms"
                >
                  {offsetMs >= 0 ? `+${offsetMs}` : offsetMs}ms
                </span>
                <button
                  onClick={() => adjustLyricsOffset(100)}
                  className="p-0.5 hover:text-white transition"
                  title="Advance lyrics 100ms (+100ms)"
                  aria-label="Advance lyrics"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {offsetMs !== 0 && (
                  <button
                    onClick={() => adjustLyricsOffset(-offsetMs)}
                    className="p-0.5 text-warm-muted hover:text-accent transition"
                    title="Reset to 0ms"
                    aria-label="Reset offset"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resume Auto-Scroll Pill if User Manually Scrolled */}
      {userInteracted && isSynced && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <button
            onClick={handleResumeSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-dark-base text-xs font-black shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Resume Auto-Scroll</span>
          </button>
        </div>
      )}

      {/* Lyrics Scrollable Stream */}
      <div
        ref={containerRef}
        onScroll={handleUserScroll}
        onTouchMove={handleUserScroll}
        onWheel={handleUserScroll}
        className="flex-1 overflow-y-auto pr-2 space-y-4 sm:space-y-6 no-scrollbar scroll-smooth antialiased py-10"
        style={{ fontSize: `${Math.max(14, fontSize)}px` }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-warm-muted space-y-3 py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm font-medium text-warm-white/80">Fetching Synchronized Lyrics...</p>
          </div>
        ) : parsedLines.length > 0 ? (
          parsedLines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = activeIndex >= 0 && idx < activeIndex;

            // Render according to selected style
            if (lyricsStyle === 'karaoke') {
              return (
                <div
                  key={line.id || idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  className={`transition-all duration-300 cursor-pointer leading-relaxed break-words font-sans flex items-center gap-3 ${
                    isActive
                      ? 'text-accent scale-105 sm:scale-110 origin-left font-black text-2xl sm:text-3xl opacity-100 translate-x-2'
                      : isPast
                      ? 'text-warm-muted/30 font-semibold text-lg sm:text-xl hover:text-warm-white/70'
                      : 'text-warm-muted/50 font-semibold text-lg sm:text-xl hover:text-warm-white'
                  }`}
                >
                  {isActive && (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)] animate-ping flex-shrink-0" />
                  )}
                  <p className="drop-shadow-sm">{line.text || '♪'}</p>
                </div>
              );
            }

            if (lyricsStyle === 'zen') {
              return (
                <p
                  key={line.id || idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  className={`transition-colors duration-200 cursor-pointer leading-relaxed break-words font-sans ${
                    isActive
                      ? 'text-white font-black text-2xl sm:text-3xl opacity-100'
                      : isPast
                      ? 'text-warm-muted/35 font-medium text-lg sm:text-xl hover:text-warm-white/60'
                      : 'text-warm-muted/65 font-medium text-lg sm:text-xl hover:text-warm-white'
                  }`}
                >
                  {line.text || '♪'}
                </p>
              );
            }

            // Default: 'fluid' (Apple Music Fluid Glow)
            return (
              <p
                key={line.id || idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => handleLineClick(line.time)}
                className={`transition-all duration-400 cursor-pointer leading-relaxed break-words font-sans ${
                  isActive
                    ? 'text-accent scale-105 sm:scale-110 origin-left glow-text font-black text-2xl sm:text-3xl opacity-100 translate-x-2 drop-shadow-[0_0_20px_rgba(255,123,114,0.45)]'
                    : isPast
                    ? 'text-warm-muted/25 font-bold text-lg sm:text-xl blur-[0.6px] hover:blur-none hover:text-warm-white/70 hover:opacity-80'
                    : 'text-warm-muted/50 font-bold text-lg sm:text-xl blur-[0.4px] hover:blur-none hover:text-warm-white hover:opacity-90'
                }`}
              >
                {line.text || '♪'}
              </p>
            );
          })
        ) : lyricsData?.raw ? (
          <div className="space-y-3 py-4 text-center sm:text-left">
            {lyricsData.raw.split('\n').map((line, i) => (
              <p
                key={i}
                className="text-warm-white/85 leading-relaxed font-semibold text-base sm:text-lg break-words"
              >
                {line.trim() || '\u00A0'}
              </p>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 text-warm-muted/70 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-warm-muted/50 mx-auto">
              <Music2 className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-warm-white">Lyrics Unavailable</p>
            <p className="text-xs text-warm-muted/70 max-w-sm leading-relaxed">
              Synchronized LRC lyrics can be added or updated for this track via the Vex-M Admin panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

