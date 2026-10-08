import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music2, Disc3, User, Play } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';

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
      ).slice(0, 8)
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = e => {
    if (e.key === 'Escape') {
      setSearchModalOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, matchingTracks.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingTracks[selectedIndex]) {
        playTrack(matchingTracks[selectedIndex]);
        setSearchModalOpen(false);
      }
    }
  };

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => setSearchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-bg-secondary border border-white/10 shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-bg-card">
          <Search className="w-5 h-5 text-accent flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, artists, albums... (use ↑↓ arrows to navigate)"
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
        <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
          {!query ? (
            <div className="p-8 text-center text-warm-muted text-sm">
              <p className="font-medium text-warm-white">Search SPiDEYxFLASH</p>
              <p className="text-xs text-warm-muted/70 mt-1">
                Type song titles, artist names, or album names to find tracks instantly.
              </p>
            </div>
          ) : matchingTracks.length === 0 ? (
            <div className="p-8 text-center text-warm-muted text-sm">
              <p>No matches found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-warm-muted uppercase tracking-wider">
                Tracks ({matchingTracks.length})
              </div>
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
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition ${
                      isSelected ? 'bg-bg-active text-white' : 'hover:bg-bg-card text-warm-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-bg-card flex-shrink-0">
                        <img src={cover} alt={t.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${isSelected ? 'text-accent' : 'text-warm-white'}`}>
                          {t.title}
                        </p>
                        <p className="truncate text-xs text-warm-muted">{t.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-warm-muted flex-shrink-0">
                      <span>{formatDuration(t.duration)}</span>
                      <button
                        className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center"
                        aria-label="Play"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
