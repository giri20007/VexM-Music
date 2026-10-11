import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Play,
  Shuffle,
  Music2,
  Disc3,
  Users,
  ListMusic,
  Heart,
  History,
  TrendingUp,
  Plus,
  Cloud,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { PlaylistCard } from '../components/library/PlaylistCard';
import { PlaylistCreationModal } from '../components/library/PlaylistCreationModal';
import { TrackListSkeleton } from '../components/ui/Skeleton';
import { SafeImage } from '../components/ui/SafeImage';

export function LibraryPage({ lib, onNavigate }) {
  const [activeTab, setActiveTab] = useState('playlists'); // playlists | songs | albums | artists | cloud | history
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  const playTrack = useAudioStore(s => s.playTrack);
  const playlists = useAudioStore(s => s.playlists);
  const deletePlaylist = useAudioStore(s => s.deletePlaylist);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed);
  const playHistory = useAudioStore(s => s.playHistory);

  // Derived collections safely guarded
  const likedTracks = useMemo(() => {
    return (lib?.allItems || []).filter(t => t?.id && likedTrackIds.includes(String(t.id)));
  }, [lib?.allItems, likedTrackIds]);

  const ownTgTracks = useMemo(() => {
    return (lib?.allItems || []).filter(t => t?.isOwnTg || t?.isTelegram);
  }, [lib?.allItems]);

  const historyTracks = useMemo(() => {
    if (recentlyPlayed && recentlyPlayed.length > 0) {
      return recentlyPlayed;
    }
    return (playHistory || [])
      .map(h => (lib?.allItems || []).find(t => t?.id === h?.id))
      .filter(Boolean);
  }, [recentlyPlayed, playHistory, lib?.allItems]);

  // Filter songs based on search query in the songs tab
  const filteredLibraryItems = useMemo(() => {
    const items = lib?.items || [];
    const q = songSearchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      t =>
        (t?.title && t.title.toLowerCase().includes(q)) ||
        (t?.artist && t.artist.toLowerCase().includes(q)) ||
        (t?.album && t.album.toLowerCase().includes(q))
    );
  }, [lib?.items, songSearchQuery]);

  const handlePlayAll = tracks => {
    if (tracks && tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffleAll = tracks => {
    if (tracks && tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const tabs = [
    { id: 'playlists', label: 'Playlists', count: playlists.length + (likedTracks.length > 0 ? 1 : 0), icon: ListMusic },
    { id: 'songs', label: 'Songs', count: lib?.total || 0, icon: Music2 },
    { id: 'albums', label: 'Albums', count: lib?.albums?.length || 0, icon: Disc3 },
    { id: 'artists', label: 'Artists', count: lib?.artists?.length || 0, icon: Users },
    { id: 'cloud', label: 'Cloud Vault', count: ownTgTracks.length, icon: Cloud },
    { id: 'history', label: 'History', count: historyTracks.length, icon: History },
  ];

  return (
    <div className="flex-1 w-full bg-transparent text-white select-none animate-fade-in pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Your Library
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              Playlists, saved tracks, albums, and personal cloud storage
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-lg shadow-[#fa2d48]/20 hover:scale-105 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Playlist</span>
            </button>

            <button
              onClick={lib?.refresh}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition"
              title="Refresh library"
              aria-label="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${lib?.state === 'connecting' ? 'animate-spin text-[#fa2d48]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Apple Music / Spotify Segmented Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10 scale-[1.02]'
                    : 'bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.10] border border-white/[0.08]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-black' : ''}`} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/15 text-black font-bold' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* 1. PLAYLISTS TAB */}
        {/* ======================================================== */}
        {activeTab === 'playlists' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Highlight Card 1: Liked Songs Hero Card */}
              <div
                onClick={() => onNavigate('liked')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-[#450af5] via-[#8e2de2] to-[#f000ff] cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all min-h-[160px]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Heart className="w-5 h-5 fill-white stroke-white" />
                  </div>
                  {likedTracks.length > 0 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handlePlayAll(likedTracks);
                      }}
                      className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all"
                      title="Play Liked Songs"
                    >
                      <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                    </button>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Liked Songs
                  </h3>
                  <p className="text-xs text-white/80 font-medium mt-1">
                    {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              </div>

              {/* Highlight Card 2: Create Playlist Card */}
              <div
                onClick={() => setIsCreatePlaylistOpen(true)}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-white/30 bg-[#121212]/50 hover:bg-[#1a1a1a] cursor-pointer transition-all text-center min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#fa2d48]/20 group-hover:text-[#fa2d48] border border-white/10 flex items-center justify-center text-white/60 mb-3 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Create Playlist</h4>
                <p className="text-xs text-white/40 mt-1">Add your favorite tracks</p>
              </div>

              {/* User Playlists */}
              {playlists.map(pl => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  allTracks={lib?.allItems || []}
                  onClick={() => onNavigate(`playlist:${pl.id}`)}
                  onDelete={deletePlaylist}
                />
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. SONGS TAB */}
        {/* ======================================================== */}
        {activeTab === 'songs' && (
          <div className="space-y-4">
            {/* Filter & Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {filteredLibraryItems.length > 0 && (
                  <>
                    <button
                      onClick={() => handlePlayAll(filteredLibraryItems)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md shadow-[#fa2d48]/25 hover:scale-105 active:scale-95 transition"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                      <span>Play All</span>
                    </button>

                    <button
                      onClick={() => handleShuffleAll(filteredLibraryItems)}
                      className="p-2.5 rounded-full bg-[#141414] hover:bg-[#202020] text-white/80 hover:text-white border border-white/10 transition"
                      title="Shuffle songs"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </>
                )}

                <span className="text-xs text-white/50 font-medium pl-1">
                  {filteredLibraryItems.length} {filteredLibraryItems.length === 1 ? 'song' : 'songs'}
                </span>
              </div>

              {/* Search bar inside songs tab */}
              <div className="w-full sm:w-72">
                <input
                  type="search"
                  placeholder="Filter tracks by title, artist..."
                  value={songSearchQuery}
                  onChange={e => setSongSearchQuery(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-full bg-[#141414] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            {/* Track Rows */}
            {lib?.state === 'connecting' && filteredLibraryItems.length === 0 ? (
              <TrackListSkeleton count={8} />
            ) : filteredLibraryItems.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.06] space-y-1">
                {filteredLibraryItems.map((track, idx) => (
                  <TrackRow
                    key={`${track.id || 'trk'}_${idx}`}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                    onPlay={trk => playTrack(trk, filteredLibraryItems)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <Music2 className="w-10 h-10 text-white/20 mx-auto" />
                <p className="font-bold text-white">No tracks in library</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Songs you play, search, or upload will appear here for easy playback.
                </p>
                <button
                  onClick={() => onNavigate('home')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#fa2d48] text-white font-bold text-xs hover:bg-[#ff3b53] transition mt-2"
                >
                  <span>Explore Music</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. ALBUMS TAB */}
        {/* ======================================================== */}
        {activeTab === 'albums' && (
          <div className="space-y-6">
            {lib?.albums && lib.albums.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {lib.albums.map(album => (
                  <AlbumCard
                    key={album.name}
                    album={album}
                    onClick={() => onNavigate(`album:${encodeURIComponent(album.name)}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <Disc3 className="w-10 h-10 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Saved Albums</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Explore complete movie soundtracks and studio albums across Indian and international music.
                </p>
                <button
                  onClick={() => onNavigate('albums')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#fa2d48] text-white font-bold text-xs hover:bg-[#ff3b53] transition mt-2"
                >
                  <span>Browse Albums</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. ARTISTS TAB */}
        {/* ======================================================== */}
        {activeTab === 'artists' && (
          <div className="space-y-6">
            {lib?.artists && lib.artists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {lib.artists.map(artist => (
                  <ArtistCard
                    key={artist.name}
                    artist={artist}
                    onClick={() => onNavigate(`artist:${encodeURIComponent(artist.name)}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <Users className="w-10 h-10 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Followed Artists</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Discover top vocalists, composers, and global artists on Vex-M.
                </p>
                <button
                  onClick={() => onNavigate('artists')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#fa2d48] text-white font-bold text-xs hover:bg-[#ff3b53] transition mt-2"
                >
                  <span>Explore Artists</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. CLOUD VAULT TAB (OwnTg Personal Storage) */}
        {/* ======================================================== */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Cloud Audio Storage
                </h3>
                <p className="text-xs text-white/50 mt-1 max-w-xl">
                  High-fidelity audio files stored directly in your connected Telegram cloud vault channel.
                </p>
                <p className="text-xs text-[#fa2d48] font-semibold mt-2">
                  {ownTgTracks.length} cloud tracks connected
                </p>
              </div>

              {ownTgTracks.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayAll(ownTgTracks)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md shadow-[#fa2d48]/25 hover:scale-105 active:scale-95 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    <span>Play Cloud Vault</span>
                  </button>

                  <button
                    onClick={() => handleShuffleAll(ownTgTracks)}
                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                    title="Shuffle vault"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {ownTgTracks.length > 0 ? (
              <div className="bg-white/[0.03] backdrop-blur-md p-2 rounded-2xl border border-white/[0.06] space-y-1">
                {ownTgTracks.map((track, idx) => (
                  <TrackRow
                    key={`${track.id || 'vault'}_${idx}`}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                    onPlay={trk => playTrack(trk, ownTgTracks)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <Cloud className="w-10 h-10 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Cloud Tracks Connected</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Audio files uploaded to your Telegram bot or channel will automatically stream here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. HISTORY TAB */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyTracks.length > 0 ? (
              <div className="bg-white/[0.03] backdrop-blur-md p-2 rounded-2xl border border-white/[0.06] space-y-1">
                {historyTracks.map((track, idx) => (
                  <TrackRow
                    key={`${track.id || 'hist'}_${idx}`}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                    onPlay={trk => playTrack(trk, historyTracks)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <History className="w-10 h-10 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Listening History</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Songs you stream will appear here for quick recall.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Playlist Creation Modal */}
        <PlaylistCreationModal
          isOpen={isCreatePlaylistOpen}
          onClose={() => setIsCreatePlaylistOpen(false)}
          onCreated={newPl => onNavigate(`playlist:${newPl.id}`)}
        />
      </div>
    </div>
  );
}
