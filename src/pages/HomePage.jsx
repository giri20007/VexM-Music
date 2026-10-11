import React, { useState } from 'react';
import { Play, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackCard } from '../components/library/TrackCard';
import { TrackRow } from '../components/library/TrackRow';
import { AlbumCard } from '../components/library/AlbumCard';
import { ArtistCard } from '../components/library/ArtistCard';
import { SafeImage } from '../components/ui/SafeImage';
import { getArtworkSrc, getTrackArtworkUrl } from '../utils/artworkGenerator';

export function HomePage({ lib, onNavigate }) {
  const recentlyPlayed = useAudioStore(s => s.recentlyPlayed);
  const playTrack = useAudioStore(s => s.playTrack);
  const [heroImgErr, setHeroImgErr] = useState(false);

  const items = lib.allItems || [];
  const newestTrack = items[0] || null;
  const recentlyAdded = items.slice(0, 10);
  const jumpBackInList = recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 6) : items.slice(0, 6);

  const handlePlayAllRecentlyAdded = () => {
    if (recentlyAdded.length > 0) {
      playTrack(recentlyAdded[0], recentlyAdded);
    }
  };

  const heroCover = (!heroImgErr && newestTrack) ? getArtworkSrc(newestTrack) : (newestTrack ? getTrackArtworkUrl(newestTrack, 800) : null);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-8 select-none">
      {/* Loading & Sleeping Backend Wakeup Banner */}
      {lib.state === 'connecting' && (
        <div className="p-4 rounded-2xl bg-bg-card border border-accent/20 flex items-center justify-between text-xs text-warm-muted animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 animate-spin text-accent" />
            <span>
              {lib.retry ? `Waking up Render backend (attempt ${lib.retry}/3)...` : 'Connecting to SPiDEYxFLASH Telegram library...'}
            </span>
          </div>
        </div>
      )}

      {lib.state === 'error' && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-warm-white flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-300">Connection issue</p>
            <p className="text-warm-muted mt-0.5">{lib.error}</p>
          </div>
          <button
            onClick={lib.refresh}
            className="px-4 py-1.5 rounded-full bg-white text-bg-primary font-bold text-xs hover:bg-white/90 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. JUMP BACK IN SECTION (Matches Screenshot 3: 2x3 Grid) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-warm-white">
            Jump back in
          </h2>
          <button
            onClick={() => onNavigate('library')}
            className="flex items-center gap-1 text-xs font-semibold text-warm-muted hover:text-accent transition"
          >
            <span>More</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {jumpBackInList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jumpBackInList.map((t, idx) => (
              <TrackCard key={`${t.id}_${idx}`} track={t} />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-bg-card text-center text-xs text-warm-muted border border-white/5">
            Play some music to see your recent tracks here.
          </div>
        )}
      </section>

      {/* 2. DUAL SPLIT: NEWEST ADDITION (Hero Card) + RECENTLY ADDED */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Newest Addition Hero Card (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-lg font-bold tracking-tight text-warm-white">
            Newest addition
          </h3>

          {newestTrack ? (
            <div
              onClick={() => playTrack(newestTrack)}
              className="group relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-bg-card border border-white/10 shadow-2xl cursor-pointer"
            >
              {/* Image */}
              <SafeImage
                src={heroCover}
                track={newestTrack}
                alt={newestTrack.title}
                size={600}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-between p-6">
                {/* Top Badge: "Just added" */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-accent">
                    <Clock className="w-3 h-3" />
                    <span>Just added</span>
                  </span>
                </div>

                {/* Bottom Title & Play Button */}
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                      {newestTrack.title}
                    </h4>
                    <p className="text-xs sm:text-sm font-medium text-warm-muted truncate mt-0.5">
                      {newestTrack.artist}
                    </p>
                  </div>

                  {/* Circular Coral Pink Play Button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      playTrack(newestTrack);
                    }}
                    className="w-13 h-13 rounded-full bg-accent text-bg-primary flex items-center justify-center shadow-xl shadow-accent/30 hover:scale-110 active:scale-95 transition-all flex-shrink-0"
                    aria-label={`Play ${newestTrack.title}`}
                  >
                    <Play className="w-6 h-6 fill-bg-primary stroke-bg-primary ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-3xl bg-bg-card border border-white/5 flex items-center justify-center text-xs text-warm-muted">
              Syncing library...
            </div>
          )}
        </div>

        {/* Right: Recently Added Numbered List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-warm-white">
                Recently added
              </h3>
              <p className="text-xs text-warm-muted">
                {lib.total.toLocaleString()} in the library
              </p>
            </div>

            <button
              onClick={handlePlayAllRecentlyAdded}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-accent transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play all</span>
            </button>
          </div>

          <div className="space-y-1 bg-bg-secondary/40 p-2 rounded-2xl border border-white/5">
            {recentlyAdded.map((t, idx) => (
              <TrackRow
                key={`${t.id}_${idx}`}
                track={t}
                index={idx}
                showNumber={true}
                showCover={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. DISCOVER ALBUMS */}
      {lib.albums.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-warm-white">
              Featured Albums
            </h2>
            <button
              onClick={() => onNavigate('albums')}
              className="text-xs font-semibold text-warm-muted hover:text-accent transition"
            >
              See all ({lib.albums.length})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {lib.albums.slice(0, 6).map(album => (
              <AlbumCard
                key={album.name}
                album={album}
                onClick={() => onNavigate(`album:${album.name}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. DISCOVER ARTISTS */}
      {lib.artists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-warm-white">
              Popular Artists
            </h2>
            <button
              onClick={() => onNavigate('artists')}
              className="text-xs font-semibold text-warm-muted hover:text-accent transition"
            >
              See all ({lib.artists.length})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {lib.artists.slice(0, 6).map(artist => (
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
  );
}
