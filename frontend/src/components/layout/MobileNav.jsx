import React from 'react';
import { Home, Search, Library, Settings, Play, Pause, Music2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { artworkUrl } from '../../utils/api';

export function MobileNav({ currentRoute, onNavigate }) {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const togglePlay = useAudioStore(s => s.togglePlay);
  const setNowPlayingOpen = useAudioStore(s => s.setNowPlayingOpen);

  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-lg border-t border-white/5 select-none">
      {/* Mobile Mini-Player bar above navigation (when track is loaded) */}
      {currentTrack && (
        <div
          onClick={() => setNowPlayingOpen(true)}
          className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-bg-card/80 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-active flex-shrink-0">
              <img
                src={currentTrack.thumbnail || artworkUrl(currentTrack.id, currentTrack.title)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-warm-white">{currentTrack.title}</p>
              <p className="truncate text-[10px] text-warm-muted">{currentTrack.artist}</p>
            </div>
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-8 h-8 rounded-full bg-accent text-bg-primary flex items-center justify-center flex-shrink-0 shadow-md ml-2"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-bg-primary stroke-bg-primary" />
            ) : (
              <Play className="w-4 h-4 fill-bg-primary stroke-bg-primary ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-around py-2 px-1">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute.startsWith(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition ${
                isActive ? 'text-accent' : 'text-warm-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
