import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Globe,
  Heart,
  MoreHorizontal,
  Disc3,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { ProviderSourceBar } from '../components/layout/ProviderSourceBar';

// Per-language memory cache for instant, zero-flicker switching
const langCache = {};

// Apple Music Editorial Category Tags
const EDITORIAL_TAGS = [
  'NEW RELEASE',
  'FEATURED TRACK',
  'APPLE MUSIC EXCLUSIVE',
  'SPATIAL AUDIO',
  'TOP CHARTBUSTER',
  'EDITOR’S CHOICE',
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
      className="group flex-shrink-0 w-[290px] sm:w-[440px] md:w-[520px] lg:w-[580px] flex flex-col cursor-pointer select-none snap-start"
    >
      {/* Top Editorial Headline */}
      <div className="mb-2 px-0.5">
        <p className="text-[11px] font-bold tracking-wider uppercase text-[#a1a1a6]">
          {tag}
        </p>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate group-hover:text-[#fa2d48] transition-colors">
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
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
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
          <p className="text-xs text-[#8e8e93] truncate mt-0.5">
            {track.artist}
          </p>
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
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#1c1c1e] border border-white/[0.08] shadow-md transition-all duration-300 group-hover:shadow-2xl group-hover:border-white/20 mb-2">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={360}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Clean Album Art */}

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

      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:underline">
        {track.title}
      </h4>
      <p className="text-[11px] sm:text-xs text-[#8e8e93] truncate mt-0.5">
        {track.artist}
      </p>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="w-[290px] sm:w-[440px] md:w-[520px] flex-shrink-0 animate-pulse">
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
      <div className="aspect-square w-full rounded-2xl bg-white/[0.06] mb-2" />
      <div className="h-3.5 w-3/4 bg-white/10 rounded mb-1" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

/**
 * CLEAN STREAMLINED APPLE MUSIC "NEW" HOME PAGE
 */
export function HomePage({ lib, onNavigate, onOpenLanguageModal }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const langConfig = MUSIC_LANGUAGES.find(l => l.id === preferredLanguage) || MUSIC_LANGUAGES[0];
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const cached = langCache[preferredLanguage];
  const [featuredTracks, setFeaturedTracks] = useState(cached?.featured || []);
  const [bestSongs, setBestSongs] = useState(cached?.best || []);
  const [newReleases, setNewReleases] = useState(cached?.releases || []);
  const [isLoading, setIsLoading] = useState(!cached);

  const heroScrollRef = useRef(null);

  // Load language-tailored or source-tailored content
  useEffect(() => {
    let isMounted = true;

    // 1. If OwnTg selected: display Telegram cloud vault storage tracks & albums directly
    if (providerSource === 'owntg') {
      const all = lib?.allItems || [];
      const feat = all.slice(0, 8);
      const best = all.slice(8, 20).length ? all.slice(8, 20) : all.slice(0, 12);
      const rel = all.slice(20, 32).length ? all.slice(20, 32) : all.slice(0, 12);
      setFeaturedTracks(feat);
      setBestSongs(best);
      setNewReleases(rel);
      setIsLoading(false);
      return;
    }

    // 2. If JioSaavn selected: query JioSaavn 320 kbps directly
    if (providerSource === 'saavn') {
      setIsLoading(true);
      const bestQuery = `Top 20 ${langConfig.name} Songs Hits`;
      const releaseQuery = `Latest ${langConfig.name} Movie Songs`;

      Promise.allSettled([
        fetchSaavnTrending(preferredLanguage, 14),
        searchSaavn(bestQuery, 14),
        searchSaavn(releaseQuery, 14),
      ]).then(([featRes, bestRes, relRes]) => {
        if (!isMounted) return;
        setFeaturedTracks(featRes.status === 'fulfilled' ? featRes.value || [] : []);
        setBestSongs(bestRes.status === 'fulfilled' ? bestRes.value || [] : []);
        setNewReleases(relRes.status === 'fulfilled' ? relRes.value || [] : []);
        setIsLoading(false);
      });
      return;
    }

    // 3. If YouTube selected: query YouTube Music
    if (providerSource === 'youtube') {
      setIsLoading(true);
      const langQuery = langConfig.query;
      const bestQuery = `Top 20 ${langConfig.name} Songs Hits`;
      const releaseQuery = `Latest ${langConfig.name} Songs`;

      Promise.allSettled([
        searchYouTube(langQuery, 14),
        searchYouTube(bestQuery, 14),
        searchYouTube(releaseQuery, 14),
      ]).then(([featRes, bestRes, relRes]) => {
        if (!isMounted) return;
        setFeaturedTracks(featRes.status === 'fulfilled' ? featRes.value || [] : []);
        setBestSongs(bestRes.status === 'fulfilled' ? bestRes.value || [] : []);
        setNewReleases(relRes.status === 'fulfilled' ? relRes.value || [] : []);
        setIsLoading(false);
      });
      return;
    }

    // 4. Default 'all': Smart Unified (JioSaavn 320k Studio + YouTube fallback) with memory cache
    if (langCache[preferredLanguage]) {
      setFeaturedTracks(langCache[preferredLanguage].featured);
      setBestSongs(langCache[preferredLanguage].best);
      setNewReleases(langCache[preferredLanguage].releases);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const langQuery = langConfig.query;
    const bestQuery = `Top 20 ${langConfig.name} Songs 2026 Hits`;
    const releaseQuery = `Latest ${langConfig.name} Movie Songs 2026 Releases`;

    // High-Fidelity JioSaavn 320 kbps loader with YouTube fallback
    const fetchRowWithFallback = async (saavnPromise, ytQuery, count = 12) => {
      try {
        const saavnItems = await saavnPromise;
        if (saavnItems && saavnItems.length >= 6) return saavnItems.slice(0, count);
        const ytItems = await searchYouTube(ytQuery, count);
        const combined = [...(saavnItems || []), ...ytItems];
        return combined.slice(0, count);
      } catch {
        return searchYouTube(ytQuery, count).catch(() => []);
      }
    };

    Promise.allSettled([
      fetchRowWithFallback(fetchSaavnTrending(preferredLanguage, 14), langQuery, 12),
      fetchRowWithFallback(searchSaavn(bestQuery, 14), bestQuery, 12),
      fetchRowWithFallback(searchSaavn(releaseQuery, 14), releaseQuery, 12),
    ]).then(([featRes, bestRes, relRes]) => {
      if (!isMounted) return;

      const feat = featRes.status === 'fulfilled' && featRes.value?.length ? featRes.value : [];
      const best = bestRes.status === 'fulfilled' && bestRes.value?.length ? bestRes.value : [];
      const rel = relRes.status === 'fulfilled' && relRes.value?.length ? relRes.value : [];

      langCache[preferredLanguage] = { featured: feat, best, releases: rel };

      setFeaturedTracks(feat);
      setBestSongs(best);
      setNewReleases(rel);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [preferredLanguage, langConfig, providerSource, lib?.allItems]);

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
      const offset = direction === 'left' ? -480 : 480;
      heroScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Best New Songs: 4 columns x 3 rows (Total 12 items)
  const bestSongColumns = useMemo(() => {
    const list = bestSongs.length ? bestSongs.slice(0, 12) : featuredTracks.slice(0, 12);
    const columns = [];
    for (let i = 0; i < list.length; i += 3) {
      columns.push(list.slice(i, i + 3));
    }
    return columns;
  }, [bestSongs, featuredTracks]);

  return (
    <div className="flex-1 w-full pb-24 select-none bg-[#000000] text-white">
      {/* 1. TOP HEADER WITH PREFERRED LANGUAGE PICKER PILL & PROVIDER SOURCE BAR */}
      <div className="px-4 sm:px-8 pt-8 pb-5 border-b border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
                New
              </h1>
              {/* Quick Language Pill */}
              <button
                onClick={onOpenLanguageModal}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-[#fa2d48]/20 border border-white/15 hover:border-[#fa2d48]/50 text-xs font-bold text-white transition active:scale-95 group"
                title="Change preferred music language"
              >
                <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
                <span>{langConfig.name}</span>
                <span className="text-[10px] text-[#a1a1a6] font-normal">
                  ({langConfig.native})
                </span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#8e8e93] mt-1">
              {providerSource === 'owntg'
                ? 'Your personal Telegram cloud storage audio vault and saved BIN tracks'
                : providerSource === 'saavn'
                ? `High-fidelity 320 kbps JioSaavn studio catalog for ${langConfig.name}`
                : providerSource === 'youtube'
                ? `Worldwide YouTube Music catalog for ${langConfig.name}`
                : `Latest ${langConfig.name} releases, chartbusters, and featured hits`}
            </p>
          </div>
        </div>

        {/* Source Provider Select Option: All | JioSaavn | YouTube | OwnTg */}
        <div className="pt-1">
          <ProviderSourceBar />
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-12 mt-6">
        {/* 2. SECTION: FEATURED EDITORIAL CAROUSEL */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#fa2d48]" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Featured
              </h2>
            </div>

            {/* Carousel Navigation Arrows */}
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

          <div
            ref={heroScrollRef}
            className="flex gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
          >
            {isLoading && featuredTracks.length === 0 ? (
              <>
                <SkeletonHero />
                <SkeletonHero />
                <SkeletonHero />
              </>
            ) : (
              featuredTracks.slice(0, 8).map((t, idx) => (
                <AppleFeaturedHeroCard
                  key={`hero_${t.id}_${idx}`}
                  track={t}
                  index={idx}
                  onPlay={handlePlayTrack}
                  queue={featuredTracks}
                />
              ))
            )}
          </div>
        </section>

        {/* 3. SECTION: BEST NEW SONGS (4 COLUMNS X 3 ROWS) */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-1">
            {bestSongColumns.map((colGroup, colIdx) => (
              <div key={`col_${colIdx}`} className="flex flex-col">
                {colGroup.map((track, rowIdx) => (
                  <AppleSongRowItem
                    key={`bns_${track.id}_${colIdx}_${rowIdx}`}
                    track={track}
                    onPlay={handlePlayTrack}
                    queue={bestSongs}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* 4. SECTION: NEW RELEASES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                New Releases
              </h2>
              <p className="text-xs text-[#8e8e93]">Fresh releases, soundtrack drops, and singles</p>
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
              {isLoading && newReleases.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonSquare key={`sk_${i}`} />)
              ) : (
                (newReleases.length ? newReleases : featuredTracks).slice(0, 12).map((t, idx) => (
                  <AppleSquareCard
                    key={`rel_${t.id}_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={newReleases}
                  />
                ))
              )}
            </div>
          </section>
        </div>
    </div>
  );
}
