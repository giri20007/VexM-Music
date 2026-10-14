import React, { useState } from 'react';
import { Check, Globe, Sparkles, X } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export const MUSIC_LANGUAGES = [
  {
    id: 'tamil',
    name: 'Tamil',
    native: 'தமிழ்',
    subtitle: 'Kollywood, Anirudh, AR Rahman, Yuvan',
    query: 'Latest Tamil Songs 2026 Hits Anirudh Rahman',
    color: 'from-amber-500/20 to-red-500/20',
  },
  {
    id: 'english',
    name: 'English',
    native: 'English',
    subtitle: 'Global Hits, Pop, Hip-Hop, Billboard Hot 100',
    query: 'Billboard Hot 100 Today Hits Global 2026',
    color: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 'hindi',
    name: 'Hindi',
    native: 'हिंदी',
    subtitle: 'Bollywood, Arijit Singh, Badshah, Pritam',
    query: 'Latest Hindi Songs 2026 Bollywood Chartbusters',
    color: 'from-orange-500/20 to-rose-500/20',
  },
  {
    id: 'telugu',
    name: 'Telugu',
    native: 'తెలుగు',
    subtitle: 'Tollywood, Thaman S, Devi Sri Prasad',
    query: 'Latest Telugu Songs 2026 Tollywood Hits',
    color: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    id: 'malayalam',
    name: 'Malayalam',
    native: 'മലയാളം',
    subtitle: 'Mollywood, Sushin Shyam, Jakes Bejoy',
    query: 'Latest Malayalam Songs 2026 Mollywood Hits',
    color: 'from-cyan-500/20 to-blue-500/20',
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    native: 'ਪੰਜਾਬੀ',
    subtitle: 'Sidhu Moosewala, Diljit Dosanjh, AP Dhillon',
    query: 'Latest Punjabi Songs 2026 Chartbusters',
    color: 'from-yellow-500/20 to-amber-500/20',
  },
  {
    id: 'kpop',
    name: 'K-Pop',
    native: '한국어',
    subtitle: 'BTS, BLACKPINK, NewJeans, Stray Kids',
    query: 'Top K-Pop Songs 2026 Hits Global',
    color: 'from-fuchsia-500/20 to-pink-500/20',
  },
  {
    id: 'spanish',
    name: 'Spanish',
    native: 'Español',
    subtitle: 'Latin, Reggaeton, Bad Bunny, Rosalía',
    query: 'Top Latin Reggaeton Hits 2026',
    color: 'from-red-500/20 to-orange-500/20',
  },
];

export function LanguagePreferenceModal({ isOpen, onClose, onLanguageChange }) {
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage);
  const setPreferredLanguage = useSettingsStore(s => s.setPreferredLanguage);

  const [selected, setSelected] = useState(preferredLanguage || 'tamil');

  if (!isOpen) return null;

  const handleSave = () => {
    setPreferredLanguage(selected);
    try {
      localStorage.setItem('vexm_preferred_language', selected);
    } catch {}
    if (onLanguageChange) {
      onLanguageChange(selected);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#111622] border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/[0.08] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#00a8e1] text-xs font-bold tracking-wider uppercase">
              <Globe className="w-4 h-4" />
              <span>Music Preferences</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Choose Your Music Language
            </h2>
            <p className="text-xs sm:text-sm text-[#8e8e93]">
              We'll curate your home page, trending charts, and new releases to match your taste.
            </p>
          </div>

          {preferredLanguage && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Language Grid */}
        <div className="p-6 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MUSIC_LANGUAGES.map(lang => {
            const isSelected = selected === lang.id;
            return (
              <div
                key={lang.id}
                onClick={() => setSelected(lang.id)}
                className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#00a8e1]/15 border-[#00a8e1] shadow-lg shadow-[#00a8e1]/20'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {lang.name}
                    </span>
                    <span className="text-xs text-[#a1a1a6] font-medium">
                      ({lang.native})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8e8e93] truncate mt-0.5">
                    {lang.subtitle}
                  </p>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#00a8e1] text-black font-bold scale-100 shadow-md'
                      : 'border border-white/20 group-hover:border-white/40 scale-90 opacity-60'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Submit Button */}
        <div className="p-5 border-t border-white/[0.08] bg-black/40 flex items-center justify-between gap-4">
          <p className="text-[11px] text-[#8e8e93]">
            You can change this anytime from the top bar.
          </p>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full bg-[#00a8e1] hover:bg-[#22d3ee] text-black font-bold text-xs sm:text-sm shadow-xl shadow-[#00a8e1]/30 transition hover:scale-105 active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
