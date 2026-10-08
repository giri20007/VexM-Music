import React, { useState } from 'react';
import { Disc3, Play, Shuffle, Share2, Check, ArrowLeft, Music, Sparkles } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { formatDuration, formatQualityBadge } from '../utils/formatters';
import { getArtworkSrc } from '../utils/artworkGenerator';

export function AlbumsPage({ lib, selectedAlbumName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [copied, setCopied] = useState(false);

  const selectedAlbum = selectedAlbumName
    ? lib.albums.find(a => a.name === selectedAlbumName)
    : null;

  const handleShare = async album => {
    const url = `${window.location.origin}/#album:${encodeURIComponent(album.name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${album.name} - ${album.artist}`,
          text: `Listen to album "${album.name}" on SPiDEYxFLASH`,
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

  const handleShuffleAlbum = album => {
    if (!album?.tracks?.length) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  if (selectedAlbum) {
    const firstTrack = selectedAlbum.tracks[0];
    const coverSrc = getArtworkSrc(firstTrack, 600) || selectedAlbum.thumbnail;
    const totalDuration = selectedAlbum.tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const qualityBadge = firstTrack ? formatQualityBadge(firstTrack) : null;
    const isTelegramCover = firstTrack?.artworkConfidence >= 60;

    return (
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none animate-fade-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Albums</span>
        </button>

        {/* Album Banner */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#2a1711] via-[#1d120e] to-bg-card border border-white/5 shadow-2xl">
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

          {/* High-Res Artwork */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-bg-card border border-white/10 shadow-2xl flex-shrink-0 group">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={selectedAlbum.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent/40 bg-gradient-to-br from-[#24130d] to-bg-card">
                <Disc3 className="w-20 h-20" />
              </div>
            )}

            {isTelegramCover && (
              <div
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[10px] font-bold text-accent"
                title="Verified Telegram Cover Artwork"
              >
                <Sparkles className="w-3 h-3" />
                <span>Telegram Cover</span>
              </div>
            )}
          </div>

          {/* Album Information */}
          <div className="space-y-3 flex-1 min-w-0 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/20">
                Album
              </span>
              {qualityBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${qualityBadge.color}`}>
                  {qualityBadge.label}
                </span>
              )}
              {selectedAlbum.year && (
                <span className="text-[11px] font-bold text-warm-muted">
                  {selectedAlbum.year}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-warm-white tracking-tight truncate">
              {selectedAlbum.name}
            </h1>

            <p className="text-xs sm:text-sm text-warm-muted">
              <span className="text-warm-white font-semibold">{selectedAlbum.artist}</span> · {selectedAlbum.tracks.length} tracks · {formatDuration(totalDuration)}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Album</span>
              </button>

              <button
                onClick={() => handleShuffleAlbum(selectedAlbum)}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 hover:scale-105 active:scale-95 transition"
                title="Shuffle Album"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleShare(selectedAlbum)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white border border-white/5 text-xs font-semibold transition"
                title="Share Album"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Album Tracklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-muted">Tracks</h3>
            <span className="text-xs text-warm-muted">{selectedAlbum.tracks.length} songs</span>
          </div>

          <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
            {selectedAlbum.tracks.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx}
                showNumber={true}
                showCover={false}
                showAlbum={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Albums ({lib.albums.length})
          </h1>
          <p className="text-xs text-warm-muted mt-0.5">
            Auto-grouped from your Telegram audio files with matched artwork
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {lib.albums.map(album => (
          <AlbumCard
            key={album.name}
            album={album}
            onClick={() => onNavigate(`album:${album.name}`)}
          />
        ))}
      </div>
    </div>
  );
}
