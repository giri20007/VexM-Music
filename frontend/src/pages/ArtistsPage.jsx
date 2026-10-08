import React, { useState } from 'react';
import { User, Play, ArrowLeft } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { ArtistCard } from '../components/library/ArtistCard';
import { formatDuration } from '../utils/formatters';
import { getArtistAvatarUrl } from '../utils/artworkGenerator';

export function ArtistsPage({ lib, selectedArtistName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [imgErr, setImgErr] = useState(false);

  const selectedArtist = selectedArtistName
    ? lib.artists.find(a => a.name === selectedArtistName)
    : null;

  if (selectedArtist) {
    const totalDuration = selectedArtist.tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const avatar = (!imgErr && selectedArtist.thumbnail) ? selectedArtist.thumbnail : getArtistAvatarUrl(selectedArtist.name, 400);

    return (
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none animate-fade-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Artists</span>
        </button>

        {/* Artist Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#2a1711] via-[#1d120e] to-bg-card border border-white/5 shadow-2xl">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-bg-card border-2 border-white/10 shadow-xl flex-shrink-0">
            <img
              src={avatar}
              alt={selectedArtist.name}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-2 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Artist</span>
            <h1 className="text-2xl sm:text-4xl font-black text-warm-white tracking-tight">
              {selectedArtist.name}
            </h1>
            <p className="text-xs sm:text-sm text-warm-muted">
              {selectedArtist.tracks.length} tracks · {formatDuration(totalDuration)} total
            </p>

            <div className="pt-2">
              <button
                onClick={() => playTrack(selectedArtist.tracks[0], selectedArtist.tracks)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Artist</span>
              </button>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
          {selectedArtist.tracks.map((t, idx) => (
            <TrackRow
              key={t.id}
              track={t}
              index={idx}
              showNumber={true}
              showCover={true}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
          Artists ({lib.artists.length})
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {lib.artists.map(artist => (
          <ArtistCard
            key={artist.name}
            artist={artist}
            onClick={() => onNavigate(`artist:${artist.name}`)}
          />
        ))}
      </div>
    </div>
  );
}
