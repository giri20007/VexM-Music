import React, { useState } from 'react';
import { ListMusic, Play, Shuffle, Trash2, ArrowLeft, Share2, Check } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { formatDuration } from '../utils/formatters';

export function PlaylistPage({ playlistId, allTracks = [], onBack, onNavigate }) {
  const playlists = useAudioStore(s => s.playlists);
  const playTrack = useAudioStore(s => s.playTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const deletePlaylist = useAudioStore(s => s.deletePlaylist);
  const [copied, setCopied] = useState(false);

  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    return (
      <div className="flex-1 w-full bg-transparent text-white p-12 text-center text-white/50 space-y-4">
        <p>Playlist not found.</p>
        <button onClick={onBack} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs text-white">
          Back to Library
        </button>
      </div>
    );
  }

  const tracks = (playlist.trackIds || [])
    .map(id => allTracks.find(t => String(t.id) === String(id)))
    .filter(Boolean);

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const isPlaylistPlaying = tracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffleAll = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleSharePlaylist = async () => {
    const url = `${window.location.origin}/playlist/${encodeURIComponent(playlist.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${playlist.name} - Vex-M Playlist`,
          text: `Check out playlist "${playlist.name}" on Vex-M`,
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition group py-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </button>

        {/* Playlist Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 pt-2 pb-2">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-[#181818] border border-white/10 flex items-center justify-center text-white shadow-2xl flex-shrink-0">
            <ListMusic className="w-16 h-16 text-[#fa2d48]" />
          </div>

          <div className="space-y-3 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">
              Playlist
            </span>
            <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
              {playlist.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/50">
              {tracks.length} tracks · {formatDuration(totalDuration)}
            </p>

            <div className="flex items-center gap-3 pt-2">
              {tracks.length > 0 && (
                <>
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-lg shadow-[#fa2d48]/30 hover:scale-105 active:scale-95 transition"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                    <span>{isPlaylistPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    onClick={handleShuffleAll}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 transition"
                    title="Shuffle"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                onClick={handleSharePlaylist}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 transition"
                title="Share playlist"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>

              {playlist.id !== 'favorites' && (
                <button
                  onClick={() => {
                    if (confirm(`Delete playlist "${playlist.name}"?`)) {
                      deletePlaylist(playlist.id);
                      onBack();
                    }
                  }}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/10 transition ml-auto"
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
          <div className="bg-white/[0.03] backdrop-blur-md p-2 rounded-2xl border border-white/[0.06] space-y-1">
            {tracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}_${idx}`}
                track={track}
                index={idx}
                showNumber={true}
                showAlbum={true}
                showCover={true}
                onPlay={trk => playTrack(trk, tracks)}
              />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
            <ListMusic className="w-12 h-12 text-white/20 mx-auto" />
            <p className="font-bold text-white">This playlist is empty</p>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Add tracks from your Library or Search results to this playlist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
