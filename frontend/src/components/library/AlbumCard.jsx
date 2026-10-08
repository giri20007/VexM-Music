import React from 'react';
import { Disc3, Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function AlbumCard({ album, onClick }) {
  const playTrack = useAudioStore(s => s.playTrack);

  const handlePlayAlbum = e => {
    e.stopPropagation();
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 transition-all duration-200 cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#1d120e] border border-white/5 mb-3 shadow-md">
        {album.thumbnail ? (
          <img
            src={album.thumbnail}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-card to-bg-active text-accent/50">
            <Disc3 className="w-12 h-12" />
          </div>
        )}

        {/* Hover Play Button */}
        <button
          onClick={handlePlayAlbum}
          className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105"
          aria-label={`Play album ${album.name}`}
        >
          <Play className="w-5 h-5 fill-bg-primary stroke-bg-primary ml-0.5" />
        </button>
      </div>

      <h4 className="truncate text-sm font-semibold text-warm-white group-hover:text-accent transition-colors">
        {album.name}
      </h4>
      <p className="truncate text-xs text-warm-muted mt-0.5">
        {album.artist} · {album.tracks?.length || 0} tracks
      </p>
    </div>
  );
}
