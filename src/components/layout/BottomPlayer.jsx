import React, { useState, memo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Maximize2,
  Heart,
  Sliders,
  Music2,
  Loader2,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';

// Isolated Scrubber Component with Progress Fill & Hover Tooltip
const BottomScrubber = memo(function BottomScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const [hoverPercent, setHoverPercent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayTime = isDragging ? dragValue : currentTime;
  const percent = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

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
    <div className="hidden md:flex items-center gap-3 w-full text-[11px] tabular-nums text-warm-muted font-mono select-none">
      <span className="w-8 text-right font-medium">{formatDuration(displayTime)}</span>
      <div
        className="relative flex-1 py-1.5 flex items-center group cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track Bar Background */}
        <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden transition-all group-hover:h-1.5">
          {/* Active Fill */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-[#00a8e1] rounded-full transition-all duration-75"
            style={{ width: `${percent}%` }}
          />
          {/* Hover Fill */}
          {hoverPercent !== null && (
            <div
              className="absolute top-0 left-0 bottom-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${hoverPercent * 100}%` }}
            />
          )}
        </div>

        {/* Real Range Input */}
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

        {/* Scrubber Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-[#00a8e1]/60 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${percent}%` }}
        />

        {/* Hover Time Tooltip */}
        {hoverPercent !== null && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white pointer-events-none shadow-xl"
            style={{ left: `${hoverPercent * 100}%` }}
          >
            {formatDuration(hoverPercent * duration)}
          </div>
        )}
      </div>
      <span className="w-8 text-left font-medium">{formatDuration(duration)}</span>
    </div>
  );
});

// Mobile Progress Line
const MobileProgressLine = memo(function MobileProgressLine() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="md:hidden absolute top-0 left-0 right-0 h-[2px] bg-white/10">
      <div
        className="h-full bg-[#00a8e1] transition-all duration-100"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
});

export const BottomPlayer = memo(function BottomPlayer() {
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

  const setNowPlayingOpen = useAudioStore(s => s.setNowPlayingOpen);
  const setQueueOpen = useAudioStore(s => s.setQueueOpen);
  const setEqualizerOpen = useAudioStore(s => s.setEqualizerOpen);

  const isLiked = currentTrack ? likedTrackIds.includes(String(currentTrack.id)) : false;

  if (!currentTrack) {
    return (
      <footer className="h-20 bg-[#0b0e14]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-center px-4 text-xs text-white/50 select-none">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-[#00a8e1] animate-pulse" />
          <span>Select a track from your library to start listening</span>
        </div>
      </footer>
    );
  }

  const coverSrc = getArtworkSrc(currentTrack);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-22 md:h-20 bg-[#0b0e14]/95 backdrop-blur-2xl border-t border-white/[0.08] flex flex-col justify-center px-3 sm:px-6 select-none shadow-2xl">
      {/* Mobile Top Scrubber Line */}
      <MobileProgressLine />

      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        {/* Left: Track Information & Like Button */}
        <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
          <div
            onClick={() => setNowPlayingOpen(true)}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#111622] border border-white/10 flex-shrink-0 cursor-pointer shadow-md group"
          >
            <SafeImage
              src={coverSrc}
              track={currentTrack}
              alt={currentTrack.title}
              size={100}
              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1 cursor-pointer overflow-hidden" onClick={() => setNowPlayingOpen(true)}>
            <h3 className="truncate text-xs sm:text-sm font-bold text-white hover:text-[#00a8e1] transition-colors">
              {currentTrack.title}
            </h3>
            <p className="truncate text-[11px] sm:text-xs text-white/50">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className={`p-1.5 rounded-full transition-transform hover:scale-125 active:scale-95 flex-shrink-0 ${
              isLiked ? 'text-[#fa2d48]' : 'text-white/40 hover:text-white'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#fa2d48]' : ''}`} />
          </button>
        </div>

        {/* Center: Playback Controls & Isolated Scrubber */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-lg min-w-0 px-2">
          {/* Controls Row */}
          <div className="flex items-center gap-3 sm:gap-5 mb-1">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition ${
                shuffle ? 'text-[#00a8e1] bg-[#00a8e1]/15 shadow-sm shadow-[#00a8e1]/20' : 'text-white/50 hover:text-white'
              }`}
              title={`Shuffle ${shuffle ? 'On' : 'Off'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prev}
              className="p-1.5 text-white/60 hover:text-white transition hover:scale-110 active:scale-95"
              title="Previous track"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>

            {/* Main Round Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-white/20"
              aria-label={isBuffering ? 'Buffering' : isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-4 h-4 animate-spin text-black stroke-[2.5]" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-black stroke-black" />
              ) : (
                <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-1.5 text-white/60 hover:text-white transition hover:scale-110 active:scale-95"
              title="Next track"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full transition ${
                repeatMode !== 'off' ? 'text-[#00a8e1] bg-[#00a8e1]/15 shadow-sm shadow-[#00a8e1]/20' : 'text-white/50 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Desktop Scrubber Progress Bar */}
          <BottomScrubber />
        </div>

        {/* Right: Extra Controls */}
        <div className="hidden md:flex items-center justify-end gap-2.5 w-1/4 sm:w-1/3 text-warm-muted">
          <button
            onClick={() => setNowPlayingOpen(true)}
            className="p-2 rounded-xl hover:bg-white/5 hover:text-warm-white transition"
            title="Lyrics & Track Details"
            aria-label="Open lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setEqualizerOpen(true)}
            className="p-2 rounded-xl hover:bg-white/5 hover:text-warm-white transition"
            title="Audio Equalizer & Spatializer"
            aria-label="Equalizer"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setQueueOpen(true)}
            className="relative p-2 rounded-xl hover:bg-white/5 hover:text-warm-white transition"
            title="Play Queue"
            aria-label="Open queue"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 1 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg hover:text-warm-white transition"
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
          </div>

          <button
            onClick={() => setNowPlayingOpen(true)}
            className="p-2 rounded-xl hover:bg-white/5 hover:text-warm-white transition ml-1"
            title="Full Screen View"
            aria-label="Fullscreen view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
});
