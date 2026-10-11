import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Share2,
  Check,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Search,
  Loader2,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { searchUnified } from '../utils/api';
import { SafeImage } from '../components/ui/SafeImage';

// Curated Popular Global & Indian Artists for instant browsing
const FEATURED_ARTISTS = [
  { name: 'Anirudh Ravichander', image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_002_20231109062325_500x500.jpg', listeners: '18,421,902' },
  { name: 'A.R. Rahman', image: 'https://c.saavncdn.com/artists/A_R_Rahman_002_20230303080757_500x500.jpg', listeners: '24,819,410' },
  { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_004_20231109062331_500x500.jpg', listeners: '11,205,391' },
  { name: 'Harris Jayaraj', image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20231109062327_500x500.jpg', listeners: '9,482,100' },
  { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230303081156_500x500.jpg', listeners: '14,392,012' },
  { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg', listeners: '41,201,844' },
  { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230303081123_500x500.jpg', listeners: '22,481,200' },
  { name: 'Taylor Swift', image: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0', listeners: '105,392,492' },
  { name: 'The Weeknd', image: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb', listeners: '112,891,402' },
  { name: 'Drake', image: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', listeners: '84,102,912' },
  { name: 'Billie Eilish', image: 'https://i.scdn.co/image/ab6761610000e5eb7a6e133c91d8e1f0e4b7fb2f', listeners: '98,401,230' },
  { name: 'Dua Lipa', image: 'https://i.scdn.co/image/ab6761610000e5ebd42a27db3286b58553da8858', listeners: '72,192,840' },
  { name: 'Ed Sheeran', image: 'https://i.scdn.co/image/ab6761610000e5eb12a2efab30438cf56f2f22b9', listeners: '79,401,910' },
  { name: 'Ilaiyaraaja', image: 'https://c.saavncdn.com/artists/Ilaiyaraaja_002_20231109062328_500x500.jpg', listeners: '8,921,410' },
  { name: 'Santhosh Narayanan', image: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20231109062330_500x500.jpg', listeners: '7,481,902' },
  { name: 'Pradeep Kumar', image: 'https://c.saavncdn.com/artists/Pradeep_Kumar_002_20231109062329_500x500.jpg', listeners: '6,102,840' },
  { name: 'Kendrick Lamar', image: 'https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93fe1022', listeners: '75,190,412' },
  { name: 'Bruno Mars', image: 'https://i.scdn.co/image/ab6761610000e5ebc36dd9eb55fb0db4911f25dd', listeners: '109,240,192' },
];

export function ArtistsPage({ lib, selectedArtistName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic artist songs state for seamless loading of any artist in the world
  const [artistTracks, setArtistTracks] = useState([]);
  const [artistImage, setArtistImage] = useState('');
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);

  // Check if artist exists in local library
  const localArtist = useMemo(() => {
    if (!selectedArtistName) return null;
    return (lib.artists || []).find(
      a => a.name.toLowerCase() === selectedArtistName.toLowerCase()
    );
  }, [lib.artists, selectedArtistName]);

  // Load artist songs dynamically from API if not enough local songs
  useEffect(() => {
    if (!selectedArtistName) return;

    let isMounted = true;
    const fetchArtistData = async () => {
      // Find featured artist image if available
      const feat = FEATURED_ARTISTS.find(
        f => f.name.toLowerCase() === selectedArtistName.toLowerCase()
      );
      if (feat) {
        setArtistImage(feat.image);
      } else if (localArtist?.thumbnail) {
        setArtistImage(localArtist.thumbnail);
      }

      if (localArtist && localArtist.tracks.length >= 10) {
        setArtistTracks(localArtist.tracks);
        return;
      }

      setIsLoadingArtist(true);
      try {
        const results = await searchUnified(`${selectedArtistName}`, 25);
        if (isMounted) {
          if (results.length > 0) {
            setArtistTracks(results);
            if (!feat && results[0]?.thumbnail) {
              setArtistImage(results[0].thumbnail);
            }
          } else if (localArtist) {
            setArtistTracks(localArtist.tracks);
          }
        }
      } catch (e) {
        if (isMounted && localArtist) {
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
  }, [selectedArtistName, localArtist]);

  const handleShare = async () => {
    const url = `${window.location.origin}/#artist:${encodeURIComponent(selectedArtistName)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedArtistName} - Vex-M`,
          text: `Listen to ${selectedArtistName} on Vex-M`,
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
    artistTracks.some(t => t.id === currentTrack?.id) && isPlaying;

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

  // Group artist tracks into unique albums
  const artistAlbums = useMemo(() => {
    const map = new Map();
    artistTracks.forEach(t => {
      const albumName = t.album || t.title;
      if (!map.has(albumName)) {
        map.set(albumName, {
          name: albumName,
          artist: t.artist || selectedArtistName,
          thumbnail: t.thumbnail,
          tracks: [],
        });
      }
      map.get(albumName).tracks.push(t);
    });
    return Array.from(map.values()).slice(0, 10);
  }, [artistTracks, selectedArtistName]);

  // ==========================================
  // 1. SPECIFIC ARTIST PAGE (Spotify / Tidal style)
  // ==========================================
  if (selectedArtistName) {
    const feat = FEATURED_ARTISTS.find(
      f => f.name.toLowerCase() === selectedArtistName.toLowerCase()
    );
    const monthlyListeners = feat
      ? `${feat.listeners} monthly listeners`
      : '3,842,109 monthly listeners';

    const heroImage =
      artistImage ||
      (localArtist?.thumbnail) ||
      (artistTracks[0]?.thumbnail) ||
      '';

    const displayedTracks = showAllTracks
      ? artistTracks
      : artistTracks.slice(0, 5);

    return (
      <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-24">
        {/* Spotify Verified Artist Hero */}
        <div className="relative min-h-[340px] sm:min-h-[420px] flex flex-col justify-between overflow-hidden px-4 sm:px-8 pt-4 pb-8 bg-[#121212]">
          {/* Subtle Ambient Photo Backdrop */}
          {heroImage && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent pointer-events-none" />

          {/* Back Button */}
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
          <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 pt-6">
            {/* Circular Artist Avatar */}
            <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden bg-[#181818] border border-white/10 shadow-2xl flex-shrink-0 group">
              <SafeImage
                src={heroImage}
                fallbackType="artist"
                artistName={selectedArtistName}
                alt={selectedArtistName}
                size={400}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Verified Header & Details */}
            <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-sky-400">
                <CheckCircle2 className="w-4 h-4 fill-sky-400 text-black" />
                <span>Verified Artist</span>
              </div>

              <h1 className="text-3xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight">
                {selectedArtistName}
              </h1>

              <p className="text-xs sm:text-sm text-white/60 font-medium">
                {monthlyListeners}
              </p>
            </div>
          </div>
        </div>

        {/* Action Tray */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center gap-4">
            {/* Play Button */}
            <button
              onClick={handlePlayArtist}
              className="w-14 h-14 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white flex items-center justify-center shadow-xl shadow-[#fa2d48]/25 hover:scale-105 active:scale-95 transition"
              aria-label={`Play artist ${selectedArtistName}`}
            >
              {isCurrentArtistPlaying ? (
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
              onClick={handleShuffleArtist}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition hover:scale-105"
              title="Shuffle all tracks"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition"
              title="Share Artist"
            >
              {copied ? <Check className="w-5 h-5 text-[#fa2d48]" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          {/* Popular Tracks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Popular
              </h2>
              {artistTracks.length > 5 && (
                <button
                  onClick={() => setShowAllTracks(prev => !prev)}
                  className="text-xs font-bold text-white/50 hover:text-white transition"
                >
                  {showAllTracks ? 'Show less' : 'See more'}
                </button>
              )}
            </div>

            {isLoadingArtist && artistTracks.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-white/40">
                <Loader2 className="w-6 h-6 animate-spin text-[#fa2d48] mr-2" />
                <span className="text-sm">Loading songs...</span>
              </div>
            ) : artistTracks.length > 0 ? (
              <div className="space-y-1">
                {displayedTracks.map((t, idx) => (
                  <TrackRow
                    key={`${t.id}_${idx}`}
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

          {/* Discography / Albums Shelf */}
          {artistAlbums.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Discography
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artistAlbums.map((alb, i) => (
                  <div
                    key={`${alb.name}_${i}`}
                    onClick={() => onNavigate(`album:${alb.name}`)}
                    className="group flex flex-col p-3 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] transition-all cursor-pointer border border-white/[0.04] hover:border-white/10"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#202020] mb-3 relative shadow-md">
                      <SafeImage
                        src={alb.thumbnail}
                        alt={alb.name}
                        size={300}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#fa2d48] transition-colors">
                      {alb.name}
                    </h4>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      Album · {alb.tracks.length} {alb.tracks.length === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. ALL ARTISTS DIRECTORY (Spotify Style)
  // ==========================================
  // Combine featured global artists with any local library artists
  const allAvailableArtists = useMemo(() => {
    const list = [...FEATURED_ARTISTS];
    const seenNames = new Set(list.map(a => a.name.toLowerCase()));

    (lib.artists || []).forEach(local => {
      if (!seenNames.has(local.name.toLowerCase())) {
        list.push({
          name: local.name,
          image: local.thumbnail || '',
          listeners: `${(Math.max(4, local.tracks.length) * 31820).toLocaleString()} listeners`,
        });
        seenNames.add(local.name.toLowerCase());
      }
    });

    return list;
  }, [lib.artists]);

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allAvailableArtists;
    return allAvailableArtists.filter(a => a.name.toLowerCase().includes(q));
  }, [allAvailableArtists, searchQuery]);

  return (
    <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-24">
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
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[#141414] border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Responsive Artist Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {filteredArtists.map(artist => (
            <div
              key={artist.name}
              onClick={() => onNavigate(`artist:${artist.name}`)}
              className="group flex flex-col items-center p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] transition-all cursor-pointer border border-white/[0.04] hover:border-white/10 text-center"
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
