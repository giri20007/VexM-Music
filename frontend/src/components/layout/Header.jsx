import React from 'react';
import { Search, User, Menu, Bell } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export function Header({ title = 'Home', onToggleMobileNav, onNavigate }) {
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const account = useSettingsStore(s => s.account);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutKey = isMac ? '⌘K' : 'ctrl k';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-3.5 bg-bg-primary/95 backdrop-blur-md border-b border-white/5 select-none">
      {/* Left: Mobile Menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-xl bg-bg-card text-warm-muted hover:text-white"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-bold tracking-tight text-warm-white capitalize">
          {title}
        </h1>
      </div>

      {/* Center: Global Search Bar (opens Ctrl+K command modal) */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-bg-card hover:bg-bg-cardHover border border-white/5 text-warm-muted transition text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-warm-muted group-hover:text-warm-white transition-colors" />
            <span className="truncate text-xs sm:text-sm text-warm-muted/80 group-hover:text-warm-muted">
              Search tracks, albums, artists
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-black/40 border border-white/10 text-warm-muted/80">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right: User Avatar / Account Button */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onNavigate('settings:account')}
          className="group flex items-center gap-2.5 p-1 rounded-full bg-bg-card hover:bg-bg-active border border-white/5 transition"
          title={`Signed in as ${account.username}`}
          aria-label="Account settings"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[#38231a] to-accent/30 flex items-center justify-center border border-white/10 text-accent group-hover:scale-105 transition">
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={account.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
