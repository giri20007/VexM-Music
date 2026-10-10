import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Menu, Shield, LogOut, Sparkles, Sliders, Volume2, Sun, Moon } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export function Header({ title = 'Home', onToggleMobileNav, onNavigate }) {
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const audioQuality = useSettingsStore(s => s.audioQuality);
  const setAudioQuality = useSettingsStore(s => s.setAudioQuality);
  const theme = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutKey = isMac ? '⌘K' : 'ctrl k';

  const isAdmin = user?.isAdmin || user?.role === 'ADMIN' || user?.username?.toLowerCase() === 'spidey';

  useEffect(() => {
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2.5 sm:gap-4 px-3.5 sm:px-6 py-3 bg-bg-primary/95 backdrop-blur-xl border-b border-white/5 select-none font-sans">
      {/* Left: Mobile Menu button + Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-xl bg-bg-card hover:bg-bg-cardHover text-warm-muted hover:text-white border border-white/5 transition flex items-center justify-center min-w-[38px] min-h-[38px] pointer-events-auto"
          aria-label="Toggle navigation menu"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg sm:text-xl font-black tracking-tight text-warm-white capitalize truncate max-w-[140px] sm:max-w-none">
          {title}
        </h1>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-1 sm:mx-2 min-w-0">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-bg-card hover:bg-bg-cardHover border border-white/5 text-warm-muted transition text-left group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-warm-muted group-hover:text-warm-white transition-colors flex-shrink-0" />
            <span className="truncate text-xs text-warm-muted/80 group-hover:text-warm-white">
              Search tracks, artists, albums...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/40 border border-white/10 text-warm-muted/80 font-mono flex-shrink-0">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right: Admin Mode Badge & User Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 relative flex-shrink-0" ref={menuRef}>
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-black text-xs shadow-md shadow-accent/20 hover:scale-105 transition"
            title="Open Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5 fill-accent/30" />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="group flex items-center gap-1.5 p-1 rounded-full bg-bg-card hover:bg-bg-active border border-white/10 transition shadow-sm pointer-events-auto"
          title={`Signed in as ${user?.displayName || user?.username || 'Listener'}`}
          aria-label="Account menu"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-accent/30 to-fuchsia-600/30 flex items-center justify-center border border-white/10 text-accent group-hover:scale-105 transition font-bold text-xs">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.displayName?.[0] || user?.username?.[0] || 'U').toUpperCase()}</span>
            )}
          </div>
        </button>

        {/* User Dropdown Menu with Quick Settings */}
        {menuOpen && (
          <div className="absolute right-0 top-12 w-64 rounded-3xl bg-bg-secondary border border-white/10 p-2.5 shadow-2xl space-y-2 animate-scale-up z-50">
            {/* Header / User Badge */}
            <div className="px-3 py-2.5 rounded-2xl bg-bg-card/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-warm-white truncate">
                  {user?.displayName || user?.username}
                </p>
                {isAdmin ? (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/25 border border-accent/40 text-accent shadow-xs">
                    Admin
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-warm-muted">
                    Listener
                  </span>
                )}
              </div>
              <p className="text-[11px] text-warm-muted truncate">
                @{user?.username || 'listener'}
              </p>
            </div>

            {/* Quick Settings: Audio Quality */}
            <div className="px-3 py-2 space-y-1.5 border-b border-white/5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-warm-muted">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-accent" />
                  <span>Streaming Quality</span>
                </span>
                <span className="text-warm-white font-bold uppercase text-[10px] text-accent">
                  {audioQuality === 'high' ? 'FLAC (Hi-Res)' : '320kbps'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => setAudioQuality('high')}
                  className={`py-1 px-2 rounded-xl text-[10px] font-bold transition ${
                    audioQuality === 'high'
                      ? 'bg-accent text-bg-primary shadow'
                      : 'bg-white/5 text-warm-muted hover:text-white'
                  }`}
                >
                  Hi-Res FLAC
                </button>
                <button
                  onClick={() => setAudioQuality('standard')}
                  className={`py-1 px-2 rounded-xl text-[10px] font-bold transition ${
                    audioQuality === 'standard'
                      ? 'bg-accent text-bg-primary shadow'
                      : 'bg-white/5 text-warm-muted hover:text-white'
                  }`}
                >
                  320k MP3
                </button>
              </div>
            </div>

            {/* Action Links */}
            <div className="space-y-1 pt-0.5">
              {isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('admin');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-accent hover:bg-accent/15 transition text-left"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-warm-muted hover:text-warm-white hover:bg-white/5 transition text-left"
              >
                <Sliders className="w-4 h-4" />
                <span>Audio & App Settings</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
