import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  RotateCcw,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { ProviderSourceButton } from '../components/layout/ProviderSourceButton';

// In-memory cache for fast, zero-flicker feed switching
const feedCache = {};

// Clean, professional mood chips matching YouTube Music & Spotify
const MOOD_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'slowed', label: 'Slowed & Reverb' },
  { id: 'relax', label: 'Relax' },
  { id: 'workout', label: 'Workout' },
  { id: 'energize', label: 'Energize' },
  { id: 'romance', label: 'Romance' },
  { id: 'party', label: 'Party' },
  { id: 'focus', label: 'Focus' },
  { id: 'nostalgia', label: 'Nostalgia' },
];

// Curated top artists per language with verified high-res CDN photos
const LANGUAGE_ARTISTS = {
  tamil: [
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj' },
    { name: 'A.R. Rahman', image: 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg' },
    { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_002_20180802174245_500x500.jpg' },
    { name: 'Harris Jayaraj', image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230718071330_500x500.jpg' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg' },
    { name: 'Santhosh Narayanan', image: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20250527101718_500x500.jpg' },
    { name: 'Ilaiyaraaja', image: 'https://c.saavncdn.com/artists/Ilaiyaraaja_001_20251020081419_500x500.jpg' },
    { name: 'Pradeep Kumar', image: 'https://c.saavncdn.com/artists/Pradeep_Kumar_002_20250807084559_500x500.jpg' },
  ],
  hindi: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { name: 'Pritam', image: 'https://c.saavncdn.com/artists/Pritam_003_20231120091809_500x500.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg' },
    { name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_005_20230327072944_500x500.jpg' },
    { name: 'Sachin-Jigar', image: 'https://c.saavncdn.com/artists/Sachin-Jigar_002_20220623063546_500x500.jpg' },
    { name: 'KK', image: 'https://c.saavncdn.com/artists/KK_500x500.jpg' },
    { name: 'Atif Aslam', image: 'https://c.saavncdn.com/artists/Atif_Aslam_002_20240118072124_500x500.jpg' },
  ],
  telugu: [
    { name: 'Devi Sri Prasad', image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_002_20220502094759_500x500.jpg' },
    { name: 'Thaman S', image: 'https://c.saavncdn.com/artists/Thaman_S_002_20220627110123_500x500.jpg' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg' },
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj' },
    { name: 'Ram Miriyala', image: 'https://c.saavncdn.com/artists/Ram_Miriyala_001_20230504092248_500x500.jpg' },
    { name: 'Anurag Kulkarni', image: 'https://c.saavncdn.com/artists/Anurag_Kulkarni_001_20230413063533_500x500.jpg' },
  ],
  malayalam: [
    { name: 'Sushin Shyam', image: 'https://c.saavncdn.com/artists/Sushin_Shyam_001_20230920084534_500x500.jpg' },
    { name: 'Jakes Bejoy', image: 'https://c.saavncdn.com/artists/Jakes_Bejoy_002_20230919102237_500x500.jpg' },
    { name: 'Hesham Abdul Wahab', image: 'https://c.saavncdn.com/artists/Hesham_Abdul_Wahab_001_20230919101248_500x500.jpg' },
    { name: 'Deepak Dev', image: 'https://c.saavncdn.com/artists/Deepak_Dev_001_20230920084918_500x500.jpg' },
    { name: 'Shaan Rahman', image: 'https://c.saavncdn.com/artists/Shaan_Rahman_002_20230919102431_500x500.jpg' },
  ],
  punjabi: [
    { name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_007_20241001072935_500x500.jpg' },
    { name: 'Sidhu Moosewala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20220601092823_500x500.jpg' },
    { name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_002_20230818073145_500x500.jpg' },
    { name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_004_20230918072234_500x500.jpg' },
    { name: 'Shubh', image: 'https://c.saavncdn.com/artists/Shubh_001_20230522063857_500x500.jpg' },
  ],
  english: [
    { name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg' },
    { name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg' },
    { name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg' },
    { name: 'Billie Eilish', image: 'https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg' },
    { name: 'Dua Lipa', image: 'https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg' },
    { name: 'Coldplay', image: 'https://c.saavncdn.com/artists/Coldplay_002_20241003070447_500x500.jpg' },
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
const getGreetingText = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late night';
};

/**
 * 1. Speed Dial / "Listen again" (2x3 or 2x4 grid matching Spotify/YTM)
 */
function SpeedDialItem({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const cover = getArtworkSrc(track, 120);

  return (
    <div
      onClick={() => onPlay(track, queue)}
      className={`group relative flex items-center h-14 rounded-md overflow-hidden bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer select-none ${
        currentTrack?.id === track.id ? 'bg-white/[0.14]' : ''
      }`}
    >
      <div className="relative w-14 h-14 flex-shrink-0 bg-neutral-900">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={120}
          className="w-full h-full object-cover"
        />
        {isThisPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-1 h-2.5 bg-white animate-pulse rounded-full" />
              <span className="w-1 h-3.5 bg-white animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-2 bg-white animate-pulse delay-150 rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 px-3">
        <p className="text-xs sm:text-sm font-semibold text-white truncate">
          {track.title}
        </p>
        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
          {track.artist}
        </p>
      </div>

      <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            onPlay(track, queue);
          }}
          className="w-8 h-8 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
          aria-label={`Play ${track.title}`}
        >
          {isThisPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * 2. Standard Music Card (Spotify / YouTube Music square format)
 */
function MusicCard({ track, onPlay, queue = [] }) {
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
      className="group flex flex-col flex-shrink-0 w-[140px] sm:w-[165px] md:w-[180px] cursor-pointer select-none snap-start"
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-neutral-900 mb-2.5">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={360}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover / Active Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
            isThisPlaying
              ? 'opacity-100 scale-100 translate-y-0'
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

      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:underline">
        {track.title}
      </h4>
      <p className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5">
        {track.artist}
      </p>
    </div>
  );
}

/**
 * 3. Quick Picks Row Item (Used in 4-column stacked radio slider)
 */
function QuickPickRowItem({ track, onPlay, queue = [] }) {
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
      className={`group flex items-center justify-between h-13 px-2 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer select-none ${
        currentTrack?.id === track.id ? 'bg-white/[0.08]' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="relative w-11 h-11 rounded-md overflow-hidden flex-shrink-0 bg-neutral-900">
          <SafeImage
            src={cover}
            track={track}
            alt={track.title}
            size={120}
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
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

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-medium truncate ${
              currentTrack?.id === track.id ? 'text-[#fa2d48]' : 'text-white'
            }`}
          >
            {track.title}
          </p>
          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
            {track.artist}
          </p>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={e => {
            e.stopPropagation();
            toggleLike(track.id);
          }}
          className={`p-1.5 rounded-full hover:bg-white/10 transition ${
            isLiked ? 'text-[#fa2d48] opacity-100' : 'text-neutral-400 hover:text-white'
          }`}
          aria-label="Favorite"
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}

/**
 * 4. Circular Artist Item
 */
function ArtistItem({ artist, onSelect }) {
  return (
    <div
      onClick={() => onSelect(artist.name)}
      className="group flex flex-col items-center flex-shrink-0 w-[120px] sm:w-[135px] cursor-pointer select-none text-center snap-start"
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-900 shadow-md group-hover:shadow-lg transition-transform duration-300 group-hover:scale-105 mb-2">
        <SafeImage
          src={artist.image}
          alt={artist.name}
          size={280}
          className="w-full h-full object-cover"
        />
      </div>
      <h4 className="text-xs sm:text-sm font-semibold text-white truncate w-full group-hover:underline">
        {artist.name}
      </h4>
      <p className="text-[11px] text-neutral-400 truncate w-full mt-0.5">
        Artist
      </p>
    </div>
  );
}

/**
 * 5. Section Header + Horizontal Slider
 */
function SectionRow({ kicker, title, subtitle, onSeeAll, children, scrollRef }) {
  const handleScroll = dir => {
    if (scrollRef?.current) {
      const offset = dir === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              {kicker}
            </p>
          )}
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-semibold text-neutral-400 hover:text-white transition mr-1"
            >
              See all
            </button>
          )}
          {scrollRef && (
            <>
              <button
                onClick={() => handleScroll('left')}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>
    </section>
  );
}

// Skeletons
function SkeletonCard() {
  return (
    <div className="w-[140px] sm:w-[165px] md:w-[180px] flex-shrink-0 flex flex-col animate-pulse">
      <div className="aspect-square w-full rounded-md bg-white/[0.06] mb-2" />
      <div className="h-3.5 w-3/4 bg-white/10 rounded mb-1" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

/**
 * CLEAN, PROFESSIONAL HOME PAGE (SPOTIFY & YOUTUBE MUSIC DESIGN)
 */
export function HomePage({ lib, onNavigate, onOpenLanguageModal }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed) || [];

  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const langConfig = MUSIC_LANGUAGES.find(l => l.id === preferredLanguage) || MUSIC_LANGUAGES[0];
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const [activeMood, setActiveMood] = useState('all');
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

  const slowedScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);
  const chillScrollRef = useRef(null);
  const workoutScrollRef = useRef(null);
  const romanceScrollRef = useRef(null);
  const nostalgiaScrollRef = useRef(null);
  const artistsScrollRef = useRef(null);

  const greeting = useMemo(() => getGreetingText(), []);

  // Speed Dial items (Recently played + top trending fallback)
  const speedDialItems = useMemo(() => {
    const list = [...recentlyPlayed];
    if (list.length < 8) {
      const fallback = [...trendingTracks, ...featuredTracks, ...bestSongs];
      for (const t of fallback) {
        if (!list.some(p => p.id === t.id)) {
          list.push(t);
        }
        if (list.length >= 8) break;
      }
    }
    return list.slice(0, 8);
  }, [recentlyPlayed, trendingTracks, featuredTracks, bestSongs]);

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

    // YouTube Music search specifically for Slowed + Reverb
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

  // 4 columns x 3 rows for Quick Picks slider
  const radioColumns = useMemo(() => {
    const list = bestSongs.length ? bestSongs.slice(0, 15) : featuredTracks.slice(0, 15);
    const cols = [];
    for (let i = 0; i < list.length; i += 3) {
      cols.push(list.slice(i, i + 3));
    }
    return cols;
  }, [bestSongs, featuredTracks]);

  const currentArtists = useMemo(() => {
    return LANGUAGE_ARTISTS[preferredLanguage] || LANGUAGE_ARTISTS.tamil;
  }, [preferredLanguage]);

  return (
    <div className="flex-1 w-full pb-28 select-none bg-transparent text-white">
      {/* 1. TOP HEADER & MOOD CHIPS */}
      <div className="px-4 sm:px-8 pt-6 pb-2 space-y-4">
        {/* Main Title & Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
            {greeting}
          </h1>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Minimalist Refresh Icon Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition active:scale-95"
              title="Refresh feed"
              aria-label="Refresh feed"
            >
              <RotateCcw
                className={`w-4 h-4 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin text-white' : ''
                }`}
              />
            </button>

            {/* Language Selector Pill */}
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white transition active:scale-95"
              title="Change language"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-300" />
              <span>{langConfig.name}</span>
            </button>

            <ProviderSourceButton />
          </div>
        </div>

        {/* Clean YouTube Music / Spotify Mood Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {MOOD_CHIPS.map(chip => {
            const isActive = activeMood === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveMood(isActive ? 'all' : chip.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-neutral-300 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-9 mt-5">
        {/* ========================================================================= */}
        {/* 1. SPEED DIAL (LISTEN AGAIN / RECENT FAVORITES)                           */}
        {/* ========================================================================= */}
        {speedDialItems.length > 0 && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {speedDialItems.map((track, idx) => (
                <SpeedDialItem
                  key={`sd_${track.id}_${idx}`}
                  track={track}
                  onPlay={handlePlayTrack}
                  queue={speedDialItems}
                />
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 2. SLOWED & REVERB (YOUTUBE MUSIC EXCLUSIVE)                             */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'slowed' || activeMood === 'relax' || activeMood === 'focus') && (
          <SectionRow
            kicker="YouTube Music"
            title="Slowed & Reverb"
            subtitle={`Aesthetic lofi and midnight edits in ${langConfig.name}`}
            scrollRef={slowedScrollRef}
            onSeeAll={() => onNavigate('search')}
          >
            {isLoading && slowedTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_sl_${i}`} />)
            ) : (
              slowedTracks.map((t, idx) => (
                <MusicCard
                  key={`slow_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={slowedTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 3. QUICK PICKS (START RADIO FROM A SONG - YTM 3-ROW COLUMNS)             */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
                  Start radio from a song
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Quick picks
                </h2>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                See all
              </button>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x snap-mandatory">
              {radioColumns.map((colGroup, colIdx) => (
                <div
                  key={`col_${colIdx}`}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[340px] flex flex-col space-y-1 snap-start"
                >
                  {colGroup.map((track, rowIdx) => (
                    <QuickPickRowItem
                      key={`qp_${track.id}_${colIdx}_${rowIdx}`}
                      track={track}
                      onPlay={handlePlayTrack}
                      queue={bestSongs}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 4. TODAY'S BIGGEST HITS / TRENDING NOW                                   */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize' || activeMood === 'party') && (
          <SectionRow
            kicker="Trending"
            title="Today's Biggest Hits"
            subtitle={`The most played tracks streaming in ${langConfig.name}`}
            scrollRef={trendingScrollRef}
            onSeeAll={() => onNavigate('search')}
          >
            {isLoading && trendingTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_tr_${i}`} />)
            ) : (
              trendingTracks.slice(0, 14).map((t, idx) => (
                <MusicCard
                  key={`trend_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={trendingTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 5. CHILL & RELAXING MELODIES                                              */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'relax' || activeMood === 'focus') && (
          <SectionRow
            kicker="Mood"
            title="Peaceful & Relaxed"
            subtitle="Gentle melodies and acoustic flow"
            scrollRef={chillScrollRef}
          >
            {chillTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_ch_${i}`} />)
            ) : (
              chillTracks.slice(0, 14).map((t, idx) => (
                <MusicCard
                  key={`chill_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={chillTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 6. WORKOUT ENERGY                                                         */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'workout' || activeMood === 'energize') && (
          <SectionRow
            kicker="Workout"
            title="Energy Boost"
            subtitle="High tempo tracks to power your workout"
            scrollRef={workoutScrollRef}
          >
            {workoutTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_wo_${i}`} />)
            ) : (
              workoutTracks.slice(0, 14).map((t, idx) => (
                <MusicCard
                  key={`work_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={workoutTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 7. ROMANTIC MELODIES                                                      */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'romance') && (
          <SectionRow
            kicker="Romance"
            title="Heartfelt Melodies"
            subtitle={`Soulful duets and love songs in ${langConfig.name}`}
            scrollRef={romanceScrollRef}
          >
            {romanceTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rom_${i}`} />)
            ) : (
              romanceTracks.slice(0, 14).map((t, idx) => (
                <MusicCard
                  key={`rom_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={romanceTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 8. FORGOTTEN FAVORITES (NOSTALGIA)                                        */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'nostalgia') && (
          <SectionRow
            kicker="Nostalgia"
            title="Forgotten Favorites"
            subtitle={`Classic hits and timeless melodies in ${langConfig.name}`}
            scrollRef={nostalgiaScrollRef}
          >
            {nostalgiaTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_nost_${i}`} />)
            ) : (
              nostalgiaTracks.slice(0, 14).map((t, idx) => (
                <MusicCard
                  key={`nost_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={nostalgiaTracks}
                />
              ))
            )}
          </SectionRow>
        )}

        {/* ========================================================================= */}
        {/* 9. POPULAR ARTISTS IN [LANGUAGE]                                         */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
                  Explore
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Popular Artists
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => artistsScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition active:scale-95"
                  aria-label="Previous artists"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => artistsScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition active:scale-95"
                  aria-label="Next artists"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={artistsScrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {currentArtists.map((artist, idx) => (
                <ArtistItem
                  key={`art_${artist.name}_${idx}`}
                  artist={artist}
                  onSelect={artistName => onNavigate(`artist:${artistName}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 10. NEW RELEASES                                                          */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
                  Latest
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  New Releases
                </h2>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                See all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {isLoading && newReleases.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rel_${i}`} />)
              ) : (
                (newReleases.length ? newReleases : featuredTracks).slice(0, 12).map((t, idx) => (
                  <MusicCard
                    key={`rel_${t.id}_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={newReleases}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
