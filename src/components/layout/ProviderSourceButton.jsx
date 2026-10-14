import React, { useState, useRef, useEffect } from 'react';
import { Layers, Music2, Play, Cloud, ChevronDown, Check } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export const PROVIDER_SOURCES = [
  { id: 'all', label: 'All Sources', shortLabel: 'All Sources', desc: 'Combined catalog', icon: Layers },
  { id: 'saavn', label: 'JioSaavn', shortLabel: 'JioSaavn', desc: '320 kbps audio', icon: Music2 },
  { id: 'youtube', label: 'YouTube Music', shortLabel: 'YouTube', desc: 'Global streams', icon: Play },
  { id: 'owntg', label: 'Telegram Cloud', shortLabel: 'Telegram', desc: 'Personal storage', icon: Cloud },
];

export function ProviderSourceButton({ compact = false, className = '', onSourceChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const providerSource = useSettingsStore(s => s.providerSource) || 'all';
  const setProviderSource = useSettingsStore(s => s.setProviderSource);

  const currentSource = PROVIDER_SOURCES.find(s => s.id === providerSource) || PROVIDER_SOURCES[0];
  const CurrentIcon = currentSource.icon;

  useEffect(() => {
    const handleClickOutside = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = id => {
    setProviderSource(id);
    onSourceChange?.(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block select-none ${className}`} ref={containerRef}>
      {/* Single Pill Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181818] hover:bg-[#222222] border border-white/10 text-xs font-semibold text-white transition active:scale-95 group shadow-sm"
        title="Select music source engine"
        aria-label="Select audio provider source"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-3.5 h-3.5 text-[#00a8e1] flex-shrink-0" />
        <span className="truncate max-w-[90px] sm:max-w-none">
          {compact ? currentSource.shortLabel : currentSource.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Sleek Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#111622] border border-white/[0.08] p-1.5 shadow-2xl z-50 animate-scale-up backdrop-blur-xl">
          <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-white/40 border-b border-white/[0.06] mb-1">
            Audio Source
          </div>

          <div className="space-y-0.5">
            {PROVIDER_SOURCES.map(src => {
              const Icon = src.icon;
              const isSelected = providerSource === src.id;

              return (
                <button
                  key={src.id}
                  onClick={() => handleSelect(src.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors group ${
                    isSelected
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#00a8e1] text-black font-bold'
                          : 'bg-white/5 text-white/50 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{src.label}</p>
                      <p className="truncate text-[10px] text-white/40 font-normal">{src.desc}</p>
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00a8e1] flex-shrink-0 ml-2 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Backwards-compatibility alias so any existing imports continue working smoothly
export { ProviderSourceButton as ProviderSourceBar };
