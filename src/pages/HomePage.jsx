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
  Waves,
  Zap,
  Coffee,
  Radio,
  Headphones,
  Disc3,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { ProviderSourceButton } from '../components/layout/ProviderSourceButton';

// In-memory feed cache for instant zero-flicker switching
const feedCache = {};

// Apple Music Editorial Category Tags
const EDITORIAL_TAGS = [
  'EDITOR’S CHOICE',
  'NEW RELEASE',
  'TRENDING HIT',
  'SPATIAL AUDIO',
  'FEATURED EXCLUSIVE',
  'TOP CHARTBUSTER',
];

// Clean Apple iOS Segmented Mood Chips
const MOOD_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'slowed', label: 'Slowed & Reverb', icon: Waves },
  { id: 'relax', label: 'Relax', icon: Coffee },
  { id: 'workout', label: 'Workout', icon: Zap },
  { id: 'energize', label: 'Energize', icon: Sparkles },
  { id: 'romance', label: 'Romance', icon: Heart },
  { id: 'party', label: 'Party', icon: Radio },
  { id: 'focus', label: 'Focus', icon: Headphones },
  { id: 'nostalgia', label: 'Nostalgia', icon: Disc3 },
];

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

// Formats today's date in Apple Music uppercase format
const getFormattedToday = () => {
  try {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).toUpperCase();
  } catch {
    return 'LISTEN NOW';
  }
};

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
      className="group flex-shrink-0 w-[84vw] max-w-[540px] flex flex-col cursor-pointer select-none snap-start apple-press"
    >
      {/* Editorial Header */}
      <div className="mb-2 px-1">
        <p className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-white/50">
          {tag}
        </p>
        <h3 className="text-base sm:text-xl font-bold text-white tracking-tight truncate group-hover:text-[#fa2d48] transition-colors">
          {track.title}
        </h3>
        <p className="text-xs sm:text-sm text-white/60 truncate">
          {track.artist}
        </p>
      </div>

      {/* Visual Glass Banner Card */}
      <div className="relative aspect-[16/9] sm:aspect-[2.1/1] w-full rounded-3xl overflow-hidden apple-glass-card shadow-xl transition-all duration-300 group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.8)]">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={800}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Floating Glass Play Badge */}
        <div className="absolute right-3.5 bottom-3.5 sm:right-4 sm:bottom-4">
          <button
            onClick={handlePlay}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-2xl border border-white/25 shadow-2xl transition-all duration-200 hover:scale-105 active:scale-90 ${
              isThisPlaying
                ? 'bg-[#fa2d48] text-white opacity-100 scale-100 shadow-[0_0_20px_rgba(250,45,72,0.5)]'
                : 'bg-black/50 hover:bg-[#fa2d48] text-white opacity-90 group-hover:opacity-100'
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
 * 2. iOS Glass Widget Speed Dial Card ("Listen Again")
 */
function SpeedDialWidget({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const cover = getArtworkSrc(track, 120);

  return (
    <div
      onClick={() => onPlay(track, queue)}
      className={`group relative flex items-center h-15 rounded-2xl apple-glass-card apple-press p-1.5 pr-3 cursor-pointer select-none ${
        currentTrack?.id === track.id ? 'bg-white/[0.14] border-white/25 shadow-lg' : ''
      }`}
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow-md">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={120}
          className="w-full h-full object-cover"
        />
        {isThisPlaying && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-1 h-2.5 bg-[#fa2d48] animate-pulse rounded-full" />
              <span className="w-1 h-3.5 bg-[#fa2d48] animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-2 bg-[#fa2d48] animate-pulse delay-150 rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 px-2.5">
        <p className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
          currentTrack?.id === track.id ? 'text-[#fa2d48]' : 'text-white'
        }`}>
          {track.title}
        </p>
        <p className="text-[11px] text-white/50 truncate mt-0.5">
          {track.artist}
        </p>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={e => {
            e.stopPropagation();
            onPlay(track, queue);
          }}
          className="w-7 h-7 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition"
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
 * 3. Apple iOS Frosted Glass Music Card
 */
function AppleGlassCard({ track, onPlay, queue = [] }) {
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
      className="group flex flex-col flex-shrink-0 w-[140px] sm:w-[165px] md:w-[180px] cursor-pointer select-none snap-start apple-glass-card apple-press rounded-2xl p-2.5"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 shadow-md mb-2">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={360}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Floating Glass Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-90 ${
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

      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:underline px-0.5">
        {track.title}
      </h4>
      <p className="text-[11px] text-white/50 truncate mt-0.5 px-0.5">
        {track.artist}
      </p>
    </div>
  );
}

/**
 * 4. Apple iOS Frosted Glass Row Item (Used in 3-Row Stacked Slider)
 */
function AppleGlassRowItem({ track, onPlay, queue = [] }) {
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
      className={`group flex items-center justify-between h-13 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer select-none apple-press ${
        currentTrack?.id === track.id ? 'bg-white/[0.08]' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 shadow-sm">
          <SafeImage
            src={cover}
            track={track}
            alt={track.title}
            size={120}
            className="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center transition-opacity ${
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
              currentTrack?.id === track.id ? 'text-[#fa2d48] font-semibold' : 'text-white'
            }`}
          >
            {track.title}
          </p>
          <p className="text-[11px] text-white/50 truncate mt-0.5">
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
          className={`p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition ${
            isLiked ? 'text-[#fa2d48] opacity-100' : 'text-white/40 hover:text-white'
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
 * 5. Apple Music Circular Artist Spotlight Card
 */
function AppleArtistCard({ artist, onSelect }) {
  return (
    <div
      onClick={() => onSelect(artist.name)}
      className="group flex flex-col items-center flex-shrink-0 w-[115px] sm:w-[135px] cursor-pointer select-none text-center snap-start apple-press"
    >
      <div className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-900 shadow-xl ring-2 ring-white/10 group-hover:ring-white/40 transition-all duration-300 group-hover:scale-105 mb-2.5">
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
      <p className="text-[11px] text-white/50 truncate w-full mt-0.5">
        {artist.role || 'Artist'}
      </p>
    </div>
  );
}

/**
 * 6. Apple Glass Horizontal Section Row
 */
function AppleSectionRow({ kicker, title, subtitle, onSeeAll, children, scrollRef }) {
  const handleScroll = dir => {
    if (scrollRef?.current) {
      const offset = dir === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
              {kicker}
            </p>
          )}
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-white/50 truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-semibold text-[#fa2d48] hover:underline transition mr-1 apple-press"
            >
              See all
            </button>
          )}
          {scrollRef && (
            <>
              <button
                onClick={() => handleScroll('left')}
                className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
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
        className="flex gap-3.5 sm:gap-5 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {children}
      </div>
    </section>
  );
}

// Skeletons
function SkeletonHero() {
  return (
    <div className="w-[84vw] max-w-[540px] flex-shrink-0 animate-pulse">
      <div className="h-3 w-24 bg-white/10 rounded mb-2" />
      <div className="h-5 w-48 bg-white/10 rounded mb-1" />
      <div className="h-3.5 w-32 bg-white/5 rounded mb-3" />
      <div className="aspect-[16/9] sm:aspect-[2.1/1] w-full bg-white/[0.06] rounded-3xl" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[140px] sm:w-[165px] md:w-[180px] flex-shrink-0 flex flex-col animate-pulse rounded-2xl apple-glass-card p-2.5">
      <div className="aspect-square w-full rounded-xl bg-white/[0.06] mb-2" />
      <div className="h-3.5 w-3/4 bg-white/10 rounded mb-1" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

/**
 * MASTER HOMEPAGE (APPLE iOS GLASSMORPHISM REDESIGN)
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

  const heroScrollRef = useRef(null);
  const slowedScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);
  const chillScrollRef = useRef(null);
  const workoutScrollRef = useRef(null);
  const romanceScrollRef = useRef(null);
  const nostalgiaScrollRef = useRef(null);
  const artistsScrollRef = useRef(null);

  const todayDateString = useMemo(() => getFormattedToday(), []);

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
    <div className="flex-1 w-full pb-32 select-none bg-transparent text-white">
      {/* 1. TOP EDITORIAL HERO HEADER */}
      <div className="px-4 sm:px-8 pt-5 pb-2 space-y-4">
        {/* Apple Editorial Date & Listen Now Title + Action Glass Controls */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-white/40">
              {todayDateString}
            </p>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-sans mt-0.5">
              Listen Now
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            {/* Minimalist Apple Glass Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
              title="Refresh feed"
              aria-label="Refresh feed"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin text-white' : ''
                }`}
              />
            </button>

            {/* Apple Glass Language Pill */}
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full apple-glass apple-press text-xs font-semibold text-white/90 hover:text-white transition"
              title="Change language"
            >
              <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
              <span>{langConfig.name}</span>
            </button>

            <ProviderSourceButton />
          </div>
        </div>

        {/* Apple iOS Segmented Glass Mood Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {MOOD_CHIPS.map(chip => {
            const isActive = activeMood === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveMood(isActive ? 'all' : chip.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 apple-press ${
                  isActive
                    ? 'apple-pill-active'
                    : 'apple-pill-inactive'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-11 mt-5">
        {/* ========================================================================= */}
        {/* SECTION 1: SPEED DIAL (LISTEN AGAIN / RECENT FAVORITES)                   */}
        {/* ========================================================================= */}
        {speedDialItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
                Listen Again & Quick Picks
              </h3>
              {recentlyPlayed.length > 0 && (
                <button
                  onClick={() => onNavigate('library')}
                  className="text-xs font-semibold text-[#fa2d48] hover:underline flex items-center gap-0.5 apple-press"
                >
                  <span>History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {speedDialItems.map((track, idx) => (
                <SpeedDialWidget
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
        {/* SECTION 2: APPLE FEATURED EDITORIAL HERO BANNER                           */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                  Apple Music Spotlight
                </p>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white">
                  Featured
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => heroScrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Previous Featured"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => heroScrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Next Featured"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={heroScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
            >
              {isLoading && featuredTracks.length === 0 ? (
                <>
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
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: SLOWED & REVERB (APPLE CURATED MIDNIGHT SESSION)               */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'slowed' || activeMood === 'relax' || activeMood === 'focus') && (
          <div className="p-4 sm:p-6 rounded-3xl apple-glass shadow-2xl relative overflow-hidden -mx-2 sm:mx-0">
            <AppleSectionRow
              kicker="Spatial Lofi"
              title="Slowed & Reverb"
              subtitle={`Aesthetic slowed tempo and midnight edits in ${langConfig.name}`}
              scrollRef={slowedScrollRef}
              onSeeAll={() => onNavigate('search')}
            >
              {isLoading && slowedTracks.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={`sk_sl_${i}`} />)
              ) : (
                slowedTracks.map((t, idx) => (
                  <AppleGlassCard
                    key={`slow_${t.id}_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={slowedTracks}
                  />
                ))
              )}
            </AppleSectionRow>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: QUICK PICKS RADIO (APPLE 3-ROW STACKED GLASS COLUMNS)          */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                  Start radio from a song
                </p>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  Quick picks
                </h2>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline transition apple-press"
              >
                See all
              </button>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {radioColumns.map((colGroup, colIdx) => (
                <div
                  key={`col_${colIdx}`}
                  className="flex-shrink-0 w-[285px] sm:w-[325px] md:w-[350px] p-2 rounded-2xl apple-glass-card flex flex-col space-y-1 snap-start"
                >
                  {colGroup.map((track, rowIdx) => (
                    <AppleGlassRowItem
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
        {/* SECTION 5: TODAY'S BIGGEST HITS / TRENDING NOW                            */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize' || activeMood === 'party') && (
          <AppleSectionRow
            kicker="Charts"
            title="Today's Biggest Hits"
            subtitle={`The top streaming chartbusters in ${langConfig.name}`}
            scrollRef={trendingScrollRef}
            onSeeAll={() => onNavigate('search')}
          >
            {isLoading && trendingTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_tr_${i}`} />)
            ) : (
              trendingTracks.slice(0, 14).map((t, idx) => (
                <AppleGlassCard
                  key={`trend_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={trendingTracks}
                />
              ))
            )}
          </AppleSectionRow>
        )}

        {/* ========================================================================= */}
        {/* SECTION 6: CHILL & PEACEFUL MELODIES                                      */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'relax' || activeMood === 'focus') && (
          <AppleSectionRow
            kicker="Mood"
            title="Peaceful & Relaxed"
            subtitle="Gentle acoustics, melodic chill and ambient flow"
            scrollRef={chillScrollRef}
          >
            {chillTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_ch_${i}`} />)
            ) : (
              chillTracks.slice(0, 14).map((t, idx) => (
                <AppleGlassCard
                  key={`chill_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={chillTracks}
                />
              ))
            )}
          </AppleSectionRow>
        )}

        {/* ========================================================================= */}
        {/* SECTION 7: WORKOUT ENERGY                                                 */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'workout' || activeMood === 'energize') && (
          <AppleSectionRow
            kicker="Activity"
            title="Energy Boost"
            subtitle="High-tempo workout tracks to power your session"
            scrollRef={workoutScrollRef}
          >
            {workoutTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_wo_${i}`} />)
            ) : (
              workoutTracks.slice(0, 14).map((t, idx) => (
                <AppleGlassCard
                  key={`work_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={workoutTracks}
                />
              ))
            )}
          </AppleSectionRow>
        )}

        {/* ========================================================================= */}
        {/* SECTION 8: ROMANTIC MELODIES                                              */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'romance') && (
          <AppleSectionRow
            kicker="Romance"
            title="Heartfelt Melodies"
            subtitle={`Soulful duets and romantic melodies in ${langConfig.name}`}
            scrollRef={romanceScrollRef}
          >
            {romanceTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rom_${i}`} />)
            ) : (
              romanceTracks.slice(0, 14).map((t, idx) => (
                <AppleGlassCard
                  key={`rom_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={romanceTracks}
                />
              ))
            )}
          </AppleSectionRow>
        )}

        {/* ========================================================================= */}
        {/* SECTION 9: FORGOTTEN FAVORITES (NOSTALGIA)                                */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'nostalgia') && (
          <AppleSectionRow
            kicker="Nostalgia"
            title="Forgotten Favorites"
            subtitle={`Timeless golden era classics in ${langConfig.name}`}
            scrollRef={nostalgiaScrollRef}
          >
            {nostalgiaTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_nost_${i}`} />)
            ) : (
              nostalgiaTracks.slice(0, 14).map((t, idx) => (
                <AppleGlassCard
                  key={`nost_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={nostalgiaTracks}
                />
              ))
            )}
          </AppleSectionRow>
        )}

        {/* ========================================================================= */}
        {/* SECTION 10: POPULAR ARTISTS & COMPOSERS                                   */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                  Discography
                </p>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  Featured Artists
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => artistsScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Previous artists"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => artistsScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="w-8 h-8 rounded-full apple-glass apple-press flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Next artists"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={artistsScrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
            >
              {currentArtists.map((artist, idx) => (
                <AppleArtistCard
                  key={`art_${artist.name}_${idx}`}
                  artist={artist}
                  onSelect={artistName => onNavigate(`artist:${artistName}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 11: NEW RELEASES                                                  */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                  Latest Drops
                </p>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  New Releases
                </h2>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline transition apple-press"
              >
                See all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {isLoading && newReleases.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rel_${i}`} />)
              ) : (
                (newReleases.length ? newReleases : featuredTracks).slice(0, 12).map((t, idx) => (
                  <AppleGlassCard
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
