import React, { memo, useState } from 'react';
import { Play, Pause, Heart, Plus, Music2, MoreHorizontal } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration, formatQualityBadge } from '../../utils/formatters';
import { getArtworkSrc, getTrackArtworkUrl } from '../../utils/artworkGenerator';
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

  const [hasImgError, setHasImgError] = useState(false);
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

  const coverSrc = !hasImgError ? getArtworkSrc(track) : getTrackArtworkUrl(track, 120);

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
        className={`group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 cursor-pointer ${
          isCurrent ? 'bg-bg-active text-white' : 'hover:bg-bg-card text-warm-white'
        }`}
      >
        {/* Left: Index / Play Icon + Cover + Title/Artist */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showNumber && (
            <div className="w-6 text-center text-xs font-medium text-warm-muted group-hover:text-warm-white">
              <span className="group-hover:hidden">{isCurrentPlaying ? '▶' : index !== undefined ? index + 1 : ''}</span>
              <button
                onClick={handlePlayClick}
                className="hidden group-hover:inline-flex items-center justify-center text-accent"
                aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
              >
                {isCurrentPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            </div>
          )}

          {showCover && (
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-bg-card border border-white/5">
              <img
                src={coverSrc}
                alt={track.title}
                onError={() => setHasImgError(true)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className={`truncate font-medium text-[13.5px] ${isCurrent ? 'text-accent font-semibold' : 'text-warm-white'}`}>
              {track.title}
            </p>
            <p className="truncate text-xs text-warm-muted">
              {track.artist}
              {showAlbum && track.album && track.album !== 'Unknown Album' ? ` · ${track.album}` : ''}
            </p>
          </div>
        </div>

        {/* Center: Format Badge */}
        {quality && (
          <div className="hidden sm:block">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${quality.color}`}>
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
            className={`p-1.5 rounded-full transition hover:scale-110 ${
              isLiked ? 'text-accent fill-accent' : 'opacity-0 group-hover:opacity-100 text-warm-muted hover:text-white'
            }`}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
          </button>

          <span className="w-10 text-right tabular-nums text-warm-muted">
            {formatDuration(track.duration)}
          </span>

          <button
            onClick={e => {
              e.stopPropagation();
              enqueue(track);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
            title="Add to queue"
            aria-label="Add to queue"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleMoreClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
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
