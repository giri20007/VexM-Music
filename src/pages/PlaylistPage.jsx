import React from 'react';
import { ListMusic, Play, Shuffle, Trash2, ArrowLeft } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { formatDuration } from '../utils/formatters';

export function PlaylistPage({ playlistId, allTracks = [], onBack }) {
  const playlists = useAudioStore(s => s.playlists);
  const playTrack = useAudioStore(s => s.playTrack);
  const deletePlaylist = useAudioStore(s => s.deletePlaylist);
  const removeTrackFromPlaylist = useAudioStore(s => s.removeTrackFromPlaylist);

  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    return (
      <div className="p-12 text-center text-warm-muted">
        <p>Playlist not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-1.5 rounded-full bg-white/10 text-xs text-warm-white">
          Back to Library
        </button>
      </div>
    );
  }

  const tracks = (playlist.trackIds || [])
    .map(id => allTracks.find(t => String(t.id) === String(id)))
    .filter(Boolean);

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffleAll = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Playlist Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#2a1711] via-[#1d120e] to-bg-card border border-white/5 shadow-2xl">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[#3b2017] to-bg-active flex items-center justify-center text-accent shadow-xl flex-shrink-0">
          <ListMusic className="w-14 h-14" />
        </div>

        <div className="space-y-2 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Playlist</span>
          <h1 className="text-2xl sm:text-4xl font-black text-warm-white tracking-tight">
            {playlist.name}
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted">
            {tracks.length} tracks · {formatDuration(totalDuration)} total
          </p>

          <div className="flex items-center gap-3 pt-2">
            {tracks.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play</span>
                </button>
                <button
                  onClick={handleShuffleAll}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 transition"
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </>
            )}

            {playlist.id !== 'favorites' && (
              <button
                onClick={() => {
                  if (confirm(`Delete playlist "${playlist.name}"?`)) {
                    deletePlaylist(playlist.id);
                    onBack();
                  }
                }}
                className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 border border-white/5 transition ml-auto"
                title="Delete playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Playlist Tracks */}
      {tracks.length > 0 ? (
        <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
          {tracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}_${idx}`}
              track={track}
              index={idx}
              showNumber={true}
              showAlbum={true}
              showCover={true}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/5 rounded-2xl space-y-2">
          <p className="font-semibold text-warm-white">This playlist is empty</p>
          <p className="text-xs text-warm-muted/70">
            Add tracks from your Library to this playlist.
          </p>
        </div>
      )}
    </div>
  );
}
