import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  RotateCcw,
  Sparkles,
  Search,
  Menu,
  Clock,
  Flame,
  Coffee,
  Waves,
  Music2,
  Compass,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { ProviderSourceButton } from '../components/layout/ProviderSourceButton';
import { formatDuration } from '../utils/formatters';

// In-memory feed cache for fast switching
const feedCache = {};

// Curated top artists per language with verified high-res CDN photos
const LANGUAGE_ARTISTS = {
  tamil: [
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj', role: 'Composer' },
    { name: 'A.R. Rahman', image: 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg', role: 'Composer' },
    { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_002_20180802174245_500x500.jpg', role: 'Composer' },
    { name: 'Harris Jayaraj', image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230718071330_500x500.jpg', role: 'Composer' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg', role: 'Singer' },
    { name: 'Santhosh Narayanan', image: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20250527101718_500x500.jpg', role: 'Composer' },
    { name: 'Ilaiyaraaja', image: 'https://c.saavncdn.com/artists/Ilaiyaraaja_001_20251020081419_500x500.jpg', role: 'Maestro' },
    { name: 'Pradeep Kumar', image: 'https://c.saavncdn.com/artists/Pradeep_Kumar_002_20250807084559_500x500.jpg', role: 'Singer' },
  ],
  hindi: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg', role: 'Singer' },
    { name: 'Pritam', image: 'https://c.saavncdn.com/artists/Pritam_003_20231120091809_500x500.jpg', role: 'Composer' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg', role: 'Singer' },
    { name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_005_20230327072944_500x500.jpg', role: 'Artist' },
    { name: 'Sachin-Jigar', image: 'https://c.saavncdn.com/artists/Sachin-Jigar_002_20220623063546_500x500.jpg', role: 'Composer' },
    { name: 'KK', image: 'https://c.saavncdn.com/artists/KK_500x500.jpg', role: 'Singer' },
    { name: 'Atif Aslam', image: 'https://c.saavncdn.com/artists/Atif_Aslam_002_20240118072124_500x500.jpg', role: 'Singer' },
  ],
  telugu: [
    { name: 'Devi Sri Prasad', image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_002_20220502094759_500x500.jpg', role: 'Composer' },
    { name: 'Thaman S', image: 'https://c.saavncdn.com/artists/Thaman_S_002_20220627110123_500x500.jpg', role: 'Composer' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg', role: 'Singer' },
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj', role: 'Composer' },
    { name: 'Ram Miriyala', image: 'https://c.saavncdn.com/artists/Ram_Miriyala_001_20230504092248_500x500.jpg', role: 'Singer' },
    { name: 'Anurag Kulkarni', image: 'https://c.saavncdn.com/artists/Anurag_Kulkarni_001_20230413063533_500x500.jpg', role: 'Singer' },
  ],
  malayalam: [
    { name: 'Sushin Shyam', image: 'https://c.saavncdn.com/artists/Sushin_Shyam_001_20230920084534_500x500.jpg', role: 'Composer' },
    { name: 'Jakes Bejoy', image: 'https://c.saavncdn.com/artists/Jakes_Bejoy_002_20230919102237_500x500.jpg', role: 'Composer' },
    { name: 'Hesham Abdul Wahab', image: 'https://c.saavncdn.com/artists/Hesham_Abdul_Wahab_001_20230919101248_500x500.jpg', role: 'Composer' },
    { name: 'Deepak Dev', image: 'https://c.saavncdn.com/artists/Deepak_Dev_001_20230920084918_500x500.jpg', role: 'Composer' },
    { name: 'Shaan Rahman', image: 'https://c.saavncdn.com/artists/Shaan_Rahman_002_20230919102431_500x500.jpg', role: 'Composer' },
  ],
  punjabi: [
    { name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_007_20241001072935_500x500.jpg', role: 'Artist' },
    { name: 'Sidhu Moosewala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20220601092823_500x500.jpg', role: 'Legend' },
    { name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_002_20230818073145_500x500.jpg', role: 'Artist' },
    { name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_004_20230918072234_500x500.jpg', role: 'Artist' },
    { name: 'Shubh', image: 'https://c.saavncdn.com/artists/Shubh_001_20230522063857_500x500.jpg', role: 'Artist' },
  ],
  english: [
    { name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg', role: 'Artist' },
    { name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg', role: 'Artist' },
    { name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg', role: 'Artist' },
    { name: 'Billie Eilish', image: 'https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg', role: 'Artist' },
    { name: 'Dua Lipa', image: 'https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg', role: 'Artist' },
    { name: 'Coldplay', image: 'https://c.saavncdn.com/artists/Coldplay_002_20241003070447_500x500.jpg', role: 'Band' },
  ],
};

const getQueryVariants = (lang, category, seed = 0) => {
  const seeds = {
    slowed: [
      `${lang} slowed and reverb songs`,
      `${lang} lofi chill slowed songs`,
      `${lang} midnight slowed reverb`,
      `${lang} aesthetic slowed reverb`,
    ],
    trending: [
      `Top 20 ${lang} Songs 2026 Hits`,
      `Latest ${lang} viral hits`,
      `Trending ${lang} songs 2026`,
      `Best ${lang} super hits`,
    ],
    radio: [
      `${lang} popular melody songs hits`,
      `Best of ${lang} songs radio`,
      `${lang} all time top songs`,
    ],
    chill: [
      `${lang} peaceful calm acoustic melodies`,
      `${lang} relaxed morning coffee songs`,
      `${lang} midnight chill melodies lofi`,
    ],
  };

  const list = seeds[category] || seeds.trending;
  return list[seed % list.length];
};

const dedupeList = list => {
  const seen = new Set();
  const res = [];
  for (const t of list || []) {
    if (!t) continue;
    const key = (t.title || '').toLowerCase().replace(/\s*\(from.*?\)/gi, '').trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      res.push(t);
    }
  }
  return res;
};

const getGreetingTime = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late night';
};

/**
 * Clean Horizontal Carousel with smooth desktop arrows and native touch scroll
 */
function CleanCarousel({ title, subtitle, items = [], currentTrackId, isPlaying, onPlay, onNavigateAll }) {
  const scrollRef = useRef(null);

  const scroll = direction => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -380 : 380;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-white/50 mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateAll && (
            <button
              onClick={onNavigateAll}
              className="text-xs font-semibold text-white/60 hover:text-white transition mr-1"
            >
              See all
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {items.map((track, idx) => {
          const isThisPlaying = String(currentTrackId) === String(track.id) && isPlaying;
          const cover = getArtworkSrc(track, 300);

          return (
            <div
              key={`card_${track.id}_${idx}`}
              onClick={() => onPlay(track, items)}
              className="group flex-shrink-0 w-[145px] sm:w-[170px] cursor-pointer select-none snap-start clean-card rounded-xl p-3"
            >
              {/* Artwork Box */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-900 shadow-md mb-2.5">
                <SafeImage
                  src={cover}
                  track={track}
                  alt={track.title}
                  size={300}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Clean Floating Play Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onPlay(track, items);
                  }}
                  className={`absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                    isThisPlaying
                      ? 'opacity-100 scale-100'
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

              {/* Title & Artist */}
              <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#fa2d48] transition-colors leading-snug">
                {track.title}
              </h3>
              <p className="text-[11px] text-white/50 truncate mt-0.5">
                {track.artist || 'Unknown Artist'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * HOMEPAGE - Clean, Simple, Ultra-Fast & Modern
 */
export function HomePage({ lib, onNavigate, onOpenLanguageModal, onToggleMobileNav }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const toggleLike = useAudioStore(s => s.toggleLike);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds) || [];
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed) || [];
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);

  const user = useAuthStore(s => s.user);
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const langConfig = MUSIC_LANGUAGES.find(l => l.id === preferredLanguage) || MUSIC_LANGUAGES[0];
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const [seed, setSeed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cacheKey = `${preferredLanguage}_${providerSource}_${seed}`;
  const cached = feedCache[cacheKey];

  const [trendingTracks, setTrendingTracks] = useState(cached?.trending || []);
  const [slowedTracks, setSlowedTracks] = useState(cached?.slowed || []);
  const [chillTracks, setChillTracks] = useState(cached?.chill || []);
  const [bestSongs, setBestSongs] = useState(cached?.best || []);
  const [isLoading, setIsLoading] = useState(!cached);

  const artistsScrollRef = useRef(null);

  const greetingTime = useMemo(() => getGreetingTime(), []);
  const displayName = user?.displayName || user?.username || 'Listener';

  // Fetch clean language-tailored music feed
  useEffect(() => {
    let isMounted = true;

    if (providerSource === 'owntg') {
      const all = lib?.allItems || [];
      setTrendingTracks(all.slice(0, 16));
      setSlowedTracks([]);
      setChillTracks(all.slice(6, 20));
      setBestSongs(all.slice(12, 28));
      setIsLoading(false);
      return;
    }

    if (feedCache[cacheKey]) {
      const c = feedCache[cacheKey];
      setTrendingTracks(c.trending || []);
      setSlowedTracks(c.slowed || []);
      setChillTracks(c.chill || []);
      setBestSongs(c.best || []);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const langName = langConfig.name;
    const trendingQuery = getQueryVariants(langName, 'trending', seed);
    const slowedQuery = getQueryVariants(langName, 'slowed', seed);
    const chillQuery = getQueryVariants(langName, 'chill', seed);
    const bestQuery = getQueryVariants(langName, 'radio', seed);

    const fetchFast = async (saavnPromise, ytQuery, count = 14) => {
      try {
        const saavnItems = await saavnPromise;
        if (saavnItems && saavnItems.length >= 6) return saavnItems.slice(0, count);
        const ytItems = await searchYouTube(ytQuery, count);
        return [...(saavnItems || []), ...ytItems].slice(0, count);
      } catch {
        return searchYouTube(ytQuery, count).catch(() => []);
      }
    };

    Promise.allSettled([
      fetchFast(fetchSaavnTrending(preferredLanguage, 16), trendingQuery, 14),
      searchYouTube(slowedQuery, 16).then(dedupeList).catch(() => []),
      fetchFast(searchSaavn(chillQuery, 14), chillQuery, 14),
      fetchFast(searchSaavn(bestQuery, 14), bestQuery, 14),
    ]).then(([trendRes, slowedRes, chillRes, bestRes]) => {
      if (!isMounted) return;

      const trend = trendRes.status === 'fulfilled' ? dedupeList(trendRes.value) : [];
      const slowed = slowedRes.status === 'fulfilled' ? dedupeList(slowedRes.value) : [];
      const chill = chillRes.status === 'fulfilled' ? dedupeList(chillRes.value) : [];
      const best = bestRes.status === 'fulfilled' ? dedupeList(bestRes.value) : [];

      setTrendingTracks(trend);
      setSlowedTracks(slowed);
      setChillTracks(chill);
      setBestSongs(best);
      setIsLoading(false);

      feedCache[cacheKey] = {
        trending: trend,
        slowed,
        chill,
        best,
      };
    });

    return () => {
      isMounted = false;
    };
  }, [preferredLanguage, langConfig, providerSource, lib?.allItems, seed, cacheKey]);

  const handlePlayTrack = (track, queue = []) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const activeQueue = queue && queue.length ? queue : [track];
      playTrack(track, activeQueue);
    }
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    delete feedCache[cacheKey];
    setSeed(s => s + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const currentArtists = useMemo(() => {
    return LANGUAGE_ARTISTS[preferredLanguage] || LANGUAGE_ARTISTS.tamil;
  }, [preferredLanguage]);

  // Quick Pick shortcut items
  const quickItems = useMemo(() => [
    {
      id: 'liked',
      title: 'Liked Songs',
      sub: `${likedTrackIds.length} tracks`,
      isLikedSpecial: true,
      action: () => onNavigate('liked'),
      playAction: () => {
        const likedSongs = (lib?.allItems || []).filter(t => likedTrackIds.includes(String(t.id)));
        if (likedSongs[0]) handlePlayTrack(likedSongs[0], likedSongs);
        else onNavigate('liked');
      },
    },
    {
      id: 'recent',
      title: 'Recently Played',
      sub: `${recentlyPlayed.length} tracks`,
      track: recentlyPlayed[0] || trendingTracks[0],
      action: () => {
        if (recentlyPlayed[0]) handlePlayTrack(recentlyPlayed[0], recentlyPlayed);
        else onNavigate('library');
      },
    },
    {
      id: 'slowed',
      title: 'Slowed & Reverb',
      sub: `${langConfig.name} Lofi`,
      track: slowedTracks[0] || trendingTracks[1],
      action: () => {
        if (slowedTracks[0]) handlePlayTrack(slowedTracks[0], slowedTracks);
      },
    },
    {
      id: 'trending',
      title: 'Top Hits',
      sub: `${langConfig.name} Top 20`,
      track: trendingTracks[0],
      action: () => {
        if (trendingTracks[0]) handlePlayTrack(trendingTracks[0], trendingTracks);
      },
    },
    {
      id: 'chill',
      title: 'Acoustic Chill',
      sub: 'Relaxing Vibes',
      track: chillTracks[0] || trendingTracks[2],
      action: () => {
        if (chillTracks[0]) handlePlayTrack(chillTracks[0], chillTracks);
      },
    },
    {
      id: 'radio',
      title: 'All-Time Melodies',
      sub: 'Evergreen Radio',
      track: bestSongs[0] || trendingTracks[3],
      action: () => {
        if (bestSongs[0]) handlePlayTrack(bestSongs[0], bestSongs);
      },
    },
  ], [likedTrackIds, recentlyPlayed, trendingTracks, slowedTracks, chillTracks, bestSongs, langConfig, lib?.allItems]);

  return (
    <div className="flex-1 w-full pb-32 select-none bg-transparent text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 space-y-9 pt-5">

        {/* ========================================================================= */}
        {/* 1. CLEAN TOP HEADER                                                       */}
        {/* ========================================================================= */}
        <header className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
          {/* Left: Mobile Nav Toggle + Greeting */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onToggleMobileNav && (
              <button
                onClick={onToggleMobileNav}
                className="md:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition flex items-center justify-center min-w-[38px] min-h-[38px]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white truncate">
                {greetingTime}, {displayName}
              </h1>
            </div>
          </div>

          {/* Right: Search, Language, Provider, Refresh & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Search Pill */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/5 text-xs text-white/60 hover:text-white transition"
              title="Search music"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Provider Selector */}
            <ProviderSourceButton />

            {/* Language Selector Pill */}
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/5 text-xs font-semibold text-white/80 hover:text-white transition"
              title="Switch language"
            >
              <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
              <span className="hidden xs:inline">{langConfig.name}</span>
            </button>

            {/* Refresh Feed */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white transition"
              title="Refresh feed"
              aria-label="Refresh feed"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{(displayName[0] || 'L').toUpperCase()}</span>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. QUICK PLAY GRID (SPOTIFY 6-TILE SHORTCUTS - 1 TAP PLAY)               */}
        {/* ========================================================================= */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {quickItems.map(item => {
              const cover = item.track ? getArtworkSrc(item.track, 120) : null;
              const isPlayingItem = item.track && currentTrack?.id === item.track.id && isPlaying;

              return (
                <div
                  key={item.id}
                  onClick={item.playAction || item.action}
                  className="group relative h-14 sm:h-16 rounded-xl clean-card-compact flex items-center overflow-hidden cursor-pointer select-none pr-3"
                >
                  {/* Thumbnail */}
                  <div className="w-14 sm:w-16 h-full flex-shrink-0 bg-neutral-900 relative">
                    {item.isLikedSpecial ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#fa2d48] to-[#8b5cf6] flex items-center justify-center text-white">
                        <Heart className="w-5 h-5 fill-white" />
                      </div>
                    ) : cover ? (
                      <SafeImage
                        src={cover}
                        alt={item.title}
                        size={120}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white/40">
                        <Music2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0 flex-1 px-3">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#fa2d48] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-white/45 truncate">
                      {item.sub}
                    </p>
                  </div>

                  {/* Instant Play Button */}
                  <div className="flex-shrink-0 ml-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (item.playAction) item.playAction();
                        else item.action();
                      }}
                      className={`w-8 h-8 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-md transition-all duration-150 ${
                        isPlayingItem
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                      }`}
                      aria-label={`Play ${item.title}`}
                    >
                      {isPlayingItem ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TRENDING NOW (CLEAN ALBUM ART CAROUSEL)                                */}
        {/* ========================================================================= */}
        <CleanCarousel
          title={`Trending in ${langConfig.name}`}
          subtitle="Top viral and most played songs right now"
          items={trendingTracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handlePlayTrack}
          onNavigateAll={() => onNavigate('search')}
        />

        {/* ========================================================================= */}
        {/* 4. SLOWED & REVERB HITS (REQUESTED BY USER)                              */}
        {/* ========================================================================= */}
        {slowedTracks.length > 0 && (
          <CleanCarousel
            title="Slowed + Reverb"
            subtitle="Aesthetic lofi and midnight chill vibes"
            items={slowedTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={handlePlayTrack}
          />
        )}

        {/* ========================================================================= */}
        {/* 5. TOP ARTISTS (CLEAN CIRCULAR AVATARS)                                   */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                Popular Artists
              </h2>
              <p className="text-xs text-white/50 mt-0.5 font-medium">
                Top visionaries and composers in {langConfig.name}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={artistsScrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {currentArtists.map((artist, idx) => (
              <div
                key={`artist_${artist.name}_${idx}`}
                onClick={() => onNavigate(`artist:${artist.name}`)}
                className="group flex flex-col items-center flex-shrink-0 w-[105px] sm:w-[125px] cursor-pointer select-none text-center snap-start"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-neutral-900 shadow-md ring-2 ring-white/10 group-hover:ring-[#fa2d48]/60 transition-all duration-300 group-hover:scale-105 mb-2">
                  <SafeImage
                    src={artist.image}
                    alt={artist.name}
                    size={240}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white truncate w-full group-hover:text-[#fa2d48] transition-colors">
                  {artist.name}
                </h3>
                <p className="text-[10px] text-white/40 truncate w-full mt-0.5">
                  {artist.role || 'Artist'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. RECOMMENDED TRACKS (CLEAN, COMPACT SONG LIST)                          */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                Recommended For You
              </h2>
              <p className="text-xs text-white/50 mt-0.5 font-medium">
                Fresh picks based on what's trending right now
              </p>
            </div>
            <button
              onClick={() => onNavigate('search')}
              className="text-xs font-semibold text-white/60 hover:text-white transition"
            >
              Search more
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(trendingTracks.length ? trendingTracks.slice(0, 8) : []).map((track, idx) => {
              const isThisPlaying = String(currentTrack?.id) === String(track.id) && isPlaying;
              const isLiked = likedTrackIds.includes(String(track.id));
              const thumb = getArtworkSrc(track, 100);

              return (
                <div
                  key={`rec_${track.id}_${idx}`}
                  onClick={() => handlePlayTrack(track, trendingTracks)}
                  className={`group flex items-center justify-between h-14 px-3 rounded-xl clean-card-compact cursor-pointer select-none ${
                    currentTrack?.id === track.id ? 'border-[#fa2d48]/30 bg-[#fa2d48]/5' : ''
                  }`}
                >
                  {/* Left: Thumbnail & Song / Artist */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 shadow-sm">
                      <SafeImage
                        src={thumb}
                        track={track}
                        alt={track.title}
                        size={100}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isThisPlaying ? (
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-1 h-2 bg-[#fa2d48] animate-pulse rounded-full" />
                            <span className="w-1 h-3.5 bg-[#fa2d48] animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2 bg-[#fa2d48] animate-pulse delay-150 rounded-full" />
                          </div>
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs sm:text-sm font-semibold truncate ${
                        currentTrack?.id === track.id ? 'text-[#fa2d48]' : 'text-white'
                      }`}>
                        {track.title}
                      </p>
                      <p className="text-[11px] text-white/50 truncate mt-0.5">
                        {track.artist || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Duration & Like button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-white/40 font-mono">
                      {formatDuration(track.duration || 210)}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleLike(track.id);
                      }}
                      className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                        isLiked ? 'text-[#fa2d48]' : 'text-white/30 hover:text-white'
                      }`}
                      aria-label="Like track"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. RECENTLY PLAYED                                                        */}
        {/* ========================================================================= */}
        {recentlyPlayed.length > 0 ? (
          <CleanCarousel
            title="Recently Played"
            subtitle="Pick up where you left off"
            items={recentlyPlayed}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={handlePlayTrack}
            onNavigateAll={() => onNavigate('library')}
          />
        ) : (
          <section className="clean-card rounded-2xl p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto text-[#fa2d48]">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">No listening history yet</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Any song you play will appear here so you can easily jump back in anytime.
            </p>
          </section>
        )}

      </div>
    </div>
  );
}
