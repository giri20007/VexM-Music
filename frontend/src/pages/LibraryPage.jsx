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
} from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { PlaylistCard } from '../components/library/PlaylistCard';
import { PlaylistCreationModal } from '../components/library/PlaylistCreationModal';

export function LibraryPage({ lib, onNavigate }) {
  const [activeTab, setActiveTab] = useState('songs'); // songs | liked | playlists | history | mostPlayed | albums | artists
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
    { id: 'songs', label: `Songs (${lib.total})`, icon: Music2 },
    { id: 'liked', label: `Liked (${likedTracks.length})`, icon: Heart },
    { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListMusic },
    { id: 'history', label: `History (${historyTracks.length})`, icon: History },
    { id: 'mostPlayed', label: 'Top Tracks', icon: TrendingUp },
    { id: 'albums', label: `Albums (${lib.albums.length})`, icon: Disc3 },
    { id: 'artists', label: `Artists (${lib.artists.length})`, icon: Users },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Horizontal Tab Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-bg-card border border-white/8 overflow-x-auto no-scrollbar max-w-full">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-accent text-bg-primary font-bold shadow-md shadow-accent/20'
                    : 'text-warm-muted hover:text-white hover:bg-white/5'
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Playlist</span>
            </button>
          )}

          {activeTab === 'songs' && lib.items.length > 0 && (
            <>
              <button
                onClick={() => handlePlayAll(lib.items)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play All</span>
              </button>
              <button
                onClick={() => handleShuffleAll(lib.items)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 transition"
                title="Shuffle all"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </>
          )}

          {activeTab === 'liked' && likedTracks.length > 0 && (
            <>
              <button
                onClick={() => handlePlayAll(likedTracks)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play Liked</span>
              </button>
              <button
                onClick={() => handleShuffleAll(likedTracks)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 transition"
                title="Shuffle liked"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={lib.refresh}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 transition"
            title="Refresh library"
            aria-label="Refresh library"
          >
            <RefreshCw className={`w-4 h-4 ${lib.state === 'connecting' ? 'animate-spin text-accent' : ''}`} />
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
              className="flex-1 min-w-[220px] text-xs px-3.5 py-2.5 rounded-xl bg-bg-card border border-white/8 text-warm-white placeholder:text-warm-muted/60 focus:outline-none focus:ring-1 focus:ring-accent/50"
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
                      ? 'bg-accent text-bg-primary shadow-sm font-bold'
                      : 'bg-bg-card hover:bg-bg-cardHover text-warm-muted hover:text-white border border-white/8'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <select
              value={lib.sort}
              onChange={e => lib.setSort(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl bg-bg-card border border-white/8 text-warm-white focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="alpha">Title (A–Z)</option>
              <option value="artist">Artist</option>
              <option value="duration">Duration</option>
              <option value="size">File Size</option>
            </select>
          </div>

          {/* Track Table Header & List */}
          {lib.items.length > 0 ? (
            <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
              {/* Standardized Table Column Headers */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px] font-bold tracking-wider text-warm-muted/70 uppercase border-b border-white/5 select-none">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Title & Artist</span>
                </div>
                <div className="hidden sm:block flex-shrink-0 w-24 text-center">Quality</div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-12 text-right">Duration</span>
                  <span className="w-16 text-right">Actions</span>
                </div>
              </div>

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
            <div className="p-12 sm:p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-4">
              {/* Vinyl Graphic with Glowing Accent Ring */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#2a1219] via-[#1a0c10] to-[#0d0507] border-2 border-white/10 flex items-center justify-center text-accent mx-auto shadow-xl shadow-accent/10 group animate-pulse-slow">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-accent" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-warm-white text-base">No tracks found</p>
                <p className="text-xs text-warm-muted max-w-sm mx-auto leading-relaxed">
                  {lib.query ? `No songs match "${lib.query}". Try another search term.` : 'Your saved tracks and favorites will appear here.'}
                </p>
              </div>

              {/* Quick Shortcut Chips */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => onNavigate('search')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md hover:scale-105 transition"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Search</span>
                </button>
                <button
                  onClick={() => onNavigate('artists')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 font-semibold text-xs transition"
                >
                  <Users className="w-4 h-4 text-accent" />
                  <span>Browse Artists</span>
                </button>
                <button
                  onClick={() => onNavigate('albums')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 font-semibold text-xs transition"
                >
                  <Disc3 className="w-4 h-4 text-accent" />
                  <span>Explore Albums</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. LIKED SONGS TAB */}
      {activeTab === 'liked' && (
        <div className="space-y-4">
          {likedTracks.length > 0 ? (
            <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
              {/* Standardized Table Column Headers */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px] font-bold tracking-wider text-warm-muted/70 uppercase border-b border-white/5 select-none">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Title & Artist</span>
                </div>
                <div className="hidden sm:block flex-shrink-0 w-24 text-center">Quality</div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-12 text-right">Duration</span>
                  <span className="w-16 text-right">Actions</span>
                </div>
              </div>

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
            <div className="p-12 sm:p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-warm-white text-base">No Liked Songs Yet</p>
                <p className="text-xs text-warm-muted max-w-sm mx-auto leading-relaxed">
                  Click the heart icon on any song while listening or browsing to save it to your favorites.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => onNavigate('albums')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md hover:scale-105 transition"
                >
                  <Disc3 className="w-4 h-4" />
                  <span>Explore Albums</span>
                </button>
                <button
                  onClick={() => onNavigate('artists')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white border border-white/8 font-semibold text-xs transition"
                >
                  <Users className="w-4 h-4 text-accent" />
                  <span>Browse Artists</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PLAYLISTS TAB */}
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
            <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
              <ListMusic className="w-12 h-12 text-warm-muted/40 mx-auto" />
              <p className="font-bold text-warm-white text-base">No Playlists Created</p>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Organize your favorite tracks into custom collections and mix sets.
              </p>
              <button
                onClick={() => setIsCreatePlaylistOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md hover:scale-105 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Playlist</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. LISTENING HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyTracks.length > 0 ? (
            <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px] font-bold tracking-wider text-warm-muted/70 uppercase border-b border-white/5 select-none">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Title & Artist</span>
                </div>
                <div className="hidden sm:block flex-shrink-0 w-24 text-center">Quality</div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-12 text-right">Duration</span>
                  <span className="w-16 text-right">Actions</span>
                </div>
              </div>

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
            <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
              <History className="w-12 h-12 text-warm-muted/40 mx-auto" />
              <p className="font-bold text-warm-white text-base">No Listening History</p>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Songs you play will automatically appear here for quick recall.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. TOP / MOST PLAYED TAB */}
      {activeTab === 'mostPlayed' && (
        <div className="space-y-4">
          {mostPlayedTracks.length > 0 ? (
            <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px] font-bold tracking-wider text-warm-muted/70 uppercase border-b border-white/5 select-none">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Title & Artist</span>
                </div>
                <div className="hidden sm:block flex-shrink-0 w-24 text-center">Quality</div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-12 text-right">Duration</span>
                  <span className="w-16 text-right">Actions</span>
                </div>
              </div>

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
            <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/10 rounded-3xl space-y-3">
              <TrendingUp className="w-12 h-12 text-warm-muted/40 mx-auto" />
              <p className="font-bold text-warm-white text-base">Top Tracks</p>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Play tracks in your library to rank your most listened songs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. ALBUMS TAB */}
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

      {/* 7. ARTISTS TAB */}
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
  );
}
