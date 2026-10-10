import React, { useState, memo } from 'react';
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
  Info,
  Moon,
  Sparkles,
  Disc3,
  Activity,
  Sliders,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Loader2,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc, getTrackArtworkUrl } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';
import { LyricsView } from './LyricsView';
import { TrackDetails } from './TrackDetails';
import { AudioVisualizer, MiniBeatVisualizer } from './AudioVisualizer';
import { FullscreenVisualizerModal } from './FullscreenVisualizerModal';

// Isolated Scrubber Component with Progress Fill and Hover Tooltip
const ModalScrubber = memo(function ModalScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const [hoverPercent, setHoverPercent] = useState(null);

  const percent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPercent(Math.max(0, Math.min(1, pos)));
  };

  const handleMouseLeave = () => {
    setHoverPercent(null);
  };

  return (
    <div className="space-y-1.5 select-none w-full">
      <div
        className="relative group py-2 cursor-pointer flex items-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track background */}
        <div className="relative w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden transition-all group-hover:h-2.5">
          {/* Active Progress Fill */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#f093fb] rounded-full transition-all duration-75"
            style={{ width: `${percent}%` }}
          />

          {/* Hover Preview Fill */}
          {hoverPercent !== null && (
            <div
              className="absolute top-0 left-0 bottom-0 bg-white/20 rounded-full pointer-events-none"
              style={{ width: `${hoverPercent * 100}%` }}
            />
          )}
        </div>

        {/* Real Range Input Overlay */}
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={e => seek(Number(e.target.value))}
          aria-label="Seek track position"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {/* Glowing Scrubber Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-cyan-400/60 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${percent}%` }}
        />

        {/* Hover Tooltip Timestamp */}
        {hoverPercent !== null && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 backdrop-blur-md border border-white/15 text-[11px] font-mono text-warm-white pointer-events-none shadow-xl"
            style={{ left: `${hoverPercent * 100}%` }}
          >
            {formatDuration(hoverPercent * duration)}
          </div>
        )}
      </div>

      {/* Timestamp labels */}
      <div className="flex items-center justify-between text-xs tabular-nums text-warm-muted font-medium px-0.5 font-mono">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
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
  const shuffleQueue = useAudioStore(s => s.shuffleQueue);
  const moveInQueue = useAudioStore(s => s.moveInQueue);

  // View state: 'artwork' | 'lyrics' | 'visualizer'
  const [viewMode, setViewMode] = useState('artwork');
  const [activeDrawer, setActiveDrawer] = useState(null); // null | 'queue' | 'details'
  const [isFullscreenVisualizerOpen, setIsFullscreenVisualizerOpen] = useState(false);

  // Quick Switching Keyboard Hotkeys (V = Visualizer, L = Lyrics, A = Artwork, Esc = Minimize)
  React.useEffect(() => {
    if (!isNowPlayingOpen) return;
    const handleKeyDown = e => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'v') {
        e.preventDefault();
        setViewMode('visualizer');
      } else if (key === 'l') {
        e.preventDefault();
        setViewMode('lyrics');
      } else if (key === 'a') {
        e.preventDefault();
        setViewMode('artwork');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeDrawer) {
          setActiveDrawer(null);
        } else {
          setNowPlayingOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNowPlayingOpen, activeDrawer, setNowPlayingOpen]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.includes(String(currentTrack.id));
  const quality = formatQualityBadge(currentTrack);
  const coverSrc = getArtworkSrc(currentTrack, 600);
  const upNextTracks = queue.filter(t => t.id !== currentTrack.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070709] text-warm-white overflow-hidden animate-fade-in select-none">
      {/* 1. Dynamic Ambient Backdrop with Multi-Layered Blur & Vignette */}
      <div
        className="absolute inset-0 opacity-25 filter blur-3xl pointer-events-none -z-20 bg-cover bg-center transition-all duration-1000 scale-125 transform"
        style={{ backgroundImage: `url(${coverSrc})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#070709]/80 to-[#070709] pointer-events-none -z-10" />

      {/* Dynamic Animated Pulse Aura (Multi-Color Mesh Gradient) */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[130px] pointer-events-none -z-10 transition-opacity duration-700 ${
          isPlaying ? 'opacity-80 animate-pulse-slow' : 'opacity-20'
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 35%, #7F00FF 0%, transparent 60%), radial-gradient(circle at 65% 65%, #00F2FE 0%, transparent 60%)',
        }}
      />

      {/* 2. Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl z-20 flex-shrink-0">
        <button
          onClick={() => setNowPlayingOpen(false)}
          className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-warm-muted hover:text-white transition backdrop-blur-md border border-white/5 shadow-sm"
          title="Minimize player (Esc)"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Center Context & Audio Quality Pill */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-sm">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] sm:text-xs font-semibold text-warm-white/90">
            SPiDEYxFLASH
          </span>
          {quality && (
            <>
              <span className="text-white/20 text-xs">•</span>
              <span className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded border ${quality.color}`}>
                {quality.label}
              </span>
            </>
          )}
        </div>

        {/* Top Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sleep Timer */}
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`p-2 sm:p-2.5 rounded-full transition relative backdrop-blur-md border border-white/5 ${
              sleepTimer
                ? 'text-accent bg-accent/20 border-accent/40 shadow-md shadow-accent/20'
                : 'text-warm-muted hover:text-white bg-white/5 hover:bg-white/15'
            }`}
            title="Sleep Timer"
            aria-label="Sleep timer"
          >
            <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {sleepTimer && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-ping" />
            )}
          </button>

          {/* Equalizer Modal Trigger */}
          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2 sm:p-2.5 rounded-full text-warm-muted hover:text-white bg-white/5 hover:bg-white/15 transition backdrop-blur-md border border-white/5"
            title="Audio Equalizer & Spatializer"
            aria-label="Equalizer"
          >
            <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Details / Audio Info Drawer Toggle */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'details' ? null : 'details')}
            className={`p-2 sm:p-2.5 rounded-full transition backdrop-blur-md border border-white/5 ${
              activeDrawer === 'details'
                ? 'text-accent bg-accent/20 border-accent/40'
                : 'text-warm-muted hover:text-white bg-white/5 hover:bg-white/15'
            }`}
            title="Track Specifications & Output Diagnostics"
            aria-label="Track details"
          >
            <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Queue Drawer Toggle */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'queue' ? null : 'queue')}
            className={`p-2 sm:p-2.5 rounded-full transition relative backdrop-blur-md border border-white/5 ${
              activeDrawer === 'queue'
                ? 'text-accent bg-accent/20 border-accent/40'
                : 'text-warm-muted hover:text-white bg-white/5 hover:bg-white/15'
            }`}
            title="Play Queue"
            aria-label="Open queue"
          >
            <ListMusic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {queue.length > 1 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-accent text-bg-primary text-[10px] font-black shadow">
                {queue.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3. Hero Main Stage Container */}
      <main className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto no-scrollbar relative z-10">
        {/* Mode Switcher Pill */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl mb-3 sm:mb-4 shadow-lg flex-shrink-0">
          <button
            onClick={() => setViewMode('artwork')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'artwork'
                ? 'bg-gradient-to-r from-[#00f2fe] via-[#f093fb] to-[#ff5858] text-bg-primary shadow-lg shadow-cyan-500/25'
                : 'text-warm-muted hover:text-white hover:bg-white/5'
            }`}
            title="Switch to Artwork (Press 'A')"
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Artwork</span>
            <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-black/30 opacity-70">A</kbd>
          </button>

          <button
            onClick={() => setViewMode('lyrics')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'lyrics'
                ? 'bg-gradient-to-r from-[#00f2fe] via-[#f093fb] to-[#ff5858] text-bg-primary shadow-lg shadow-cyan-500/25'
                : 'text-warm-muted hover:text-white hover:bg-white/5'
            }`}
            title="Switch to Synced Lyrics (Press 'L')"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Synced Lyrics</span>
            <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-black/30 opacity-70">L</kbd>
          </button>

          <button
            onClick={() => setViewMode('visualizer')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'visualizer'
                ? 'bg-gradient-to-r from-[#00f2fe] via-[#f093fb] to-[#ff5858] text-bg-primary shadow-lg shadow-cyan-500/25'
                : 'text-warm-muted hover:text-white hover:bg-white/5'
            }`}
            title="Switch to 360° Visualizer (Press 'V')"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>360° Visualizer</span>
            <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-black/30 opacity-70">V</kbd>
          </button>
        </div>

        {/* Center Display Area (Artwork vs Lyrics vs Visualizer) */}
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 my-auto py-2">
          {/* MODE 1: HERO ARTWORK */}
          {viewMode === 'artwork' && (
            <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-5 animate-scale-up">
              {/* Large Rounded Artwork Card with Soft Ambient Glow */}
              <div className="relative aspect-square w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[430px] rounded-3xl overflow-hidden bg-bg-card border border-white/15 shadow-2xl shadow-black/80 group">
                <SafeImage
                  src={coverSrc}
                  track={currentTrack}
                  alt={currentTrack.title}
                  size={600}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
                />

                {/* Ambient Highlight Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Buffering Radar Ripple Effect Overlay */}
                {isBuffering && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20 animate-fade-in">
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-cyan-500/20 animate-ping absolute" />
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00f2fe] to-[#f093fb] flex items-center justify-center text-bg-primary shadow-xl shadow-cyan-500/30 animate-spin">
                        <Loader2 className="w-7 h-7 stroke-[2.5]" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-warm-white tracking-wide bg-black/70 px-3 py-1 rounded-full border border-white/10 shadow-lg">
                      Buffering Hi-Res Stream...
                    </span>
                  </div>
                )}

                {/* Verified Cover Badge */}
                {currentTrack.artworkConfidence >= 60 && !isBuffering && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-[11px] font-bold text-accent shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Verified Art</span>
                  </div>
                )}

                {/* Hover Trigger for 360° Visualizer */}
                <button
                  onClick={() => setViewMode('visualizer')}
                  className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs font-bold text-accent flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl group-hover:translate-y-0 translate-y-2 hover:scale-105"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Open 360° VFX</span>
                </button>
              </div>

              {/* Centered Typography & Like Button */}
              <div className="w-full text-center space-y-1.5 px-2">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-warm-white tracking-tight truncate max-w-[85%]">
                    {currentTrack.title}
                  </h2>
                  <button
                    onClick={() => toggleLike(currentTrack.id)}
                    className={`p-1.5 rounded-full transition-transform hover:scale-125 active:scale-95 flex-shrink-0 ${
                      isLiked ? 'text-accent' : 'text-warm-muted hover:text-white'
                    }`}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart className={`w-6 h-6 ${isLiked ? 'fill-accent' : ''}`} />
                  </button>
                </div>

                <p className="text-sm sm:text-base font-semibold text-warm-muted/90 truncate">
                  {currentTrack.artist}
                  {currentTrack.album && currentTrack.album !== 'Unknown Album' && (
                    <span className="text-warm-muted/50 font-normal"> • {currentTrack.album}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* MODE 2: FLUID SYNCED LYRICS */}
          {viewMode === 'lyrics' && (
            <div className="w-full max-w-3xl h-[420px] sm:h-[480px] flex flex-col rounded-3xl bg-black/30 border border-white/10 backdrop-blur-xl p-4 sm:p-6 shadow-2xl animate-scale-up">
              {/* Floating Track Info Mini Pill */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <SafeImage
                    src={coverSrc}
                    track={currentTrack}
                    alt={currentTrack.title}
                    size={80}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-warm-white text-xs sm:text-sm truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-[11px] text-warm-muted truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleLike(currentTrack.id)}
                  className={`p-1.5 rounded-full transition hover:scale-110 ${
                    isLiked ? 'text-accent' : 'text-warm-muted hover:text-white'
                  }`}
                  aria-label={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-accent' : ''}`} />
                </button>
              </div>

              {/* Fluid Lyrics Stream View */}
              <div className="flex-1 min-h-0">
                <LyricsView track={currentTrack} />
              </div>
            </div>
          )}

          {/* MODE 3: 360° AUDIO VISUALIZER WITH DYNAMIC AMBIENT GLOW & TRACK CONTEXT */}
          {viewMode === 'visualizer' && (
            <div className="relative w-full max-w-xl flex flex-col items-center animate-scale-up">
              {/* Dynamic Soft Ambient Glow Backing */}
              <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-tr from-[#7F00FF]/25 via-[#00F2FE]/20 to-[#FF007F]/25 filter blur-[80px] pointer-events-none -z-10 animate-pulse-slow" />

              {/* Top Track Context Header (Title, Artist, Album, Quality) */}
              <div className="w-full flex items-center justify-between px-3 py-2 mb-2 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-xs z-10 shadow-lg">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-card flex-shrink-0 border border-white/10">
                    <SafeImage src={coverSrc} track={currentTrack} alt={currentTrack.title} size={80} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-warm-white truncate text-xs sm:text-sm">{currentTrack.title}</p>
                    <p className="text-[11px] text-warm-muted truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {quality && (
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${quality.color}`}>
                      {quality.label}
                    </span>
                  )}
                  <button
                    onClick={() => toggleLike(currentTrack.id)}
                    className={`p-1.5 rounded-full transition hover:scale-110 ${isLiked ? 'text-accent' : 'text-warm-muted hover:text-white'}`}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Visualizer Canvas Container */}
              <div className="w-full aspect-square max-h-[440px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-black/30 backdrop-blur-xl relative">
                <AudioVisualizer
                  onToggleFullscreen={() => setIsFullscreenVisualizerOpen(true)}
                  onCollapse={() => setViewMode('artwork')}
                  interactive={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Floating Glass Playback Dock */}
        <div className="w-full max-w-2xl mx-auto p-4 sm:p-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-3.5 flex-shrink-0 mt-2">
          {/* Scrubber Progress Bar */}
          <ModalScrubber />

          {/* Main Controls Row */}
          <div className="flex items-center justify-between px-2 sm:px-6">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition ${
                shuffle ? 'text-accent bg-accent/15 shadow-sm shadow-accent/20' : 'text-warm-muted hover:text-white'
              }`}
              title={`Shuffle ${shuffle ? 'On' : 'Off'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Previous Track */}
            <button
              onClick={prev}
              className="p-2 sm:p-3 text-warm-muted hover:text-white transition-all hover:scale-110 active:scale-95"
              title="Previous track"
              aria-label="Previous track"
            >
              <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            {/* Main Glowing Round Centerpiece Play/Pause Button */}
            <button
              onClick={togglePlay}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#00f2fe] via-[#f093fb] to-[#ff5858] text-bg-primary flex items-center justify-center shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 ${
                isPlaying && !isBuffering ? 'ring-4 ring-cyan-400/30 animate-pulse-slow' : ''
              }`}
              aria-label={isBuffering ? 'Buffering' : isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-bg-primary stroke-[2.5]" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-bg-primary stroke-bg-primary" />
              ) : (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-bg-primary stroke-bg-primary ml-1" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={next}
              className="p-2 sm:p-3 text-warm-muted hover:text-white transition-all hover:scale-110 active:scale-95"
              title="Next track"
              aria-label="Next track"
            >
              <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-full transition ${
                repeatMode !== 'off' ? 'text-accent bg-accent/15 shadow-sm shadow-accent/20' : 'text-warm-muted hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* Sub Dock (Volume Slider & Mini Visualizer) */}
          <div className="flex items-center justify-between gap-4 pt-1 px-1 border-t border-white/5 text-xs text-warm-muted">
            {/* Volume Control */}
            <div className="flex items-center gap-2 max-w-[180px] w-full">
              <button
                onClick={toggleMute}
                className="text-warm-muted hover:text-white transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={e => setVolume(Number(e.target.value))}
                aria-label="Volume slider"
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Mini Beat Visualizer */}
            <div className="hidden sm:flex items-center justify-center">
              <MiniBeatVisualizer
                onExpand={() => setViewMode('visualizer')}
                width={180}
                height={20}
                barCount={22}
              />
            </div>

            {/* Drawer Quick Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'lyrics' ? 'artwork' : 'lyrics')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'lyrics' ? 'text-accent bg-accent/15' : 'hover:text-white'
                }`}
                title="Toggle lyrics"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Lyrics</span>
              </button>

              <button
                onClick={() => setActiveDrawer(activeDrawer === 'queue' ? null : 'queue')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  activeDrawer === 'queue' ? 'text-accent bg-accent/15' : 'hover:text-white'
                }`}
                title="Toggle Queue"
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Queue</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Slide-In Overlays (Queue & Details Drawers) */}
      {activeDrawer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveDrawer(null)}
        >
          <div
            className="w-full max-w-md h-full bg-[#100b09] border-l border-white/10 shadow-2xl flex flex-col animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-bg-card">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-warm-white">
                  {activeDrawer === 'queue' ? 'Play Queue' : 'Track Specifications & Diagnostics'}
                </h3>
                {activeDrawer === 'queue' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">
                    {queue.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeDrawer === 'queue' && queue.length > 1 && (
                  <>
                    <button
                      onClick={shuffleQueue}
                      className="p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/5 transition"
                      title="Shuffle queue"
                      aria-label="Shuffle queue"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearQueue}
                      className="p-1.5 rounded-lg text-warm-muted hover:text-red-400 hover:bg-white/5 transition"
                      title="Clear queue"
                      aria-label="Clear queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/5 transition"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {activeDrawer === 'queue' ? (
                <div className="space-y-4">
                  {/* Current Track */}
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-accent uppercase mb-2">
                      Now Playing
                    </p>
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/10 border border-accent/30 shadow-md">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-card flex-shrink-0 border border-white/10">
                        <SafeImage
                          src={coverSrc}
                          track={currentTrack}
                          alt={currentTrack.title}
                          size={100}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-accent">{currentTrack.title}</p>
                        <p className="truncate text-[11px] text-warm-muted">{currentTrack.artist}</p>
                      </div>
                      <span className="text-xs text-warm-muted tabular-nums font-mono">
                        {formatDuration(currentTrack.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Up Next List */}
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-warm-muted uppercase mb-2">
                      Up Next ({upNextTracks.length})
                    </p>

                    {upNextTracks.length === 0 ? (
                      <div className="p-8 text-center text-warm-muted text-xs border border-dashed border-white/10 rounded-2xl">
                        <ListMusic className="w-8 h-8 opacity-30 mx-auto mb-2" />
                        <p className="font-semibold text-warm-white/80">No more tracks in queue</p>
                        <p className="text-[11px] text-warm-muted/60 mt-1">
                          Click any track or playlist in your library to queue more songs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {queue.map((t, idx) => {
                          if (t.id === currentTrack.id) return null;
                          const cover = getArtworkSrc(t, 100);

                          return (
                            <div
                              key={`${t.id}_${idx}`}
                              className="group flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 hover:border-accent/30 text-xs transition shadow-sm"
                            >
                              <div
                                onClick={() => playTrack(t, queue)}
                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-bg-secondary flex-shrink-0 border border-white/5">
                                  <SafeImage src={cover} track={t} alt={t.title} size={80} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-bold text-warm-white group-hover:text-accent transition-colors">
                                    {t.title}
                                  </p>
                                  <p className="truncate text-[10px] text-warm-muted">{t.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="tabular-nums font-mono text-[11px] text-warm-muted mr-1">
                                  {formatDuration(t.duration)}
                                </span>
                                <button
                                  onClick={() => moveInQueue(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="p-1 rounded-lg text-warm-muted hover:text-white disabled:opacity-20 transition"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveInQueue(idx, idx + 1)}
                                  disabled={idx === queue.length - 1}
                                  className="p-1 rounded-lg text-warm-muted hover:text-white disabled:opacity-20 transition"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeFromQueue(t.id)}
                                  className="p-1 rounded-lg text-warm-muted hover:text-red-400 transition ml-1"
                                  title="Remove from queue"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <TrackDetails track={currentTrack} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Fullscreen Visualizer Modal */}
      <FullscreenVisualizerModal
        isOpen={isFullscreenVisualizerOpen}
        onClose={() => setIsFullscreenVisualizerOpen(false)}
      />
    </div>
  );
}
