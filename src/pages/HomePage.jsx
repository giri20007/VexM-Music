import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Radio,
  Headphones,
  Music2,
  Heart,
  MoreHorizontal,
  Compass,
  Disc3,
  ListPlus,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchYouTubeTrending, searchYouTube } from '../utils/api';

// Memory cache for zero flicker navigation
let cachedTrending = null;
let cachedTopHits = null;
let cachedNewReleases = null;
let cachedChill = null;

// Apple Music Editorial Category Tags
const EDITORIAL_TAGS = [
  'NEW RELEASE',
  'FEATURED PLAYLIST',
  'APPLE MUSIC EXCLUSIVE',
  'SPATIAL AUDIO',
  'UP NEXT',
  'EDITOR’S CHOICE',
];

// Apple Music Genre Colors
const GENRE_CATEGORIES = [
  { id: 'pop', name: 'Pop Hits', query: 'Top Pop Hits 2026', gradient: 'from-[#ff2d55] to-[#ff375f]' },
  { id: 'hiphop', name: 'Hip-Hop / Rap', query: 'Hip Hop Rap Chartbusters', gradient: 'from-[#ff9500] to-[#ff3b30]' },
  { id: 'rnb', name: 'R&B Now', query: 'R&B Soul contemporary', gradient: 'from-[#af52de] to-[#5856d6]' },
  { id: 'spatial', name: 'Spatial Audio', query: 'Spatial Audio Dolby Atmos hits', gradient: 'from-[#00c7be] to-[#007aff]' },
  { id: 'dance', name: 'Dance & EDM', query: 'Dance Electronic party hits', gradient: 'from-[#32d74b] to-[#30d158]' },
  { id: 'chill', name: 'Chill Waves', query: 'Chill Acoustic lofi relaxing', gradient: 'from-[#30b0c7] to-[#5856d6]' },
  { id: 'rock', name: 'Rock & Alt', query: 'Rock Alternative classics hits', gradient: 'from-[#ff453a] to-[#bf5af2]' },
  { id: 'top100', name: 'Global Top 100', query: 'Top 100 Global Billboard', gradient: 'from-[#ffd60a] to-[#ff9f0a]' },
];

/**
 * 1. Apple Music Large Featured Editorial Hero Card
 */
function AppleFeaturedHeroCard({ track, index, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;

  const tag = EDITORIAL_TAGS[index % EDITORIAL_TAGS.length];
  const cover = getArtworkSrc(track, 800);

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  return (
    <div
      onClick={handlePlay}
      className="group flex-shrink-0 w-[300px] sm:w-[460px] md:w-[540px] lg:w-[600px] flex flex-col cursor-pointer select-none snap-start"
    >
      {/* Top Editorial Headline Header */}
      <div className="mb-2.5 px-0.5">
        <p className="text-[11px] font-bold tracking-wider uppercase text-[#a1a1a6]">
          {tag}
        </p>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate group-hover:text-[#fa2d48] transition-colors">
          {track.title}
        </h3>
        <p className="text-xs sm:text-sm text-[#8e8e93] truncate">
          {track.artist}
        </p>
      </div>

      {/* Hero Visual Card */}
      <div className="relative aspect-[2.1/1] w-full rounded-2xl overflow-hidden bg-[#1c1c1e] border border-white/[0.08] shadow-2xl transition-all duration-300 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)] group-hover:border-white/20">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={800}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Apple Music Floating Play Badge */}
        <div className="absolute right-4 bottom-4">
          <button
            onClick={handlePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              isThisPlaying
                ? 'bg-[#fa2d48] text-white opacity-100 scale-100'
                : 'bg-black/60 hover:bg-[#fa2d48] text-white border border-white/20 hover:border-transparent opacity-90 group-hover:opacity-100'
            }`}
            aria-label={`Play ${track.title}`}
          >
            {isThisPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Apple Music Lossless / Spatial badge on bottom-left */}
        <div className="absolute left-4 bottom-4 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10 uppercase tracking-wider">
            Spatial Audio
          </span>
          <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-[#fa2d48] border border-[#fa2d48]/20 uppercase tracking-wider">
            Lossless
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Apple Music "Best New Songs" Row Item (3-Row Stacked Grid Item)
 */
function AppleSongRowItem({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const toggleLike = useAudioStore(s => s.toggleLike);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const isLiked = likedTrackIds.includes(String(track.id));

  const cover = getArtworkSrc(track, 120);

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  return (
    <div
      onClick={handlePlay}
      className={`group relative flex items-center justify-between h-14 px-2 rounded-xl transition-all duration-200 cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.08] ${
        currentTrack?.id === track.id ? 'bg-white/[0.06]' : ''
      }`}
    >
      {/* Left: Thumbnail + Title + Artist */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Cover Art with Hover Play */}
        <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#242426] shadow-sm">
          <SafeImage
            src={cover}
            track={track}
            alt={track.title}
            size={120}
            className="w-full h-full object-cover"
          />

          {/* Hover Play Button Overlay */}
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
              isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isThisPlaying ? (
              <Pause className="w-4 h-4 fill-white text-white" />
            ) : (
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
              currentTrack?.id === track.id ? 'text-[#fa2d48]' : 'text-white group-hover:text-white'
            }`}
          >
            {track.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center justify-center px-1 py-0.2 rounded bg-white/10 text-[9px] font-bold text-[#a1a1a6]">
              E
            </span>
            <p className="text-[11px] text-[#8e8e93] truncate">
              {track.artist}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            toggleLike(track.id);
          }}
          className={`p-1.5 rounded-full hover:bg-white/10 transition ${
            isLiked ? 'text-[#fa2d48] opacity-100' : 'text-[#8e8e93] hover:text-white'
          }`}
          aria-label="Favorite"
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handlePlay}
          className="p-1.5 rounded-full hover:bg-white/10 text-[#8e8e93] hover:text-white transition"
          aria-label="Play song"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * 3. Apple Music Square Album / Release Card
 */
function AppleSquareCard({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;

  const cover = getArtworkSrc(track, 360);

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  return (
    <div
      onClick={handlePlay}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* Square Artwork */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#1c1c1e] border border-white/[0.08] shadow-md transition-all duration-300 group-hover:shadow-2xl group-hover:border-white/20 mb-2.5">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={360}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Gradient Shadow */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Floating Apple Red Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute right-3 bottom-3 w-10 h-10 rounded-full bg-[#fa2d48] hover:bg-[#fc3c44] text-white flex items-center justify-center shadow-xl shadow-black/60 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
            isThisPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play ${track.title}`}
        >
          {isThisPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Typography */}
      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:underline">
        {track.title}
      </h4>
      <p className="text-[11px] sm:text-xs text-[#8e8e93] truncate mt-0.5">
        {track.artist}
      </p>
    </div>
  );
}

/**
 * 4. Apple Music Category / Genre Tile Card
 */
function AppleGenreTile({ category, onSelect }) {
  return (
    <div
      onClick={() => onSelect(category.query)}
      className={`relative h-28 sm:h-32 rounded-2xl p-4 bg-gradient-to-br ${category.gradient} shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group hover:scale-[1.02] flex flex-col justify-between`}
    >
      <span className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-md">
        {category.name}
      </span>
      <div className="flex items-center justify-between text-white/80">
        <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white text-white group-hover:text-black transition">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Card for Apple Music UI
 */
function SkeletonHero() {
  return (
    <div className="w-[300px] sm:w-[460px] md:w-[540px] flex-shrink-0 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded mb-2" />
      <div className="h-5 w-48 bg-white/10 rounded mb-1" />
      <div className="h-3.5 w-32 bg-white/5 rounded mb-3" />
      <div className="aspect-[2.1/1] w-full bg-white/[0.06] rounded-2xl" />
    </div>
  );
}

function SkeletonSquare() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-square w-full rounded-2xl bg-white/[0.06] mb-2.5" />
      <div className="h-3.5 w-3/4 bg-white/10 rounded mb-1" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

/**
 * MAIN APPLE MUSIC "NEW" BROWSE PAGE
 */
export function HomePage({ lib, onNavigate }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [activeTab, setActiveTab] = useState('all'); // all | featured | bestnew | releases | categories
  const [trendingTracks, setTrendingTracks] = useState(cachedTrending || []);
  const [topHits, setTopHits] = useState(cachedTopHits || []);
  const [newReleases, setNewReleases] = useState(cachedNewReleases || []);
  const [chillTracks, setChillTracks] = useState(cachedChill || []);
  const [isLoading, setIsLoading] = useState(!cachedTrending);

  const heroScrollRef = useRef(null);

  // Load curated sets on mount
  useEffect(() => {
    let isMounted = true;
    if (cachedTrending && cachedTopHits) return;

    setIsLoading(true);
    Promise.allSettled([
      fetchYouTubeTrending(24),
      searchYouTube('Apple Music Today Hits New Music', 20),
      searchYouTube('New Music Friday Best Releases', 18),
      searchYouTube('Acoustic Chill Focus Vibes', 18),
    ]).then(([trendRes, hitsRes, releaseRes, chillRes]) => {
      if (!isMounted) return;

      if (trendRes.status === 'fulfilled' && trendRes.value?.length) {
        cachedTrending = trendRes.value;
        setTrendingTracks(trendRes.value);
      }
      if (hitsRes.status === 'fulfilled' && hitsRes.value?.length) {
        cachedTopHits = hitsRes.value;
        setTopHits(hitsRes.value);
      }
      if (releaseRes.status === 'fulfilled' && releaseRes.value?.length) {
        cachedNewReleases = releaseRes.value;
        setNewReleases(releaseRes.value);
      }
      if (chillRes.status === 'fulfilled' && chillRes.value?.length) {
        cachedChill = chillRes.value;
        setChillTracks(chillRes.value);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePlayTrack = (track, queue = []) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const activeQueue = queue && queue.length ? queue : [track];
      playTrack(track, activeQueue);
    }
  };

  const handleScrollHero = direction => {
    if (heroScrollRef.current) {
      const offset = direction === 'left' ? -520 : 520;
      heroScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Best New Songs: Slice into 4 columns of 3 rows (Total 12 items)
  const bestNewSongColumns = useMemo(() => {
    const list = trendingTracks.length >= 12 ? trendingTracks.slice(0, 12) : topHits.slice(0, 12);
    const columns = [];
    for (let i = 0; i < list.length; i += 3) {
      columns.push(list.slice(i, i + 3));
    }
    return columns;
  }, [trendingTracks, topHits]);

  return (
    <div className="flex-1 w-full pb-24 select-none bg-[#000000] text-white">
      {/* 1. APPLE MUSIC TOP PAGE HEADER */}
      <div className="px-4 sm:px-8 pt-8 pb-4 border-b border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
              New
            </h1>
            <p className="text-xs sm:text-sm text-[#8e8e93] mt-1">
              Discover the latest releases, featured music, and top streaming charts
            </p>
          </div>

          {/* Apple Music Pill Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'featured', label: 'Featured' },
              { id: 'bestnew', label: 'Best New Songs' },
              { id: 'releases', label: 'New Releases' },
              { id: 'categories', label: 'Genres & Moods' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#d1d1d6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-12 mt-6">
        {/* 2. SECTION: FEATURED EDITORIAL CAROUSEL */}
        {(activeTab === 'all' || activeTab === 'featured') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#fa2d48]" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Featured
                </h2>
              </div>

              {/* Carousel Left / Right Arrow Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleScrollHero('left')}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Previous Featured"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScrollHero('right')}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Next Featured"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Hero Carousel Container */}
            <div
              ref={heroScrollRef}
              className="flex gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {isLoading && trendingTracks.length === 0 ? (
                <>
                  <SkeletonHero />
                  <SkeletonHero />
                  <SkeletonHero />
                </>
              ) : (
                trendingTracks.slice(0, 10).map((t, idx) => (
                  <AppleFeaturedHeroCard
                    key={`hero_${t.id}_${idx}`}
                    track={t}
                    index={idx}
                    onPlay={handlePlayTrack}
                    queue={trendingTracks}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* 3. SECTION: BEST NEW SONGS (Apple Music Multi-Column 3-Row Layout) */}
        {(activeTab === 'all' || activeTab === 'bestnew') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#fa2d48]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Best New Songs
                  </h2>
                  <p className="text-xs text-[#8e8e93]">The most essential new tracks streaming right now</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline flex items-center gap-0.5"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Columns x 3 Rows Multi-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-1">
              {bestNewSongColumns.map((colGroup, colIdx) => (
                <div key={`col_${colIdx}`} className="flex flex-col">
                  {colGroup.map((track, rowIdx) => (
                    <AppleSongRowItem
                      key={`bns_${track.id}_${colIdx}_${rowIdx}`}
                      track={track}
                      onPlay={handlePlayTrack}
                      queue={trendingTracks}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. SECTION: NEW RELEASES (Apple Square Card Grid) */}
        {(activeTab === 'all' || activeTab === 'releases') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  New Releases
                </h2>
                <p className="text-xs text-[#8e8e93]">Fresh albums, EPs, and worldwide drops</p>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline flex items-center gap-0.5"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {isLoading && topHits.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonSquare key={`sk_${i}`} />)
              ) : (
                (newReleases.length ? newReleases : topHits).slice(0, 12).map((t, idx) => (
                  <AppleSquareCard
                    key={`release_${t.id}_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={newReleases}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* 5. SECTION: TODAY'S HITS (Curated Anthems) */}
        {activeTab === 'all' && topHits.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Today's Hits
                </h2>
                <p className="text-xs text-[#8e8e93]">The biggest tracks across every chart</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {topHits.slice(0, 12).map((t, idx) => (
                <AppleSquareCard
                  key={`tophits_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={topHits}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6. SECTION: BROWSE BY CATEGORY & GENRES */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#fa2d48]" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Browse by Category
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
              {GENRE_CATEGORIES.map(category => (
                <AppleGenreTile
                  key={category.id}
                  category={category}
                  onSelect={query => {
                    // Navigate to search with this genre
                    onNavigate('search');
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* 7. SECTION: CHILL & RELAXING SOUNDS */}
        {activeTab === 'all' && chillTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-[#30b0c7]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Peaceful & Relaxing Sounds
                  </h2>
                  <p className="text-xs text-[#8e8e93]">Atmospheric lofi, chill acoustics, and mellow frequencies</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {chillTracks.slice(0, 6).map((t, idx) => (
                <AppleSquareCard
                  key={`chill_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={chillTracks}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
