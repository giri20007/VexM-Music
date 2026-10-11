import React, { useState, useMemo } from 'react';
import { Disc3, Play, Shuffle, Share2, Check, ArrowLeft, Search, Sparkles, Music2, Clock, Volume2 } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { AppFooter } from '../components/layout/AppFooter';
import { formatDuration, formatQualityBadge } from '../utils/formatters';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { SafeImage } from '../components/ui/SafeImage';

export function AlbumsPage({ lib, selectedAlbumName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPill, setFilterPill] = useState('all');

  const selectedAlbum = selectedAlbumName
    ? lib.albums.find(a => a.name === selectedAlbumName)
    : null;

  const handleShare = async album => {
    const url = `${window.location.origin}/#album:${encodeURIComponent(album.name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${album.name} - ${album.artist}`,
          text: `Listen to "${album.name}" on Vex-M`,
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
      result.sort((a, b) => (b.tracks?.[0]?.date || 0) - (a.tracks?.[0]?.date || 0));
    } else if (filterPill === 'title') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterPill === 'artist') {
      result.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (filterPill === 'year') {
      result.sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    return result;
  }, [lib.albums, searchQuery, filterPill]);

  // If a specific album is chosen (Apple Music / Tidal style layout)
  if (selectedAlbum) {
    const firstTrack = selectedAlbum.tracks[0];
    const coverSrc = getArtworkSrc(firstTrack, 800) || selectedAlbum.thumbnail;
    const totalDuration = selectedAlbum.tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const isThisAlbumPlaying = selectedAlbum.tracks.some(t => t.id === currentTrack?.id) && isPlaying;
    const isTelegramCover = firstTrack?.artworkConfidence >= 60 || firstTrack?.isOwnTg || firstTrack?.isTelegram;

    return (
      <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-8 space-y-8">
          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition group py-1"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Albums</span>
          </button>

          {/* Apple Music Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0d0d0d] border border-white/[0.08] p-6 sm:p-10 shadow-2xl">
            {/* Ambient Background Glow from Cover */}
            <div
              className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#fa2d48]/15 blur-3xl pointer-events-none"
              style={{
                backgroundImage: coverSrc ? `radial-gradient(circle, #fa2d48 0%, transparent 70%)` : undefined,
              }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8">
              {/* Glossy Album Artwork */}
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden bg-[#181818] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex-shrink-0 group">
                <SafeImage
                  src={coverSrc}
                  alt={selectedAlbum.name}
                  size={600}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {isTelegramCover && (
                  <div
                    className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-sky-500/30 flex items-center gap-1.5 text-[10px] font-bold text-sky-300 shadow"
                    title="Verified Cloud Art"
                  >
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    <span>OwnTg Vault</span>
                  </div>
                )}
              </div>

              {/* Album Details */}
              <div className="space-y-4 flex-1 min-w-0 text-center md:text-left">
                {/* Badges Row */}
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#fa2d48] px-2.5 py-0.5 rounded-full bg-[#fa2d48]/15 border border-[#fa2d48]/30">
                    Album
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    320 kbps Studio
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                    Lossless Master
                  </span>
                  {selectedAlbum.year && (
                    <span className="text-[11px] font-mono text-white/50">
                      {selectedAlbum.year}
                    </span>
                  )}
                </div>

                {/* Album Title */}
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {selectedAlbum.name}
                </h1>

                {/* Artist & Metas */}
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-white/70 flex-wrap">
                  <button
                    onClick={() => onNavigate && onNavigate(`artist:${selectedAlbum.artist}`)}
                    className="text-white font-bold hover:text-[#fa2d48] transition-colors underline-offset-2 hover:underline"
                  >
                    {selectedAlbum.artist}
                  </button>
                  <span className="text-white/30">·</span>
                  <span className="text-white/60">{selectedAlbum.tracks.length} tracks</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/60 font-mono">{formatDuration(totalDuration)}</span>
                </div>

                {/* High-Impact Actions */}
                <div className="flex items-center justify-center md:justify-start gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (isThisAlbumPlaying) {
                        togglePlay();
                      } else {
                        playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks);
                      }
                    }}
                    className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-sm shadow-xl shadow-[#fa2d48]/30 hover:scale-105 active:scale-95 transition"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                    <span>{isThisAlbumPlaying ? 'Pause' : 'Play Album'}</span>
                  </button>

                  <button
                    onClick={() => handleShuffleAlbum(selectedAlbum)}
                    className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 hover:scale-105 active:scale-95 transition"
                    title="Shuffle tracks"
                  >
                    <Shuffle className="w-4 h-4 text-white/80" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </button>

                  <button
                    onClick={() => handleShare(selectedAlbum)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition"
                    title="Share Album"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#fa2d48]" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tracklist Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 pt-4 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/5 pb-2">
              <div className="flex items-center gap-4">
                <span className="w-6 text-center">#</span>
                <span>Title</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="hidden md:inline">Quality</span>
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Apple / Tidal Track Rows */}
            <div className="space-y-1">
              {selectedAlbum.tracks.map((t, idx) => (
                <TrackRow
                  key={t.id || idx}
                  track={t}
                  index={idx}
                  showNumber={true}
                  showCover={false}
                  showAlbum={false}
                  onPlay={trk => playTrack(trk, selectedAlbum.tracks)}
                />
              ))}
            </div>
          </div>

          {/* Album Footer & Copyright */}
          <div className="pt-8 border-t border-white/10 text-xs text-white/40 space-y-2">
            <p className="font-mono">
              Released {selectedAlbum.year || '2024'} · {selectedAlbum.tracks.length} Songs, {formatDuration(totalDuration)}
            </p>
            <p className="text-[11px] text-white/30">
              ℗ {selectedAlbum.year || '2024'} {selectedAlbum.artist} · Produced & Streamed via Vex-M High-Fidelity Audio Vault
            </p>
          </div>
        </div>

        {/* Global Footer */}
        <AppFooter onNavigate={onNavigate} />
      </div>
    );
  }

  // All Albums Grid View
  return (
    <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#fa2d48] px-2.5 py-0.5 rounded-full bg-[#fa2d48]/15 border border-[#fa2d48]/30">
                Discography
              </span>
              <span className="text-xs font-mono text-white/40">
                {filteredAlbums.length} {filteredAlbums.length === 1 ? 'Album' : 'Albums'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Albums & Soundtracks
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              High-fidelity studio collections curated from your library, YouTube, and OwnTg vault
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              placeholder="Filter by album, artist, or year..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#fa2d48]/50 shadow-sm"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
          {[
            { id: 'all', label: 'All Albums' },
            { id: 'recent', label: 'Recently Added' },
            { id: 'title', label: 'Title (A–Z)' },
            { id: 'artist', label: 'By Artist' },
            { id: 'year', label: 'Release Year' },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setFilterPill(pill.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterPill === pill.id
                  ? 'bg-[#fa2d48] text-white font-bold shadow-md shadow-[#fa2d48]/20'
                  : 'bg-[#141414] hover:bg-[#1f1f1f] text-white/70 hover:text-white border border-white/5'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Responsive Album Grid */}
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
          <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
            <Disc3 className="w-12 h-12 text-white/20 mx-auto" />
            <p className="font-bold text-white">No albums found</p>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {searchQuery
                ? `No albums match your search query "${searchQuery}".`
                : 'Add audio files or stream any track to populate albums automatically.'}
            </p>
          </div>
        )}
      </div>

      {/* Global Footer */}
      <AppFooter onNavigate={onNavigate} />
    </div>
  );
}
