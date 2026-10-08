import React, { memo, useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtistArtworkSrc } from '../../utils/artworkGenerator';

export const ArtistCard = memo(function ArtistCard({ artist, onClick }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [imgErr, setImgErr] = useState(false);

  const handlePlayArtist = e => {
    e.stopPropagation();
    if (artist.tracks && artist.tracks.length > 0) {
      playTrack(artist.tracks[0], artist.tracks);
    }
  };

  const avatarSrc = !imgErr ? getArtistArtworkSrc(artist, 300) : getArtistArtworkSrc(artist.name, 300);
  const trackCount = artist.tracks?.length || 0;
  const albumCount = artist.albums?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col items-center p-4 rounded-3xl bg-bg-card hover:bg-bg-cardHover border border-white/5 hover:border-accent/30 transition-all duration-300 cursor-pointer text-center shadow-lg hover:shadow-accent/10 hover:-translate-y-1"
    >
      {/* Circular Artist Portrait with subtle outer ring & glow */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-bg-secondary border-2 border-white/10 mb-3 shadow-xl group-hover:border-accent/60 group-hover:shadow-accent/20 transition-all duration-300">
        <img
          src={avatarSrc}
          alt={artist.name}
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Floating Hover Play Button */}
        <button
          onClick={handlePlayArtist}
          className="absolute right-1 bottom-1 w-10 h-10 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-xl opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label={`Play all songs by ${artist.name}`}
          title={`Play all songs by ${artist.name}`}
        >
          <Play className="w-5 h-5 fill-bg-primary stroke-bg-primary ml-0.5" />
        </button>
      </div>

      {/* Artist Name */}
      <h4 className="truncate w-full text-sm font-bold text-warm-white group-hover:text-accent transition-colors">
        {artist.name}
      </h4>

      {/* Track & Album Count */}
      <p className="text-[11px] font-medium text-warm-muted mt-1 truncate max-w-full">
        {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
        {albumCount > 0 ? ` · ${albumCount} ${albumCount === 1 ? 'album' : 'albums'}` : ''}
      </p>
    </div>
  );
});

