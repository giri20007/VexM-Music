import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Music2, Disc3, User, Play, Loader2, Sparkles } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatDuration } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { searchUnified, fetchYouTubeSuggestions } from '../../utils/api';
import { SafeImage } from '../ui/SafeImage';
import { ProviderSourceBar } from './ProviderSourceBar';

export function GlobalSearchModal({ allTracks = [], onNavigate }) {
  const isSearchModalOpen = useAudioStore(s => s.isSearchModalOpen);
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const playTrack = useAudioStore(s => s.playTrack);
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ytResults, setYtResults] = useState([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setQuery('');
      setSelectedIndex(0);
      setYtResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchModalOpen]);

  const cleanQuery = query.trim().toLowerCase();

  // Local matching tracks
  const localMatchingTracks = useMemo(() => {
    if (!cleanQuery) return [];
    return allTracks
      .filter(t => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(cleanQuery))
      .slice(0, 4);
  }, [cleanQuery, allTracks]);

  // Debounced live search across sources
  useEffect(() => {
    if (!cleanQuery || cleanQuery.length < 2) {
      setYtResults([]);
      setIsSearchingYt(false);
      setSuggestions([]);
      return;
    }

    setIsSearchingYt(true);
    const timer = setTimeout(async () => {
      try {
        const [songs, suggests] = await Promise.all([
          searchUnified(cleanQuery, 12, providerSource, allTracks),
          fetchYouTubeSuggestions(cleanQuery),
        ]);
        setYtResults(songs);
        setSuggestions(suggests.slice(0, 5));
      } catch {
        // ignore
      } finally {
        setIsSearchingYt(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [cleanQuery, providerSource, allTracks]);

  const combinedResults = useMemo(() => {
    const list = [...localMatchingTracks];
    const seenTitles = new Set(list.map(t => t.title.toLowerCase()));

    ytResults.forEach(yt => {
      if (!seenTitles.has(yt.title.toLowerCase())) {
        list.push(yt);
      }
    });
    return list.slice(0, 10);
  }, [localMatchingTracks, ytResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectTrack = track => {
    playTrack(track, combinedResults);
    setSearchModalOpen(false);
  };

  const handleKeyDown = e => {
    if (e.key === 'Escape') {
      setSearchModalOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, combinedResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = combinedResults[selectedIndex];
      if (item) {
        handleSelectTrack(item);
      }
    }
  };

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => setSearchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#181818] border border-white/10 shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/5 bg-[#1a1a1a]">
          <Search className="w-5 h-5 text-[#fa2d48] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any song, artist, or album across sources..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none"
          />
          {isSearchingYt && (
            <Loader2 className="w-4 h-4 text-[#fa2d48] animate-spin mr-3 flex-shrink-0" />
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/50">
            ESC
          </span>
        </div>

        {/* Source Switcher */}
        <div className="px-3 py-2 bg-[#121212] border-b border-white/5 flex items-center justify-between">
          <ProviderSourceBar compact />
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/30 hidden sm:inline">
            Vex-M Live
          </span>
        </div>

        {/* Suggestions chips */}
        {suggestions.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#0e0e0e] overflow-x-auto border-b border-white/5 no-scrollbar">
            <span className="text-[11px] text-white/40 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#fa2d48]" /> Suggest:
            </span>
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {cleanQuery && combinedResults.length === 0 && !isSearchingYt && (
            <div className="p-8 text-center text-xs text-white/50">
              No songs found for "{query}". Try switching provider source above or search a different keyword.
            </div>
          )}

          {!cleanQuery && (
            <div className="p-6 text-center text-xs text-white/50">
              <p className="font-semibold text-white">Search Across All Connected Engines</p>
              <p className="text-[11px] mt-1 text-white/40">
                Switch between JioSaavn 320k Studio, YouTube Global catalog, and OwnTg Personal Cloud Storage.
              </p>
            </div>
          )}

          {combinedResults.map((t, idx) => {
            const isSelected = idx === selectedIndex;
            const cover = getArtworkSrc(t, 100);

            return (
              <div
                key={`${t.id}_${idx}`}
                onClick={() => handleSelectTrack(t)}
                className={`group flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#242424] flex-shrink-0 shadow-md">
                    <SafeImage
                      src={cover}
                      track={t}
                      alt={t.title}
                      size={100}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {t.title}
                    </h4>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {t.artist} {t.album && t.album !== t.title ? `· ${t.album}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                  {(t.isOwnTg || t.isTelegram) && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      OwnTg
                    </span>
                  )}
                  {t.is320k && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      320k
                    </span>
                  )}
                  {t.isYouTube && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      YouTube
                    </span>
                  )}
                  {t.duration > 0 && (
                    <span className="text-xs font-mono text-white/40">
                      {t.durationFormatted || formatDuration(t.duration)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
