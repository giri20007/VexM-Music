import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Menu, Shield, LogOut, Sliders, Volume2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export function Header({ title = 'Home', currentRoute = 'home', onToggleMobileNav, onNavigate }) {
  const setSearchModalOpen = useAudioStore(s => s.setSearchModalOpen);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const audioQuality = useSettingsStore(s => s.audioQuality);
  const setAudioQuality = useSettingsStore(s => s.setAudioQuality);

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
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2.5 sm:gap-4 px-4 sm:px-8 py-3 bg-[#0a0b12]/80 backdrop-blur-2xl border-b border-white/[0.06] select-none font-sans">
      {/* Left: Mobile Menu button + Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition flex items-center justify-center min-w-[38px] min-h-[38px]"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white capitalize truncate max-w-[140px] sm:max-w-none">
          {title}
        </h1>
      </div>

      {/* Center: Global Search Bar (Desktop only, hidden on search page) */}
      <div className={`hidden md:flex flex-1 max-w-md mx-2 min-w-0 ${currentRoute === 'search' ? 'invisible pointer-events-none' : ''}`}>
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/40 hover:text-white/70 transition text-left group shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-white/40 group-hover:text-white transition-colors flex-shrink-0" />
            <span className="truncate text-xs">
              Search songs, artists, albums...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-white/40 font-mono flex-shrink-0">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right: Admin Mode Badge & User Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 relative flex-shrink-0" ref={menuRef}>
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition"
            title="Open Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5 text-[#fa2d48]" />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="group flex items-center gap-1.5 p-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition shadow-sm"
          title={`Signed in as ${user?.displayName || user?.username || 'Listener'}`}
          aria-label="Account menu"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-white font-bold text-xs">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.displayName?.[0] || user?.username?.[0] || 'U').toUpperCase()}</span>
            )}
          </div>
        </button>

        {/* User Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-12 w-64 rounded-2xl bg-[#11131e]/95 backdrop-blur-2xl border border-white/10 p-2 shadow-2xl space-y-1.5 animate-scale-up z-50">
            {/* Header / User Badge */}
            <div className="px-3 py-2 rounded-xl bg-white/5 space-y-0.5">
              <p className="text-xs font-bold text-white truncate">
                {user?.displayName || user?.username}
              </p>
              <p className="text-[11px] text-white/40 truncate">
                @{user?.username || 'listener'}
              </p>
            </div>

            {/* Quick Settings: Audio Quality */}
            <div className="px-3 py-2 space-y-1 border-b border-white/5">
              <span className="text-[11px] font-semibold text-white/50">Streaming Quality</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => setAudioQuality('high')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                    audioQuality === 'high'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Hi-Res
                </button>
                <button
                  onClick={() => setAudioQuality('standard')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-bold transition ${
                    audioQuality === 'standard'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  Standard
                </button>
              </div>
            </div>

            {/* Action Links */}
            <div className="space-y-0.5 pt-0.5">
              {isAdmin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('admin');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition text-left"
                >
                  <Shield className="w-4 h-4 text-[#fa2d48]" />
                  <span>Admin Dashboard</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition text-left"
              >
                <Sliders className="w-4 h-4" />
                <span>Settings</span>
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
