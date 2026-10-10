import React, { useEffect, useState, memo } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  Waves,
  Sparkles,
  Heart,
  Minimize2,
  Mic2,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { AudioVisualizer } from './AudioVisualizer';
import { LyricsView } from './LyricsView';

const FullscreenScrubber = memo(function FullscreenScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayTime = isDragging ? dragValue : currentTime;

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
    <div className="w-full max-w-2xl mx-auto space-y-1 select-none">
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
        aria-label="Seek time"
        className="w-full h-1.5 bg-white/10 hover:bg-white/20 rounded-full appearance-none cursor-pointer transition-all"
      />
      <div className="flex items-center justify-between text-xs tabular-nums text-warm-muted font-medium pt-0.5 font-mono">
        <span>{formatDuration(displayTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
});

export function FullscreenVisualizerModal({ isOpen, onClose }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const volume = useAudioStore(s => s.volume);
  const isMuted = useAudioStore(s => s.isMuted);
  const shuffle = useAudioStore(s => s.shuffle);
  const repeatMode = useAudioStore(s => s.repeatMode);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);

  const togglePlay = useAudioStore(s => s.togglePlay);
  const next = useAudioStore(s => s.next);
  const prev = useAudioStore(s => s.prev);
  const toggleShuffle = useAudioStore(s => s.toggleShuffle);
  const cycleRepeat = useAudioStore(s => s.cycleRepeat);
  const setVolume = useAudioStore(s => s.setVolume);
  const toggleMute = useAudioStore(s => s.toggleMute);
  const toggleLike = useAudioStore(s => s.toggleLike);

  const visualizerMode = useSettingsStore(s => s.visualizerMode);
  const setVisualizerMode = useSettingsStore(s => s.setVisualizerMode);

  // Mobile active tab: 'visualizer' | 'lyrics'
  const [mobileTab, setMobileTab] = useState('visualizer');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.includes(String(currentTrack.id));
  const quality = formatQualityBadge(currentTrack);
  const coverSrc = getArtworkSrc(currentTrack, 400);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080507] text-warm-white animate-fade-in select-none overflow-hidden font-sans">
      {/* Dynamic Background Blur Layer */}
      <div
        className="absolute inset-0 opacity-15 filter blur-3xl pointer-events-none -z-10 bg-cover bg-center scale-125"
        style={{ backgroundImage: `url(${coverSrc})` }}
      />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="brand-neon-container flex items-center gap-2">
            <span className="brand-text-neon text-sm sm:text-base">
              SPiDEY<span className="brand-x-neon">x</span>FLASH
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent">
              Immersive Mode
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
          <button
            onClick={() => setVisualizerMode('orbital')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
              visualizerMode === 'orbital'
                ? 'bg-accent text-bg-primary shadow'
                : 'text-warm-muted hover:text-white hover:bg-white/10'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Round VFX</span>
          </button>

          <button
            onClick={() => setVisualizerMode('spectrum')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
              visualizerMode === 'spectrum'
                ? 'bg-accent text-bg-primary shadow'
                : 'text-warm-muted hover:text-white hover:bg-white/10'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Spectrum</span>
          </button>

          <button
            onClick={() => setVisualizerMode('wave')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
              visualizerMode === 'wave'
                ? 'bg-accent text-bg-primary shadow'
                : 'text-warm-muted hover:text-white hover:bg-white/10'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Wave</span>
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex sm:hidden items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10">
          <button
            onClick={() => setMobileTab('visualizer')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mobileTab === 'visualizer' ? 'bg-accent text-bg-primary' : 'text-warm-muted'
            }`}
          >
            Visualizer
          </button>
          <button
            onClick={() => setMobileTab('lyrics')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mobileTab === 'lyrics' ? 'bg-accent text-bg-primary' : 'text-warm-muted'
            }`}
          >
            Lyrics
          </button>
        </div>

        {/* Right: Minimize / Close Button */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-warm-muted hover:text-white transition border border-white/5"
          title="Exit Fullscreen (ESC)"
          aria-label="Exit fullscreen"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area: Split Dual-Panel on Desktop (Visualizer Left, Synced Lyrics Right) */}
      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8 items-center overflow-hidden">
        {/* Left Column: Audio Visualizer */}
        <div
          className={`lg:col-span-6 h-full flex flex-col items-center justify-center relative overflow-hidden rounded-3xl bg-black/40 border border-white/5 backdrop-blur-md shadow-2xl p-4 ${
            mobileTab !== 'visualizer' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <AudioVisualizer
            mode={visualizerMode}
            interactive={false}
            className="w-full h-full border-none bg-transparent shadow-none"
          />
        </div>

        {/* Right Column: Synchronized Lyrics Panel */}
        <div
          className={`lg:col-span-6 h-full flex flex-col rounded-3xl bg-bg-secondary/60 border border-white/10 backdrop-blur-xl p-6 shadow-2xl overflow-hidden ${
            mobileTab !== 'lyrics' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-warm-muted">
              <Mic2 className="w-4 h-4 text-accent" />
              <span>Synchronized Lyrics</span>
            </div>
            <span className="text-[11px] text-warm-muted/60">Click any line to seek</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <LyricsView track={currentTrack} />
          </div>
        </div>
      </main>

      {/* Bottom Floating Player Controls Bar */}
      <footer className="px-6 py-4 border-t border-white/5 bg-black/60 backdrop-blur-xl z-10 space-y-3">
        {/* Scrubber */}
        <FullscreenScrubber />

        {/* Bottom Bar: Track Info + Playback Controls + Volume */}
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          {/* Left: Floating Track Pill with Thumbnail */}
          <div className="flex items-center gap-3 min-w-0 max-w-xs">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-card border border-white/10 shadow-lg flex-shrink-0">
              <img src={coverSrc} alt={currentTrack.title} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-warm-white">{currentTrack.title}</p>
                {quality && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${quality.color}`}>
                    {quality.label}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-warm-muted">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className={`p-1.5 rounded-full transition hover:scale-110 flex-shrink-0 ${
                isLiked ? 'text-accent' : 'text-warm-muted hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
            </button>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition ${shuffle ? 'text-accent' : 'text-warm-muted hover:text-white'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prev}
              className="p-2 text-warm-muted hover:text-white transition hover:scale-110"
              aria-label="Previous track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-lg shadow-accent/30 hover:scale-105 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-bg-primary stroke-bg-primary" />
              ) : (
                <Play className="w-5 h-5 fill-bg-primary stroke-bg-primary ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-2 text-warm-muted hover:text-white transition hover:scale-110"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 transition ${repeatMode !== 'off' ? 'text-accent' : 'text-warm-muted hover:text-white'}`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: Volume & Exit */}
          <div className="flex items-center gap-3 max-w-[180px] w-full justify-end">
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
              className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white transition ml-1"
              title="Minimize"
              aria-label="Minimize visualizer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
