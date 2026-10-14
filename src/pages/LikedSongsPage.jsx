import React from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { formatDuration } from '../utils/formatters';

export function LikedSongsPage({ allTracks = [], onNavigate }) {
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const playTrack = useAudioStore(s => s.playTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const likedTracks = allTracks.filter(t => likedTrackIds.includes(String(t.id)));
  const totalDuration = likedTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const isLikedPlaying = likedTracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    if (isLikedPlaying) {
      togglePlay();
    } else if (likedTracks.length > 0) {
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
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 pt-4 pb-2">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-br from-[#00a8e1] to-[#8b5cf6] flex items-center justify-center text-white shadow-2xl flex-shrink-0">
            <Heart className="w-16 h-16 fill-white stroke-white" />
          </div>

          <div className="space-y-3 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00a8e1]">
              Playlist
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Liked Songs
            </h1>
            <p className="text-xs sm:text-sm text-white/50">
              {likedTracks.length} tracks · {formatDuration(totalDuration)}
            </p>

            {/* Action Buttons */}
            {likedTracks.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00a8e1] hover:bg-[#22d3ee] text-white font-bold text-xs shadow-lg shadow-[#00a8e1]/30 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                  <span>{isLikedPlaying ? 'Pause' : 'Play All'}</span>
                </button>

                <button
                  onClick={handleShuffleAll}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 transition active:scale-95"
                  title="Shuffle liked tracks"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Track List */}
        {likedTracks.length > 0 ? (
          <div className="bg-[#111622] p-2 rounded-2xl border border-white/[0.06] space-y-1">
            {likedTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                showNumber={true}
                showAlbum={true}
                showCover={true}
                onPlay={trk => playTrack(trk, likedTracks)}
              />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
            <Heart className="w-12 h-12 mx-auto text-rose-500/30" />
            <p className="font-bold text-white text-base">No liked songs yet</p>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Click the heart icon on any track while playing or browsing to save it to your Liked Songs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
