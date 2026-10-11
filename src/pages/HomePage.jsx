import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Disc, Sparkles, RefreshCw, ChevronRight, Flame, Music, Headphones } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { TrackRow } from '../components/library/TrackRow';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc } from '../utils/artworkGenerator';
import { fetchYouTubeTrending, searchYouTube } from '../utils/api';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Module-level cache so navigating between tabs is instant without re-fetching
let cachedYtTrending = null;
let cachedYtTopHits = null;
let cachedYtChill = null;

// 1. Spotify Top 6 Quick-Access Card
function SpotifyQuickAccessCard({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  const cover = getArtworkSrc(track, 120);

  return (
    <div
      onClick={handlePlay}
      className={`group relative flex items-center h-16 sm:h-20 rounded-[6px] bg-white/[0.08] hover:bg-white/[0.16] transition-all duration-200 cursor-pointer overflow-hidden shadow-md hover:shadow-xl ${
        currentTrack?.id === track.id ? 'bg-white/[0.14]' : ''
      }`}
    >
      {/* Artwork Left */}
      <div className="h-full aspect-square flex-shrink-0 bg-[#242424] shadow-md">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={120}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 px-3 sm:px-4">
        <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-white">
          {track.title}
        </p>
        <p className="text-[11px] text-[#b3b3b3] truncate mt-0.5">
          {track.artist}
        </p>
      </div>

      {/* Spotify Green Play Button */}
      <div className="pr-3 sm:pr-4">
        <button
          onClick={handlePlay}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-black/50 transition-all duration-200 hover:scale-105 active:scale-95 ${
            isThisPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play ${track.title}`}
        >
          {isThisPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// 2. Spotify Square Album / Track Card
function SpotifySquareCard({ track, onPlay, queue = [] }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isThisPlaying = currentTrack?.id === track.id && isPlaying;

  const handlePlay = e => {
    e.stopPropagation();
    onPlay(track, queue);
  };

  const cover = getArtworkSrc(track, 300);

  return (
    <div
      onClick={handlePlay}
      className="group relative flex flex-col p-3 sm:p-3.5 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl"
    >
      {/* Square Artwork */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#242424] shadow-lg mb-3">
        <SafeImage
          src={cover}
          track={track}
          alt={track.title}
          size={300}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Floating Green Play Button */}
        <button
          onClick={handlePlay}
          className={`absolute right-2.5 bottom-2.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-black/60 transition-all duration-300 hover:scale-105 active:scale-95 z-10 ${
            isThisPlaying
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
          aria-label={`Play ${track.title}`}
        >
          {isThisPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>

        {track.isLossless && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-black tracking-widest text-[#1db954] border border-[#1db954]/30">
            FLAC
          </span>
        )}

        {track.isYouTube && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-bold tracking-wide text-red-400 border border-red-500/20">
            YT MUSIC
          </span>
        )}
      </div>

      {/* Info */}
      <h4 className="truncate text-xs sm:text-sm font-bold text-white group-hover:underline">
        {track.title}
      </h4>
      <p className="truncate text-[11px] sm:text-xs text-[#b3b3b3] mt-1">
        {track.artist}
      </p>
    </div>
  );
}

// 3. Skeleton Loading Cards
function QuickAccessSkeleton() {
  return (
    <div className="flex items-center h-16 sm:h-20 rounded-[6px] bg-white/[0.05] animate-pulse overflow-hidden">
      <div className="h-full aspect-square bg-white/[0.08]" />
      <div className="flex-1 px-4 space-y-2">
        <div className="h-3.5 bg-white/[0.1] rounded w-3/4" />
        <div className="h-2.5 bg-white/[0.06] rounded w-1/2" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col p-3 sm:p-3.5 rounded-lg bg-[#181818] animate-pulse">
      <div className="aspect-square w-full rounded-md bg-white/[0.06] mb-3" />
      <div className="h-3.5 bg-white/[0.1] rounded w-3/4 mb-2" />
      <div className="h-2.5 bg-white/[0.06] rounded w-1/2" />
    </div>
  );
}

export function HomePage({ lib, onNavigate }) {
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [activeFilter, setActiveFilter] = useState('all'); // all | trending | tophits | chill | albums | artists | lossless
  const [ytTrending, setYtTrending] = useState(cachedYtTrending || []);
  const [ytTopHits, setYtTopHits] = useState(cachedYtTopHits || []);
  const [ytChill, setYtChill] = useState(cachedYtChill || []);
  const [isLoadingYt, setIsLoadingYt] = useState(!cachedYtTrending);

  const items = lib.allItems || [];

  // Fetch YouTube Music trending hits on mount
  useEffect(() => {
    let isMounted = true;
    if (cachedYtTrending && cachedYtTopHits) return;

    setIsLoadingYt(true);
    Promise.allSettled([
      fetchYouTubeTrending(24),
      searchYouTube('Today Top Hits Global 2024', 18),
      searchYouTube('Chill lofi acoustic vibes', 18),
    ]).then(([trendRes, hitsRes, chillRes]) => {
      if (!isMounted) return;
      if (trendRes.status === 'fulfilled' && trendRes.value?.length) {
        cachedYtTrending = trendRes.value;
        setYtTrending(trendRes.value);
      }
      if (hitsRes.status === 'fulfilled' && hitsRes.value?.length) {
        cachedYtTopHits = hitsRes.value;
        setYtTopHits(hitsRes.value);
      }
      if (chillRes.status === 'fulfilled' && chillRes.value?.length) {
        cachedYtChill = chillRes.value;
        setYtChill(chillRes.value);
      }
      setIsLoadingYt(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Top 6 Quick-Access items (recently played -> local library -> trending YouTube)
  const quickAccessList = useMemo(() => {
    const list = [...recentlyPlayed];
    for (const t of items) {
      if (list.length >= 6) break;
      if (!list.some(x => x.id === t.id)) list.push(t);
    }
    for (const t of ytTrending) {
      if (list.length >= 6) break;
      if (!list.some(x => x.id === t.id)) list.push(t);
    }
    return list.slice(0, 6);
  }, [recentlyPlayed, items, ytTrending]);

  // Jump Back In items
  const jumpBackInList = useMemo(() => {
    if (recentlyPlayed.length > 0) {
      return recentlyPlayed.slice(0, 8);
    }
    return items.slice(0, 8);
  }, [recentlyPlayed, items]);

  // Lossless tracks highlight
  const losslessTracks = useMemo(() => {
    return items.filter(t => t.isLossless || t.format === 'FLAC').slice(0, 10);
  }, [items]);

  // Handle Play Track
  const handlePlayTrack = (track, queue = null) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const activeQueue = queue && queue.length ? queue : (items.length ? items : [track]);
      playTrack(track, activeQueue);
    }
  };

  return (
    <div className="flex-1 w-full pb-16 select-none">
      {/* Ambient Gradient Header Banner */}
      <div className="relative pt-6 px-4 sm:px-8 pb-6 bg-gradient-to-b from-[#1e3b2e]/50 via-[#121212]/95 to-[#121212]">
        {/* Dynamic Greeting & Filter Pills */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {getGreeting()}
            </h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-[#b3b3b3]">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Live Streaming Engine
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'trending', label: 'Trending Hits' },
              { id: 'tophits', label: "Today's Top Hits" },
              { id: 'chill', label: 'Chill & Relax' },
              ...(items.length > 0 ? [{ id: 'library', label: 'My Vault' }] : []),
              ...(losslessTracks.length > 0 ? [{ id: 'lossless', label: 'Lossless Hi-Res' }] : []),
              ...(lib.albums?.length > 0 ? [{ id: 'albums', label: 'Albums' }] : []),
              ...(lib.artists?.length > 0 ? [{ id: 'artists', label: 'Artists' }] : []),
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spotify 2x3 Quick-Access Grid */}
        {activeFilter === 'all' && (
          <div className="mt-6">
            {isLoadingYt && quickAccessList.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {[...Array(6)].map((_, i) => (
                  <QuickAccessSkeleton key={`skeleton_quick_${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {quickAccessList.map((t, idx) => (
                  <SpotifyQuickAccessCard
                    key={`${t.id}_quick_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={quickAccessList}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Sections */}
      <div className="px-4 sm:px-8 space-y-10 mt-4">
        {/* 1. SECTION: TRENDING ON YOUTUBE MUSIC */}
        {(activeFilter === 'all' || activeFilter === 'trending') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Trending on YouTube Music
                  </h2>
                  <p className="text-xs text-[#b3b3b3] mt-0.5">Top chartbusters streaming worldwide right now</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('search')}
                className="text-xs font-bold text-[#b3b3b3] hover:text-white transition flex items-center gap-1"
              >
                <span>Search more</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingYt && ytTrending.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <CardSkeleton key={`skeleton_trend_${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {ytTrending.slice(0, 12).map((t, idx) => (
                  <SpotifySquareCard
                    key={`${t.id}_trend_${idx}`}
                    track={t}
                    onPlay={handlePlayTrack}
                    queue={ytTrending}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 2. SECTION: TODAY'S TOP HITS */}
        {(activeFilter === 'all' || activeFilter === 'tophits') && ytTopHits.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1db954]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Today's Top Hits
                  </h2>
                  <p className="text-xs text-[#b3b3b3] mt-0.5">The biggest tracks and viral anthems</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {ytTopHits.slice(0, 12).map((t, idx) => (
                <SpotifySquareCard
                  key={`${t.id}_tophits_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={ytTopHits}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. SECTION: JUMP BACK IN / RECENTLY PLAYED */}
        {(activeFilter === 'all' || activeFilter === 'library') && jumpBackInList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer" onClick={() => onNavigate('library')}>
                  Jump back in
                </h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Your recent listening history</p>
              </div>
              <button
                onClick={() => onNavigate('library')}
                className="text-xs font-bold text-[#b3b3b3] hover:text-white transition flex items-center gap-1"
              >
                <span>Show all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {jumpBackInList.slice(0, 6).map((t, idx) => (
                <SpotifySquareCard
                  key={`${t.id}_jump_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={jumpBackInList}
                />
              ))}
            </div>
          </section>
        )}

        {/* 4. SECTION: CHILL & RELAX */}
        {(activeFilter === 'all' || activeFilter === 'chill') && ytChill.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-sky-400" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Chill & Mellow Vibes
                  </h2>
                  <p className="text-xs text-[#b3b3b3] mt-0.5">Soft melodies, lofi beats, and acoustic songs</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {ytChill.slice(0, 12).map((t, idx) => (
                <SpotifySquareCard
                  key={`${t.id}_chill_${idx}`}
                  track={t}
                  onPlay={handlePlayTrack}
                  queue={ytChill}
                />
              ))}
            </div>
          </section>
        )}

        {/* 5. SECTION: POPULAR ALBUMS (From Vault) */}
        {(activeFilter === 'all' || activeFilter === 'albums') && lib.albums?.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer" onClick={() => onNavigate('albums')}>
                  Popular albums
                </h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Studio releases and collections</p>
              </div>
              <button
                onClick={() => onNavigate('albums')}
                className="text-xs font-bold text-[#b3b3b3] hover:text-white transition flex items-center gap-1"
              >
                <span>Show all ({lib.albums.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {lib.albums.slice(0, 6).map(album => (
                <AlbumCard
                  key={album.name}
                  album={album}
                  onClick={() => onNavigate(`album:${album.name}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6. SECTION: FEATURED ARTISTS (From Vault) */}
        {(activeFilter === 'all' || activeFilter === 'artists') && lib.artists?.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer" onClick={() => onNavigate('artists')}>
                  Popular artists
                </h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Musicians you love</p>
              </div>
              <button
                onClick={() => onNavigate('artists')}
                className="text-xs font-bold text-[#b3b3b3] hover:text-white transition flex items-center gap-1"
              >
                <span>Show all ({lib.artists.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {lib.artists.slice(0, 6).map(artist => (
                <ArtistCard
                  key={artist.name}
                  artist={artist}
                  onClick={() => onNavigate(`artist:${artist.name}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 7. SECTION: LOSSLESS MASTERPIECES */}
        {(activeFilter === 'all' || activeFilter === 'lossless') && losslessTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Disc className="w-5 h-5 text-[#1db954]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Lossless Audio Vault
                  </h2>
                  <p className="text-xs text-[#b3b3b3] mt-0.5">Bit-perfect 24-bit / 48kHz studio audio</p>
                </div>
              </div>
            </div>

            <div className="bg-[#181818] p-3 rounded-lg border border-white/5 space-y-1">
              {losslessTracks.slice(0, 8).map((t, idx) => (
                <TrackRow
                  key={`lossless_${t.id}_${idx}`}
                  track={t}
                  index={idx}
                  showNumber={true}
                  showCover={true}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
