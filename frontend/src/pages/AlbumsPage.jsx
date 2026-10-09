import React, { useState, useMemo } from 'react';
import { Disc3, Play, Shuffle, Share2, Check, ArrowLeft, Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { formatDuration, formatQualityBadge } from '../utils/formatters';
import { getArtworkSrc } from '../utils/artworkGenerator';

export function AlbumsPage({ lib, selectedAlbumName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPill, setFilterPill] = useState('all'); // all | recent | title | artist | year
  const [sortBy, setSortBy] = useState('recent'); // recent | alpha | artist | trackCount

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

  // Filtered & Sorted Albums
  const filteredAlbums = useMemo(() => {
    let result = [...lib.albums];
    const clean = searchQuery.trim().toLowerCase();

    if (clean) {
      result = result.filter(
        a =>
          a.name.toLowerCase().includes(clean) ||
          a.artist.toLowerCase().includes(clean) ||
          (a.year && String(a.year).includes(clean))
      );
    }

    if (filterPill === 'recent') {
      // Sort by recent
      result.sort((a, b) => (b.tracks?.[0]?.date || 0) - (a.tracks?.[0]?.date || 0));
    } else if (filterPill === 'title') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterPill === 'artist') {
      result.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (filterPill === 'year') {
      result.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else {
      if (sortBy === 'alpha') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'artist') {
        result.sort((a, b) => a.artist.localeCompare(b.artist));
      } else if (sortBy === 'trackCount') {
        result.sort((a, b) => (b.tracks?.length || 0) - (a.tracks?.length || 0));
      }
    }

    return result;
  }, [lib.albums, searchQuery, filterPill, sortBy]);

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
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-bg-card via-bg-secondary to-bg-card border border-white/8 shadow-2xl">
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

          {/* High-Res Artwork */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-bg-card border border-white/10 shadow-2xl flex-shrink-0 group">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={selectedAlbum.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent/40 bg-gradient-to-br from-[#24130d] to-bg-card">
                <Disc3 className="w-20 h-20" />
              </div>
            )}

            {isTelegramCover && (
              <div
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[10px] font-bold text-accent shadow"
                title="Verified Telegram Cover Artwork"
              >
                <Sparkles className="w-3 h-3" />
                <span>Verified Art</span>
              </div>
            )}
          </div>

          {/* Album Information */}
          <div className="space-y-3 flex-1 min-w-0 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/20 shadow-sm">
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
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Album</span>
              </button>

              <button
                onClick={() => handleShuffleAlbum(selectedAlbum)}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 hover:scale-105 active:scale-95 transition"
                title="Shuffle Album"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleShare(selectedAlbum)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white border border-white/8 text-xs font-semibold transition"
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
            <span className="text-xs text-warm-muted font-mono">{selectedAlbum.tracks.length} songs</span>
          </div>

          <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
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
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Albums ({filteredAlbums.length})
          </h1>
          <p className="text-xs text-warm-muted mt-0.5">
            Auto-grouped from your library collection with matched high-res artwork
          </p>
        </div>

        {/* Search Bar with Ctrl+K shortcut cue */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
          <input
            type="search"
            placeholder="Search albums, artists, years..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-16 py-2 rounded-xl bg-bg-card border border-white/8 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/50 shadow-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-warm-muted/60 pointer-events-none hidden sm:inline">
            ⌘K
          </span>
        </div>
      </div>

      {/* Filter Pill Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
        {[
          { id: 'all', label: 'All Albums' },
          { id: 'recent', label: 'Recently Added' },
          { id: 'title', label: 'Title (A–Z)' },
          { id: 'artist', label: 'By Artist' },
          { id: 'year', label: 'By Release Year' },
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => setFilterPill(pill.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterPill === pill.id
                ? 'bg-accent text-bg-primary font-bold shadow-md shadow-accent/20'
                : 'bg-bg-card hover:bg-bg-cardHover text-warm-muted hover:text-white border border-white/8'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Responsive Album Grid (2 to 6 columns) */}
      {filteredAlbums.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredAlbums.map(album => (
            <AlbumCard
              key={album.name}
              album={album}
              onClick={() => onNavigate(`album:${album.name}`)}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
          <Disc3 className="w-12 h-12 text-warm-muted/40 mx-auto" />
          <p className="font-bold text-warm-white">No albums found</p>
          <p className="text-xs text-warm-muted max-w-sm mx-auto">
            {searchQuery
              ? `No albums match your search query "${searchQuery}".`
              : 'Add audio files to your library to automatically generate albums.'}
          </p>
        </div>
      )}
    </div>
  );
}
