import React, { memo } from 'react';
import { Play, Pause } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtistArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';

export const ArtistCard = memo(function ArtistCard({ artist, onClick }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const artistTracks = artist.tracks || [];
  const isThisArtistPlaying = artistTracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayArtist = e => {
    e.stopPropagation();
    if (isThisArtistPlaying) {
      togglePlay();
    } else if (artistTracks.length > 0) {
      playTrack(artistTracks[0], artistTracks);
    }
  };

  const avatarSrc = getArtistArtworkSrc(artist, 350);

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3 rounded-2xl bg-[#141414] hover:bg-[#1e1e1e] border border-white/[0.06] hover:border-white/15 transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl text-center"
    >
      {/* Circular Artist Avatar */}
      <div className="relative aspect-square w-full rounded-full overflow-hidden bg-[#202020] shadow-xl mb-3">
        <SafeImage
          src={avatarSrc}
          fallbackType="artist"
          artistName={artist.name}
          alt={artist.name}
          size={350}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Floating Red Play Button on Avatar Hover */}
        <button
          onClick={handlePlayArtist}
          className={`absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white flex items-center justify-center shadow-xl shadow-[#fa2d48]/40 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
            isThisArtistPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play artist ${artist.name}`}
        >
          {isThisArtistPlaying ? (
            <Pause className="w-5 h-5 fill-white stroke-white" />
          ) : (
            <Play className="w-5 h-5 fill-white stroke-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Artist Name & Tag */}
      <h4 className="truncate text-sm font-bold text-white group-hover:text-[#fa2d48] transition-colors">
        {artist.name}
      </h4>
      <p className="truncate text-xs text-white/50 mt-0.5">
        Artist
      </p>
    </div>
  );
});
