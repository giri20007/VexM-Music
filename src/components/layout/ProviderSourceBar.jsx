import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

export const PROVIDER_SOURCES = [
  { id: 'all', label: 'All Sources', shortLabel: 'All' },
  { id: 'saavn', label: 'JioSaavn', shortLabel: 'JioSaavn' },
  { id: 'youtube', label: 'YouTube Music', shortLabel: 'YouTube' },
  { id: 'owntg', label: 'Telegram Storage', shortLabel: 'Telegram' },
];

export function ProviderSourceBar({ compact = false, className = '', onSourceChange }) {
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';
  const setProviderSource = useSettingsStore(s => s.setProviderSource);

  const handleSelect = id => {
    setProviderSource(id);
    onSourceChange?.(id);
  };

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none ${className}`}>
      {PROVIDER_SOURCES.map(src => {
        const isActive = providerSource === src.id;

        return (
          <button
            key={src.id}
            onClick={() => handleSelect(src.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'bg-white text-black font-bold'
                : 'bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white'
            }`}
          >
            {compact ? src.shortLabel : src.label}
          </button>
        );
      })}
    </div>
  );
}
