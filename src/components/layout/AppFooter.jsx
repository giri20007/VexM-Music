import React from 'react';
import {
  Music2,
  Globe,
  Radio,
  Disc3,
  Cloud,
  Play,
  ShieldCheck,
  Headphones,
  Sliders,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { MUSIC_LANGUAGES } from '../modals/LanguagePreferenceModal';

export function AppFooter({ onNavigate, onOpenLanguageModal, className = '' }) {
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage) || 'tamil';
  const langConfig = MUSIC_LANGUAGES.find(l => l.id === preferredLanguage) || MUSIC_LANGUAGES[0];

  return (
    <footer className={`w-full mt-16 pt-12 pb-16 border-t border-white/[0.08] bg-[#050505] text-white select-none ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        {/* Top Section: Brand + Multi-Engine Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Col 1 & 2: Vex-M Identity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fa2d48] to-[#ff6b81] flex items-center justify-center text-white shadow-xl shadow-[#fa2d48]/25">
                <Music2 className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  Vex<span className="text-[#fa2d48]">-</span>M
                </span>
                <p className="text-[11px] text-[#8e8e93] font-medium">Ultra High-Fidelity Multi-Source Player</p>
              </div>
            </div>

            <p className="text-xs text-[#8e8e93] leading-relaxed max-w-sm">
              Experience studio master audio streaming with JioSaavn 320 kbps bit-perfect playback, YouTube Music catalog companion, and your personal OwnTg Telegram cloud storage vault.
            </p>

            {/* Source Status Badges */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                JioSaavn 320k Studio
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                YouTube Music HQ
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-[10px] font-bold text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                OwnTg Telegram Cloud
              </span>
            </div>
          </div>

          {/* Col 3: Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">Explore</h4>
            <ul className="space-y-2 text-xs text-[#8e8e93]">
              <li>
                <button onClick={() => onNavigate?.('home')} className="hover:text-white transition">
                  New & Featured
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('search')} className="hover:text-white transition">
                  Search Catalogue
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('albums')} className="hover:text-white transition">
                  Albums & Soundtracks
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('artists')} className="hover:text-white transition">
                  Artists & Groups
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Audio Engine Tech */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">Audio Fidelity</h4>
            <ul className="space-y-2 text-xs text-[#8e8e93]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                <span>320 kbps AAC Studio Master</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                <span>10-Band WebAudio EQ</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                <span>Zero Latency Hardware Direct</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fa2d48]" />
                <span>Lossless FLAC Compatible</span>
              </li>
            </ul>
          </div>

          {/* Col 5: Your Vault */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">Your Vault</h4>
            <ul className="space-y-2 text-xs text-[#8e8e93]">
              <li>
                <button onClick={() => onNavigate?.('library')} className="hover:text-white transition">
                  Library & OwnTg BIN
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('liked')} className="hover:text-white transition">
                  Favorite Tracks
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('settings:audio')} className="hover:text-white transition">
                  Equalizer & Quality
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('settings')} className="hover:text-white transition">
                  Preferences & Themes
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Language Pill + Copyright */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#8e8e93]">
          <div className="flex items-center gap-3">
            {onOpenLanguageModal && (
              <button
                onClick={onOpenLanguageModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-xs font-semibold text-white transition active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-[#fa2d48]" />
                <span>Music Language: {langConfig.name}</span>
                <span className="text-[10px] text-[#8e8e93]">({langConfig.native})</span>
              </button>
            )}

            <span className="hidden sm:inline-block text-white/20">|</span>
            <span className="text-[11px] text-[#8e8e93]">Dual-Engine Powered: JioSaavn & YouTube Music</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#8e8e93]">
            <span>© 2026 Vex-M. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
