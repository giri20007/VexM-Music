import React, { useState, useMemo } from 'react';
import { User, Play, Pause, Shuffle, Share2, Check, ArrowLeft, Disc3, Sparkles, CheckCircle2, Heart, Music2, Radio, Info } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { ArtistCard } from '../components/library/ArtistCard';
import { AlbumCard } from '../components/library/AlbumCard';
import { AppFooter } from '../components/layout/AppFooter';
import { formatDuration } from '../utils/formatters';
import { getArtistArtworkSrc } from '../utils/artworkGenerator';
import { SafeImage } from '../components/ui/SafeImage';

export function ArtistsPage({ lib, selectedArtistName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [discographyFilter, setDiscographyFilter] = useState('all');

  const [artistSearch, setArtistSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('ALL');

  const selectedArtist = selectedArtistName
    ? lib.artists.find(a => a.name.toLowerCase() === selectedArtistName.toLowerCase())
    : null;

  const handleShare = async artist => {
    const url = `${window.location.origin}/#artist:${encodeURIComponent(artist.name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${artist.name} - Vex-M`,
          text: `Stream ${artist.name} on Vex-M High-Fidelity Audio`,
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

  // If a specific artist is chosen (Spotify & Tidal inspired layout)
  if (selectedArtist) {
    const totalDuration = selectedArtist.tracks.reduce((s, t) => s + (t.duration || 0), 0);
    const avatar = getArtistArtworkSrc(selectedArtist, 800) || getArtistArtworkSrc(selectedArtist.name, 800);
    const albums = selectedArtist.albums || [];
    const isThisArtistPlaying = selectedArtist.tracks.some(t => t.id === currentTrack?.id) && isPlaying;

    // Simulate monthly listeners based on track count
    const simulatedListeners = (Math.max(12, selectedArtist.tracks.length * 37) * 45281).toLocaleString();

    // Top tracks (Popular)
    const displayedTracks = showAllTracks ? selectedArtist.tracks : selectedArtist.tracks.slice(0, 5);

    return (
      <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
        {/* Spotify / Tidal Immersive Artist Hero */}
        <div className="relative min-h-[380px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1c1c1c] via-[#0d0d0d] to-[#000000] px-4 sm:px-8 pt-4 pb-8 border-b border-white/[0.08]">
          {/* Ambient Blurred Backdrop from Artist Artwork */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110 pointer-events-none"
            style={{ backgroundImage: `url(${avatar})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent pointer-events-none" />

          {/* Top Navigation */}
          <div className="relative z-10">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition group py-1"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Artists</span>
            </button>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 pt-8">
            {/* Artist Round Portrait */}
            <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden bg-[#181818] border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex-shrink-0 group">
              <SafeImage
                src={avatar}
                fallbackType="artist"
                artistName={selectedArtist.name}
                alt={selectedArtist.name}
                size={400}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Verified Header & Details */}
            <div className="space-y-3 flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-black" />
                  <span>Verified Artist</span>
                </span>
                <span className="text-xs text-white/40 font-mono hidden sm:inline">
                  Vex-M Studio Sound
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-none">
                {selectedArtist.name}
              </h1>

              <p className="text-xs sm:text-sm text-white/60 font-medium">
                <span className="text-white font-bold">{simulatedListeners}</span> monthly listeners · {selectedArtist.tracks.length} songs in vault · {formatDuration(totalDuration)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Big Circular Play Button */}
            <button
              onClick={() => {
                if (isThisArtistPlaying) {
                  togglePlay();
                } else if (selectedArtist.tracks.length > 0) {
                  playTrack(selectedArtist.tracks[0], selectedArtist.tracks);
                }
              }}
              className="w-14 h-14 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white flex items-center justify-center shadow-xl shadow-[#fa2d48]/30 hover:scale-105 active:scale-95 transition"
              aria-label={`Play artist ${selectedArtist.name}`}
            >
              {isThisArtistPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-1" />
              )}
            </button>

            {/* Follow Button */}
            <button
              onClick={() => setIsFollowing(prev => !prev)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase border transition-all ${
                isFollowing
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-transparent text-white border-white/30 hover:border-white hover:scale-105'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            {/* Shuffle Button */}
            <button
              onClick={() => handleShuffleArtist(selectedArtist)}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition hover:scale-105"
              title="Shuffle all tracks"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Share Button */}
            <button
              onClick={() => handleShare(selectedArtist)}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition"
              title="Share Artist"
            >
              {copied ? <Check className="w-5 h-5 text-[#fa2d48]" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          {/* Section 1: Popular Tracks (Spotify Style 1..5) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Popular
              </h2>
              {selectedArtist.tracks.length > 5 && (
                <button
                  onClick={() => setShowAllTracks(prev => !prev)}
                  className="text-xs font-bold text-white/60 hover:text-white transition"
                >
                  {showAllTracks ? 'Show less' : 'See all songs'}
                </button>
              )}
            </div>

            <div className="space-y-1 bg-[#0d0d0d] p-3 rounded-2xl border border-white/[0.06]">
              {displayedTracks.map((t, idx) => (
                <TrackRow
                  key={t.id || idx}
                  track={t}
                  index={idx}
                  showNumber={true}
                  showCover={true}
                  showAlbum={true}
                  onPlay={trk => playTrack(trk, selectedArtist.tracks)}
                />
              ))}
            </div>
          </div>

          {/* Section 2: Discography (Albums & EPs) */}
          {albums.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Discography
                  </h2>
                  <p className="text-xs text-white/40">Studio albums and soundtrack appearances</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {['all', 'albums'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setDiscographyFilter(filter)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition ${
                        discographyFilter === filter
                          ? 'bg-white/20 text-white'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
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

          {/* Section 3: About / Bio Card (Spotify Style) */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              About
            </h2>

            <div className="relative overflow-hidden rounded-3xl bg-[#121212] border border-white/[0.08] p-6 sm:p-8 max-w-3xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-[#202020] flex-shrink-0 border border-white/10">
                  <SafeImage
                    src={avatar}
                    fallbackType="artist"
                    artistName={selectedArtist.name}
                    alt={selectedArtist.name}
                    size={200}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/50">Verified Artist Profile</span>
                    <span className="text-xs text-sky-400">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{selectedArtist.name}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Featuring {selectedArtist.tracks.length} high-fidelity studio tracks streaming via Vex-M.
                    All audio streams decoded with studio-grade dynamic range and synchronized lyrics support.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-mono text-white/40">
                    <span>Rank: Top 50 Artist</span>
                    <span>·</span>
                    <span>Studio 320k Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer */}
        <AppFooter onNavigate={onNavigate} />
      </div>
    );
  }

  // All Artists Directory View
  const alphabet = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];

  const filteredArtists = useMemo(() => {
    let list = lib.artists || [];
    if (artistSearch.trim()) {
      const q = artistSearch.trim().toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q));
    }
    if (selectedLetter !== 'ALL') {
      if (selectedLetter === '#') {
        list = list.filter(a => !/^[a-zA-Z]/.test(a.name.trim()));
      } else {
        list = list.filter(a => a.name.trim().toUpperCase().startsWith(selectedLetter));
      }
    }
    return list;
  }, [lib.artists, artistSearch, selectedLetter]);

  return (
    <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#fa2d48] px-2.5 py-0.5 rounded-full bg-[#fa2d48]/15 border border-[#fa2d48]/30">
                Directory
              </span>
              <span className="text-xs font-mono text-white/40">
                {filteredArtists.length} {filteredArtists.length === 1 ? 'Artist' : 'Artists'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Artists Catalog
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              Explore your complete collection of music creators, vocalists, and composers
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <input
              type="search"
              placeholder="Filter artists by name..."
              value={artistSearch}
              onChange={e => setArtistSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#fa2d48]/50 shadow-sm"
            />
          </div>
        </div>

        {/* A–Z Scrubber Bar */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#141414] border border-white/10 overflow-x-auto no-scrollbar shadow-sm">
          {alphabet.map(letter => {
            const isActive = selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`min-w-[30px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#fa2d48] text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Artists Grid */}
        {filteredArtists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredArtists.map(artist => (
              <ArtistCard
                key={artist.name}
                artist={artist}
                onClick={() => onNavigate(`artist:${artist.name}`)}
              />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-2">
            <User className="w-12 h-12 text-white/20 mx-auto" />
            <p className="font-bold text-white">No artists found</p>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              No artists match your search "{artistSearch}" {selectedLetter !== 'ALL' ? `under "${selectedLetter}"` : ''}.
            </p>
            {(artistSearch || selectedLetter !== 'ALL') && (
              <button
                onClick={() => {
                  setArtistSearch('');
                  setSelectedLetter('ALL');
                }}
                className="mt-3 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#fa2d48] transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Global Footer */}
      <AppFooter onNavigate={onNavigate} />
    </div>
  );
}
