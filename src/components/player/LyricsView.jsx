import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { fetchTrackLyrics } from '../../utils/api';
import { parseLrc, findActiveLyricIndex } from '../../utils/lrcParser';
import { detectScript, transliterateIndicToRoman } from '../../utils/transliterate';
import { seek } from '../../hooks/usePlayer';
import {
  RefreshCw,
  Music2,
  Copy,
  Check,
  Mic2,
  Radio,
} from 'lucide-react';

export function LyricsView({ track, isCompact = false }) {
  const currentTime = useAudioStore(s => s.currentTime);
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [scriptMode, setScriptMode] = useState('original'); // 'original' | 'roman'
  const resumeTimeoutRef = useRef(null);

  const syncLyrics = useSettingsStore(s => s.syncLyrics);
  const autoScroll = useSettingsStore(s => s.autoScroll);
  const fontSize = useSettingsStore(s => s.lyricsFontSize || 18);
  const offsetMs = useSettingsStore(s => s.lyricsOffsetMs || 0);

  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;
    setLoading(true);
    setScriptMode('original');

    fetchTrackLyrics(track.id, track)
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
    : lyricsData?.raw && lyricsData?.synced !== false
    ? parseLrc(lyricsData.raw)
    : [];

  const isSynced = syncLyrics && lyricsData?.synced !== false && parsedLines.length > 0;
  const activeIndex = isSynced
    ? findActiveLyricIndex(parsedLines, currentTime, offsetMs)
    : -1;

  // Detect script (Tamil, Hindi, Telugu, etc.) to offer clean Tanglish/Hinglish language options
  const sampleText = parsedLines.slice(0, 10).map(l => l.text).join(' ') || lyricsData?.raw?.slice(0, 400) || '';
  const detectedScript = detectScript(sampleText);

  const getDisplayText = useCallback((text) => {
    if (!text) return '♪';
    if (scriptMode === 'roman' && detectedScript) {
      return transliterateIndicToRoman(text);
    }
    return text;
  }, [scriptMode, detectedScript]);

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
      ? parsedLines.map(l => getDisplayText(l.text)).join('\n')
      : getDisplayText(lyricsData?.raw || '');
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const hasLyrics = parsedLines.length > 0 || !!lyricsData?.raw;

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

      {/* Clean, Minimal Lyrics Header Bar */}
      {hasLyrics && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 text-xs text-warm-muted flex-shrink-0 z-10 px-1">
          {/* Left: Language Script Switcher or Clean Indicator */}
          {detectedScript ? (
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-sm">
              <button
                onClick={() => setScriptMode('original')}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  scriptMode === 'original'
                    ? 'bg-white/20 text-white shadow-sm font-bold'
                    : 'text-white/60 hover:text-white font-medium'
                }`}
                title={`Show lyrics in original ${detectedScript.native} script`}
              >
                {detectedScript.native}
              </button>
              <button
                onClick={() => setScriptMode('roman')}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  scriptMode === 'roman'
                    ? 'bg-accent text-dark-base shadow-sm font-black'
                    : 'text-white/60 hover:text-white font-medium'
                }`}
                title={`Show lyrics in phonetic ${detectedScript.roman} (English alphabet)`}
              >
                {detectedScript.roman}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/50 text-xs font-semibold">
              <Mic2 className="w-3.5 h-3.5 text-accent" />
              <span>Lyrics</span>
            </div>
          )}

          {/* Right: Sleek Copy Button */}
          <button
            onClick={handleCopyLyrics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 text-white/70 hover:text-white text-xs font-medium transition shadow-sm"
            title="Copy lyrics to clipboard"
            aria-label="Copy lyrics"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* Floating Auto-Scroll Resume Pill at Bottom Center */}
      {userInteracted && isSynced && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 animate-fade-in pointer-events-auto">
          <button
            onClick={handleResumeSync}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-xl border border-white/15 text-white text-xs font-bold shadow-2xl active:scale-95 transition"
          >
            <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
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
        className="flex-1 overflow-y-auto pr-2 space-y-4 sm:space-y-6 no-scrollbar scroll-smooth antialiased py-8"
        style={{ fontSize: `${Math.max(16, fontSize)}px` }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-warm-muted space-y-3 py-16">
            <RefreshCw className="w-7 h-7 animate-spin text-accent" />
            <p className="text-sm font-medium text-warm-white/80">Fetching Lyrics...</p>
          </div>
        ) : parsedLines.length > 0 ? (
          parsedLines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = activeIndex >= 0 && idx < activeIndex;

            return (
              <p
                key={line.id || idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => handleLineClick(line.time)}
                className={`transition-all duration-300 cursor-pointer leading-relaxed break-words font-sans ${
                  isActive
                    ? 'text-accent scale-105 sm:scale-110 origin-left glow-text font-black text-2xl sm:text-3xl opacity-100 translate-x-2 drop-shadow-[0_0_20px_rgba(255,123,114,0.45)]'
                    : isPast
                    ? 'text-white/25 font-bold text-lg sm:text-xl blur-[0.4px] hover:blur-none hover:text-white/70 hover:opacity-85'
                    : 'text-white/50 font-bold text-lg sm:text-xl blur-[0.3px] hover:blur-none hover:text-white hover:opacity-95'
                }`}
              >
                {getDisplayText(line.text)}
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
                {getDisplayText(line.trim()) || '\u00A0'}
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
              Lyrics are automatically synchronized when available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
