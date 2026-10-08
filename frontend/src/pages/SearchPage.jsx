import React, { useState, useMemo } from 'react';
import { Search, Music2, Disc3, Users } from 'lucide-react';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';

export function SearchPage({ lib, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const clean = searchQuery.trim().toLowerCase();

  const matchingTracks = useMemo(() => {
    if (!clean) return [];
    return lib.allItems.filter(t =>
      `${t.title} ${t.artist} ${t.album} ${t.fileName}`.toLowerCase().includes(clean)
    );
  }, [clean, lib.allItems]);

  const matchingAlbums = useMemo(() => {
    if (!clean) return [];
    return lib.albums.filter(a => a.name.toLowerCase().includes(clean));
  }, [clean, lib.albums]);

  const matchingArtists = useMemo(() => {
    if (!clean) return [];
    return lib.artists.filter(a => a.name.toLowerCase().includes(clean));
  }, [clean, lib.artists]);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent" />
        <input
          type="search"
          autoFocus
          placeholder="Search tracks, albums, artists..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 rounded-2xl bg-bg-card border border-white/5 text-sm sm:text-base text-warm-white placeholder:text-warm-muted/70 focus:outline-none focus:ring-1 focus:ring-accent/50 shadow-lg"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-warm-muted hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        )}
      </div>

      {!clean ? (
        <div className="space-y-6 pt-4">
          <h3 className="text-base font-bold text-warm-white">Browse Library</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['FLAC Lossless', 'MP3 320k', 'Soundtracks', 'Popular'].map(tag => (
              <div
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="p-5 rounded-2xl bg-gradient-to-br from-[#2f1b14] to-bg-card border border-white/5 cursor-pointer hover:scale-102 transition shadow-md"
              >
                <h4 className="font-bold text-sm text-warm-white">{tag}</h4>
                <p className="text-xs text-warm-muted mt-1">Explore collection</p>
              </div>
            ))}
          </div>
        </div>
      ) : matchingTracks.length === 0 && matchingAlbums.length === 0 && matchingArtists.length === 0 ? (
        <div className="p-16 text-center text-warm-muted text-sm border border-dashed border-white/5 rounded-2xl">
          <p>No results found for "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tracks Results */}
          {matchingTracks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-warm-white flex items-center gap-2">
                <Music2 className="w-5 h-5 text-accent" />
                <span>Songs ({matchingTracks.length})</span>
              </h3>
              <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/5 space-y-1">
                {matchingTracks.slice(0, 15).map((t, idx) => (
                  <TrackRow key={t.id} track={t} index={idx} showCover={true} />
                ))}
              </div>
            </div>
          )}

          {/* Albums Results */}
          {matchingAlbums.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-warm-white flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-accent" />
                <span>Albums ({matchingAlbums.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {matchingAlbums.map(album => (
                  <AlbumCard
                    key={album.name}
                    album={album}
                    onClick={() => onNavigate(`album:${album.name}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artists Results */}
          {matchingArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-warm-white flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <span>Artists ({matchingArtists.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {matchingArtists.map(artist => (
                  <ArtistCard
                    key={artist.name}
                    artist={artist}
                    onClick={() => onNavigate(`artist:${artist.name}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
