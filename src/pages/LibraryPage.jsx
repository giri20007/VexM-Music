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
  Compass,
  Cloud,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { PlaylistCard } from '../components/library/PlaylistCard';
import { PlaylistCreationModal } from '../components/library/PlaylistCreationModal';
import { TrackListSkeleton } from '../components/ui/Skeleton';
import { formatDuration } from '../utils/formatters';

export function LibraryPage({ lib, onNavigate }) {
  const [activeTab, setActiveTab] = useState('songs'); // songs | owntg | liked | playlists | history | mostPlayed | albums | artists
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);

  const playTrack = useAudioStore(s => s.playTrack);
  const playlists = useAudioStore(s => s.playlists);
  const deletePlaylist = useAudioStore(s => s.deletePlaylist);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed);
  const playHistory = useAudioStore(s => s.playHistory);

  // Derived collections
  const likedTracks = useMemo(() => {
    return lib.allItems.filter(t => likedTrackIds.includes(String(t.id)));
  }, [lib.allItems, likedTrackIds]);

  const ownTgTracks = useMemo(() => {
    return lib.allItems.filter(t => t.isOwnTg || t.isTelegram);
  }, [lib.allItems]);

  const mostPlayedTracks = useMemo(() => {
    if (!playHistory || playHistory.length === 0) return [];
    const sorted = [...playHistory].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    return sorted
      .map(h => lib.allItems.find(t => t.id === h.id))
      .filter(Boolean)
      .slice(0, 50);
  }, [playHistory, lib.allItems]);

  const historyTracks = useMemo(() => {
    if (recentlyPlayed && recentlyPlayed.length > 0) {
      return recentlyPlayed;
    }
    return playHistory.map(h => lib.allItems.find(t => t.id === h.id)).filter(Boolean);
  }, [recentlyPlayed, playHistory, lib.allItems]);

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
    { id: 'songs', label: `All Songs (${lib.total})`, icon: Music2 },
    { id: 'owntg', label: `OwnTg Vault (${ownTgTracks.length})`, icon: HardDrive },
    { id: 'liked', label: `Liked (${likedTracks.length})`, icon: Heart },
    { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListMusic },
    { id: 'history', label: `History (${historyTracks.length})`, icon: History },
    { id: 'mostPlayed', label: 'Top Tracks', icon: TrendingUp },
    { id: 'albums', label: `Albums (${lib.albums.length})`, icon: Disc3 },
    { id: 'artists', label: `Artists (${lib.artists.length})`, icon: Users },
  ];

  return (
    <div className="flex-1 w-full bg-[#000000] text-white select-none animate-fade-in pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6">
        {/* OwnTg Cloud Vault Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1624] via-[#0b1019] to-[#0a0a0a] border border-sky-500/20 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-lg shadow-sky-500/10">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30">
                    Telegram Audio Vault · BIN
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {ownTgTracks.length} Cloud Files Connected
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  OwnTg Personal Audio Storage
                </h3>
                <p className="text-xs text-white/50 max-w-xl mt-0.5">
                  Telegram channel acts as your unlimited personal storage BIN. Custom uploaded FLAC and MP3 files stream directly alongside JioSaavn and YouTube.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setActiveTab('owntg')}
                className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-bold text-xs transition"
              >
                View Vault ({ownTgTracks.length})
              </button>
            </div>
          </div>
        </div>

        {/* Top Header & Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Horizontal Tab Bar */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#141414] border border-white/10 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#fa2d48] text-white font-bold shadow-md shadow-[#fa2d48]/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Global Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'playlists' && (
              <button
                onClick={() => setIsCreatePlaylistOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md shadow-[#fa2d48]/20 hover:scale-105 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Playlist</span>
              </button>
            )}

            {activeTab === 'songs' && lib.items.length > 0 && (
              <>
                <button
                  onClick={() => handlePlayAll(lib.items)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md shadow-[#fa2d48]/20 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => handleShuffleAll(lib.items)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                  title="Shuffle all"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </>
            )}

            {activeTab === 'owntg' && ownTgTracks.length > 0 && (
              <>
                <button
                  onClick={() => handlePlayAll(ownTgTracks)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs shadow-md shadow-sky-500/20 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Play Vault</span>
                </button>
                <button
                  onClick={() => handleShuffleAll(ownTgTracks)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                  title="Shuffle Vault"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </>
            )}

            {activeTab === 'liked' && likedTracks.length > 0 && (
              <>
                <button
                  onClick={() => handlePlayAll(likedTracks)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md shadow-[#fa2d48]/20 hover:scale-105 active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  <span>Play Liked</span>
                </button>
                <button
                  onClick={() => handleShuffleAll(likedTracks)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
                  title="Shuffle liked"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={lib.refresh}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
              title="Refresh library"
              aria-label="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${lib.state === 'connecting' ? 'animate-spin text-[#fa2d48]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. ALL SONGS TAB */}
        {activeTab === 'songs' && (
          <div className="space-y-4">
            {/* Search, Filter & Sorters */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                placeholder="Filter tracks by title, artist, album, genre..."
                value={lib.query}
                onChange={e => lib.setQuery(e.target.value)}
                className="flex-1 min-w-[220px] text-xs px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#fa2d48]/50"
              />

              {/* Format Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'flac', label: 'FLAC (Hi-Res)' },
                  { id: 'mp3', label: 'MP3' },
                  { id: 'aac', label: 'AAC' },
                  { id: 'wav', label: 'WAV' },
                  { id: 'recent', label: 'Recently Added' },
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => lib.setFilterFormat(fmt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      lib.filterFormat === fmt.id
                        ? 'bg-[#fa2d48] text-white shadow-sm font-bold'
                        : 'bg-[#141414] hover:bg-[#1f1f1f] text-white/70 hover:text-white border border-white/10'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              <select
                value={lib.sort}
                onChange={e => lib.setSort(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="alpha">Title (A–Z)</option>
                <option value="artist">Artist</option>
                <option value="duration">Duration</option>
                <option value="size">File Size</option>
              </select>
            </div>

            {/* Track Table Header & List */}
            {lib.state === 'connecting' && lib.items.length === 0 ? (
              <TrackListSkeleton count={10} />
            ) : lib.items.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.08] space-y-1">
                {lib.items.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 sm:p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-4">
                <Music2 className="w-12 h-12 text-white/20 mx-auto" />
                <p className="font-bold text-white text-base">No tracks found</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                  {lib.query ? `No songs match "${lib.query}". Try another search term.` : 'Your saved tracks and favorites will appear here.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. OWN-TG VAULT / BIN TAB */}
        {activeTab === 'owntg' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span>OwnTg Telegram Cloud Storage Vault</span>
                </h3>
                <p className="text-xs text-white/40">
                  Audio files stored in Telegram BIN for private streaming in FLAC / Hi-Res
                </p>
              </div>
              <span className="text-xs font-mono text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                {ownTgTracks.length} items
              </span>
            </div>

            {ownTgTracks.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-sky-500/20 space-y-1">
                {ownTgTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-sky-500/20 rounded-3xl space-y-3">
                <HardDrive className="w-12 h-12 text-sky-400/30 mx-auto" />
                <p className="font-bold text-white">No Telegram Vault Files Found</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Add audio files to your Telegram channel to stream your personal lossless music vault.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. LIKED SONGS TAB */}
        {activeTab === 'liked' && (
          <div className="space-y-4">
            {likedTracks.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.08] space-y-1">
                {likedTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <Heart className="w-12 h-12 text-rose-500/30 mx-auto" />
                <p className="font-bold text-white">No Liked Songs Yet</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Click the heart icon on any song to add it to your favorites.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. PLAYLISTS TAB */}
        {activeTab === 'playlists' && (
          <div className="space-y-4">
            {playlists.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {playlists.map(pl => (
                  <PlaylistCard
                    key={pl.id}
                    playlist={pl}
                    allTracks={lib.allItems}
                    onClick={() => onNavigate(`playlist:${pl.id}`)}
                    onDelete={deletePlaylist}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <ListMusic className="w-12 h-12 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Playlists Created</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Organize your favorite tracks into custom collections.
                </p>
                <button
                  onClick={() => setIsCreatePlaylistOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#fa2d48] hover:bg-[#ff3b53] text-white font-bold text-xs shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Playlist</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 5. HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyTracks.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.08] space-y-1">
                {historyTracks.map((track, idx) => (
                  <TrackRow
                    key={`${track.id}_${idx}`}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <History className="w-12 h-12 text-white/20 mx-auto" />
                <p className="font-bold text-white">No Listening History</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Songs you stream will appear here for quick recall.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 6. TOP TRACKS TAB */}
        {activeTab === 'mostPlayed' && (
          <div className="space-y-4">
            {mostPlayedTracks.length > 0 ? (
              <div className="bg-[#0e0e0e] p-2 rounded-2xl border border-white/[0.08] space-y-1">
                {mostPlayedTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    showNumber={true}
                    showAlbum={true}
                    showCover={true}
                  />
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
                <TrendingUp className="w-12 h-12 text-white/20 mx-auto" />
                <p className="font-bold text-white">Top Tracks</p>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  Stream songs in Vex-M to automatically rank your most played tracks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 7. ALBUMS TAB */}
        {activeTab === 'albums' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {lib.albums.map(album => (
              <AlbumCard
                key={album.name}
                album={album}
                onClick={() => onNavigate(`album:${album.name}`)}
              />
            ))}
          </div>
        )}

        {/* 8. ARTISTS TAB */}
        {activeTab === 'artists' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {lib.artists.map(artist => (
              <ArtistCard
                key={artist.name}
                artist={artist}
                onClick={() => onNavigate(`artist:${artist.name}`)}
              />
            ))}
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
