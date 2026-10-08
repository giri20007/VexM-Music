import React from 'react';
import { User, Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function ArtistCard({ artist, onClick }) {
  const playTrack = useAudioStore(s => s.playTrack);

  const handlePlayArtist = e => {
    e.stopPropagation();
    if (artist.tracks && artist.tracks.length > 0) {
      playTrack(artist.tracks[0], artist.tracks);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col items-center p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 transition-all duration-200 cursor-pointer text-center"
    >
      <div className="relative w-28 h-28 rounded-full overflow-hidden bg-[#1d120e] border border-white/10 mb-3 shadow-lg">
        {artist.thumbnail ? (
          <img
            src={artist.thumbnail}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-card to-bg-active text-accent/50">
            <User className="w-12 h-12" />
          </div>
        )}

        {/* Hover Play Button */}
        <button
          onClick={handlePlayArtist}
          className="absolute right-1 bottom-1 w-9 h-9 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105"
          aria-label={`Play artist ${artist.name}`}
        >
          <Play className="w-4 h-4 fill-bg-primary stroke-bg-primary ml-0.5" />
        </button>
      </div>

      <h4 className="truncate w-full text-sm font-semibold text-warm-white group-hover:text-accent transition-colors">
        {artist.name}
      </h4>
      <p className="text-xs text-warm-muted mt-0.5">
        Artist · {artist.tracks?.length || 0} tracks
      </p>
    </div>
  );
}
