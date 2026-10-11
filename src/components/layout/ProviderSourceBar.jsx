import React from 'react';
import { Sparkles, Radio, Play, Cloud, Disc3, ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export const PROVIDER_SOURCES = [
  {
    id: 'all',
    label: 'All Sources',
    shortLabel: 'All',
    tag: 'Unified',
    desc: 'Smart 320k Studio + YouTube + OwnTg',
    icon: Sparkles,
    color: 'text-white',
    activeBg: 'bg-white text-black font-black',
  },
  {
    id: 'saavn',
    label: 'JioSaavn',
    shortLabel: 'JioSaavn',
    tag: '320k Studio',
    desc: 'Crystal-clear 320 kbps AAC bit-perfect audio',
    icon: Disc3,
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/25',
  },
  {
    id: 'youtube',
    label: 'YouTube Music',
    shortLabel: 'YouTube',
    tag: 'Global',
    desc: 'Worldwide catalogue, indie, live concerts & singles',
    icon: Play,
    color: 'text-red-400',
    activeBg: 'bg-red-500 text-white font-black shadow-lg shadow-red-500/25',
  },
  {
    id: 'owntg',
    label: 'OwnTg Cloud',
    shortLabel: 'OwnTg',
    tag: 'Personal BIN',
    desc: 'Telegram storage vault for custom files and uploads',
    icon: Cloud,
    color: 'text-sky-400',
    activeBg: 'bg-sky-500 text-black font-black shadow-lg shadow-sky-500/25',
  },
];

export function ProviderSourceBar({ compact = false, className = '', onSourceChange }) {
  const providerSource = useSettingsStore(s => s.providerSource) || 'all';
  const setProviderSource = useSettingsStore(s => s.setProviderSource);

  const handleSelect = id => {
    setProviderSource(id);
    onSourceChange?.(id);
  };

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none ${className}`}>
      {PROVIDER_SOURCES.map(src => {
        const Icon = src.icon;
        const isActive = providerSource === src.id;

        return (
          <button
            key={src.id}
            onClick={() => handleSelect(src.id)}
            className={`group flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border text-xs transition-all duration-200 active:scale-95 whitespace-nowrap ${
              isActive
                ? `${src.activeBg} border-transparent`
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-white/70 hover:text-white'
            }`}
            title={src.desc}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : src.color}`} />
            <span className="font-semibold">{compact ? src.shortLabel : src.label}</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                isActive
                  ? 'bg-black/25 text-current'
                  : 'bg-white/10 text-white/50 group-hover:text-white/80'
              }`}
            >
              {src.tag}
            </span>
          </button>
        );
      })}
    </div>
  );
}
