import React, { useState } from 'react';
import { Disc3, Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function AlbumCard({ album, onClick }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [imgErr, setImgErr] = useState(false);

  const handlePlayAlbum = e => {
    e.stopPropagation();
    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/8 hover:border-white/15 transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-bg-secondary border border-white/8 mb-3 shadow-inner">
        {album.thumbnail && !imgErr ? (
          <img
            src={album.thumbnail}
            alt={album.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-card to-bg-active text-accent/40">
            <Disc3 className="w-12 h-12" />
          </div>
        )}

        {/* Hover Play Overlay Button */}
        <button
          onClick={handlePlayAlbum}
          className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95 z-10"
          aria-label={`Play album ${album.name}`}
        >
          <Play className="w-5 h-5 fill-bg-primary stroke-bg-primary ml-0.5" />
        </button>

        {album.year && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-warm-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {album.year}
          </span>
        )}
      </div>

      <h4 className="truncate text-xs sm:text-sm font-bold text-warm-white group-hover:text-accent transition-colors">
        {album.name}
      </h4>
      <p className="truncate text-[11px] sm:text-xs text-warm-muted mt-0.5">
        {album.artist} · {album.tracks?.length || 0} tracks
      </p>
    </div>
  );
}
