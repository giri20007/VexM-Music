import React from 'react';
import { Play, Pause, Music2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { artworkUrl } from '../../utils/api';

export function TrackCard({ track, onPlay }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;

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

  const coverSrc = track.thumbnail || artworkUrl(track.id, track.title);

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative flex items-center gap-3.5 p-2 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 transition-all duration-200 cursor-pointer overflow-hidden ${
        isCurrent ? 'ring-1 ring-accent/40 bg-bg-active' : ''
      }`}
    >
      {/* Artwork Thumbnail */}
      <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-[#1f1410] border border-white/5 shadow-md">
        <img
          src={coverSrc}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={e => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden w-full h-full items-center justify-center bg-bg-card text-accent">
          <Music2 className="w-6 h-6" />
        </div>

        {/* Play overlay button on image */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg text-bg-primary transform active:scale-95">
            {isCurrentPlaying ? (
              <Pause className="w-4 h-4 fill-bg-primary stroke-bg-primary" />
            ) : (
              <Play className="w-4 h-4 fill-bg-primary stroke-bg-primary ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div className="min-w-0 flex-1 pr-2">
        <h4 className={`truncate text-sm font-semibold tracking-tight ${isCurrent ? 'text-accent' : 'text-warm-white'}`}>
          {track.title}
        </h4>
        <p className="truncate text-xs text-warm-muted mt-0.5">
          {track.artist}
        </p>
      </div>
    </div>
  );
}
