import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  RotateCcw,
  Search,
  Menu,
  Clock,
  Flame,
  Radio,
  Plus,
  Check,
  Disc3,
  Waves,
  Music2,
  SlidersHorizontal,
  Settings,
  ChevronRight as ChevronIcon,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { PROVIDER_SOURCES } from '../components/layout/ProviderSourceButton';
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

/**
 * Amazon Music Horizontal Carousel (Shelf)
 */
function AmazonMusicShelf({
  title,
  subtitle,
  items = [],
  currentTrackId,
  isPlaying,
  onPlay,
  onNavigateAll,
  showAtmos = true,
}) {
  const scrollRef = useRef(null);

  const scroll = direction => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -420 : 420;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Amazon Music Shelf Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs text-white/55 font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onNavigateAll && (
            <button
              onClick={onNavigateAll}
              className="text-xs font-bold text-[#00a8e1] hover:text-[#22d3ee] uppercase tracking-wider transition mr-1"
            >
              See all
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/80 hover:text-white transition active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/80 hover:text-white transition active:scale-95"
              aria-label="Next"
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
          const cover = getArtworkSrc(track, 360);

          return (
            <div
              key={`amz_card_${track.id}_${idx}`}
              onClick={() => onPlay(track, items)}
              className="group flex-shrink-0 w-[155px] sm:w-[178px] cursor-pointer select-none snap-start amz-card p-3"
            >
              {/* Artwork Box */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#0d1117] shadow-lg mb-2.5">
                <SafeImage
                  src={cover}
                  track={track}
                  alt={track.title}
                  size={360}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Amazon Music Signature Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="amz-badge-hd">ULTRA HD</span>
                  {showAtmos && idx % 2 === 0 && (
                    <span className="amz-badge-atmos">ATMOS</span>
                  )}
                </div>

                {/* Amazon Music Cyan Circular Play Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onPlay(track, items);
                  }}
                  className={`absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full amz-play-btn flex items-center justify-center ${
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
              <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00a8e1] transition-colors leading-tight">
                {track.title}
              </h3>
              <p className="text-[11px] text-white/50 truncate mt-1">
                {track.artist || 'Amazon Music Hit'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * MASTER HOMEPAGE: CLEAN AMAZON MUSIC IN IOS 17
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
  const setProviderSource = useSettingsStore(s => s.setProviderSource);

  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  const [seed, setSeed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredHeroIndex, setFeaturedHeroIndex] = useState(0);

  const cacheKey = `${preferredLanguage}_${providerSource}_${seed}`;
  const cached = feedCache[cacheKey];

  const [trendingTracks, setTrendingTracks] = useState(cached?.trending || []);
  const [slowedTracks, setSlowedTracks] = useState(cached?.slowed || []);
  const [chillTracks, setChillTracks] = useState(cached?.chill || []);
  const [bestSongs, setBestSongs] = useState(cached?.best || []);
  const [isLoading, setIsLoading] = useState(!cached);

  const artistsScrollRef = useRef(null);

  const displayName = user?.displayName || user?.username || 'Listener';

  // Click outside listener for unified Settings Menu
  useEffect(() => {
    const handleClickOutside = e => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setSettingsMenuOpen(false);
      }
    };
    if (settingsMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [settingsMenuOpen]);

  // Load language tailored content
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

  // Top featured hero tracks for the Amazon Music Spotlight Banner
  const heroSpotlightTracks = useMemo(() => {
    const pool = trendingTracks.length ? trendingTracks : (lib?.allItems || []);
    return pool.slice(0, 4);
  }, [trendingTracks, lib?.allItems]);

  const currentHeroTrack = heroSpotlightTracks[featuredHeroIndex] || heroSpotlightTracks[0];
  const isHeroPlaying = currentHeroTrack && currentTrack?.id === currentHeroTrack.id && isPlaying;
  const heroCover = currentHeroTrack ? getArtworkSrc(currentHeroTrack, 600) : null;

  const currentArtists = useMemo(() => {
    return LANGUAGE_ARTISTS[preferredLanguage] || LANGUAGE_ARTISTS.tamil;
  }, [preferredLanguage]);

  // Quick 6-card Jump Back In tiles
  const quickJumpItems = useMemo(() => [
    {
      id: 'liked',
      title: 'My Favorites',
      sub: `${likedTrackIds.length} Songs`,
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
      title: 'Listen Again',
      sub: `${recentlyPlayed.length} Tracks`,
      track: recentlyPlayed[0] || trendingTracks[0],
      action: () => {
        if (recentlyPlayed[0]) handlePlayTrack(recentlyPlayed[0], recentlyPlayed);
        else onNavigate('library');
      },
    },
    {
      id: 'slowed',
      title: 'Slowed + Reverb',
      sub: `${langConfig.name} Station`,
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
      sub: 'Relaxing Melodies',
      track: chillTracks[0] || trendingTracks[2],
      action: () => {
        if (chillTracks[0]) handlePlayTrack(chillTracks[0], chillTracks);
      },
    },
    {
      id: 'radio',
      title: 'Evergreen Radio',
      sub: 'All-Time Hits',
      track: bestSongs[0] || trendingTracks[3],
      action: () => {
        if (bestSongs[0]) handlePlayTrack(bestSongs[0], bestSongs);
      },
    },
  ], [likedTrackIds, recentlyPlayed, trendingTracks, slowedTracks, chillTracks, bestSongs, langConfig, lib?.allItems]);

  return (
    <div className="flex-1 w-full pb-32 select-none bg-transparent text-white font-sans">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-7 pt-4">

        {/* ========================================================================= */}
        {/* 1. TOP HEADER & BRANDING (AMAZON MUSIC WEB + IOS 17)                      */}
        {/* ========================================================================= */}
        <header className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          {/* Left: Mobile Nav Toggle + Amazon Music Brand Mark */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onToggleMobileNav && (
              <button
                onClick={onToggleMobileNav}
                className="md:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white transition flex items-center justify-center min-w-[38px] min-h-[38px]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div
              onClick={() => onNavigate('home')}
              className="cursor-pointer flex items-center gap-1.5 select-none"
            >
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                vex<span className="text-[#00a8e1]">m</span>
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white/60 tracking-wider uppercase ml-1">
                music
              </span>
            </div>
          </div>

          {/* Right: Search + Single Unified Settings Button + User Avatar */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Search Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/5 text-white/70 hover:text-white transition active:scale-95 flex items-center gap-2"
              title="Search music"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Search</span>
            </button>

            {/* SINGLE SETTINGS BUTTON (GROUPS LANGUAGE, SOURCE, AND REFRESH) */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setSettingsMenuOpen(prev => !prev)}
                className={`p-2 rounded-full transition active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px] ${
                  settingsMenuOpen
                    ? 'bg-[#00a8e1] text-black shadow-lg shadow-[#00a8e1]/40'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/5'
                }`}
                title="Preferences & Audio Source"
                aria-label="Preferences and Audio Source"
                aria-expanded={settingsMenuOpen}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* iOS 17 Style Popover Dropdown */}
              {settingsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#111622] border border-white/10 p-3 shadow-2xl z-50 animate-scale-up backdrop-blur-2xl divide-y divide-white/[0.08]">
                  {/* Popover Header */}
                  <div className="pb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#00a8e1]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Music Preferences</span>
                    </div>
                    <button
                      onClick={() => setSettingsMenuOpen(false)}
                      className="text-xs font-bold text-[#00a8e1] hover:underline"
                    >
                      Done
                    </button>
                  </div>

                  {/* Section 1: Music Language */}
                  <div className="py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 font-medium flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#00a8e1]" />
                        Language
                      </span>
                      <button
                        onClick={() => {
                          setSettingsMenuOpen(false);
                          onOpenLanguageModal();
                        }}
                        className="text-xs font-bold text-[#00a8e1] hover:underline flex items-center gap-1"
                      >
                        <span>{langConfig.name}</span>
                        <ChevronIcon className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Language Switcher Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      {MUSIC_LANGUAGES.slice(0, 5).map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => {
                            useSettingsStore.getState().setPreferredLanguage(lang.id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${
                            preferredLanguage === lang.id
                              ? 'bg-[#00a8e1] text-black font-bold'
                              : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Streaming Audio Source */}
                  <div className="py-2.5 space-y-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                      Audio Source Engine
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROVIDER_SOURCES.map(src => {
                        const Icon = src.icon;
                        const isSelected = providerSource === src.id;
                        return (
                          <button
                            key={src.id}
                            onClick={() => {
                              setProviderSource(src.id);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition text-left ${
                              isSelected
                                ? 'bg-[#00a8e1] text-black font-bold shadow-md shadow-[#00a8e1]/30'
                                : 'bg-white/[0.05] hover:bg-white/[0.10] text-white/80'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{src.shortLabel || src.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Refresh Feed & Full Settings */}
                  <div className="pt-2.5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white transition active:scale-95"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00a8e1]' : ''}`} />
                      <span>{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition"
                      title="Open full settings"
                      aria-label="Open full settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Action */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/[0.10] border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 ring-2 ring-[#00a8e1]/40">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{(displayName[0] || 'L').toUpperCase()}</span>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. FEATURED SPOTLIGHT BANNER (AMAZON MUSIC ORIGINAL HERO)                 */}
        {/* ========================================================================= */}
        {currentHeroTrack && (
          <section className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-[#111622] border border-white/10 shadow-2xl">
            {/* Background Artwork Stage with Dark Right-to-Left Gradient Overlay */}
            {heroCover && (
              <div className="absolute inset-0">
                <img
                  src={heroCover}
                  alt={currentHeroTrack.title}
                  className="w-full h-full object-cover opacity-25 filter blur-xs sm:blur-none sm:opacity-30 object-right"
                />
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#0b0e14] via-[#0b0e14]/90 to-transparent" />
              </div>
            )}

            <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
              {/* Left Column: Metadata & CTAs */}
              <div className="flex-1 space-y-3.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#00a8e1]">
                    FEATURED SPOTLIGHT
                  </span>
                  <span className="amz-badge-hd">ULTRA HD</span>
                  <span className="amz-badge-atmos">DOLBY ATMOS</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
                    {currentHeroTrack.title}
                  </h2>
                  <p className="text-sm sm:text-base text-white/70 font-medium truncate">
                    {currentHeroTrack.artist || 'Featured Artist'} • {currentHeroTrack.album || 'Single'}
                  </p>
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                  <button
                    onClick={() => handlePlayTrack(currentHeroTrack, heroSpotlightTracks)}
                    className="flex items-center gap-2 px-6 py-3 rounded-full amz-play-btn font-bold text-xs sm:text-sm active:scale-95"
                  >
                    {isHeroPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                        <span>Listen Now</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toggleLike(currentHeroTrack.id)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white font-semibold text-xs sm:text-sm transition active:scale-95"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        likedTrackIds.includes(String(currentHeroTrack.id))
                          ? 'fill-[#fa2d48] text-[#fa2d48]'
                          : 'text-white/80'
                      }`}
                    />
                    <span>{likedTrackIds.includes(String(currentHeroTrack.id)) ? 'Saved' : 'Add to Library'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Square Artwork with Spotlight Controls */}
              <div className="w-40 sm:w-48 md:w-56 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 relative group">
                <SafeImage
                  src={heroCover}
                  alt={currentHeroTrack.title}
                  size={500}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Carousel Dots */}
                {heroSpotlightTracks.length > 1 && (
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10">
                    {heroSpotlightTracks.map((_, i) => (
                      <button
                        key={`dot_${i}`}
                        onClick={e => {
                          e.stopPropagation();
                          setFeaturedHeroIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          i === featuredHeroIndex ? 'w-5 bg-[#00a8e1]' : 'w-1.5 bg-white/40'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 3. JUMP BACK IN / LISTEN AGAIN (AMAZON MUSIC 6-CARD GRID)                 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight px-1">
            Listen Again
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {quickJumpItems.map(item => {
              const cover = item.track ? getArtworkSrc(item.track, 140) : null;
              const isPlayingItem = item.track && currentTrack?.id === item.track.id && isPlaying;

              return (
                <div
                  key={item.id}
                  onClick={item.playAction || item.action}
                  className="group relative h-15 sm:h-16 rounded-xl amz-card flex items-center overflow-hidden cursor-pointer select-none pr-3"
                >
                  {/* Artwork on Left */}
                  <div className="w-15 sm:w-16 h-full flex-shrink-0 bg-[#0d1117] relative">
                    {item.isLikedSpecial ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#00a8e1] to-[#8b5cf6] flex items-center justify-center text-white">
                        <Heart className="w-5 h-5 fill-white" />
                      </div>
                    ) : cover ? (
                      <SafeImage
                        src={cover}
                        alt={item.title}
                        size={140}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-white/40">
                        <Music2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0 flex-1 px-3">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00a8e1] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-white/50 truncate">
                      {item.sub}
                    </p>
                  </div>

                  {/* Play Button */}
                  <div className="flex-shrink-0 ml-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (item.playAction) item.playAction();
                        else item.action();
                      }}
                      className={`w-8 h-8 rounded-full amz-play-btn flex items-center justify-center ${
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
        {/* 4. TRENDING SONGS IN {LANGUAGE} (AMAZON MUSIC HORIZONTAL SHELF)           */}
        {/* ========================================================================= */}
        <AmazonMusicShelf
          title={`Trending Songs in ${langConfig.name}`}
          subtitle="The most-streamed tracks on Amazon Music this week"
          items={trendingTracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onPlay={handlePlayTrack}
          onNavigateAll={() => onNavigate('search')}
        />

        {/* ========================================================================= */}
        {/* 5. SLOWED + REVERB STATIONS (SIGNATURE AMZ STATION SHELF)                 */}
        {/* ========================================================================= */}
        {slowedTracks.length > 0 && (
          <AmazonMusicShelf
            title="Slowed + Reverb Stations"
            subtitle="Endless aesthetic lofi, midnight chill, and slowed mixes"
            items={slowedTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={handlePlayTrack}
            showAtmos={false}
          />
        )}

        {/* ========================================================================= */}
        {/* 6. POPULAR ARTISTS (AMAZON MUSIC VERIFIED ARTIST ROW)                     */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Popular Artists
              </h2>
              <p className="text-xs text-white/55 font-normal mt-0.5">
                Top composers, singers, and creators in {langConfig.name}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/80 hover:text-white transition active:scale-95"
                aria-label="Previous artists"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-white/80 hover:text-white transition active:scale-95"
                aria-label="Next artists"
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
                key={`amz_artist_${artist.name}_${idx}`}
                onClick={() => onNavigate(`artist:${artist.name}`)}
                className="group flex flex-col items-center flex-shrink-0 w-[110px] sm:w-[130px] cursor-pointer select-none text-center snap-start"
              >
                <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full overflow-hidden bg-[#0d1117] shadow-lg ring-2 ring-white/10 group-hover:ring-[#00a8e1] transition-all duration-300 group-hover:scale-105 mb-2">
                  <SafeImage
                    src={artist.image}
                    alt={artist.name}
                    size={260}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate w-full group-hover:text-[#00a8e1] transition-colors">
                  {artist.name}
                </h3>
                <p className="text-[10px] text-white/45 truncate w-full mt-0.5">
                  {artist.role || 'Artist'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. TOP 10 CHARTBUSTERS (AMAZON MUSIC NUMBERED TRACK LIST)                 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Top Chartbusters
              </h2>
              <p className="text-xs text-white/55 font-normal mt-0.5">
                Stream in Ultra HD Lossless Audio
              </p>
            </div>
            <button
              onClick={() => onNavigate('search')}
              className="text-xs font-bold text-[#00a8e1] hover:text-[#22d3ee] uppercase tracking-wider transition"
            >
              Explore More
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {(trendingTracks.length ? trendingTracks.slice(0, 8) : []).map((track, idx) => {
              const isThisPlaying = String(currentTrack?.id) === String(track.id) && isPlaying;
              const isLiked = likedTrackIds.includes(String(track.id));
              const thumb = getArtworkSrc(track, 120);

              return (
                <div
                  key={`chart_row_${track.id}_${idx}`}
                  onClick={() => handlePlayTrack(track, trendingTracks)}
                  className={`group flex items-center justify-between h-15 px-3 rounded-xl amz-card cursor-pointer select-none ${
                    currentTrack?.id === track.id ? 'border-[#00a8e1]/40 bg-[#00a8e1]/10' : ''
                  }`}
                >
                  {/* Left: Number + Thumbnail + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <span className="w-5 text-center text-xs font-bold text-white/40 group-hover:text-[#00a8e1] font-mono">
                      {idx + 1}
                    </span>

                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#0d1117] shadow-sm">
                      <SafeImage
                        src={thumb}
                        track={track}
                        alt={track.title}
                        size={120}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                          isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isThisPlaying ? (
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-1 h-2 bg-[#00a8e1] animate-pulse rounded-full" />
                            <span className="w-1 h-3.5 bg-[#00a8e1] animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2 bg-[#00a8e1] animate-pulse delay-150 rounded-full" />
                          </div>
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs sm:text-sm font-bold truncate ${
                          currentTrack?.id === track.id ? 'text-[#00a8e1]' : 'text-white'
                        }`}>
                          {track.title}
                        </p>
                        <span className="amz-badge-hd hidden sm:inline-flex">ULTRA HD</span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate mt-0.5">
                        {track.artist || 'Amazon Music Hit'}
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
        {/* 8. RECENTLY PLAYED SHELF                                                  */}
        {/* ========================================================================= */}
        {recentlyPlayed.length > 0 && (
          <AmazonMusicShelf
            title="Recently Played"
            subtitle="Pick up where you left off"
            items={recentlyPlayed}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlay={handlePlayTrack}
            onNavigateAll={() => onNavigate('library')}
            showAtmos={false}
          />
        )}

      </div>
    </div>
  );
}
