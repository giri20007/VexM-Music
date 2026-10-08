import React, { useState, memo } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
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
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { seek } from '../../hooks/usePlayer';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc, getTrackArtworkUrl } from '../../utils/artworkGenerator';
import { LyricsView } from './LyricsView';
import { TrackDetails } from './TrackDetails';

// Isolated Scrubber component to prevent full modal re-renders during playback timeupdates
const ModalScrubber = memo(function ModalScrubber() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);

  return (
    <div className="space-y-1 select-none">
      <input
        type="range"
        min="0"
        max={duration || 1}
        step="0.5"
        value={Math.min(currentTime, duration || 0)}
        onChange={e => seek(Number(e.target.value))}
        aria-label="Seek time"
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
      />
      <div className="flex items-center justify-between text-xs tabular-nums text-warm-muted font-medium pt-1">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
});

export function NowPlayingModal() {
  const isNowPlayingOpen = useAudioStore(s => s.isNowPlayingOpen);
  const setNowPlayingOpen = useAudioStore(s => s.setNowPlayingOpen);
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
  const playTrack = useAudioStore(s => s.playTrack);
  const removeFromQueue = useAudioStore(s => s.removeFromQueue);

  const [activeTab, setActiveTab] = useState('lyrics'); // lyrics | upnext | details
  const [imgError, setImgError] = useState(false);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.includes(String(currentTrack.id));
  const quality = formatQualityBadge(currentTrack);
  const coverSrc = !imgError ? getArtworkSrc(currentTrack) : getTrackArtworkUrl(currentTrack, 600);
  const upNextTracks = queue.filter(t => t.id !== currentTrack.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary text-warm-white overflow-y-auto animate-fade-in select-none">
      {/* Dynamic Blurred Background Artwork */}
      <div
        className="absolute inset-0 opacity-20 filter blur-3xl pointer-events-none -z-10 bg-cover bg-center transition-all duration-1000 scale-125"
        style={{ backgroundImage: `url(${coverSrc})` }}
      />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-bg-secondary/40 backdrop-blur-md">
        <button
          onClick={() => setNowPlayingOpen(false)}
          className="p-2 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Context Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-warm-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Playing from SPiDEYxFLASH</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNowPlayingOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
            aria-label="Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-10 items-center">
        {/* Left Column: Artwork, Track Info, Scrubber, Controls */}
        <div className="lg:col-span-6 flex flex-col justify-center max-w-lg mx-auto w-full space-y-6">
          {/* Large Square Artwork */}
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-bg-card shadow-2xl border border-white/10 group">
            <img
              src={coverSrc}
              alt={currentTrack.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover shadow-inner transition-transform duration-500 group-hover:scale-102"
            />
          </div>

          {/* Track Info & Like */}
          <div className="space-y-1.5">
            {/* Format Badge & Album Title */}
            <div className="flex items-center gap-2 text-xs">
              {quality && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${quality.color}`}>
                  {quality.label}
                </span>
              )}
              {currentTrack.album && currentTrack.album !== 'Unknown Album' && (
                <span className="text-warm-muted truncate text-xs font-medium">
                  {currentTrack.album}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold tracking-tight text-warm-white truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm font-medium text-warm-muted truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <button
                onClick={() => toggleLike(currentTrack.id)}
                className={`p-2 rounded-full transition hover:scale-110 flex-shrink-0 ${
                  isLiked ? 'text-accent' : 'text-warm-muted hover:text-white'
                }`}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-accent' : ''}`} />
              </button>
            </div>
          </div>

          {/* Isolated Scrubber Progress Bar */}
          <ModalScrubber />

          {/* Playback Controls Row */}
          <div className="flex items-center justify-between px-2 pt-2">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition ${shuffle ? 'text-accent' : 'text-warm-muted hover:text-white'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={prev}
              className="p-2 text-warm-muted hover:text-white transition hover:scale-110"
              aria-label="Previous track"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            {/* Prominent Circular Play Button */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-xl shadow-accent/30 hover:scale-105 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-bg-primary stroke-bg-primary" />
              ) : (
                <Play className="w-7 h-7 fill-bg-primary stroke-bg-primary ml-1" />
              )}
            </button>

            <button
              onClick={next}
              className="p-2 text-warm-muted hover:text-white transition hover:scale-110"
              aria-label="Next track"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 transition ${repeatMode !== 'off' ? 'text-accent' : 'text-warm-muted hover:text-white'}`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 pt-2">
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
        </div>

        {/* Right Column: 3-Tab Panel (Lyrics, Up Next, Details) */}
        <div className="lg:col-span-6 h-[550px] flex flex-col rounded-3xl bg-bg-secondary/70 border border-white/10 backdrop-blur-xl p-6 shadow-2xl">
          {/* Panel Header Tabs */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-bg-card border border-white/5">
              <button
                onClick={() => setActiveTab('lyrics')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'lyrics'
                    ? 'bg-accent text-bg-primary shadow-md'
                    : 'text-warm-muted hover:text-white'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() => setActiveTab('upnext')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'upnext'
                    ? 'bg-accent text-bg-primary shadow-md'
                    : 'text-warm-muted hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Up next · {upNextTracks.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'details'
                    ? 'bg-accent text-bg-primary shadow-md'
                    : 'text-warm-muted hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
            </div>
          </div>

          {/* Panel Tab View Body */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'lyrics' && <LyricsView track={currentTrack} />}

            {activeTab === 'upnext' && (
              <div className="h-full overflow-y-auto pr-2 space-y-1.5 no-scrollbar">
                {upNextTracks.length === 0 ? (
                  <p className="p-8 text-center text-xs text-warm-muted">No upcoming tracks.</p>
                ) : (
                  upNextTracks.map((t, i) => (
                    <div
                      key={`${t.id}_${i}`}
                      className="group flex items-center justify-between gap-3 p-2 rounded-xl bg-bg-card hover:bg-bg-cardHover border border-white/5 text-xs transition"
                    >
                      <div
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                          <img
                            src={getArtworkSrc(t)}
                            alt={t.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-warm-white group-hover:text-accent">
                            {t.title}
                          </p>
                          <p className="truncate text-[10px] text-warm-muted">{t.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-warm-muted">
                        <span className="tabular-nums text-[11px]">{formatDuration(t.duration)}</span>
                        <button
                          onClick={() => removeFromQueue(t.id)}
                          className="p-1 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'details' && <TrackDetails track={currentTrack} />}
          </div>
        </div>
      </main>
    </div>
  );
}
