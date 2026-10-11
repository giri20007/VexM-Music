import React, { useState, useEffect, useMemo } from 'react';
import { Search, Music2, Disc3, Users, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { searchUnified, fetchSaavnTrending, fetchYouTubeTrending, fetchYouTubeSuggestions } from '../utils/api';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { ProviderSourceBar } from '../components/layout/ProviderSourceBar';
import { AppFooter } from '../components/layout/AppFooter';

export function SearchPage({ lib, onNavigate }) {
  const playTrack = useAudioStore(s => s.playTrack);
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [ytResults, setYtResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const clean = searchQuery.trim().toLowerCase();

  // Load trending music on mount (JioSaavn 320k + YouTube fallback)
  useEffect(() => {
    fetchSaavnTrending(preferredLanguage, 16)
      .then(async items => {
        if (items && items.length >= 6) {
          setTrendingTracks(items);
        } else {
          const ytItems = await fetchYouTubeTrending(16);
          setTrendingTracks(ytItems || []);
        }
      })
      .catch(() => {
        fetchYouTubeTrending(16).then(items => {
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
      <div className="space-y-3 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fa2d48]" />
          <input
            type="search"
            autoFocus
            placeholder="Search songs, artists, or albums across all engines..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#1c1c1e] hover:bg-[#242426] focus:bg-[#242426] border border-white/10 text-sm sm:text-base text-white placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#fa2d48] transition shadow-xl"
          />
          {isSearching && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-[#fa2d48] animate-spin" />
            </div>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#8e8e93] hover:text-white hover:bg-white/10 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Source Filter Selector */}
        <ProviderSourceBar />
      </div>

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-[#8e8e93] font-semibold mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#fa2d48]" /> Related:
          </span>
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setSearchQuery(s)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition whitespace-nowrap"
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
              <div className="bg-[#181818] p-3 rounded-xl border border-white/5 space-y-1">
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
            <h3 className="text-xl font-bold text-white">Explore Genres</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Tamil Hits', color: 'from-[#8400e7] to-[#1e3264]' },
                { label: 'Bollywood & Hindi', color: 'from-[#e13300] to-[#731300]' },
                { label: 'Pop & International', color: 'from-[#148a08] to-[#0d5905]' },
                { label: 'Anirudh Masterpieces', color: 'from-[#e91429] to-[#800b17]' },
                { label: 'A.R. Rahman Classics', color: 'from-[#503750] to-[#281b28]' },
                { label: 'Hip Hop & Rap', color: 'from-[#ba5d07] to-[#5d2e03]' },
                { label: 'Chill & Acoustic', color: 'from-[#056952] to-[#023529]' },
                { label: 'Workout & Energy', color: 'from-[#777777] to-[#383838]' },
              ].map(cat => (
                <div
                  key={cat.label}
                  onClick={() => setSearchQuery(cat.label)}
                  className={`p-5 rounded-xl bg-gradient-to-br ${cat.color} cursor-pointer hover:scale-102 active:scale-98 transition-all duration-300 shadow-lg min-h-[110px] flex flex-col justify-between`}
                >
                  <h4 className="font-extrabold text-base sm:text-lg text-white">{cat.label}</h4>
                  <span className="text-[11px] text-white/70 font-semibold">Explore →</span>
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
              <div className="bg-[#181818] p-3 rounded-xl border border-white/5 space-y-1">
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

      {/* Global Apple/Tidal Styled Footer */}
      <AppFooter onNavigate={onNavigate} />
    </div>
  );
}
