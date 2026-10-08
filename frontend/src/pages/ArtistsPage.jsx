import React, { useState } from 'react';
import { User, Play, Shuffle, Share2, Check, ArrowLeft, Disc3, Sparkles } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { ArtistCard } from '../components/library/ArtistCard';
import { AlbumCard } from '../components/library/AlbumCard';
import { formatDuration } from '../utils/formatters';
import { getArtistArtworkSrc } from '../utils/artworkGenerator';

export function ArtistsPage({ lib, selectedArtistName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [imgErr, setImgErr] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedArtist = selectedArtistName
    ? lib.artists.find(a => a.name.toLowerCase() === selectedArtistName.toLowerCase())
    : null;

  const handleShare = async artist => {
    const url = `${window.location.origin}/#artist:${encodeURIComponent(artist.name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${artist.name} - SPiDEYxFLASH`,
          text: `Listen to ${artist.name} on SPiDEYxFLASH`,
          url,
        });
        return;
      } catch {
        /* fallback to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleShuffleArtist = artist => {
    if (!artist?.tracks?.length) return;
    const shuffled = [...artist.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  if (selectedArtist) {
    const totalDuration = selectedArtist.tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const avatar = !imgErr ? getArtistArtworkSrc(selectedArtist, 500) : getArtistArtworkSrc(selectedArtist.name, 500);
    const albums = selectedArtist.albums || [];

    return (
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 select-none animate-fade-in">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Artists</span>
        </button>

        {/* Artist Hero Header */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#2a1711] via-[#1d120e] to-bg-card border border-white/5 shadow-2xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          {/* Large Circular Artist Portrait */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden bg-bg-card border-4 border-white/10 shadow-2xl flex-shrink-0 group">
            <img
              src={avatar}
              alt={selectedArtist.name}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Artist Information & Actions */}
          <div className="space-y-3 flex-1 min-w-0 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/20">
                Artist
              </span>
              <span className="text-[11px] font-bold text-warm-muted">
                {selectedArtist.tracks.length} {selectedArtist.tracks.length === 1 ? 'track' : 'tracks'}
              </span>
              {albums.length > 0 && (
                <span className="text-[11px] font-bold text-warm-muted">
                  · {albums.length} {albums.length === 1 ? 'album' : 'albums'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-warm-white tracking-tight truncate">
              {selectedArtist.name}
            </h1>

            <p className="text-xs sm:text-sm text-warm-muted">
              {formatDuration(totalDuration)} total playtime
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => playTrack(selectedArtist.tracks[0], selectedArtist.tracks)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Artist</span>
              </button>

              <button
                onClick={() => handleShuffleArtist(selectedArtist)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 text-xs font-semibold hover:scale-105 active:scale-95 transition"
                title="Shuffle Artist"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={() => handleShare(selectedArtist)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white border border-white/5 text-xs font-semibold transition"
                title="Share Artist"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Albums by this Artist (if any) */}
        {albums.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-warm-muted flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-accent" />
                <span>Albums</span>
              </h3>
              <span className="text-xs text-warm-muted">{albums.length} albums</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums.map(album => (
                <AlbumCard
                  key={album.name}
                  album={album}
                  onClick={() => onNavigate(`album:${album.name}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Discography / Tracks by this Artist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-warm-muted">
              All Tracks ({selectedArtist.tracks.length})
            </h3>
          </div>

          <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
            {selectedArtist.tracks.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx}
                showNumber={true}
                showCover={true}
                showAlbum={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Artists ({lib.artists.length})
          </h1>
          <p className="text-xs text-warm-muted mt-0.5">
            Discover all artists featured in your Telegram music collection
          </p>
        </div>
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

