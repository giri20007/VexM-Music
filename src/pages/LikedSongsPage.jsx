import React from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AppFooter } from '../components/layout/AppFooter';
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
    <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#240b10] via-[#150709] to-[#0a0a0a] border border-[#fa2d48]/20 shadow-2xl">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[#fa2d48] to-[#990024] flex items-center justify-center text-white shadow-xl shadow-[#fa2d48]/20 flex-shrink-0">
            <Heart className="w-14 h-14 fill-white stroke-white" />
          </div>

          <div className="space-y-2 flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#fa2d48] px-2.5 py-0.5 rounded-full bg-[#fa2d48]/15 border border-[#fa2d48]/30">
              Personal Collection
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Liked Songs
            </h1>
            <p className="text-xs sm:text-sm text-white/50">
              {likedTracks.length} tracks · {formatDuration(totalDuration)} total duration
            </p>

            {/* Action Buttons */}
            {likedTracks.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-lg shadow-[#fa2d48]/30 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                  <span>{isLikedPlaying ? 'Pause' : 'Play All'}</span>
                </button>

                <button
                  onClick={handleShuffleAll}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 transition"
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
          <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.08] space-y-1">
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

      {/* Global Footer */}
      <AppFooter onNavigate={onNavigate} />
    </div>
  );
}
