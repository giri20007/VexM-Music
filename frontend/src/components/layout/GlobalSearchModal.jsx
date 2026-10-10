import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Music2, Disc3, User, Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';

export function GlobalSearchModal({ allTracks = [], onNavigate }) {
  const isSearchModalOpen = useAudioStore(s => s.isSearchModalOpen);
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const playTrack = useAudioStore(s => s.playTrack);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchModalOpen]);

  const cleanQuery = query.trim().toLowerCase();

  const matchingTracks = cleanQuery
    ? allTracks.filter(t =>
        `${t.title} ${t.artist} ${t.album} ${t.fileName}`.toLowerCase().includes(cleanQuery)
      ).slice(0, 6)
    : [];

  const matchingArtists = useMemo(() => {
    if (!cleanQuery) return [];
    const set = new Set();
    const result = [];
    allTracks.forEach(t => {
      if (t.artist && t.artist.toLowerCase().includes(cleanQuery) && !set.has(t.artist.toLowerCase())) {
        set.add(t.artist.toLowerCase());
        result.push({ name: t.artist, sampleTrack: t });
      }
    });
    return result.slice(0, 3);
  }, [cleanQuery, allTracks]);

  const matchingAlbums = useMemo(() => {
    if (!cleanQuery) return [];
    const set = new Set();
    const result = [];
    allTracks.forEach(t => {
      if (t.album && t.album !== 'Unknown Album' && t.album.toLowerCase().includes(cleanQuery) && !set.has(t.album.toLowerCase())) {
        set.add(t.album.toLowerCase());
        result.push({ name: t.album, artist: t.artist, sampleTrack: t });
      }
    });
    return result.slice(0, 3);
  }, [cleanQuery, allTracks]);

  const totalResults = [...matchingTracks, ...matchingArtists.map(a => ({ ...a, isArtist: true })), ...matchingAlbums.map(b => ({ ...b, isAlbum: true }))];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = e => {
    if (e.key === 'Escape') {
      setSearchModalOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = totalResults[selectedIndex];
      if (item) {
        if (item.isArtist && onNavigate) {
          onNavigate(`artist:${item.name}`);
        } else if (item.isAlbum && onNavigate) {
          onNavigate(`album:${item.name}`);
        } else {
          playTrack(item);
        }
        setSearchModalOpen(false);
      }
    }
  };

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => setSearchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-bg-secondary border border-white/10 shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-bg-card">
          <Search className="w-5 h-5 text-accent flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search tracks, artists, albums... (↑↓ to select, ↵ to play)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm sm:text-base text-warm-white placeholder:text-warm-muted/70 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-warm-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-warm-muted">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-[65vh] overflow-y-auto p-3 no-scrollbar space-y-4">
          {!query ? (
            <div className="p-8 text-center text-warm-muted text-sm space-y-2">
              <p className="font-bold text-warm-white text-base">Quick Search Palette</p>
              <p className="text-xs text-warm-muted/70 max-w-sm mx-auto">
                Type song titles, artist names, or albums to find and play music instantly.
              </p>
            </div>
          ) : totalResults.length === 0 ? (
            <div className="p-8 text-center text-warm-muted text-sm">
              <p>No matches found for "{query}"</p>
            </div>
          ) : (
            <>
              {/* Matching Artists */}
              {matchingArtists.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-accent uppercase tracking-wider">
                    Artists
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchingArtists.map(artist => (
                      <div
                        key={artist.name}
                        onClick={() => {
                          if (onNavigate) onNavigate(`artist:${artist.name}`);
                          setSearchModalOpen(false);
                        }}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-bg-card hover:bg-bg-cardHover text-sm cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-accent text-xs font-bold border border-accent/30">
                            {artist.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-warm-white truncate">{artist.name}</span>
                        </div>
                        <span className="text-[11px] text-warm-muted">View Artist →</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Albums */}
              {matchingAlbums.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-accent uppercase tracking-wider">
                    Albums
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchingAlbums.map(album => (
                      <div
                        key={album.name}
                        onClick={() => {
                          if (onNavigate) onNavigate(`album:${album.name}`);
                          setSearchModalOpen(false);
                        }}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-bg-card hover:bg-bg-cardHover text-sm cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-secondary flex items-center justify-center text-warm-muted border border-white/5">
                            <Disc3 className="w-4 h-4 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-warm-white text-xs truncate">{album.name}</p>
                            <p className="text-[10px] text-warm-muted truncate">{album.artist}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-warm-muted">View Album →</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Tracks */}
              {matchingTracks.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-warm-muted uppercase tracking-wider">
                    Tracks ({matchingTracks.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchingTracks.map((t, idx) => {
                      const isSelected = idx === selectedIndex;
                      const cover = getArtworkSrc(t, 100);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            playTrack(t);
                            setSearchModalOpen(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-2xl text-sm cursor-pointer transition ${
                            isSelected ? 'bg-bg-active text-white' : 'hover:bg-bg-card text-warm-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-bg-card flex-shrink-0 border border-white/5">
                              <SafeImage src={cover} track={t} alt={t.title} size={80} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate font-semibold text-xs sm:text-sm ${isSelected ? 'text-accent' : 'text-warm-white'}`}>
                                {t.title}
                              </p>
                              <p className="truncate text-[11px] text-warm-muted">{t.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-warm-muted flex-shrink-0">
                            <span className="tabular-nums font-mono text-[11px]">{formatDuration(t.duration)}</span>
                            <button
                              className="w-7 h-7 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-md"
                              aria-label="Play"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
