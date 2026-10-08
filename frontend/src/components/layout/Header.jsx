import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Menu, Shield, LogOut, Sparkles } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';

export function Header({ title = 'Home', onToggleMobileNav, onNavigate }) {
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-3.5 bg-bg-primary/95 backdrop-blur-md border-b border-white/5 select-none font-sans">
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

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-bg-card hover:bg-bg-cardHover border border-white/5 text-warm-muted transition text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-warm-muted group-hover:text-warm-white transition-colors" />
            <span className="truncate text-xs sm:text-sm text-warm-muted/80 group-hover:text-warm-muted">
              Search tracks, albums, artists...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-black/40 border border-white/10 text-warm-muted/80 font-mono">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right: Admin Mode Badge & User Profile Dropdown */}
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-black text-xs shadow-md shadow-accent/20 hover:scale-105 transition"
            title="Open Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5 fill-accent/30" />
            <span>Admin Mode</span>
          </button>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="group flex items-center gap-2 p-1 rounded-full bg-bg-card hover:bg-bg-active border border-white/5 transition"
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

        {/* User Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-12 w-56 rounded-2xl bg-bg-secondary border border-white/10 p-2 shadow-2xl space-y-1 animate-fade-in z-50">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-bold text-warm-white truncate">
                {user?.displayName || user?.username}
              </p>
              <p className="text-[11px] text-warm-muted truncate">
                @{user?.username || 'listener'}
              </p>
              {isAdmin && (
                <span className="inline-block mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent">
                  Administrator
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('admin');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-accent hover:bg-accent/10 transition text-left"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigate('settings');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-warm-muted hover:text-warm-white hover:bg-white/5 transition text-left"
            >
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
