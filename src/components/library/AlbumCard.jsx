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
      className="group relative flex flex-col p-3 rounded-2xl bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-md hover:shadow-2xl"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#202020] shadow-lg mb-3">
        <SafeImage
          src={album.thumbnail}
          track={sampleTrack}
          alt={album.name}
          size={350}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Vex-M Floating Accent Play Button */}
        <button
          onClick={handlePlayAlbum}
          className={`absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white flex items-center justify-center shadow-xl shadow-[#fa2d48]/40 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
            isThisAlbumPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play album ${album.name}`}
        >
          {isThisAlbumPlaying ? (
            <Pause className="w-5 h-5 fill-white stroke-white" />
          ) : (
            <Play className="w-5 h-5 fill-white stroke-white ml-0.5" />
          )}
        </button>

        {album.year && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10">
            {album.year}
          </span>
        )}
      </div>

      {/* Album Info */}
      <h4 className="truncate text-sm font-bold text-white group-hover:text-[#fa2d48] transition-colors">
        {album.name}
      </h4>
      <p className="truncate text-xs text-white/50 mt-1">
        {album.artist || 'Various Artists'}
      </p>
      <span className="text-[11px] text-white/35 mt-0.5 font-mono">
        {albumTracks.length} {albumTracks.length === 1 ? 'song' : 'songs'}
      </span>
    </div>
  );
}
