import React, { useState } from 'react';
import { RefreshCw, Play, Shuffle, Music2, Disc3, Users, ListMusic } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { PlaylistCard } from '../components/library/PlaylistCard';

export function LibraryPage({ lib, onNavigate }) {
  const [activeTab, setActiveTab] = useState('songs'); // songs | albums | artists | playlists
  const playTrack = useAudioStore(s => s.playTrack);
  const playlists = useAudioStore(s => s.playlists);
  const deletePlaylist = useAudioStore(s => s.deletePlaylist);

  const handlePlayAll = () => {
    if (lib.items.length > 0) {
      playTrack(lib.items[0], lib.items);
    }
  };

  const handleShuffleAll = () => {
    if (lib.items.length > 0) {
      const shuffled = [...lib.items].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-bg-card border border-white/5 w-fit">
          {[
            { id: 'songs', label: `Songs (${lib.total})`, icon: Music2 },
            { id: 'albums', label: `Albums (${lib.albums.length})`, icon: Disc3 },
            { id: 'artists', label: `Artists (${lib.artists.length})`, icon: Users },
            { id: 'playlists', label: `Playlists (${playlists.length})`, icon: ListMusic },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-accent text-bg-primary shadow-md'
                    : 'text-warm-muted hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controls: Play All, Shuffle, Refresh */}
        <div className="flex items-center gap-2">
          {activeTab === 'songs' && lib.items.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleShuffleAll}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 transition"
                title="Shuffle all"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={lib.refresh}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-warm-white border border-white/5 transition"
            title="Refresh library from Telegram"
            aria-label="Refresh library"
          >
            <RefreshCw className={`w-4 h-4 ${lib.state === 'connecting' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SONGS TAB */}
      {activeTab === 'songs' && (
        <div className="space-y-4">
          {/* Search, Filter & Sorters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Filter current view..."
              value={lib.query}
              onChange={e => lib.setQuery(e.target.value)}
              className="flex-1 min-w-[200px] text-xs px-3.5 py-2 rounded-xl bg-bg-card border border-white/5 text-warm-white placeholder:text-warm-muted/60 focus:outline-none"
            />

            <select
              value={lib.sort}
              onChange={e => lib.setSort(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-bg-card border border-white/5 text-warm-white focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="alpha">Title (A–Z)</option>
              <option value="artist">Artist</option>
              <option value="duration">Duration</option>
              <option value="size">File Size</option>
            </select>

            <select
              value={lib.filterFormat}
              onChange={e => lib.setFilterFormat(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-bg-card border border-white/5 text-warm-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="flac">FLAC Lossless</option>
              <option value="mp3">MP3</option>
              <option value="aac">AAC / M4A</option>
              <option value="opus">OPUS</option>
            </select>
          </div>

          {/* Track List */}
          {lib.items.length > 0 ? (
            <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
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
            <div className="p-12 text-center text-warm-muted text-sm border border-dashed border-white/5 rounded-2xl">
              No tracks found matching your filter.
            </div>
          )}
        </div>
      )}

      {/* ALBUMS TAB */}
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

      {/* ARTISTS TAB */}
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

      {/* PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
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
      )}
    </div>
  );
}
