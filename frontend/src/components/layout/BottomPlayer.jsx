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
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/formatters';
import { getTrackArtworkUrl } from '../../utils/artworkGenerator';

// Isolated Scrubber Component to prevent bottom player re-renders
const BottomScrubber = memo(function BottomScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);

  return (
    <div className="hidden md:flex items-center gap-2.5 w-full text-[11px] tabular-nums text-warm-muted">
      <span className="w-8 text-right">{formatDuration(currentTime)}</span>
      <div className="relative flex-1 flex items-center">
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.5"
          value={Math.min(currentTime, duration || 0)}
          onChange={e => seek(Number(e.target.value))}
          aria-label="Seek track position"
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
      </div>
      <span className="w-8 text-left">{formatDuration(duration)}</span>
    </div>
  );
});

// Mobile Progress Line
const MobileProgressLine = memo(function MobileProgressLine() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-white/10">
      <div
        className="h-full bg-accent transition-all duration-100"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
});

export const BottomPlayer = memo(function BottomPlayer() {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
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

  const [imgErr, setImgErr] = useState(false);

  const isLiked = currentTrack ? likedTrackIds.includes(String(currentTrack.id)) : false;

  if (!currentTrack) {
    return (
      <footer className="h-20 bg-bg-secondary/95 backdrop-blur-lg border-t border-white/5 flex items-center justify-center px-4 text-xs text-warm-muted select-none">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-accent animate-pulse" />
          <span>Select a track from your library to start listening</span>
        </div>
      </footer>
    );
  }

  const fallbackArt = getTrackArtworkUrl(currentTrack, 200);
  const coverSrc = (!imgErr && currentTrack.thumbnail) ? currentTrack.thumbnail : fallbackArt;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-22 md:h-20 bg-bg-secondary/98 backdrop-blur-xl border-t border-white/5 flex flex-col justify-center px-3 sm:px-6 select-none shadow-2xl">
      {/* Mobile Top Scrubber Line */}
      <MobileProgressLine />

      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        {/* Left: Track Information & Like Button */}
        <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
          <div
            onClick={() => setNowPlayingOpen(true)}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-bg-card border border-white/5 flex-shrink-0 cursor-pointer shadow-md group"
          >
            <img
              src={coverSrc}
              alt={currentTrack.title}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setNowPlayingOpen(true)}>
            <h3 className="truncate text-xs sm:text-sm font-semibold text-warm-white hover:text-accent transition-colors">
              {currentTrack.title}
            </h3>
            <p className="truncate text-[11px] sm:text-xs text-warm-muted">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className={`p-1.5 rounded-full transition hover:scale-110 flex-shrink-0 ${
              isLiked ? 'text-accent' : 'text-warm-muted hover:text-warm-white'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
          </button>
        </div>

        {/* Center: Playback Controls & Isolated Scrubber */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-lg min-w-0 px-2">
          {/* Controls Row */}
          <div className="flex items-center gap-3 sm:gap-5 mb-1">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition hover:text-white ${
                shuffle ? 'text-accent' : 'text-warm-muted'
              }`}
              title="Shuffle"
              aria-label="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prev}
              className="p-1.5 text-warm-muted hover:text-warm-white transition hover:scale-105"
              title="Previous"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>

            {/* Main Round Pink Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition-all"
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
              className="p-1.5 text-warm-muted hover:text-warm-white transition hover:scale-105"
              title="Next"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full transition hover:text-white ${
                repeatMode !== 'off' ? 'text-accent' : 'text-warm-muted'
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
            title="Audio Equalizer"
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
            {queue.length > 0 && (
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
