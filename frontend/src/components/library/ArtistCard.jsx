import React, { memo, useState } from 'react';
import { Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtistAvatarUrl } from '../../utils/artworkGenerator';

export const ArtistCard = memo(function ArtistCard({ artist, onClick }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [imgErr, setImgErr] = useState(false);

  const handlePlayArtist = e => {
    e.stopPropagation();
    if (artist.tracks && artist.tracks.length > 0) {
      playTrack(artist.tracks[0], artist.tracks);
    }
  };

  const avatarSrc = (!imgErr && artist.thumbnail) ? artist.thumbnail : getArtistAvatarUrl(artist.name);

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col items-center p-4 rounded-3xl bg-bg-card hover:bg-bg-cardHover border border-white/5 transition-all duration-200 cursor-pointer text-center"
    >
      <div className="relative w-28 h-28 rounded-full overflow-hidden bg-[#1d120e] border border-white/10 mb-3 shadow-lg group-hover:border-accent/40 transition">
        <img
          src={avatarSrc}
          alt={artist.name}
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

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
});
