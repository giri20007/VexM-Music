import React, { memo, useState } from 'react';
import { Play, Pause, Heart, Plus, Music2, MoreHorizontal } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';
import { TrackContextMenu } from '../layout/TrackContextMenu';

export const TrackRow = memo(function TrackRow({
  track,
  index,
  showNumber = true,
  showAlbum = false,
  showCover = true,
  onPlay,
}) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const toggleLike = useAudioStore(s => s.toggleLike);
  const enqueue = useAudioStore(s => s.enqueue);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const isLiked = likedTrackIds.includes(String(track.id));
  const quality = formatQualityBadge(track);

  const handlePlayClick = e => {
    e.stopPropagation();
    if (isCurrent) {
      useAudioStore.getState().togglePlay();
    } else if (onPlay) {
      onPlay(track);
    } else {
      useAudioStore.getState().playTrack(track);
    }
  };

  const coverSrc = getArtworkSrc(track, 120);

  const handleContextMenu = e => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleMoreClick = e => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left - 180, y: rect.bottom + 5 });
    setMenuOpen(true);
  };

  return (
    <>
      <div
        onClick={handlePlayClick}
        onContextMenu={handleContextMenu}
        className={`group relative flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200 cursor-pointer select-none border border-transparent ${
          isCurrent
            ? 'bg-bg-active text-white border-accent/20 shadow-sm'
            : 'hover:bg-bg-card/90 hover:border-white/5 text-warm-white'
        }`}
      >
        {/* Left: Index / Play Icon + Cover + Title/Artist */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {showNumber && (
            <div className="w-6 text-center text-xs font-mono font-medium text-warm-muted group-hover:text-warm-white flex items-center justify-center flex-shrink-0">
              <span className="group-hover:hidden">{isCurrentPlaying ? '▶' : index !== undefined ? index + 1 : ''}</span>
              <button
                onClick={handlePlayClick}
                className="hidden group-hover:inline-flex items-center justify-center text-accent transition-transform hover:scale-125"
                aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
              >
                {isCurrentPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            </div>
          )}

          {showCover && (
            <div className="relative w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden bg-bg-card border border-white/10 shadow-sm group/cover">
              <SafeImage
                src={coverSrc}
                track={track}
                alt={track.title}
                size={120}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity">
                {isCurrentPlaying ? <Pause className="w-3.5 h-3.5 text-accent fill-current" /> : <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />}
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold text-[13.5px] ${isCurrent ? 'text-accent' : 'text-warm-white group-hover:text-warm-white'}`}>
              {track.title}
            </p>
            <p className="truncate text-xs text-warm-muted group-hover:text-warm-muted/90">
              {track.artist}
              {showAlbum && track.album && track.album !== 'Unknown Album' ? ` · ${track.album}` : ''}
            </p>
          </div>
        </div>

        {/* Center: Audio Quality Pill */}
        {quality && (
          <div className="hidden sm:block flex-shrink-0">
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border shadow-xs ${quality.color}`}>
              {quality.label}
            </span>
          </div>
        )}

        {/* Right: Like + Duration + Actions */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-warm-muted flex-shrink-0">
          <button
            onClick={e => {
              e.stopPropagation();
              toggleLike(track.id);
            }}
            className={`p-1.5 rounded-full transition-transform hover:scale-125 ${
              isLiked ? 'text-accent fill-accent' : 'opacity-0 group-hover:opacity-100 text-warm-muted hover:text-white'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
          </button>

          <span className="w-12 text-right tabular-nums font-mono text-[11px] text-warm-muted">
            {formatDuration(track.duration)}
          </span>

          <button
            onClick={e => {
              e.stopPropagation();
              enqueue(track);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-warm-muted hover:text-white transition"
            title="Add to queue"
            aria-label="Add to queue"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleMoreClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-warm-muted hover:text-white transition"
            title="More options"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <TrackContextMenu
        track={track}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        position={menuPos}
      />
    </>
  );
});
