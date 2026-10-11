import React from 'react';
import { Play, Pause } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { SafeImage } from '../ui/SafeImage';

export function AlbumCard({ album, onClick }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const albumTracks = album.tracks || [];
  const isThisAlbumPlaying = albumTracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAlbum = e => {
    e.stopPropagation();
    if (isThisAlbumPlaying) {
      togglePlay();
    } else if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  const sampleTrack = albumTracks[0] || { title: album.name, artist: album.artist };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3.5 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#242424] shadow-lg mb-3">
        <SafeImage
          src={album.thumbnail}
          track={sampleTrack}
          alt={album.name}
          size={350}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Spotify Iconic Floating Green Play Button */}
        <button
          onClick={handlePlayAlbum}
          className={`absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-black/60 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
            isThisAlbumPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play album ${album.name}`}
        >
          {isThisAlbumPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>

        {album.year && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white/90">
            {album.year}
          </span>
        )}
      </div>

      {/* Album Info */}
      <h4 className="truncate text-sm font-bold text-white group-hover:underline">
        {album.name}
      </h4>
      <p className="truncate text-xs text-[#b3b3b3] mt-1">
        {album.artist || 'Various Artists'}
      </p>
      <span className="text-[11px] text-[#808080] mt-0.5">
        {albumTracks.length} {albumTracks.length === 1 ? 'song' : 'songs'}
      </span>
    </div>
  );
}
