import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Share2,
  Check,
  ArrowLeft,
  Search,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { searchUnified, fetchAlbumDetails } from '../utils/api';
import { formatDuration } from '../utils/formatters';
import { SafeImage } from '../components/ui/SafeImage';

// Curated Popular Soundtracks & Albums for instant browsing
const FEATURED_ALBUMS = [
  { name: 'Coolie (Original Motion Picture Soundtrack)', albumId: '67199425', query: 'Coolie Anirudh', artist: 'Anirudh Ravichander', year: 2024, thumbnail: 'https://c.saavncdn.com/981/Coolie-Disco-From-Coolie-Tamil-2024-20240509170935-500x500.jpg' },
  { name: 'The Greatest Of All Time (GOAT)', query: 'The Greatest Of All Time', artist: 'Yuvan Shankar Raja', year: 2024, thumbnail: 'https://c.saavncdn.com/829/The-Greatest-Of-All-Time-Tamil-Tamil-2024-20240903191033-500x500.jpg' },
  { name: 'Devara Part 1', query: 'Devara Part 1', artist: 'Anirudh Ravichander', year: 2024, thumbnail: 'https://c.saavncdn.com/313/Devara-Part-1-Telugu-Telugu-2024-20240926171010-500x500.jpg' },
  { name: 'Leo', query: 'Leo Anirudh', artist: 'Anirudh Ravichander', year: 2023, thumbnail: 'https://c.saavncdn.com/415/Leo-Original-Motion-Picture-Soundtrack-English-2023-20231019170311-500x500.jpg' },
  { name: 'Jailer', query: 'Jailer Anirudh', artist: 'Anirudh Ravichander', year: 2023, thumbnail: 'https://c.saavncdn.com/187/Jailer-Tamil-2023-20230728081443-500x500.jpg' },
  { name: 'Vikram', query: 'Vikram Anirudh', artist: 'Anirudh Ravichander', year: 2022, thumbnail: 'https://c.saavncdn.com/973/Vikram-Tamil-2022-20220515182605-500x500.jpg' },
  { name: 'Jawan', query: 'Jawan Anirudh', artist: 'Anirudh Ravichander', year: 2023, thumbnail: 'https://c.saavncdn.com/047/Jawan-Hindi-2023-20230921190854-500x500.jpg' },
  { name: 'Kalki 2898 AD', query: 'Kalki 2898 AD', artist: 'Santhosh Narayanan', year: 2024, thumbnail: 'https://c.saavncdn.com/892/Kalki-2898-Ad-Hindi-Hindi-2024-20240712063714-500x500.jpg' },
  { name: 'Animal', query: 'Animal Ranbir', artist: 'Various Artists', year: 2023, thumbnail: 'https://c.saavncdn.com/092/ANIMAL-Hindi-2023-20260724191152-500x500.jpg' },
  { name: 'Amar Singh Chamkila', query: 'Amar Singh Chamkila', artist: 'A.R. Rahman', year: 2024, thumbnail: 'https://c.saavncdn.com/403/Amar-Singh-Chamkila-Hindi-2024-20250130073140-500x500.jpg' },
  { name: 'Dunki', query: 'Dunki Pritam', artist: 'Pritam', year: 2023, thumbnail: 'https://c.saavncdn.com/139/Dunki-Hindi-2023-20231220211003-500x500.jpg' },
  { name: 'Master', query: 'Master Anirudh', artist: 'Anirudh Ravichander', year: 2020, thumbnail: 'https://c.saavncdn.com/347/Master-Tamil-2020-20200316084627-500x500.jpg' },
  { name: 'Aavesham', query: 'Aavesham', artist: 'Sushin Shyam', year: 2024, thumbnail: 'https://c.saavncdn.com/202/Aavesham-Original-Motion-Picture-Soundtrack-Malayalam-2024-20250910150630-500x500.jpg' },
];

// Sub-Component 1: Dedicated Album View (Apple Music Clean Hero & Tracklist)
function AlbumDetailView({ lib, albumName, onNavigate, onBack }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const [copied, setCopied] = useState(false);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [albumCover, setAlbumCover] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);

  // Check if album is in local library safely
  const localAlbum = useMemo(() => {
    if (!albumName) return null;
    return (lib?.albums || []).find(
      a => a?.name && a.name.toLowerCase() === albumName.toLowerCase()
    );
  }, [lib?.albums, albumName]);

  // Load album songs dynamically from API if not enough local songs
  useEffect(() => {
    if (!albumName) return;

    let isMounted = true;
    const fetchAlbumData = async () => {
      // Find featured album metadata if available
      const feat = FEATURED_ALBUMS.find(
        f => f.name.toLowerCase() === albumName.toLowerCase()
      );
      if (feat) {
        setAlbumCover(feat.thumbnail);
        setAlbumArtist(feat.artist);
      } else if (localAlbum?.thumbnail) {
        setAlbumCover(localAlbum.thumbnail);
        setAlbumArtist(localAlbum.artist);
      }

      setIsLoadingAlbum(true);
      try {
        // 1. Fetch official high-fidelity studio album tracks (320 kbps AAC)
        const targetQuery = feat?.albumId || feat?.query || albumName;
        const albumData = await fetchAlbumDetails(targetQuery);
        if (isMounted && albumData?.songs && albumData.songs.length > 0) {
          setAlbumTracks(albumData.songs);
          if (albumData.thumbnail && !feat) setAlbumCover(albumData.thumbnail);
          if (albumData.artist && !feat) setAlbumArtist(albumData.artist);
          return;
        }

        // 2. Fallback to unified search
        const results = await searchUnified(albumName, 25);
        if (isMounted) {
          if (results && results.length > 0) {
            setAlbumTracks(results);
            if (!feat && results[0]?.thumbnail) {
              setAlbumCover(results[0].thumbnail);
              setAlbumArtist(results[0].artist);
            }
          } else if (localAlbum?.tracks) {
            setAlbumTracks(localAlbum.tracks);
          }
        }
      } catch {
        if (isMounted && localAlbum?.tracks) {
          setAlbumTracks(localAlbum.tracks);
        }
      } finally {
        if (isMounted) setIsLoadingAlbum(false);
      }
    };

    fetchAlbumData();
    return () => {
      isMounted = false;
    };
  }, [albumName, localAlbum]);

  const handleShare = async () => {
    const url = `${window.location.origin}/album/${encodeURIComponent(albumName)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${albumName} - Vex-M`,
          text: `Listen to "${albumName}" on Vex-M`,
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

  const isAlbumPlaying =
    albumTracks.some(t => t?.id === currentTrack?.id) && isPlaying;

  const handlePlayAlbum = () => {
    if (isAlbumPlaying) {
      togglePlay();
    } else if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  const handleShuffleAlbum = () => {
    if (albumTracks.length === 0) return;
    const shuffled = [...albumTracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const totalDuration = albumTracks.reduce((s, t) => s + (t?.duration || 0), 0);
  const coverSrc =
    albumCover ||
    localAlbum?.thumbnail ||
    albumTracks[0]?.thumbnail ||
    '';

  const artistName = albumArtist || localAlbum?.artist || albumTracks[0]?.artist || 'Various Artists';
  const releaseYear = localAlbum?.year || 2024;

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-8 space-y-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition group py-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Albums</span>
        </button>

        {/* Apple Music Hero Layout */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8 pt-2">
          {/* Glossy Album Artwork */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden bg-[#181818] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex-shrink-0 group">
            <SafeImage
              src={coverSrc}
              alt={albumName}
              size={600}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          {/* Album Metadata & Actions */}
          <div className="space-y-4 flex-1 min-w-0 text-center md:text-left">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#00a8e1]">
                Album
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mt-1">
                {albumName}
              </h1>
            </div>

            {/* Artist link & Details */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-white/60 flex-wrap">
              <button
                onClick={() => onNavigate && onNavigate(`artist:${encodeURIComponent(artistName)}`)}
                className="text-white font-bold hover:text-[#00a8e1] transition-colors"
              >
                {artistName}
              </button>
              <span>·</span>
              <span>{releaseYear}</span>
              <span>·</span>
              <span>{albumTracks.length} songs</span>
              {totalDuration > 0 && (
                <>
                  <span>·</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={handlePlayAlbum}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#00a8e1] hover:bg-[#22d3ee] text-white font-bold text-sm shadow-xl shadow-[#00a8e1]/25 hover:scale-105 active:scale-95 transition"
              >
                {isAlbumPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
                <span>{isAlbumPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={handleShuffleAlbum}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition hover:scale-105 active:scale-95"
                title="Shuffle album"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={handleShare}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition active:scale-95"
                title="Share Album"
              >
                {copied ? <Check className="w-4 h-4 text-[#00a8e1]" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tracklist Table */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between px-3 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/5 pb-2">
            <div className="flex items-center gap-4">
              <span className="w-6 text-center">#</span>
              <span>Title</span>
            </div>
            <Clock className="w-4 h-4" />
          </div>

          {isLoadingAlbum && albumTracks.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin text-[#00a8e1] mr-2" />
              <span className="text-sm">Loading album tracks...</span>
            </div>
          ) : albumTracks.length > 0 ? (
            <div className="space-y-1">
              {albumTracks.map((t, idx) => (
                <TrackRow
                  key={`${t?.id || 'trk'}_${idx}`}
                  track={t}
                  index={idx}
                  showNumber={true}
                  showCover={false}
                  showAlbum={false}
                  onPlay={trk => playTrack(trk, albumTracks)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-white/40 text-sm">
              No songs found in this album.
            </div>
          )}
        </div>

        {/* Clean Album Copyright Notice */}
        <div className="pt-8 border-t border-white/[0.06] text-xs text-white/40 space-y-1">
          <p>
            Released {releaseYear} · {albumTracks.length} Songs{totalDuration > 0 ? `, ${formatDuration(totalDuration)}` : ''}
          </p>
          <p className="text-[11px] text-white/30">
            ℗ {releaseYear} {artistName}
          </p>
        </div>
      </div>
    </div>
  );
}

// Sub-Component 2: All Albums Directory (Curated + Library Albums Grid)
function AlbumDirectoryView({ lib, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');

  const allAvailableAlbums = useMemo(() => {
    const list = [...FEATURED_ALBUMS];
    const seenNames = new Set(list.map(a => a.name.toLowerCase()));

    (lib?.albums || []).forEach(local => {
      if (local?.name && !seenNames.has(local.name.toLowerCase())) {
        list.push({
          name: local.name,
          artist: local.artist || 'Various Artists',
          year: local.year || 2024,
          thumbnail: local.thumbnail || '',
        });
        seenNames.add(local.name.toLowerCase());
      }
    });

    return list;
  }, [lib?.albums]);

  const filteredAlbums = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return allAvailableAlbums;
    return allAvailableAlbums.filter(
      a =>
        (a?.name && a.name.toLowerCase().includes(q)) ||
        (a?.artist && a.artist.toLowerCase().includes(q))
    );
  }, [allAvailableAlbums, searchQuery]);

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Albums & Soundtracks
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              Complete soundtrack collections and studio albums
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              placeholder="Search albums..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Responsive Album Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {filteredAlbums.map(album => (
            <div
              key={album.name}
              onClick={() => onNavigate(`album:${encodeURIComponent(album.name)}`)}
              className="group flex flex-col p-3 rounded-2xl amz-card cursor-pointer select-none"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#0d1117] mb-3 shadow-lg">
                <SafeImage
                  src={album.thumbnail}
                  alt={album.name}
                  size={350}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Floating Play Button */}
                <div className="absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full amz-play-btn flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl shadow-black/60">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-white truncate group-hover:text-[#00a8e1] transition-colors">
                {album.name}
              </h4>
              <p className="text-xs text-white/50 truncate mt-1">
                {album.artist}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Master Albums Page (Zero Conditional Hooks, Guaranteed Render Safety)
export function AlbumsPage({ lib, selectedAlbumName, onNavigate, onBack }) {
  const safeAlbumName = useMemo(() => {
    if (!selectedAlbumName) return null;
    try {
      return decodeURIComponent(selectedAlbumName).trim();
    } catch {
      return String(selectedAlbumName).trim();
    }
  }, [selectedAlbumName]);

  if (safeAlbumName) {
    return (
      <AlbumDetailView
        lib={lib}
        albumName={safeAlbumName}
        onNavigate={onNavigate}
        onBack={onBack}
      />
    );
  }

  return (
    <AlbumDirectoryView
      lib={lib}
      onNavigate={onNavigate}
    />
  );
}
