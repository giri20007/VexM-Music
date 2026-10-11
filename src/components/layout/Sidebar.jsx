import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  Disc3,
  Users,
  Heart,
  Plus,
  Settings,
  Shield,
  Music2,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  LogOut,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { useAuthStore } from '../../store/useAuthStore';

export function Sidebar({ currentRoute, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const playlists = useAudioStore(s => s.playlists);
  const createPlaylist = useAudioStore(s => s.createPlaylist);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const handleCreatePlaylist = e => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'albums', label: 'Albums', icon: Disc3 },
    { id: 'artists', label: 'Artists', icon: Users },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 bg-[#0c0d15]/80 backdrop-blur-2xl border-r border-white/[0.06] transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#fa2d48] flex items-center justify-center text-white shadow-lg shadow-[#fa2d48]/20 flex-shrink-0">
            <Music2 className="w-4 h-4 fill-white stroke-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-black tracking-tight text-white">
              Vex<span className="text-[#fa2d48]">-</span>M
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Nav Links */}
      <nav className="px-3 space-y-1 mt-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#fa2d48]' : 'text-white/60'}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="my-4 mx-4 border-t border-white/[0.08]" />

      {/* Your Library Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 no-scrollbar">
        {!collapsed && (
          <div className="flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-wider text-white/40">
            <span>Playlists</span>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="p-1 rounded-md hover:bg-white/5 hover:text-white transition"
              title="Create playlist"
              aria-label="Create playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Liked Songs Entry */}
        <button
          onClick={() => onNavigate('liked')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all duration-150 ${
            currentRoute === 'liked'
              ? 'bg-white/10 text-white font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
          }`}
          title={collapsed ? 'Liked songs' : undefined}
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#fa2d48] to-[#670014] flex items-center justify-center text-white flex-shrink-0">
            <Heart className="w-3.5 h-3.5 fill-white stroke-white" />
          </div>
          {!collapsed && <span className="truncate">Liked Songs</span>}
        </button>

        {/* Create playlist input */}
        {isCreatingPlaylist && !collapsed && (
          <form onSubmit={handleCreatePlaylist} className="px-2 py-1">
            <input
              type="text"
              autoFocus
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onBlur={() => {
                if (!newPlaylistName.trim()) setIsCreatingPlaylist(false);
              }}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#fa2d48]"
            />
          </form>
        )}

        {/* User Playlists */}
        {!collapsed && playlists.length > 1 && (
          <div className="space-y-0.5 pt-1">
            {playlists
              .filter(p => p.id !== 'favorites')
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => onNavigate(`playlist:${p.id}`)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    currentRoute === `playlist:${p.id}`
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Section: Settings & User Profile */}
      <div className="p-3 border-t border-white/[0.08] space-y-1">
        {user?.isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              currentRoute === 'admin'
                ? 'bg-[#fa2d48] text-white shadow-md'
                : 'text-white/70 hover:bg-white/5'
            }`}
            title={collapsed ? 'Admin Dashboard' : undefined}
          >
            <Shield className="w-4 h-4 flex-shrink-0 text-[#fa2d48]" />
            {!collapsed && <span>Admin Dashboard</span>}
          </button>
        )}

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            currentRoute.startsWith('settings')
              ? 'bg-white/10 text-white font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        {!collapsed && user && (
          <div className="pt-2 mt-1 border-t border-white/5 flex items-center justify-between px-2 text-xs">
            <span className="truncate text-[11px] text-white/50 font-medium">
              {user.displayName || user.username || 'Listener'}
            </span>
            <button
              onClick={logout}
              className="p-1 rounded text-white/40 hover:text-red-400 transition"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
