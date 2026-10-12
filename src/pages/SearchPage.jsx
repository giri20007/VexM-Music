import React, { useState, useEffect, useMemo } from 'react';
import { Search, Music2, Disc3, Users, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { searchUnified, fetchSaavnTrending, fetchYouTubeTrending, fetchYouTubeSuggestions } from '../utils/api';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { ProviderSourceButton } from '../components/layout/ProviderSourceButton';

export function SearchPage({ lib, onNavigate }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || '';
    } catch {
      return '';
    }
  });
  const [ytResults, setYtResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const clean = searchQuery.trim().toLowerCase();

  // Synchronize active search query with URL (/search?q=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (clean) {
        url.searchParams.set('q', clean);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    } catch {}
  }, [clean]);

  // Load trending music on mount (JioSaavn 320k + YouTube fallback)
  useEffect(() => {
    fetchSaavnTrending(preferredLanguage, 30)
      .then(async items => {
        if (items && items.length >= 6) {
          const seen = new Set();
          const unique = [];
          for (const t of items) {
            const cleanTitle = (t.title || '')
              .toLowerCase()
              .replace(/\s*\(from.*?\)/gi, '')
              .replace(/\s*-\s*\(.*?\)/gi, '')
              .trim();
            if (!seen.has(cleanTitle)) {
              seen.add(cleanTitle);
              unique.push(t);
            }
          }
          setTrendingTracks(unique.slice(0, 15));
        } else {
          const ytItems = await fetchYouTubeTrending(20);
          setTrendingTracks(ytItems || []);
        }
      })
      .catch(() => {
        fetchYouTubeTrending(20).then(items => {
          if (items && items.length > 0) setTrendingTracks(items);
        }).catch(() => {});
      });
  }, [preferredLanguage]);

  // Debounced live search
  useEffect(() => {
    if (!clean || clean.length < 2) {
      setYtResults([]);
      setIsSearching(false);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [songs, suggests] = await Promise.all([
          searchUnified(clean, 30, providerSource, lib.allItems),
          fetchYouTubeSuggestions(clean),
        ]);
        setYtResults(songs);
        setSuggestions(suggests.slice(0, 6));
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [clean, providerSource, lib.allItems]);

  // Combined tracks: ytResults contains multi-engine results from searchUnified
  const allSongResults = useMemo(() => {
    return ytResults;
  }, [ytResults]);

  const matchingAlbums = useMemo(() => {
    if (!clean) return [];
    return (lib.albums || []).filter(a => a.name.toLowerCase().includes(clean));
  }, [clean, lib.albums]);

  const matchingArtists = useMemo(() => {
    if (!clean) return [];
    return (lib.artists || []).filter(a => a.name.toLowerCase().includes(clean));
  }, [clean, lib.artists]);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 select-none">
      {/* Search Bar Header */}
      <div className="flex items-center gap-2.5 max-w-3xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="search"
            placeholder="Search songs, artists, or albums..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-12 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.10] border border-white/10 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition shadow-lg backdrop-blur-md"
          />
          {isSearching && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-[#fa2d48] animate-spin" />
            </div>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Single Source Dropdown Button */}
        <ProviderSourceButton />
      </div>

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-white/60 font-semibold mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#fa2d48]" /> Related:
          </span>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setSearchQuery(s)}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 text-xs font-semibold text-white transition whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* DEFAULT VIEW: TRENDING & GENRE CARDS */}
      {!clean && (
        <div className="space-y-10">
          {/* Trending Music Row */}
          {trendingTracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#fa2d48]" />
                <h3 className="text-xl sm:text-2xl font-black text-white">Trending Hits</h3>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-md p-2 rounded-2xl border border-white/[0.06] space-y-1">
                {trendingTracks.slice(0, 10).map((t, idx) => (
                  <TrackRow
                    key={`trend_${t.id}_${idx}`}
                    track={t}
                    index={idx}
                    showCover={true}
                    showNumber={true}
                    onPlay={() => playTrack(t, trendingTracks)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Browse Categories */}
          <section className="space-y-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Browse All</h3>
              <p className="text-xs text-white/50 mt-0.5">Explore by genre, vibe, and artist collections</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: 'Tamil Top Hits', query: 'Tamil Top Hits 2026', color: 'from-[#7b1fa2] via-[#512da8] to-[#1a237e]' },
                { label: 'Bollywood Romance', query: 'Bollywood Romance Hits', color: 'from-[#e65100] via-[#c2185b] to-[#880e4f]' },
                { label: 'Anirudh Ravichander', query: 'Anirudh Ravichander Hits', color: 'from-[#d32f2f] via-[#c2185b] to-[#4a148c]' },
                { label: 'A.R. Rahman Classics', query: 'A.R. Rahman Hits', color: 'from-[#4527a0] via-[#283593] to-[#004d40]' },
                { label: 'Hip Hop & Trap', query: 'Hip Hop Rap Hits', color: 'from-[#f57f17] via-[#e65100] to-[#b71c1c]' },
                { label: 'Pop & Global Hits', query: 'Global Pop Hits', color: 'from-[#00897b] via-[#00695c] to-[#004d40]' },
                { label: 'Acoustic & Chill', query: 'Acoustic Chillout Songs', color: 'from-[#0277bd] via-[#00838f] to-[#00695c]' },
                { label: 'Workout & Energy', query: 'Workout Gym Songs', color: 'from-[#c62828] via-[#ad1457] to-[#6a1b9a]' },
                { label: 'Telugu Chartbusters', query: 'Telugu Top Hits', color: 'from-[#ad1457] via-[#880e4f] to-[#311b92]' },
                { label: 'Malayalam Wave', query: 'Malayalam Hits', color: 'from-[#2e7d32] via-[#1b5e20] to-[#004d40]' },
                { label: '90s & 2000s Nostalgia', query: '90s 2000s Tamil Hindi Hits', color: 'from-[#bf360c] via-[#8d6e63] to-[#3e2723]' },
                { label: 'Party & Dance', query: 'Party Dance Hits', color: 'from-[#ec407a] via-[#ab47bc] to-[#7e57c2]' },
              ].map(cat => (
                <div
                  key={cat.label}
                  onClick={() => setSearchQuery(cat.query)}
                  className={`relative p-5 rounded-2xl bg-gradient-to-br ${cat.color} cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl shadow-lg min-h-[120px] flex flex-col justify-between group select-none border border-white/10`}
                >
                  <h4 className="font-black text-base sm:text-lg text-white tracking-tight leading-snug drop-shadow-md">
                    {cat.label}
                  </h4>
                  <div className="flex items-center justify-between text-white/80 group-hover:text-white text-xs font-bold pt-4">
                    <span>Listen Now</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {clean && (
        <div className="space-y-10">
          {allSongResults.length === 0 && !isSearching && (
            <div className="p-16 text-center text-[#b3b3b3] text-sm border border-dashed border-white/10 rounded-2xl">
              <p>No songs found for "{searchQuery}". Try a different spelling or keyword.</p>
            </div>
          )}

          {/* Songs List */}
          {allSongResults.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Music2 className="w-5 h-5 text-[#fa2d48]" />
                <span>Songs ({allSongResults.length})</span>
              </h3>
              <div className="bg-white/[0.03] backdrop-blur-md p-2 rounded-2xl border border-white/[0.06] space-y-1">
                {allSongResults.map((t, idx) => (
                  <TrackRow
                    key={`search_${t.id}_${idx}`}
                    track={t}
                    index={idx}
                    showCover={true}
                    showNumber={true}
                    onPlay={() => playTrack(t, allSongResults)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums Results */}
          {matchingAlbums.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-[#fa2d48]" />
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
            </section>
          )}

          {/* Artists Results */}
          {matchingArtists.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#fa2d48]" />
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
