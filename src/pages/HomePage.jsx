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
  Disc3,
  RotateCcw,
  Waves,
  Zap,
  Coffee,
  Radio,
  Headphones,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Clock,
  Compass,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchSaavnTrending, searchSaavn, searchYouTube } from '../utils/api';
import { MUSIC_LANGUAGES } from '../components/modals/LanguagePreferenceModal';
import { ProviderSourceButton } from '../components/layout/ProviderSourceButton';

// Per-language & per-seed memory cache for instant, zero-flicker transitions
const homeCache = {};

// Editorial tags for featured banner
const EDITORIAL_TAGS = [
  'NEW RELEASE',
  'TRENDING HIT',
  'FEATURED TRACK',
  'TOP CHARTBUSTER',
  'EDITOR’S CHOICE',
  'STAFF PICK',
];

// Mood & Activity filter chips (matching YouTube Music)
const MOOD_CHIPS = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'slowed', label: 'Slowed + Reverb', icon: Waves, highlight: true },
  { id: 'relax', label: 'Relax', icon: Coffee },
  { id: 'workout', label: 'Workout', icon: Zap },
  { id: 'energize', label: 'Energize', icon: Flame },
  { id: 'romance', label: 'Romance', icon: Heart },
  { id: 'party', label: 'Party', icon: Radio },
  { id: 'focus', label: 'Focus', icon: Headphones },
  { id: 'nostalgia', label: 'Nostalgia', icon: Disc3 },
];

// Curated top composers & vocalists per language
const LANGUAGE_ARTISTS = {
  tamil: [
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj', tag: 'Rockstar Composer' },
    { name: 'A.R. Rahman', image: 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg', tag: 'Mozart of Madras' },
    { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_002_20180802174245_500x500.jpg', tag: 'Youth Icon' },
    { name: 'Harris Jayaraj', image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230718071330_500x500.jpg', tag: 'Melody King' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg', tag: 'Soulful Vocals' },
    { name: 'Santhosh Narayanan', image: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20250527101718_500x500.jpg', tag: 'Acoustic & Folk' },
    { name: 'Ilaiyaraaja', image: 'https://c.saavncdn.com/artists/Ilaiyaraaja_001_20251020081419_500x500.jpg', tag: 'Isaignani Maestro' },
    { name: 'Pradeep Kumar', image: 'https://c.saavncdn.com/artists/Pradeep_Kumar_002_20250807084559_500x500.jpg', tag: 'Indie & Classical' },
  ],
  hindi: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg', tag: 'Soulful Ballads' },
    { name: 'Pritam', image: 'https://c.saavncdn.com/artists/Pritam_003_20231120091809_500x500.jpg', tag: 'Chartbuster Maestro' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg', tag: 'Melody Queen' },
    { name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_005_20230327072944_500x500.jpg', tag: 'Party & Rap' },
    { name: 'Sachin-Jigar', image: 'https://c.saavncdn.com/artists/Sachin-Jigar_002_20220623063546_500x500.jpg', tag: 'Bollywood Pop' },
    { name: 'KK', image: 'https://c.saavncdn.com/artists/KK_500x500.jpg', tag: 'Timeless Voice' },
    { name: 'Atif Aslam', image: 'https://c.saavncdn.com/artists/Atif_Aslam_002_20240118072124_500x500.jpg', tag: 'Romantic Classics' },
  ],
  telugu: [
    { name: 'Devi Sri Prasad', image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_002_20220502094759_500x500.jpg', tag: 'Rockstar DSP' },
    { name: 'Thaman S', image: 'https://c.saavncdn.com/artists/Thaman_S_002_20220627110123_500x500.jpg', tag: 'Tollywood Beats' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg', tag: 'Heartfelt Melodies' },
    { name: 'Anirudh Ravichander', image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj', tag: 'Sensational Hits' },
    { name: 'Ram Miriyala', image: 'https://c.saavncdn.com/artists/Ram_Miriyala_001_20230504092248_500x500.jpg', tag: 'Folk & High Energy' },
    { name: 'Anurag Kulkarni', image: 'https://c.saavncdn.com/artists/Anurag_Kulkarni_001_20230413063533_500x500.jpg', tag: 'Romantic Vocalist' },
  ],
  malayalam: [
    { name: 'Sushin Shyam', image: 'https://c.saavncdn.com/artists/Sushin_Shyam_001_20230920084534_500x500.jpg', tag: 'Mollywood Trailblazer' },
    { name: 'Jakes Bejoy', image: 'https://c.saavncdn.com/artists/Jakes_Bejoy_002_20230919102237_500x500.jpg', tag: 'Atmospheric Beats' },
    { name: 'Hesham Abdul Wahab', image: 'https://c.saavncdn.com/artists/Hesham_Abdul_Wahab_001_20230919101248_500x500.jpg', tag: 'Soulful Melodies' },
    { name: 'Deepak Dev', image: 'https://c.saavncdn.com/artists/Deepak_Dev_001_20230920084918_500x500.jpg', tag: 'Groovy Soundtracks' },
    { name: 'Shaan Rahman', image: 'https://c.saavncdn.com/artists/Shaan_Rahman_002_20230919102431_500x500.jpg', tag: 'Catchy Melodies' },
  ],
  punjabi: [
    { name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_007_20241001072935_500x500.jpg', tag: 'Global Punjabi Icon' },
    { name: 'Sidhu Moosewala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20220601092823_500x500.jpg', tag: 'Legend of Hip-Hop' },
    { name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_002_20230818073145_500x500.jpg', tag: 'Brown Munde Beat' },
    { name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_004_20230918072234_500x500.jpg', tag: 'Geetan Di Machine' },
    { name: 'Shubh', image: 'https://c.saavncdn.com/artists/Shubh_001_20230522063857_500x500.jpg', tag: 'Lofi Flow' },
    { name: 'B Praak', image: 'https://c.saavncdn.com/artists/B_Praak_003_20230413063548_500x500.jpg', tag: 'Emotive Vocals' },
  ],
  english: [
    { name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg', tag: 'Global Superstar' },
    { name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg', tag: 'Synthwave & R&B' },
    { name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg', tag: 'Hip-Hop Titan' },
    { name: 'Billie Eilish', image: 'https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg', tag: 'Alternative Pop' },
    { name: 'Dua Lipa', image: 'https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg', tag: 'Dance Pop Queen' },
    { name: 'Coldplay', image: 'https://c.saavncdn.com/artists/Coldplay_002_20241003070447_500x500.jpg', tag: 'Stadium Rock' },
  ],
  kpop: [
    { name: 'BTS', image: 'https://c.saavncdn.com/artists/BTS_002_20220610091842_500x500.jpg', tag: 'Global Phenomenon' },
    { name: 'BLACKPINK', image: 'https://c.saavncdn.com/artists/BLACKPINK_002_20220916091238_500x500.jpg', tag: 'Queens of K-Pop' },
    { name: 'NewJeans', image: 'https://c.saavncdn.com/artists/NewJeans_001_20230102073918_500x500.jpg', tag: 'Y2K Pop Waves' },
    { name: 'Stray Kids', image: 'https://c.saavncdn.com/artists/Stray_Kids_001_20230602073145_500x500.jpg', tag: 'High Voltage Dance' },
  ],
  spanish: [
    { name: 'Bad Bunny', image: 'https://c.saavncdn.com/artists/Bad_Bunny_002_20231013072214_500x500.jpg', tag: 'Reggaeton King' },
    { name: 'Rosalía', image: 'https://c.saavncdn.com/artists/Rosalia_001_20220318073112_500x500.jpg', tag: 'Motomami Visionary' },
    { name: 'J Balvin', image: 'https://c.saavncdn.com/artists/J_Balvin_002_20210910072214_500x500.jpg', tag: 'Colores & Vibras' },
    { name: 'Daddy Yankee', image: 'https://c.saavncdn.com/artists/Daddy_Yankee_002_20220325072214_500x500.jpg', tag: 'Reggaeton Pioneer' },
  ],
};

// Dynamic queries for refresh rotation
const getQueryVariants = (lang, category, seed = 0) => {
  const seeds = {
    slowed: [
      `${lang} slowed and reverb songs`,
      `${lang} lofi chill slowed songs`,
      `${lang} midnight slowed reverb edits`,
      `${lang} aesthetic slowed reverb bass`,
    ],
    trending: [
      `Top 20 ${lang} Songs 2026 Hits`,
      `Latest ${lang} viral chartbusters`,
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
      `Classic old ${lang} melodies all time favorite`,
      `Nostalgic retro ${lang} super hits`,
    ],
    workout: [
      `${lang} gym workout motivation high energy`,
      `${lang} bass boosted fast beat workout songs`,
      `${lang} energetic motivational songs`,
    ],
    romance: [
      `${lang} romantic soulful love melody songs`,
      `${lang} acoustic romantic duets love`,
      `${lang} heart touching love melodies`,
    ],
    party: [
      `${lang} party dance club songs`,
      `${lang} kuthu fast dance beats`,
      `${lang} celebration festival dance hits`,
    ],
    chill: [
      `${lang} peaceful calm acoustic melodies`,
      `${lang} relaxed acoustic morning coffee songs`,
      `${lang} gentle sleep melodies lofi`,
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

// Time-of-day dynamic greeting
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', icon: Sunrise, moodTag: 'Morning Energy' };
  }
  if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', icon: Sun, moodTag: 'Afternoon Flow' };
  }
  if (hour >= 17 && hour < 21) {
    return { text: 'Good evening', icon: Sunset, moodTag: 'Evening Unwind' };
  }
  return { text: 'Late night vibes', icon: Moon, moodTag: 'Midnight Chill' };
};

/**
 * 1. Quick Picks Speed Dial (YouTube Music 2x4 card grid)
 */
function QuickPickSpeedDial({ tracks, onPlay }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);

  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {tracks.slice(0, 8).map((track, idx) => {
        const isThisPlaying = currentTrack?.id === track.id && isPlaying;
        const cover = getArtworkSrc(track, 120);

        return (
          <div
            key={`qp_${track.id}_${idx}`}
            onClick={() => onPlay(track, tracks)}
            className={`group relative flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer ${
              currentTrack?.id === track.id ? 'bg-white/[0.08] border-white/20 shadow-md shadow-black/40' : ''
            }`}
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#202022] shadow">
              <SafeImage
                src={cover}
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
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-3 bg-[#fa2d48] animate-pulse rounded-full" />
                    <span className="w-1 h-4 bg-[#fa2d48] animate-pulse delay-75 rounded-full" />
                    <span className="w-1 h-2 bg-[#fa2d48] animate-pulse delay-150 rounded-full" />
                  </div>
                ) : (
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 pr-1">
              <p
                className={`text-xs font-semibold truncate ${
                  currentTrack?.id === track.id ? 'text-[#fa2d48]' : 'text-white'
                }`}
              >
                {track.title}
              </p>
              <p className="text-[11px] text-[#8e8e93] truncate mt-0.5">
                {track.artist}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 2. Dedicated Slowed + Reverb Card (YTM Atmospheric Aesthetic)
 */
function SlowedReverbCard({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
  const cover = getArtworkSrc(track, 400);

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  return (
    <div
      onClick={handlePlay}
      className="group flex-shrink-0 w-[180px] sm:w-[210px] md:w-[230px] flex flex-col cursor-pointer select-none snap-start"
    >
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-br from-purple-950/40 via-[#120a1f] to-black/90 border border-purple-500/20 group-hover:border-purple-400/60 shadow-lg transition-all duration-300 group-hover:shadow-[0_16px_36px_rgba(168,85,247,0.25)] mb-2">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={400}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
        />

        {/* Ambient atmospheric purple tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-black/20 to-transparent" />

        {/* Badge: Slowed + Reverb */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 rounded-full bg-purple-900/80 backdrop-blur-md border border-purple-400/30 text-[9px] font-bold text-purple-200 tracking-wider uppercase flex items-center gap-1 shadow-sm">
            <Sparkles className="w-2.5 h-2.5 text-purple-300" />
            Slowed+Reverb
          </span>
        </div>

        {/* Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute right-3 bottom-3 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-xl shadow-purple-950/60 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
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

      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
        {track.title}
      </h4>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] font-semibold text-purple-400/90 uppercase tracking-wider">YTM Lofi</span>
        <span className="text-[11px] text-[#8e8e93] truncate">• {track.artist}</span>
      </div>
    </div>
  );
}

/**
 * 3. Featured Editorial Hero Card
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

      <div className="relative aspect-[2.1/1] w-full rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-md border border-white/[0.08] shadow-2xl transition-all duration-300 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.8)] group-hover:border-white/20">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={800}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

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
 * 4. Apple/YTM Song Row Item (Used in 3-Row Stacked Grid)
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
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#242426] shadow-sm">
          <SafeImage
            src={cover}
            track={track}
            alt={track.title}
            size={120}
            className="w-full h-full object-cover"
          />

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
      </div>
    </div>
  );
}

/**
 * 5. Square Album / Release Card (With clean carousel/grid support)
 */
function AppleSquareCard({ track, onPlay, queue = [], tag = null }) {
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
      className="group flex flex-col cursor-pointer select-none flex-shrink-0 w-[150px] sm:w-[175px] md:w-[190px] snap-start"
    >
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-md border border-white/[0.08] shadow-md transition-all duration-300 group-hover:shadow-[0_16px_36px_rgba(250,45,72,0.15)] group-hover:border-white/20 mb-2">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={360}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {tag && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/90 uppercase tracking-wider">
              {tag}
            </span>
          </div>
        )}

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

/**
 * 6. Circular Artist Spotlight Card
 */
function ArtistSpotlightCard({ artist, onSelect }) {
  return (
    <div
      onClick={() => onSelect(artist.name)}
      className="group flex flex-col items-center flex-shrink-0 w-[120px] sm:w-[140px] cursor-pointer select-none text-center snap-start"
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white/[0.05] border-2 border-white/10 group-hover:border-[#fa2d48] shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_28px_rgba(250,45,72,0.25)] mb-2.5">
        <SafeImage
          src={artist.image}
          alt={artist.name}
          size={280}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <h4 className="text-xs sm:text-sm font-bold text-white truncate w-full group-hover:text-[#fa2d48] transition-colors">
        {artist.name}
      </h4>
      <p className="text-[11px] text-[#8e8e93] truncate w-full mt-0.5">
        {artist.tag || 'Artist'}
      </p>
    </div>
  );
}

// Skeletons
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

function SkeletonCard() {
  return (
    <div className="w-[150px] sm:w-[175px] md:w-[190px] flex-shrink-0 flex flex-col animate-pulse">
      <div className="aspect-square w-full rounded-2xl bg-white/[0.06] mb-2" />
      <div className="h-3.5 w-3/4 bg-white/10 rounded mb-1" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

/**
 * REUSABLE HORIZONTAL SCROLL SECTION CONTAINER
 */
function HorizontalSection({ title, subtitle, icon: Icon, badge, onSeeAll, children, scrollRef }) {
  const handleScroll = dir => {
    if (scrollRef?.current) {
      const offset = dir === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-[#fa2d48]" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white truncate">
                {title}
              </h2>
              {badge && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/10 text-white/80 border border-white/10">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-[#8e8e93] truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-semibold text-[#fa2d48] hover:underline flex items-center gap-0.5 mr-2"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {scrollRef && (
            <>
              <button
                onClick={() => handleScroll('left')}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
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
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>
    </section>
  );
}

/**
 * DYNAMIC YOUTUBE MUSIC STYLE HOME PAGE
 */
export function HomePage({ lib, onNavigate, onOpenLanguageModal }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed) || [];
  const likedTrackIds = useAudioStore(s => s.likedTrackIds) || [];

  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const langConfig = MUSIC_LANGUAGES.find(l => l.id === preferredLanguage) || MUSIC_LANGUAGES[0];
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  // Active Mood Filter Chip
  const [activeMood, setActiveMood] = useState('all');

  // Refresh and seed rotation
  const [seed, setSeed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(null);

  // Cached data state
  const cacheKey = `${preferredLanguage}_${providerSource}_${seed}`;
  const cached = homeCache[cacheKey];

  const [featuredTracks, setFeaturedTracks] = useState(cached?.featured || []);
  const [slowedReverbTracks, setSlowedReverbTracks] = useState(cached?.slowed || []);
  const [bestSongs, setBestSongs] = useState(cached?.best || []);
  const [trendingTracks, setTrendingTracks] = useState(cached?.trending || []);
  const [timeVibeTracks, setTimeVibeTracks] = useState(cached?.timeVibe || []);
  const [workoutTracks, setWorkoutTracks] = useState(cached?.workout || []);
  const [romanceTracks, setRomanceTracks] = useState(cached?.romance || []);
  const [nostalgiaTracks, setNostalgiaTracks] = useState(cached?.nostalgia || []);
  const [newReleases, setNewReleases] = useState(cached?.releases || []);
  const [isLoading, setIsLoading] = useState(!cached);

  // Scroll references for horizontal carousels
  const heroScrollRef = useRef(null);
  const slowedScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);
  const timeVibeScrollRef = useRef(null);
  const workoutScrollRef = useRef(null);
  const romanceScrollRef = useRef(null);
  const nostalgiaScrollRef = useRef(null);
  const artistsScrollRef = useRef(null);

  const greeting = useMemo(() => getTimeGreeting(), []);

  // Quick picks speed dial tracks (Recent + Liked + Fallback)
  const quickPicks = useMemo(() => {
    const list = [...recentlyPlayed];
    if (list.length < 8) {
      const topList = [...trendingTracks, ...featuredTracks, ...bestSongs];
      for (const t of topList) {
        if (!list.some(p => p.id === t.id)) {
          list.push(t);
        }
        if (list.length >= 8) break;
      }
    }
    return list.slice(0, 8);
  }, [recentlyPlayed, trendingTracks, featuredTracks, bestSongs]);

  // Load language-tailored or source-tailored content
  useEffect(() => {
    let isMounted = true;

    // 1. If OwnTg selected: display Telegram cloud vault storage tracks
    if (providerSource === 'owntg') {
      const all = lib?.allItems || [];
      const feat = all.slice(0, 8);
      const best = all.slice(8, 20).length ? all.slice(8, 20) : all.slice(0, 12);
      const rel = all.slice(20, 32).length ? all.slice(20, 32) : all.slice(0, 12);
      setFeaturedTracks(feat);
      setSlowedReverbTracks([]);
      setBestSongs(best);
      setTrendingTracks(all.slice(0, 12));
      setTimeVibeTracks(all.slice(4, 16));
      setWorkoutTracks(all.slice(8, 20));
      setRomanceTracks(all.slice(12, 24));
      setNostalgiaTracks(all.slice(16, 28));
      setNewReleases(rel);
      setIsLoading(false);
      return;
    }

    // 2. Check in-memory cache for instant zero-latency render
    if (homeCache[cacheKey]) {
      const c = homeCache[cacheKey];
      setFeaturedTracks(c.featured || []);
      setSlowedReverbTracks(c.slowed || []);
      setBestSongs(c.best || []);
      setTrendingTracks(c.trending || []);
      setTimeVibeTracks(c.timeVibe || []);
      setWorkoutTracks(c.workout || []);
      setRomanceTracks(c.romance || []);
      setNostalgiaTracks(c.nostalgia || []);
      setNewReleases(c.releases || []);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const langName = langConfig.name;

    // Build dynamic queries based on rotation seed
    const slowedQuery = getQueryVariants(langName, 'slowed', seed);
    const trendingQuery = getQueryVariants(langName, 'trending', seed);
    const bestQuery = getQueryVariants(langName, 'radio', seed);
    const timeVibeQuery = getQueryVariants(langName, greeting.icon === Moon ? 'chill' : 'trending', seed);
    const workoutQuery = getQueryVariants(langName, 'workout', seed);
    const romanceQuery = getQueryVariants(langName, 'romance', seed);
    const nostalgiaQuery = getQueryVariants(langName, 'nostalgia', seed);
    const releaseQuery = `Latest ${langName} Movie Songs 2026 Releases`;

    // High-Fidelity JioSaavn 320 kbps loader with YouTube fallback
    const fetchRowWithFallback = async (saavnPromise, ytQuery, count = 14) => {
      try {
        const saavnItems = await saavnPromise;
        if (saavnItems && saavnItems.length >= 6) return saavnItems.slice(0, count);
        const ytItems = await searchYouTube(ytQuery, count);
        return [...(saavnItems || []), ...ytItems].slice(0, count);
      } catch {
        return searchYouTube(ytQuery, count).catch(() => []);
      }
    };

    // Slowed + Reverb specifically queries YouTube Music directly!
    const fetchSlowedFromYTM = async () => {
      try {
        const items = await searchYouTube(slowedQuery, 18);
        return dedupeList(items);
      } catch {
        return [];
      }
    };

    // Priority Tier 1: Essential sections (Featured, Slowed+Reverb, Radio picks, Trending)
    Promise.allSettled([
      fetchRowWithFallback(fetchSaavnTrending(preferredLanguage, 16), trendingQuery, 14),
      fetchSlowedFromYTM(),
      fetchRowWithFallback(searchSaavn(bestQuery, 16), bestQuery, 14),
      fetchRowWithFallback(searchSaavn(releaseQuery, 16), releaseQuery, 14),
    ]).then(([trendRes, slowedRes, bestRes, relRes]) => {
      if (!isMounted) return;

      const feat = trendRes.status === 'fulfilled' ? dedupeList(trendRes.value) : [];
      const slowed = slowedRes.status === 'fulfilled' ? dedupeList(slowedRes.value) : [];
      const best = bestRes.status === 'fulfilled' ? dedupeList(bestRes.value) : [];
      const rel = relRes.status === 'fulfilled' ? dedupeList(relRes.value) : [];

      setFeaturedTracks(feat);
      setSlowedReverbTracks(slowed);
      setBestSongs(best);
      setTrendingTracks(feat);
      setNewReleases(rel);
      setIsLoading(false);

      // Priority Tier 2: Mood & Activity playlists (progressive load for silky responsiveness)
      Promise.allSettled([
        fetchRowWithFallback(searchSaavn(timeVibeQuery, 14), timeVibeQuery, 14),
        fetchRowWithFallback(searchSaavn(workoutQuery, 14), workoutQuery, 14),
        fetchRowWithFallback(searchSaavn(romanceQuery, 14), romanceQuery, 14),
        fetchRowWithFallback(searchSaavn(nostalgiaQuery, 14), nostalgiaQuery, 14),
      ]).then(([timeRes, workRes, romRes, nostRes]) => {
        if (!isMounted) return;

        const timeVibe = timeRes.status === 'fulfilled' ? dedupeList(timeRes.value) : [];
        const workout = workRes.status === 'fulfilled' ? dedupeList(workRes.value) : [];
        const romance = romRes.status === 'fulfilled' ? dedupeList(romRes.value) : [];
        const nostalgia = nostRes.status === 'fulfilled' ? dedupeList(nostRes.value) : [];

        setTimeVibeTracks(timeVibe);
        setWorkoutTracks(workout);
        setRomanceTracks(romance);
        setNostalgiaTracks(nostalgia);

        // Store comprehensive snapshot in cache
        homeCache[cacheKey] = {
          featured: feat,
          slowed,
          best,
          trending: feat,
          releases: rel,
          timeVibe,
          workout,
          romance,
          nostalgia,
        };
      });
    });

    return () => {
      isMounted = false;
    };
  }, [preferredLanguage, langConfig, providerSource, lib?.allItems, seed, cacheKey, greeting.icon]);

  // Handle Play Action
  const handlePlayTrack = (track, queue = []) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const activeQueue = queue && queue.length ? queue : [track];
      playTrack(track, activeQueue);
    }
  };

  // Handle Refresh Action
  const handleRefreshFeed = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // Invalidate current cache entry and rotate seed
    delete homeCache[cacheKey];
    setSeed(prev => prev + 1);

    setRefreshToast('Refreshed feed with fresh songs ✨');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
    setTimeout(() => {
      setRefreshToast(null);
    }, 3200);
  };

  // Group Best Songs into 4 columns x 3 rows for horizontal radio carousel
  const radioColumns = useMemo(() => {
    const list = bestSongs.length ? bestSongs.slice(0, 15) : featuredTracks.slice(0, 15);
    const columns = [];
    for (let i = 0; i < list.length; i += 3) {
      columns.push(list.slice(i, i + 3));
    }
    return columns;
  }, [bestSongs, featuredTracks]);

  // Artists for current language
  const currentArtists = useMemo(() => {
    return LANGUAGE_ARTISTS[preferredLanguage] || LANGUAGE_ARTISTS.tamil;
  }, [preferredLanguage]);

  return (
    <div className="flex-1 w-full pb-28 select-none bg-transparent text-white">
      {/* 1. TOP HEADER & MOOD CHIPS BAR */}
      <div className="px-4 sm:px-8 pt-6 pb-2 border-b border-white/[0.06] space-y-4">
        {/* Main Title, Greeting & Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <greeting.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#fa2d48]" />
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-sans">
                {greeting.text}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#8e8e93] hidden xs:block">
              Personalized mixes, Slowed+Reverb edits, and fresh drops for you
            </p>
          </div>

          {/* Action Controls: Refresh Button + Language Modal Pill + Source Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Refresh Button with Smooth Spin */}
            <button
              onClick={handleRefreshFeed}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181818] hover:bg-[#222222] border border-white/10 text-xs font-semibold text-white transition active:scale-95 group shadow-sm ${
                isRefreshing ? 'opacity-80' : ''
              }`}
              title="Refresh recommendations and discover fresh songs"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 text-[#fa2d48] transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : 'group-hover:-rotate-45'
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Language Selector Pill */}
            <button
              onClick={onOpenLanguageModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181818] hover:bg-[#222222] border border-white/10 text-xs font-semibold text-white transition active:scale-95 group shadow-sm"
              title="Change preferred music language"
            >
              <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
              <span>{langConfig.name}</span>
            </button>

            <ProviderSourceButton />
          </div>
        </div>

        {/* Refresh Toast Notice */}
        {refreshToast && (
          <div className="animate-fade-in py-1 px-3 rounded-full bg-white/[0.08] border border-white/10 text-xs font-medium text-white/90 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#fa2d48]" />
            <span>{refreshToast}</span>
          </div>
        )}

        {/* YouTube Music Mood & Activity Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {MOOD_CHIPS.map(chip => {
            const isActive = activeMood === chip.id;
            const Icon = chip.icon;

            return (
              <button
                key={chip.id}
                onClick={() => setActiveMood(isActive ? 'all' : chip.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 active:scale-95 ${
                  isActive
                    ? chip.highlight
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40'
                      : 'bg-white text-black font-bold shadow-md'
                    : chip.highlight
                    ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/50 hover:text-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? (chip.highlight ? 'text-purple-200' : 'text-black') : (chip.highlight ? 'text-purple-400' : 'text-[#8e8e93]')}`} />
                <span>{chip.label}</span>
              </button>
            );
          })}

          {activeMood !== 'all' && (
            <button
              onClick={() => setActiveMood('all')}
              className="flex-shrink-0 text-xs font-semibold text-[#fa2d48] hover:underline px-2"
            >
              Reset to All
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 space-y-12 mt-6">
        {/* ========================================================================= */}
        {/* SECTION 1: SPEED DIAL / QUICK PICKS (LISTEN AGAIN)                        */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#fa2d48]" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight uppercase tracking-wider text-xs text-[#a1a1a6]">
                Listen Again & Quick Picks
              </h3>
            </div>
            {recentlyPlayed.length > 0 && (
              <button
                onClick={() => onNavigate('library')}
                className="text-xs font-semibold text-[#fa2d48] hover:underline flex items-center gap-0.5"
              >
                <span>History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <QuickPickSpeedDial tracks={quickPicks} onPlay={handlePlayTrack} />
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: SLOWED + REVERB SECTION (YTM EXCLUSIVE)                        */}
        {/* (Showcase at top when 'slowed' mood active, or as signature row in 'all')  */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'slowed' || activeMood === 'relax' || activeMood === 'focus') && (
          <section className="space-y-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-950/20 via-[#0d0714] to-black/90 border border-purple-500/20 shadow-2xl relative overflow-hidden">
            {/* Ambient Purple Glow Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-950/80">
                  <Waves className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Slowed + Reverb
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-[10px] font-extrabold tracking-wider uppercase text-purple-200 border border-purple-400/30">
                      YTM AUDIO
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/70">
                    Aesthetic slowed tempo, deep reverb & midnight edits in {langConfig.name}
                  </p>
                </div>
              </div>

              {/* Scroll Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    slowedScrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Previous Slowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    slowedScrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Next Slowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={slowedScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth relative z-10"
            >
              {isLoading && slowedReverbTracks.length === 0 ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={`sk_slow_${i}`} />)
              ) : slowedReverbTracks.length === 0 ? (
                <div className="py-8 text-center text-xs text-purple-300/60 w-full">
                  Fetching fresh Slowed+Reverb tracks from YouTube Music...
                </div>
              ) : (
                slowedReverbTracks.map((t, idx) => (
                  <SlowedReverbCard
                    key={`slow_${t.id}_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={slowedReverbTracks}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: FEATURED EDITORIAL HERO CAROUSEL                               */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#fa2d48]" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Featured & Editorials
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    heroScrollRef.current?.scrollBy({ left: -480, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Previous Featured"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    heroScrollRef.current?.scrollBy({ left: 480, behavior: 'smooth' });
                  }}
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
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: QUICK PICKS RADIO (3-ROW STACKED HORIZONTAL SLIDER)            */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#fa2d48]" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      Quick Picks
                    </h2>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/10 text-white/80 border border-white/10">
                      START RADIO FROM A SONG
                    </span>
                  </div>
                  <p className="text-xs text-[#8e8e93]">Handpicked tracks tailored to your listening taste</p>
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

            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 pt-1 no-scrollbar snap-x snap-mandatory">
              {radioColumns.map((colGroup, colIdx) => (
                <div
                  key={`col_${colIdx}`}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] flex flex-col space-y-1 snap-start"
                >
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
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: TRENDING NOW & VIRAL CHARTBUSTERS                              */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize' || activeMood === 'party') && (
          <HorizontalSection
            title="Trending Now"
            subtitle={`Top viral hits streaming in ${langConfig.name}`}
            icon={TrendingUp}
            scrollRef={trendingScrollRef}
            onSeeAll={() => onNavigate('search')}
          >
            {isLoading && trendingTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_tr_${i}`} />)
            ) : (
              trendingTracks.slice(0, 14).map((t, idx) => (
                <AppleSquareCard
                  key={`trend_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={trendingTracks}
                  tag={idx < 3 ? `#${idx + 1} TRENDING` : null}
                />
              ))
            )}
          </HorizontalSection>
        )}

        {/* ========================================================================= */}
        {/* SECTION 6: TIME-OF-DAY VIBE (LATE NIGHT MELODIES / MORNING ENERGY)        */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'relax' || activeMood === 'focus') && (
          <HorizontalSection
            title={greeting.moodTag}
            subtitle={`Curated tunes matching your current ${greeting.text.toLowerCase()}`}
            icon={greeting.icon}
            scrollRef={timeVibeScrollRef}
          >
            {timeVibeTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_tv_${i}`} />)
            ) : (
              timeVibeTracks.slice(0, 14).map((t, idx) => (
                <AppleSquareCard
                  key={`tv_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={timeVibeTracks}
                />
              ))
            )}
          </HorizontalSection>
        )}

        {/* ========================================================================= */}
        {/* SECTION 7: WORKOUT & GYM ENERGY                                           */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'workout' || activeMood === 'energize') && (
          <HorizontalSection
            title="Workout & Gym Energy"
            subtitle={`High-tempo beats and adrenaline pumpers in ${langConfig.name}`}
            icon={Zap}
            scrollRef={workoutScrollRef}
          >
            {workoutTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_wo_${i}`} />)
            ) : (
              workoutTracks.slice(0, 14).map((t, idx) => (
                <AppleSquareCard
                  key={`work_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={workoutTracks}
                  tag="HIGH BASS"
                />
              ))
            )}
          </HorizontalSection>
        )}

        {/* ========================================================================= */}
        {/* SECTION 8: SOULFUL ROMANCE & LOVE SONGS                                   */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'romance' || activeMood === 'relax') && (
          <HorizontalSection
            title="Soulful Romance & Love Melodies"
            subtitle={`Heart-touching duets and romantic acoustic songs in ${langConfig.name}`}
            icon={Heart}
            scrollRef={romanceScrollRef}
          >
            {romanceTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rom_${i}`} />)
            ) : (
              romanceTracks.slice(0, 14).map((t, idx) => (
                <AppleSquareCard
                  key={`rom_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={romanceTracks}
                />
              ))
            )}
          </HorizontalSection>
        )}

        {/* ========================================================================= */}
        {/* SECTION 9: FORGOTTEN FAVORITES & NOSTALGIA                                */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'nostalgia') && (
          <HorizontalSection
            title="Forgotten Favorites & Nostalgia"
            subtitle={`Timeless melodies and nostalgic retro hits in ${langConfig.name}`}
            icon={Disc3}
            scrollRef={nostalgiaScrollRef}
          >
            {nostalgiaTracks.length === 0 ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={`sk_nost_${i}`} />)
            ) : (
              nostalgiaTracks.slice(0, 14).map((t, idx) => (
                <AppleSquareCard
                  key={`nost_${t.id}_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={nostalgiaTracks}
                  tag="EVERGREEN"
                />
              ))
            )}
          </HorizontalSection>
        )}

        {/* ========================================================================= */}
        {/* SECTION 10: TOP ARTISTS & COMPOSERS IN [LANGUAGE]                         */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#fa2d48]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Featured Artists & Composers
                  </h2>
                  <p className="text-xs text-[#8e8e93]">
                    Explore the music visionaries defining {langConfig.name} sound
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    artistsScrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Previous Artists"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    artistsScrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' });
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Next Artists"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={artistsScrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
            >
              {currentArtists.map((artist, idx) => (
                <ArtistSpotlightCard
                  key={`art_${artist.name}_${idx}`}
                  artist={artist}
                  onSelect={artistName => onNavigate(`artist:${artistName}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 11: NEW RELEASES & MOVIE SOUNDTRACKS                              */}
        {/* ========================================================================= */}
        {(activeMood === 'all' || activeMood === 'energize') && (
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
                [...Array(6)].map((_, i) => <SkeletonCard key={`sk_rel_${i}`} />)
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
        )}
      </div>
    </div>
  );
}
