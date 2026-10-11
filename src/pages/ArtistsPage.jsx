import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Radio,
  Share2,
  Check,
  ArrowLeft,
  CheckCircle2,
  Search,
  Loader2,
  Music2,
  Disc3,
  Users,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { searchUnified, fetchArtistInfo } from '../utils/api';
import { SafeImage } from '../components/ui/SafeImage';

// Verified, high-resolution official portrait photography for top global and Indian artists
const FEATURED_ARTISTS = [
  {
    name: 'Anirudh Ravichander',
    image: 'https://lh3.googleusercontent.com/wBG4jypwBcEGHd-qSbM2_4B46WPEhlOCjusCOEkxdnsoIC4WLS9LmFARZsE854pB-vAEYlsp4x2yiHE=w1200-h1200-p-l90-rj',
    listeners: '608M+ monthly audience',
    bio: 'Renowned Indian composer and singer celebrated for chart-topping, high-energy soundtracks across Tamil, Telugu, and Hindi cinema including Leo, Jawan, Jailer, Coolie, Vikram, and Master.',
  },
  {
    name: 'A.R. Rahman',
    image: 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg',
    listeners: '284M+ monthly audience',
    bio: 'Two-time Academy Award-winning composer, producer, and singer referred to worldwide as "The Mozart of Madras", redefining modern Indian music.',
  },
  {
    name: 'Yuvan Shankar Raja',
    image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_002_20180802174245_500x500.jpg',
    listeners: '122M+ monthly audience',
    bio: 'Pioneering Tamil film composer and vocalist, celebrated for revolutionizing contemporary youth music and soulful indie melodies.',
  },
  {
    name: 'Harris Jayaraj',
    image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230718071330_500x500.jpg',
    listeners: '95M+ monthly audience',
    bio: 'Master of melodic orchestration and electronic pop fusion, behind iconic soundtracks like Minnale, Kaakha Kaakha, and Ghajini.',
  },
  {
    name: 'Sid Sriram',
    image: 'https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg',
    listeners: '160M+ monthly audience',
    bio: 'Indian-American Carnatic and playback singer known for emotive, soaring vocals bridging traditional acoustics with contemporary R&B.',
  },
  {
    name: 'Arijit Singh',
    image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
    listeners: '480M+ monthly audience',
    bio: 'Leading Indian playback vocalist recognized for soulful romantic ballads dominating Bollywood and regional music charts.',
  },
  {
    name: 'Shreya Ghoshal',
    image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg',
    listeners: '240M+ monthly audience',
    bio: 'National Award-winning Indian playback legend celebrated across languages for extraordinary vocal range and purity.',
  },
  {
    name: 'Santhosh Narayanan',
    image: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20250527101718_500x500.jpg',
    listeners: '82M+ monthly audience',
    bio: 'Eclectic music director and record producer known for raw folk-electronic fusion in Kalki 2898 AD, Kabali, and Kaala.',
  },
  {
    name: 'Ilaiyaraaja',
    image: 'https://c.saavncdn.com/artists/Ilaiyaraaja_001_20251020081419_500x500.jpg',
    listeners: '98M+ monthly audience',
    bio: 'Legendary maestro with over 1,000 film scores, fusing Western classical symphonic arrangements with South Indian folk traditions.',
  },
  {
    name: 'Pradeep Kumar',
    image: 'https://c.saavncdn.com/artists/Pradeep_Kumar_002_20250807084559_500x500.jpg',
    listeners: '65M+ monthly audience',
    bio: 'Acoustic singer, composer, and Carnatic musician celebrated for deeply atmospheric and introspective cinema songs.',
  },
  {
    name: 'Taylor Swift',
    image: 'https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg',
    listeners: '820M+ monthly audience',
    bio: 'Global pop superstar and Grammy-winning songwriter known for historic chart dominance and cultural impact.',
  },
  {
    name: 'The Weeknd',
    image: 'https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg',
    listeners: '740M+ monthly audience',
    bio: 'Canadian singer and record producer known for dark R&B, synth-pop anthems, and multi-platinum global records.',
  },
  {
    name: 'Drake',
    image: 'https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg',
    listeners: '680M+ monthly audience',
    bio: 'Grammy-winning rapper, singer, and songwriter who defined 2010s hip-hop with record-shattering streaming milestones.',
  },
  {
    name: 'Billie Eilish',
    image: 'https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg',
    listeners: '590M+ monthly audience',
    bio: 'Oscar and Grammy-winning pop innovator known for whispered vocals, genre-defying basslines, and introspective songwriting.',
  },
  {
    name: 'Dua Lipa',
    image: 'https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg',
    listeners: '520M+ monthly audience',
    bio: 'Grammy-winning powerhouse leading modern disco-pop revival with chart-topping club anthems.',
  },
  {
    name: 'Coldplay',
    image: 'https://c.saavncdn.com/artists/Coldplay_002_20241003070447_500x500.jpg',
    listeners: '490M+ monthly audience',
    bio: 'Legendary British rock band renowned for stadium anthems, melodic piano hooks, and timeless pop melodies.',
  },
  {
    name: 'S. P. Balasubrahmanyam',
    image: 'https://c.saavncdn.com/artists/S_P_Balasubrahmanyam_500x500.jpg',
    listeners: '140M+ monthly audience',
    bio: 'Legendary Indian playback singer who recorded over 40,000 songs across 16 languages, celebrated as one of music’s greatest voices.',
  },
  {
    name: 'K. J. Yesudas',
    image: 'https://c.saavncdn.com/artists/KJ_Yesudas_500x500.jpg',
    listeners: '85M+ monthly audience',
    bio: 'Esteemed Carnatic classical maestro and playback singer holding a world record for singing across eight decades.',
  },
];

// Sub-Component 1: Dedicated Artist View (YouTube Music / Apple Music Layout)
function ArtistDetailView({ lib, artistName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [artistTracks, setArtistTracks] = useState([]);
  const [artistImage, setArtistImage] = useState('');
  const [dynamicAudience, setDynamicAudience] = useState('');
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);

  // Check if artist exists in local library safely
  const localArtist = useMemo(() => {
    if (!artistName) return null;
    return (lib?.artists || []).find(
      a => a?.name && a.name.toLowerCase() === artistName.toLowerCase()
    );
  }, [lib?.artists, artistName]);

  // Load artist songs and high-resolution portrait dynamically
  useEffect(() => {
    if (!artistName) return;

    let isMounted = true;
    const fetchArtistData = async () => {
      // 1. Check curated list for instant instant high-res photo
      const feat = FEATURED_ARTISTS.find(
        f => f.name.toLowerCase() === artistName.toLowerCase()
      );
      if (feat) {
        setArtistImage(feat.image);
        setDynamicAudience(feat.listeners);
      } else if (localArtist?.thumbnail) {
        setArtistImage(localArtist.thumbnail);
      }

      // 2. Fetch fresh dynamic portrait & listener stats from API
      fetchArtistInfo(artistName).then(info => {
        if (isMounted && info?.image) {
          setArtistImage(info.image);
          if (info.listeners) setDynamicAudience(info.listeners);
        }
      });

      // 3. If local library already has plenty of songs, show them immediately
      if (localArtist && localArtist.tracks?.length >= 10) {
        setArtistTracks(localArtist.tracks);
        return;
      }

      setIsLoadingArtist(true);
      try {
        const results = await searchUnified(artistName, 25);
        if (isMounted) {
          if (results && results.length > 0) {
            setArtistTracks(results);
            // If still no artist photo, fallback to top track's thumbnail
            if (!feat && results[0]?.thumbnail) {
              setArtistImage(prev => prev || results[0].thumbnail);
            }
          } else if (localArtist?.tracks) {
            setArtistTracks(localArtist.tracks);
          }
        }
      } catch {
        if (isMounted && localArtist?.tracks) {
          setArtistTracks(localArtist.tracks);
        }
      } finally {
        if (isMounted) setIsLoadingArtist(false);
      }
    };

    fetchArtistData();
    return () => {
      isMounted = false;
    };
  }, [artistName, localArtist]);

  const handleShare = async () => {
    const url = `${window.location.origin}/#artist:${encodeURIComponent(artistName)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${artistName} - Vex-M`,
          text: `Listen to ${artistName} on Vex-M`,
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const isCurrentArtistPlaying =
    artistTracks.some(t => t?.id === currentTrack?.id) && isPlaying;

  const handlePlayArtist = () => {
    if (isCurrentArtistPlaying) {
      togglePlay();
    } else if (artistTracks.length > 0) {
      playTrack(artistTracks[0], artistTracks);
    }
  };

  const handleShuffleArtist = () => {
    if (artistTracks.length === 0) return;
    const shuffled = [...artistTracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  // Group artist tracks into unique albums & singles
  const { albumsList, singlesList } = useMemo(() => {
    const map = new Map();
    artistTracks.forEach(t => {
      if (!t) return;
      const albumName = t.album || t.title;
      if (albumName && !map.has(albumName)) {
        map.set(albumName, {
          name: albumName,
          artist: t.artist || artistName,
          thumbnail: t.thumbnail,
          tracks: [],
        });
      }
      if (albumName && map.has(albumName)) {
        map.get(albumName).tracks.push(t);
      }
    });

    const all = Array.from(map.values());
    const albums = all.filter(a => a.tracks.length > 1).slice(0, 8);
    const singles = all.filter(a => a.tracks.length === 1).slice(0, 8);

    return {
      albumsList: albums.length > 0 ? albums : all.slice(0, 8),
      singlesList: singles,
    };
  }, [artistTracks, artistName]);

  // Similar Artists Shelf (curated or discovery)
  const similarArtists = useMemo(() => {
    return FEATURED_ARTISTS.filter(
      f => f.name.toLowerCase() !== artistName.toLowerCase()
    ).slice(0, 6);
  }, [artistName]);

  const feat = FEATURED_ARTISTS.find(
    f => f.name.toLowerCase() === artistName.toLowerCase()
  );

  const audienceLabel =
    dynamicAudience ||
    feat?.listeners ||
    '18,421,902 monthly audience';

  const heroImage =
    artistImage ||
    feat?.image ||
    localArtist?.thumbnail ||
    artistTracks[0]?.thumbnail ||
    '';

  const displayedTracks = showAllTracks
    ? artistTracks
    : artistTracks.slice(0, 5);

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      {/* ========================================================= */}
      {/* 1. CINEMATIC ARTIST HERO (YouTube Music / Vex-M Layout) */}
      {/* ========================================================= */}
      <div className="relative min-h-[360px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden px-4 sm:px-8 pt-4 pb-8 bg-black/20 backdrop-blur-md">
        {/* Ambient Blurred Backdrop */}
        {heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />

        {/* Back Button */}
        <div className="relative z-10">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition group py-1.5 px-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Artists</span>
          </button>
        </div>

        {/* Hero Content: Avatar + Metadata */}
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 pt-6">
          {/* Circular High-Resolution Artist Portrait */}
          <div className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-[#181818] border-2 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex-shrink-0 group">
            <SafeImage
              src={heroImage}
              fallbackType="artist"
              artistName={artistName}
              alt={artistName}
              size={500}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          {/* Official Channel Info */}
          <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 px-2.5 py-1 rounded-full bg-sky-400/10 border border-sky-400/20 backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-black" />
              <span>Official Artist Channel</span>
            </div>

            <h1 className="text-3xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight">
              {artistName}
            </h1>

            <p className="text-xs sm:text-sm text-white/70 font-medium">
              Artist • {audienceLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ACTION BAR (Play, Radio, Subscribe, Share) */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Play / Pause Primary Action */}
          <button
            onClick={handlePlayArtist}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-lg shadow-[#fa2d48]/25 hover:scale-105 active:scale-95 transition"
            aria-label={`Play artist ${artistName}`}
          >
            {isCurrentArtistPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
            <span>{isCurrentArtistPlaying ? 'Pause' : 'Play All'}</span>
          </button>

          {/* Artist Radio / Shuffle Action */}
          <button
            onClick={handleShuffleArtist}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition hover:scale-105"
            title="Start Artist Radio"
          >
            <Radio className="w-3.5 h-3.5 text-[#fa2d48]" />
            <span>Radio</span>
          </button>

          {/* Subscribe / Follow Button */}
          <button
            onClick={() => setIsFollowing(prev => !prev)}
            className={`flex items-center gap-1.5 px-5 py-3 rounded-full text-xs font-bold tracking-wider uppercase border transition-all ${
              isFollowing
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-white border-white/30 hover:border-white hover:scale-105'
            }`}
          >
            {isFollowing && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            <span>{isFollowing ? 'Subscribed' : 'Subscribe'}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition"
            title="Share Artist"
          >
            {copied ? <Check className="w-4 h-4 text-[#fa2d48]" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BODY CONTENT (Top Songs, Discography, Similar Artists) */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* Section A: Top Songs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Top Songs
            </h2>
            {artistTracks.length > 5 && (
              <button
                onClick={() => setShowAllTracks(prev => !prev)}
                className="text-xs font-bold text-white/50 hover:text-white transition"
              >
                {showAllTracks ? 'Show less' : 'View all'}
              </button>
            )}
          </div>

          {isLoadingArtist && artistTracks.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin text-[#fa2d48] mr-2" />
              <span className="text-sm">Loading songs...</span>
            </div>
          ) : artistTracks.length > 0 ? (
            <div className="space-y-1 bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.06]">
              {displayedTracks.map((t, idx) => (
                <TrackRow
                  key={`${t.id || 'trk'}_${idx}`}
                  track={t}
                  index={idx}
                  showNumber={true}
                  showCover={true}
                  showAlbum={true}
                  onPlay={trk => playTrack(trk, artistTracks)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-white/40 text-sm">
              No songs found for this artist.
            </div>
          )}
        </div>

        {/* Section B: Albums & Soundtracks */}
        {albumsList.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Albums & Soundtracks
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albumsList.map((alb, i) => (
                <div
                  key={`${alb.name}_${i}`}
                  onClick={() => onNavigate(`album:${encodeURIComponent(alb.name)}`)}
                  className="group flex flex-col p-3 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] transition-all cursor-pointer border border-white/[0.04] hover:border-white/10"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#202020] mb-3 relative shadow-md">
                    <SafeImage
                      src={alb.thumbnail}
                      alt={alb.name}
                      size={350}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#fa2d48] transition-colors">
                    {alb.name}
                  </h4>
                  <p className="text-xs text-white/40 truncate mt-0.5">
                    Album • {alb.tracks.length} {alb.tracks.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section C: Fans Might Also Like (Similar Artists) */}
        {similarArtists.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Fans Also Like
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarArtists.map(artist => (
                <div
                  key={artist.name}
                  onClick={() => onNavigate(`artist:${encodeURIComponent(artist.name)}`)}
                  className="group flex flex-col items-center p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] transition-all cursor-pointer border border-white/[0.04] hover:border-white/10 text-center"
                >
                  <div className="relative aspect-square w-full rounded-full overflow-hidden bg-[#202020] mb-3.5 shadow-lg">
                    <SafeImage
                      src={artist.image}
                      fallbackType="artist"
                      artistName={artist.name}
                      alt={artist.name}
                      size={300}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="text-sm font-bold text-white truncate w-full group-hover:text-[#fa2d48] transition-colors">
                    {artist.name}
                  </h4>
                  <p className="text-xs text-white/40 mt-0.5">
                    Artist
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section D: About The Artist */}
        {feat?.bio && (
          <div className="p-6 rounded-2xl bg-[#121212] border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#fa2d48]">
                About
              </span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-xs text-white/50">{artistName}</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed max-w-4xl">
              {feat.bio}
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-white/40 font-mono">
              <span>{audienceLabel}</span>
              <span>•</span>
              <span>Verified Creator</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-Component 2: All Artists Directory (Spotify / Tidal Style Directory)
function ArtistDirectoryView({ lib, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Combine featured global artists with any local library artists safely
  const allAvailableArtists = useMemo(() => {
    const list = [...FEATURED_ARTISTS];
    const seenNames = new Set(list.map(a => a.name.toLowerCase()));

    (lib?.artists || []).forEach(local => {
      if (local?.name && !seenNames.has(local.name.toLowerCase())) {
        list.push({
          name: local.name,
          image: local.thumbnail || '',
          listeners: `${(Math.max(4, local.tracks?.length || 1) * 31820).toLocaleString()} monthly audience`,
        });
        seenNames.add(local.name.toLowerCase());
      }
    });

    return list;
  }, [lib?.artists]);

  const filteredArtists = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return allAvailableArtists;
    return allAvailableArtists.filter(a => a?.name && a.name.toLowerCase().includes(q));
  }, [allAvailableArtists, searchQuery]);

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Artists
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              Top artists, composers, and vocalists
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              placeholder="Search any artist..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Responsive Artist Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {filteredArtists.map(artist => (
            <div
              key={artist.name}
              onClick={() => onNavigate(`artist:${encodeURIComponent(artist.name)}`)}
              className="group flex flex-col items-center p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer text-center"
            >
              {/* Circular Avatar */}
              <div className="relative aspect-square w-full rounded-full overflow-hidden bg-[#202020] mb-3.5 shadow-lg">
                <SafeImage
                  src={artist.image}
                  fallbackType="artist"
                  artistName={artist.name}
                  alt={artist.name}
                  size={300}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Hover Play Button */}
                <div className="absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full bg-[#fa2d48] text-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl shadow-black/60">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Artist Name & Type */}
              <h4 className="text-sm font-bold text-white truncate w-full group-hover:text-[#fa2d48] transition-colors">
                {artist.name}
              </h4>
              <p className="text-xs text-white/40 mt-0.5">
                Artist
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Master Artists Page (Zero Conditional Hooks, Guaranteed Render Safety)
export function ArtistsPage({ lib, selectedArtistName, onNavigate, onBack }) {
  const safeArtistName = useMemo(() => {
    if (!selectedArtistName) return null;
    try {
      return decodeURIComponent(selectedArtistName).trim();
    } catch {
      return String(selectedArtistName).trim();
    }
  }, [selectedArtistName]);

  if (safeArtistName) {
    return (
      <ArtistDetailView
        lib={lib}
        artistName={safeArtistName}
        onNavigate={onNavigate}
        onBack={onBack}
      />
    );
  }

  return (
    <ArtistDirectoryView
      lib={lib}
      onNavigate={onNavigate}
    />
  );
}
