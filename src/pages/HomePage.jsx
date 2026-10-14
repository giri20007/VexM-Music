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
  Compass,
  Radio,
  Flame,
  Volume2,
  Headphones,
  Zap,
  Coffee,
  Waves,
  Disc3,
  Moon,
  Library,
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

// Seed variations for natural feed rotation
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
    nostalgia: [
      `Evergreen 90s 2000s ${lang} golden hits`,
      `Classic old ${lang} melodies`,
      `Nostalgic retro ${lang} super hits`,
    ],
    workout: [
      `${lang} gym workout motivation high energy`,
      `${lang} bass boosted workout songs`,
      `${lang} energetic workout hits`,
    ],
    romance: [
      `${lang} romantic soulful love melody songs`,
      `${lang} acoustic romantic duets love`,
      `${lang} heart touching love melodies`,
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

// Deduplicate helper
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

// Human-like time-of-day greeting
const getGreetingTime = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late night';
};

/**
 * MASTER HOMEPAGE: "VEX-M ATMOSPHERE"
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

  const [featuredTracks, setFeaturedTracks] = useState(cached?.featured || []);
  const [slowedTracks, setSlowedTracks] = useState(cached?.slowed || []);
  const [bestSongs, setBestSongs] = useState(cached?.best || []);
  const [trendingTracks, setTrendingTracks] = useState(cached?.trending || []);
  const [chillTracks, setChillTracks] = useState(cached?.chill || []);
  const [workoutTracks, setWorkoutTracks] = useState(cached?.workout || []);
  const [romanceTracks, setRomanceTracks] = useState(cached?.romance || []);
  const [nostalgiaTracks, setNostalgiaTracks] = useState(cached?.nostalgia || []);
  const [newReleases, setNewReleases] = useState(cached?.releases || []);
  const [isLoading, setIsLoading] = useState(!cached);

  const artistsScrollRef = useRef(null);

  const greetingTime = useMemo(() => getGreetingTime(), []);
  const displayName = user?.displayName || user?.username || 'Listener';

  // Load language tailored content
  useEffect(() => {
    let isMounted = true;

    // 1. If OwnTg selected: load from local storage library
    if (providerSource === 'owntg') {
      const all = lib?.allItems || [];
      setFeaturedTracks(all.slice(0, 8));
      setSlowedTracks([]);
      setBestSongs(all.slice(8, 20).length ? all.slice(8, 20) : all.slice(0, 12));
      setTrendingTracks(all.slice(0, 12));
      setChillTracks(all.slice(4, 16));
      setWorkoutTracks(all.slice(8, 20));
      setRomanceTracks(all.slice(12, 24));
      setNostalgiaTracks(all.slice(16, 28));
      setNewReleases(all.slice(20, 32).length ? all.slice(20, 32) : all.slice(0, 12));
      setIsLoading(false);
      return;
    }

    // 2. Cache hit
    if (feedCache[cacheKey]) {
      const c = feedCache[cacheKey];
      setFeaturedTracks(c.featured || []);
      setSlowedTracks(c.slowed || []);
      setBestSongs(c.best || []);
      setTrendingTracks(c.trending || []);
      setChillTracks(c.chill || []);
      setWorkoutTracks(c.workout || []);
      setRomanceTracks(c.romance || []);
      setNostalgiaTracks(c.nostalgia || []);
      setNewReleases(c.releases || []);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const langName = langConfig.name;
    const slowedQuery = getQueryVariants(langName, 'slowed', seed);
    const trendingQuery = getQueryVariants(langName, 'trending', seed);
    const bestQuery = getQueryVariants(langName, 'radio', seed);
    const chillQuery = getQueryVariants(langName, 'chill', seed);
    const workoutQuery = getQueryVariants(langName, 'workout', seed);
    const romanceQuery = getQueryVariants(langName, 'romance', seed);
    const nostalgiaQuery = getQueryVariants(langName, 'nostalgia', seed);
    const releaseQuery = `Latest ${langName} Movie Songs 2026 Releases`;

    const fetchWithFallback = async (saavnPromise, ytQuery, count = 14) => {
      try {
        const saavnItems = await saavnPromise;
        if (saavnItems && saavnItems.length >= 6) return saavnItems.slice(0, count);
        const ytItems = await searchYouTube(ytQuery, count);
        return [...(saavnItems || []), ...ytItems].slice(0, count);
      } catch {
        return searchYouTube(ytQuery, count).catch(() => []);
      }
    };

    const fetchSlowedYTM = async () => {
      try {
        const items = await searchYouTube(slowedQuery, 16);
        return dedupeList(items);
      } catch {
        return [];
      }
    };

    // Tier 1: Primary rows (Trending, Slowed, Radio, Releases)
    Promise.allSettled([
      fetchWithFallback(fetchSaavnTrending(preferredLanguage, 16), trendingQuery, 14),
      fetchSlowedYTM(),
      fetchWithFallback(searchSaavn(bestQuery, 16), bestQuery, 14),
      fetchWithFallback(searchSaavn(releaseQuery, 16), releaseQuery, 14),
    ]).then(([trendRes, slowedRes, bestRes, relRes]) => {
      if (!isMounted) return;

      const trend = trendRes.status === 'fulfilled' ? dedupeList(trendRes.value) : [];
      const slowed = slowedRes.status === 'fulfilled' ? dedupeList(slowedRes.value) : [];
      const best = bestRes.status === 'fulfilled' ? dedupeList(bestRes.value) : [];
      const rel = relRes.status === 'fulfilled' ? dedupeList(relRes.value) : [];

      setFeaturedTracks(trend);
      setSlowedTracks(slowed);
      setBestSongs(best);
      setTrendingTracks(trend);
      setNewReleases(rel);
      setIsLoading(false);

      // Tier 2: Mood rows (Chill, Workout, Romance, Nostalgia)
      Promise.allSettled([
        fetchWithFallback(searchSaavn(chillQuery, 14), chillQuery, 14),
        fetchWithFallback(searchSaavn(workoutQuery, 14), workoutQuery, 14),
        fetchWithFallback(searchSaavn(romanceQuery, 14), romanceQuery, 14),
        fetchWithFallback(searchSaavn(nostalgiaQuery, 14), nostalgiaQuery, 14),
      ]).then(([chillRes, workRes, romRes, nostRes]) => {
        if (!isMounted) return;

        const chill = chillRes.status === 'fulfilled' ? dedupeList(chillRes.value) : [];
        const work = workRes.status === 'fulfilled' ? dedupeList(workRes.value) : [];
        const rom = romRes.status === 'fulfilled' ? dedupeList(romRes.value) : [];
        const nost = nostRes.status === 'fulfilled' ? dedupeList(nostRes.value) : [];

        setChillTracks(chill);
        setWorkoutTracks(work);
        setRomanceTracks(rom);
        setNostalgiaTracks(nost);

        feedCache[cacheKey] = {
          featured: trend,
          slowed,
          best,
          trending: trend,
          releases: rel,
          chill,
          workout: work,
          romance: rom,
          nostalgia: nost,
        };
      });
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
    }, 600);
  };

  // Hero Spotlight Track (featured track or top trending)
  const heroTrack = useMemo(() => {
    if (featuredTracks.length > 0) return featuredTracks[0];
    if (trendingTracks.length > 0) return trendingTracks[0];
    return currentTrack;
  }, [featuredTracks, trendingTracks, currentTrack]);

  const isHeroPlaying = heroTrack && currentTrack?.id === heroTrack.id && isPlaying;
  const heroCover = heroTrack ? getArtworkSrc(heroTrack, 800) : null;

  // Curated Focus Collections
  const focusCollections = useMemo(() => [
    {
      id: 'late_night',
      title: 'Late Night Drive',
      description: 'Atmospheric midnight synth & slow reverb',
      mood: 'Midnight Beats',
      tracks: slowedTracks.length ? slowedTracks : trendingTracks,
      gradient: 'from-purple-900/40 via-indigo-950/30 to-black',
      cover: slowedTracks[0] ? getArtworkSrc(slowedTracks[0], 400) : heroCover,
    },
    {
      id: 'deep_focus',
      title: 'Deep Focus',
      description: 'Ambient acoustic flow for uninterrupted coding',
      mood: 'Calm Flow',
      tracks: chillTracks.length ? chillTracks : bestSongs,
      gradient: 'from-cyan-950/40 via-slate-900/30 to-black',
      cover: chillTracks[0] ? getArtworkSrc(chillTracks[0], 400) : heroCover,
    },
    {
      id: 'studio_energy',
      title: 'Studio Energy',
      description: 'High-voltage basslines and festival adrenaline',
      mood: 'Adrenaline',
      tracks: workoutTracks.length ? workoutTracks : trendingTracks,
      gradient: 'from-rose-950/40 via-red-950/30 to-black',
      cover: workoutTracks[0] ? getArtworkSrc(workoutTracks[0], 400) : heroCover,
    },
    {
      id: 'neon_rain',
      title: 'Neon Rain',
      description: 'Lofi chill and deep spatial resonance',
      mood: 'Spatial Audio',
      tracks: slowedTracks.length > 3 ? slowedTracks.slice(3) : trendingTracks,
      gradient: 'from-violet-950/40 via-blue-950/30 to-black',
      cover: slowedTracks[1] ? getArtworkSrc(slowedTracks[1], 400) : heroCover,
    },
  ], [slowedTracks, chillTracks, workoutTracks, trendingTracks, bestSongs, heroCover]);

  const currentArtists = useMemo(() => {
    return LANGUAGE_ARTISTS[preferredLanguage] || LANGUAGE_ARTISTS.tamil;
  }, [preferredLanguage]);

  return (
    <div className="flex-1 w-full pb-36 select-none bg-transparent text-white font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* ========================================================================= */}
        {/* SECTION 1: TOP HEADER                                                     */}
        {/* ========================================================================= */}
        <header className="pt-6 pb-2 flex items-center justify-between gap-4 border-b border-white/[0.08]">
          {/* Left: Mobile Nav Toggle + Contextual Greeting & Atmosphere Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            {onToggleMobileNav && (
              <button
                onClick={onToggleMobileNav}
                className="md:hidden p-2 rounded-xl vexm-glass vexm-press text-white/70 hover:text-white flex items-center justify-center min-w-[40px] min-h-[40px]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-white/40">
                Your Listening Atmosphere
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {greetingTime}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{displayName}</span>
              </h1>
            </div>
          </div>

          {/* Center: Desktop Integrated Glass Search Field */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full h-10 px-4 rounded-full vexm-glass hover:bg-white/[0.09] hover:border-white/20 transition-all flex items-center justify-between text-white/40 hover:text-white/80 group shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-white/40 group-hover:text-[#fa2d48] transition-colors" />
                <span className="text-xs truncate">Search songs, artists, albums...</span>
              </div>
              <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/40">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions (Mobile Search Button + Source Button + Language Pill + Refresh + Avatar) */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="md:hidden p-2.5 rounded-full vexm-glass vexm-press text-white/70 hover:text-white"
              title="Search"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Provider Source Selector */}
            <ProviderSourceButton />

            {/* Language Selector Pill */}
            <button
              onClick={onOpenLanguageModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full vexm-glass vexm-press text-xs font-semibold text-white/90 hover:text-white hover:border-white/20"
              title="Change music language"
            >
              <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
              <span>{langConfig.name}</span>
            </button>

            {/* Minimal Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full vexm-glass vexm-press text-white/60 hover:text-white"
              title="Refresh recommendations"
              aria-label="Refresh recommendations"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            </button>

            {/* User Avatar Action */}
            <div className="w-8 h-8 rounded-full overflow-hidden vexm-glass border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{(displayName[0] || 'L').toUpperCase()}</span>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SECTION 2: HERO SECTION ("VEX-M ATMOSPHERE" PERSONALIZED LISTENING STAGE) */}
        {/* ========================================================================= */}
        {heroTrack && (
          <section className="relative rounded-3xl p-6 sm:p-8 md:p-10 vexm-glass-strong overflow-hidden shadow-2xl">
            {/* Ambient Blurred Artwork Lighting */}
            {heroCover && (
              <div
                className="absolute -right-16 -top-16 w-[450px] h-[450px] rounded-full filter blur-[120px] opacity-25 pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: `url(${heroCover})` }}
              />
            )}

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10">
              {/* Left Side: Editorial Typography & Actions */}
              <div className="flex-1 space-y-5 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fa2d48] animate-pulse" />
                  Your Current Atmosphere
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                    Find your next frequency.
                  </h2>
                  <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    A curated space for the sounds you keep coming back to. Precision-mastered 320 kbps audio streaming in {langConfig.name}.
                  </p>
                </div>

                {/* Primary & Secondary Call to Actions */}
                <div className="flex items-center justify-center lg:justify-start gap-3.5 pt-1">
                  <button
                    onClick={() => handlePlayTrack(heroTrack, featuredTracks)}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs sm:text-sm shadow-xl shadow-[#fa2d48]/25 vexm-press"
                  >
                    {isHeroPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        <span>Pause Session</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                        <span>Start Listening</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onNavigate('library')}
                    className="flex items-center gap-2 px-5 py-3 rounded-full vexm-glass hover:bg-white/[0.12] text-white/90 hover:text-white font-semibold text-xs sm:text-sm vexm-press"
                  >
                    <Library className="w-4 h-4 text-white/70" />
                    <span>Explore Library</span>
                  </button>
                </div>
              </div>

              {/* Right Side: Large Rounded Artwork Stage with Glass Metadata Strip */}
              <div className="w-full sm:w-[360px] md:w-[400px] flex-shrink-0">
                <div
                  onClick={() => handlePlayTrack(heroTrack, featuredTracks)}
                  className="group relative aspect-square w-full rounded-2xl overflow-hidden vexm-glass border border-white/15 shadow-2xl cursor-pointer"
                >
                  <SafeImage
                    src={heroCover}
                    track={heroTrack}
                    alt={heroTrack.title}
                    size={600}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Glass Metadata Strip Overlapping Artwork Bottom */}
                  <div className="absolute inset-x-3 bottom-3 p-3.5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/15 flex items-center justify-between gap-3 shadow-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mini Vinyl Spin Detail */}
                      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <Disc3 className={`w-5 h-5 text-[#fa2d48] ${isHeroPlaying ? 'animate-spin' : ''}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#fa2d48] transition-colors">
                          {heroTrack.title}
                        </p>
                        <p className="text-[11px] text-white/50 truncate">
                          {heroTrack.artist}
                        </p>
                      </div>
                    </div>

                    {/* Quality Badge & Play Icon */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-white/10 text-white/80 border border-white/10">
                        320 KBPS
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handlePlayTrack(heroTrack, featuredTracks);
                        }}
                        className="w-8 h-8 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition"
                        aria-label="Play spotlight track"
                      >
                        {isHeroPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: QUICK LISTENING ROW (COMPACT SHORTCUTS)                        */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-white/40 tracking-wider uppercase px-1">
            Quick Shortcuts
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {[
              {
                label: 'Recently Played',
                sub: `${recentlyPlayed.length} Tracks`,
                icon: Clock,
                color: 'text-cyan-400',
                action: () => onNavigate('library'),
              },
              {
                label: 'Liked Songs',
                sub: `${likedTrackIds.length} Favorites`,
                icon: Heart,
                color: 'text-[#fa2d48]',
                action: () => onNavigate('liked'),
              },
              {
                label: 'Slowed & Reverb',
                sub: 'Midnight Lofi',
                icon: Waves,
                color: 'text-purple-400',
                action: () => {
                  if (slowedTracks[0]) handlePlayTrack(slowedTracks[0], slowedTracks);
                },
              },
              {
                label: 'Trending Hits',
                sub: `${langConfig.name} Top 20`,
                icon: Flame,
                color: 'text-amber-400',
                action: () => {
                  if (trendingTracks[0]) handlePlayTrack(trendingTracks[0], trendingTracks);
                },
              },
              {
                label: 'Pure Chill',
                sub: 'Acoustic Beats',
                icon: Coffee,
                color: 'text-emerald-400',
                action: () => {
                  if (chillTracks[0]) handlePlayTrack(chillTracks[0], chillTracks);
                },
              },
              {
                label: 'New Drops',
                sub: 'Fresh Releases',
                icon: Sparkles,
                color: 'text-rose-400',
                action: () => {
                  if (newReleases[0]) handlePlayTrack(newReleases[0], newReleases);
                },
              },
            ].map((shortcut, idx) => {
              const Icon = shortcut.icon;
              return (
                <div
                  key={`sc_${idx}`}
                  onClick={shortcut.action}
                  className="h-14 px-3 rounded-2xl vexm-glass-card vexm-press flex items-center gap-3 cursor-pointer select-none group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className={`w-4 h-4 ${shortcut.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-[#fa2d48] transition-colors">
                      {shortcut.label}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">
                      {shortcut.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: FOCUS SECTION ("MADE FOR YOUR FOCUS" SESSIONS)                 */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                Session Curation
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Made for your focus
              </h2>
            </div>
            <p className="text-xs text-white/40 hidden sm:block">
              Soundscapes designed to lock you into deep flow
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {focusCollections.map((col, idx) => {
              const isColPlaying = col.tracks.some(t => t.id === currentTrack?.id) && isPlaying;
              return (
                <div
                  key={col.id}
                  onClick={() => {
                    if (col.tracks[0]) handlePlayTrack(col.tracks[0], col.tracks);
                  }}
                  className="group relative aspect-[1.4/1] rounded-2xl overflow-hidden vexm-glass-card vexm-press p-5 flex flex-col justify-between cursor-pointer border border-white/10 shadow-lg"
                >
                  {/* Subtle Background Glow Tint */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  
                  {/* Background Artwork Silhouette */}
                  {col.cover && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-sm scale-110 group-hover:scale-105 transition-transform duration-700"
                      style={{ backgroundImage: `url(${col.cover})` }}
                    />
                  )}

                  {/* Header: Mood Tag */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold text-white/80 border border-white/10 uppercase tracking-wider">
                      {col.mood}
                    </span>
                    <button
                      className={`w-9 h-9 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-xl transition-all duration-200 ${
                        isColPlaying ? 'opacity-100 scale-100' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                      aria-label={`Play ${col.title}`}
                    >
                      {isColPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                  </div>

                  {/* Footer Details */}
                  <div className="relative z-10 space-y-1">
                    <h4 className="text-base font-bold text-white tracking-tight group-hover:text-[#fa2d48] transition-colors">
                      {col.title}
                    </h4>
                    <p className="text-xs text-white/60 line-clamp-1 leading-relaxed">
                      {col.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: TRENDING / NEW MUSIC TRACK LIST                                */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                Top Chartbusters
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Trending now
              </h2>
            </div>
            <button
              onClick={() => onNavigate('search')}
              className="text-xs font-semibold text-[#fa2d48] hover:underline transition"
            >
              See all
            </button>
          </div>

          <div className="rounded-2xl vexm-glass border border-white/10 p-2 sm:p-3 divide-y divide-white/[0.04]">
            {isLoading && trendingTracks.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={`sk_tr_${i}`} className="h-14 flex items-center gap-3 px-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 bg-white/[0.06] rounded" />
                    <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
                  </div>
                </div>
              ))
            ) : (
              trendingTracks.slice(0, 8).map((track, idx) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isLiked = likedTrackIds.includes(String(track.id));
                const thumb = getArtworkSrc(track, 120);

                return (
                  <div
                    key={`tr_${track.id}_${idx}`}
                    onClick={() => handlePlayTrack(track, trendingTracks)}
                    className={`group flex items-center justify-between h-15 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      currentTrack?.id === track.id
                        ? 'bg-white/[0.08] shadow-sm'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Left: Thumbnail & Song / Artist */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow">
                        <SafeImage
                          src={thumb}
                          track={track}
                          alt={track.title}
                          size={120}
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
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Center: Album Name (Desktop) */}
                    <div className="hidden md:block w-1/4 text-xs text-white/40 truncate pr-4">
                      {track.album || 'Single'}
                    </div>

                    {/* Right: Quality Badge, Duration, and Favorite Button */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/[0.06] text-white/60 border border-white/5">
                        320K
                      </span>
                      <span className="text-xs text-white/40 font-mono">
                        {formatDuration(track.duration || 210)}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleLike(track.id);
                        }}
                        className={`p-1.5 rounded-full hover:bg-white/10 transition ${
                          isLiked ? 'text-[#fa2d48]' : 'text-white/40 hover:text-white'
                        }`}
                        aria-label="Favorite"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: FEATURED ARTISTS DISCOVERY                                     */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                Artists & Visionaries
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Featured Artists
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full vexm-glass vexm-press flex items-center justify-center text-white/60 hover:text-white"
                aria-label="Previous artists"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => artistsScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full vexm-glass vexm-press flex items-center justify-center text-white/60 hover:text-white"
                aria-label="Next artists"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={artistsScrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {currentArtists.map((artist, idx) => (
              <div
                key={`art_${artist.name}_${idx}`}
                onClick={() => onNavigate(`artist:${artist.name}`)}
                className="group flex flex-col items-center flex-shrink-0 w-[115px] sm:w-[135px] cursor-pointer select-none text-center snap-start vexm-press"
              >
                <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-900 shadow-xl ring-2 ring-white/10 group-hover:ring-white/40 transition-all duration-300 group-hover:scale-105 mb-2.5">
                  <SafeImage
                    src={artist.image}
                    alt={artist.name}
                    size={280}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-xs sm:text-sm font-semibold text-white truncate w-full group-hover:text-[#fa2d48] transition-colors">
                  {artist.name}
                </h4>
                <p className="text-[11px] text-white/40 truncate w-full mt-0.5">
                  {artist.role || 'Artist'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7: RECENTLY PLAYED SECTION (WITH DESIGNED EMPTY STATE)             */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                Playback History
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Recently played
              </h2>
            </div>
            {recentlyPlayed.length > 0 && (
              <button
                onClick={() => onNavigate('library')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline transition"
              >
                View all in library
              </button>
            )}
          </div>

          {recentlyPlayed.length === 0 ? (
            /* Clear, Designed Empty State */
            <div className="rounded-3xl vexm-glass border border-white/10 p-8 sm:p-12 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-[#fa2d48] shadow-inner">
                <Compass className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base font-bold text-white">
                  No listening history yet
                </h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Songs you play will appear here so you can pick up your session right where you left off.
                </p>
              </div>
              <button
                onClick={() => {
                  if (featuredTracks[0]) handlePlayTrack(featuredTracks[0], featuredTracks);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fa2d48] text-white text-xs font-bold shadow-lg shadow-[#fa2d48]/20 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start exploring music</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {recentlyPlayed.slice(0, 6).map((track, idx) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const cover = getArtworkSrc(track, 360);

                return (
                  <div
                    key={`rec_${track.id}_${idx}`}
                    onClick={() => handlePlayTrack(track, recentlyPlayed)}
                    className="group flex flex-col cursor-pointer select-none vexm-glass-card vexm-press rounded-2xl p-2.5"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 shadow mb-2">
                      <SafeImage
                        src={cover}
                        track={track}
                        alt={track.title}
                        size={360}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handlePlayTrack(track, recentlyPlayed);
                        }}
                        className={`absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-90 ${
                          isThisPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
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

                    <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#fa2d48] transition-colors px-0.5">
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-white/50 truncate mt-0.5 px-0.5">
                      {track.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
