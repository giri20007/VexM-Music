import React, { useState, memo, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Sliders,
  Moon,
  Sparkles,
  Disc3,
  X,
  Trash2,
  Share2,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';
import { LyricsView } from './LyricsView';

// Apple Music Style Scrubber Component
const AppleScrubber = memo(function AppleScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const [hoverPercent, setHoverPercent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayTime = isDragging ? dragValue : currentTime;
  const percent = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const remainingTime = duration > 0 ? Math.max(0, duration - displayTime) : 0;

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPercent(Math.max(0, Math.min(1, pos)));
  };

  const handleMouseLeave = () => {
    setHoverPercent(null);
  };

  const handleStartDrag = e => {
    setIsDragging(true);
    const val = Number(e.target.value);
    setDragValue(val);
    useAudioStore.getState().set({ isSeeking: true });
  };

  const handleDragChange = e => {
    const val = Number(e.target.value);
    setDragValue(val);
    if (!isDragging) {
      setIsDragging(true);
      useAudioStore.getState().set({ isSeeking: true });
    }
  };

  const handleCommitSeek = e => {
    const val = Number(e.target.value);
    setIsDragging(false);
    seek(val);
  };

  return (
    <div className="space-y-2 select-none w-full">
      <div
        className="relative group py-2 cursor-pointer flex items-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track bar background */}
        <div className="relative w-full h-1 sm:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all group-hover:h-2">
          {/* Active progress fill */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-[#fa2d48] rounded-full transition-all duration-75"
            style={{ width: `${percent}%` }}
          />

          {/* Hover preview fill */}
          {hoverPercent !== null && (
            <div
              className="absolute top-0 left-0 bottom-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${hoverPercent * 100}%` }}
            />
          )}
        </div>

        {/* Real range input */}
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(displayTime, duration || 0)}
          onPointerDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          onChange={handleDragChange}
          onPointerUp={handleCommitSeek}
          onTouchEnd={handleCommitSeek}
          onKeyUp={handleCommitSeek}
          aria-label="Seek track position"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {/* Apple Music Scrubber Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-xl shadow-black/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${percent}%` }}
        />

        {/* Hover Time Tooltip */}
        {hoverPercent !== null && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 backdrop-blur-md border border-white/15 text-[11px] font-mono text-white pointer-events-none shadow-xl"
            style={{ left: `${hoverPercent * 100}%` }}
          >
            {formatDuration(hoverPercent * duration)}
          </div>
        )}
      </div>

      {/* Timestamp labels */}
      <div className="flex items-center justify-between text-xs tabular-nums text-white/60 font-medium px-0.5 font-sans">
        <span>{formatDuration(displayTime)}</span>
        <span>-{formatDuration(remainingTime)}</span>
      </div>
    </div>
  );
});

export function NowPlayingModal() {
  const isNowPlayingOpen = useAudioStore(s => s.isNowPlayingOpen);
  const setNowPlayingOpen = useAudioStore(s => s.setNowPlayingOpen);
  const setSleepTimerOpen = useAudioStore(s => s.setSleepTimerOpen);
  const setEqualizerOpen = useAudioStore(s => s.setEqualizerOpen);
  const sleepTimer = useAudioStore(s => s.sleepTimer);

  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isBuffering = useAudioStore(s => s.isBuffering);
  const volume = useAudioStore(s => s.volume);
  const isMuted = useAudioStore(s => s.isMuted);
  const shuffle = useAudioStore(s => s.shuffle);
  const repeatMode = useAudioStore(s => s.repeatMode);
  const queue = useAudioStore(s => s.queue);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);

  const togglePlay = useAudioStore(s => s.togglePlay);
  const next = useAudioStore(s => s.next);
  const prev = useAudioStore(s => s.prev);
  const toggleShuffle = useAudioStore(s => s.toggleShuffle);
  const cycleRepeat = useAudioStore(s => s.cycleRepeat);
  const setVolume = useAudioStore(s => s.setVolume);
  const toggleMute = useAudioStore(s => s.toggleMute);
  const toggleLike = useAudioStore(s => s.toggleLike);
  const playTrack = useAudioStore(s => s.playTrack);
  const removeFromQueue = useAudioStore(s => s.removeFromQueue);
  const clearQueue = useAudioStore(s => s.clearQueue);

  // View state: 'artwork' | 'lyrics' | 'queue'
  const [viewMode, setViewMode] = useState('artwork');

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isNowPlayingOpen) return;
    const handleKeyDown = e => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setNowPlayingOpen(false);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setViewMode(v => (v === 'lyrics' ? 'artwork' : 'lyrics'));
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setViewMode(v => (v === 'queue' ? 'artwork' : 'queue'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNowPlayingOpen, setNowPlayingOpen]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.includes(String(currentTrack.id));
  const coverSrc = getArtworkSrc(currentTrack, 800);
  const upNextTracks = queue.filter(t => t.id !== currentTrack.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050507] text-white overflow-hidden animate-fade-in select-none">
      {/* 1. Dynamic Ambient Aura Mesh Backdrop */}
      <div
        className="absolute inset-0 opacity-40 filter blur-[100px] pointer-events-none -z-20 bg-cover bg-center transition-all duration-1000 scale-125 transform"
        style={{ backgroundImage: `url(${coverSrc})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#050507]/80 to-[#050507] pointer-events-none -z-10" />

      {/* Rhythmic Glow Orb when playing */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[140px] pointer-events-none -z-10 transition-opacity duration-1000 ${
          isPlaying ? 'opacity-70' : 'opacity-20'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(250,45,72,0.4) 0%, rgba(90,40,200,0.2) 60%, transparent 100%)',
        }}
      />

      {/* 2. Top Header Navigation */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/[0.06] bg-black/30 backdrop-blur-2xl z-20 flex-shrink-0">
        <button
          onClick={() => setNowPlayingOpen(false)}
          className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 border border-white/10"
          title="Minimize player (Esc)"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Center Now Playing Pill */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#fa2d48] animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            NOW PLAYING
          </span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-[10px] font-bold text-[#fa2d48] uppercase tracking-wider">
            Spatial Audio
          </span>
        </div>

        {/* Right Tools: Equalizer & Sleep Timer */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`p-2 rounded-full transition border border-white/10 ${
              sleepTimer
                ? 'text-[#fa2d48] bg-[#fa2d48]/20 border-[#fa2d48]/40'
                : 'text-white/70 hover:text-white bg-white/10 hover:bg-white/20'
            }`}
            title="Sleep Timer"
            aria-label="Sleep timer"
          >
            <Moon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2 rounded-full text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition border border-white/10"
            title="Equalizer"
            aria-label="Equalizer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. Main Center Canvas */}
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto h-full flex flex-col justify-center">
          {/* VIEW: ARTWORK MODE (Default Apple Music Experience) */}
          {viewMode === 'artwork' && (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 my-auto">
              {/* Left / Center: Large Living Album Artwork */}
              <div className="w-full max-w-[280px] sm:max-w-[380px] md:max-w-[420px] aspect-square rounded-3xl overflow-hidden bg-[#1c1c1e] border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex-shrink-0 group relative">
                <SafeImage
                  src={coverSrc}
                  track={currentTrack}
                  alt={currentTrack.title}
                  size={800}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Subtle Glass Corner Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
              </div>

              {/* Right / Center: Song Metadata & Quick Action Tray */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-white/90 uppercase tracking-wider">
                    Lossless
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#fa2d48]/20 border border-[#fa2d48]/40 text-[10px] font-bold text-[#fa2d48] uppercase tracking-wider">
                    Apple Digital Master
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2">
                  {currentTrack.title}
                </h1>

                <p className="text-base sm:text-lg lg:text-xl text-white/70 font-medium mt-1 line-clamp-1">
                  {currentTrack.artist}
                </p>

                {currentTrack.album && currentTrack.album !== currentTrack.title && (
                  <p className="text-xs sm:text-sm text-white/40 mt-1 line-clamp-1">
                    {currentTrack.album}
                  </p>
                )}

                {/* Favorite & Mode Selector Tray */}
                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => toggleLike(currentTrack.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition active:scale-95 text-xs font-semibold ${
                      isLiked
                        ? 'bg-[#fa2d48] border-[#fa2d48] text-white shadow-lg shadow-[#fa2d48]/30'
                        : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{isLiked ? 'Favorited' : 'Favorite'}</span>
                  </button>

                  <button
                    onClick={() => setViewMode('lyrics')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-95 text-xs font-semibold"
                  >
                    <Mic2 className="w-4 h-4 text-[#fa2d48]" />
                    <span>Lyrics</span>
                  </button>

                  <button
                    onClick={() => setViewMode('queue')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-95 text-xs font-semibold"
                  >
                    <ListMusic className="w-4 h-4" />
                    <span>Up Next</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LYRICS MODE (Apple Music Synced Karaoke View) */}
          {viewMode === 'lyrics' && (
            <div className="flex flex-col lg:flex-row items-center gap-8 h-full max-h-[65vh]">
              {/* Mini Artwork Left on Desktop */}
              <div className="hidden lg:flex flex-col items-center w-72 flex-shrink-0">
                <div className="w-64 h-64 rounded-2xl overflow-hidden bg-[#1c1c1e] border border-white/15 shadow-2xl mb-4">
                  <SafeImage
                    src={coverSrc}
                    track={currentTrack}
                    alt={currentTrack.title}
                    size={400}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-base font-bold text-white text-center truncate w-full">
                  {currentTrack.title}
                </h3>
                <p className="text-xs text-white/60 text-center truncate w-full">
                  {currentTrack.artist}
                </p>
                <button
                  onClick={() => setViewMode('artwork')}
                  className="mt-4 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
                >
                  Return to Artwork
                </button>
              </div>

              {/* Scrolling Lyrics Container Right */}
              <div className="flex-1 w-full h-full rounded-3xl bg-black/40 border border-white/10 p-4 sm:p-6 backdrop-blur-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-[#fa2d48]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Time-Synced Lyrics
                    </span>
                  </div>
                  <button
                    onClick={() => setViewMode('artwork')}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  <LyricsView track={currentTrack} />
                </div>
              </div>
            </div>
          )}

          {/* VIEW: QUEUE / UP NEXT MODE */}
          {viewMode === 'queue' && (
            <div className="flex flex-col h-full max-h-[65vh] rounded-3xl bg-black/40 border border-white/10 p-5 sm:p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-[#fa2d48]" />
                  <span className="text-sm font-bold text-white">
                    Up Next ({queue.length} songs)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 1 && (
                    <button
                      onClick={clearQueue}
                      className="text-xs text-white/60 hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('artwork')}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5">
                {queue.map((t, idx) => {
                  const isCurrent = t.id === currentTrack.id;
                  return (
                    <div
                      key={`queue_${t.id}_${idx}`}
                      onClick={() => playTrack(t, queue)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#fa2d48]/20 border border-[#fa2d48]/40 text-white'
                          : 'hover:bg-white/[0.08] text-white/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                          <img
                            src={getArtworkSrc(t, 100)}
                            alt={t.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold truncate">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-white/60 truncate">
                            {t.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#fa2d48] uppercase">
                            Playing
                          </span>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeFromQueue(t.id);
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Bottom Controls Section (Apple Music Player Bar) */}
      <footer className="w-full max-w-3xl mx-auto px-6 pb-6 pt-2 z-20 flex flex-col space-y-4 flex-shrink-0">
        {/* Scrubber Bar */}
        <AppleScrubber />

        {/* Primary Playback Buttons */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-full transition relative ${
              shuffle
                ? 'text-[#fa2d48] bg-[#fa2d48]/15'
                : 'text-white/60 hover:text-white'
            }`}
            title="Shuffle"
            aria-label="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
            {shuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#fa2d48]" />
            )}
          </button>

          {/* Center Playback Triad: Previous - Play/Pause - Next */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={prev}
              className="p-3 text-white/80 hover:text-white transition active:scale-90"
              title="Previous"
              aria-label="Previous track"
            >
              <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-black" />
              ) : (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-black ml-1" />
              )}
            </button>

            <button
              onClick={next}
              className="p-3 text-white/80 hover:text-white transition active:scale-90"
              title="Next"
              aria-label="Next track"
            >
              <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            </button>
          </div>

          {/* Right: Repeat Mode */}
          <button
            onClick={cycleRepeat}
            className={`p-3 rounded-full transition relative ${
              repeatMode !== 'off'
                ? 'text-[#fa2d48] bg-[#fa2d48]/15'
                : 'text-white/60 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
            aria-label={`Repeat mode ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#fa2d48]" />
            )}
          </button>
        </div>

        {/* Volume Slider Tray */}
        <div className="flex items-center justify-center gap-3 max-w-sm mx-auto w-full pt-1">
          <button
            onClick={toggleMute}
            className="text-white/60 hover:text-white transition"
            aria-label="Mute"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#fa2d48]"
            aria-label="Volume"
          />
        </div>
      </footer>
    </div>
  );
}
