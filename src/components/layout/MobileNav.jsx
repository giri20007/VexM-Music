import React from 'react';
import { Home, Search, Library, Users, Disc3, Play, Pause, SkipForward, SkipBack, Music2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';

export function MobileNav({ currentRoute, onNavigate }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const next = useAudioStore(s => s.next);
  const prev = useAudioStore(s => s.prev);
  const setNowPlayingOpen = useAudioStore(s => s.setNowPlayingOpen);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'albums', label: 'Albums', icon: Disc3 },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'library', label: 'Library', icon: Library },
  ];

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/98 backdrop-blur-xl border-t border-white/10 select-none pb-[env(safe-area-inset-bottom,0px)]">
      {/* Mobile Mini-Player Bar (shown when track is loaded) */}
      {currentTrack && (
        <div
          onClick={() => setNowPlayingOpen(true)}
          className="relative flex items-center justify-between px-3.5 py-2.5 bg-bg-card/90 border-b border-white/5 cursor-pointer shadow-lg"
        >
          {/* Top Progress Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-secondary flex-shrink-0 border border-white/10 shadow-md">
              <img
                src={getArtworkSrc(currentTrack, 120)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-warm-white leading-tight">
                {currentTrack.title}
              </p>
              <p className="truncate text-[11px] text-warm-muted leading-tight mt-0.5">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={e => {
                e.stopPropagation();
                prev();
              }}
              className="w-9 h-9 flex items-center justify-center text-warm-muted hover:text-white rounded-full transition active:scale-95"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={e => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-10 h-10 rounded-full bg-[#fa2d48] text-white flex items-center justify-center shadow-md shadow-[#fa2d48]/25 active:scale-90 transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            <button
              onClick={e => {
                e.stopPropagation();
                next();
              }}
              className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-full transition active:scale-95"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-around py-1.5 px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.id ||
            currentRoute.startsWith(`${item.id}:`) ||
            (item.id === 'library' && (currentRoute === 'liked' || currentRoute.startsWith('playlist:')));
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[10px] font-bold transition ${
                isActive ? 'text-[#fa2d48]' : 'text-white/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
