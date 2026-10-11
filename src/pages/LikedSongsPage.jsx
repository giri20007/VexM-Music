import React from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { formatDuration } from '../utils/formatters';

export function LikedSongsPage({ allTracks = [] }) {
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const playTrack = useAudioStore(s => s.playTrack);

  const likedTracks = allTracks.filter(t => likedTrackIds.includes(String(t.id)));
  const totalDuration = likedTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  const handleShuffleAll = () => {
    if (likedTracks.length > 0) {
      const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#3a1818] via-[#241412] to-bg-card border border-white/5 shadow-2xl">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-accent to-[#e11d48] flex items-center justify-center text-bg-primary shadow-xl flex-shrink-0">
          <Heart className="w-12 h-12 sm:w-16 sm:h-16 fill-bg-primary stroke-bg-primary" />
        </div>

        <div className="space-y-2 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Playlist</span>
          <h1 className="text-2xl sm:text-4xl font-black text-warm-white tracking-tight">
            Liked Songs
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted">
            {likedTracks.length} tracks · {formatDuration(totalDuration)} total duration
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {likedTracks.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play All</span>
          </button>

          <button
            onClick={handleShuffleAll}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 transition"
            title="Shuffle liked tracks"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Track List */}
      {likedTracks.length > 0 ? (
        <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
          {likedTracks.map((track, idx) => (
            <TrackRow
              key={track.id}
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
          <Heart className="w-8 h-8 mx-auto text-warm-muted/40" />
          <p className="font-semibold text-warm-white">No liked songs yet</p>
          <p className="text-xs text-warm-muted/70">
            Click the heart icon on any track to save it to your Liked Songs.
          </p>
        </div>
      )}
    </div>
  );
}
