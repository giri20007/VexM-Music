import React from 'react';
import { ListMusic, Play, Trash2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function PlaylistCard({ playlist, allTracks, onClick, onDelete }) {
  const playTrack = useAudioStore(s => s.playTrack);

  const playlistTracks = (playlist.trackIds || [])
    .map(id => allTracks.find(t => String(t.id) === String(id)))
    .filter(Boolean);

  const handlePlay = e => {
    e.stopPropagation();
    if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks);
    }
  };

  const firstTrackThumb = playlistTracks[0]?.thumbnail;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-3.5 rounded-2xl bg-[#111622] hover:bg-[#161c2b] border border-white/[0.06] hover:border-[#00a8e1]/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-md hover:shadow-2xl"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#00a8e1]/20 to-[#182030] border border-white/5 mb-3 flex items-center justify-center shadow-md">
        {firstTrackThumb ? (
          <img
            src={firstTrackThumb}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#00a8e1]/15 flex items-center justify-center text-[#00a8e1]">
            <ListMusic className="w-6 h-6" />
          </div>
        )}

        {/* Hover Play Button */}
        {playlistTracks.length > 0 && (
          <button
            onClick={handlePlay}
            className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#00a8e1] hover:bg-[#22d3ee] text-black flex items-center justify-center shadow-lg shadow-[#00a8e1]/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105"
            aria-label={`Play ${playlist.name}`}
          >
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white group-hover:text-[#00a8e1] transition-colors">
            {playlist.name}
          </h4>
          <p className="text-xs text-white/50 mt-0.5">
            Playlist · {playlistTracks.length} tracks
          </p>
        </div>

        {playlist.id !== 'favorites' && onDelete && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(playlist.id);
            }}
            className="p-1.5 text-warm-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded-lg hover:bg-white/5"
            title="Delete playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
