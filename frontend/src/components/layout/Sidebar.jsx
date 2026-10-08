import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  Disc3,
  Users,
  Clock,
  Heart,
  Plus,
  Settings,
  Shield,
  Music2,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  LogOut,
  Sparkles,
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
    { id: 'library', label: 'Library', icon: Library },
    { id: 'recaps', label: 'Recaps', icon: Clock },
    { id: 'albums', label: 'Albums', icon: Disc3 },
    { id: 'artists', label: 'Artists', icon: Users },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 bg-bg-secondary border-r border-white/5 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div
          onClick={() => onNavigate('home')}
          className="brand-neon-container flex items-center gap-3 cursor-pointer group"
        >
          <div className="brand-icon-box w-9 h-9 rounded-xl flex items-center justify-center text-bg-primary flex-shrink-0">
            <Music2 className="w-5 h-5 fill-bg-primary stroke-bg-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="brand-text-neon text-base tracking-tight select-none">
                  SPiDEY<span className="brand-x-neon">x</span>FLASH
                </span>
                {user?.isAdmin ? (
                  <span className="brand-tag-neon text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/25 border border-accent/40 text-accent">
                    ADMIN
                  </span>
                ) : (
                  <span className="brand-tag-neon text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                    PRO
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-warm-muted hover:text-warm-white hover:bg-white/5 transition"
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
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-bg-active text-accent font-semibold shadow-inner'
                  : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="my-4 mx-4 border-t border-white/5" />

      {/* Your Library Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 no-scrollbar">
        {!collapsed && (
          <div className="flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-warm-muted/80">
            <span>Your library</span>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              className="p-1 rounded-md hover:bg-white/5 hover:text-warm-white transition"
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
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
            currentRoute === 'liked'
              ? 'bg-bg-active text-warm-white font-semibold'
              : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
          }`}
          title={collapsed ? 'Liked songs' : undefined}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#e11d48] flex items-center justify-center text-bg-primary shadow-sm flex-shrink-0">
            <Heart className="w-4 h-4 fill-bg-primary stroke-bg-primary" />
          </div>
          {!collapsed && (
            <div className="text-left min-w-0 flex-1">
              <p className="truncate font-medium text-xs text-warm-white">Liked songs</p>
              <p className="truncate text-[11px] text-warm-muted">{likedTrackIds.length} tracks</p>
            </div>
          )}
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
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-bg-card border border-accent/40 text-warm-white placeholder:text-warm-muted/60 focus:outline-none"
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition ${
                    currentRoute === `playlist:${p.id}`
                      ? 'bg-bg-active text-accent font-medium'
                      : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
          </div>
        )}

        {!collapsed && likedTrackIds.length === 0 && playlists.length <= 1 && (
          <p className="px-3 text-[11px] text-warm-muted/60 leading-relaxed">
            Playlists you create will appear here.
          </p>
        )}
      </div>

      {/* Bottom Footer Section: Settings & (Admin Only) */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {/* Admin Dashboard Entry: Only visible to authenticated Admin User (ID 5216415651) */}
        {user?.isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              currentRoute === 'admin'
                ? 'bg-accent text-bg-primary shadow-md'
                : 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20'
            }`}
            title={collapsed ? 'Admin Panel' : undefined}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Admin Dashboard</span>}
          </button>
        )}

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
            currentRoute.startsWith('settings')
              ? 'bg-bg-active text-accent font-semibold'
              : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className={`w-5 h-5 flex-shrink-0 ${currentRoute.startsWith('settings') ? 'text-accent' : ''}`} />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User profile / Logout snippet */}
        {!collapsed && user && (
          <div className="pt-2 mt-1 border-t border-white/5 flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-accent/20 border border-white/10 flex-shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-accent">
                    {(user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              <span className="truncate text-[11px] text-warm-muted font-medium">
                {user.displayName || user.username || 'Listener'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1 rounded text-warm-muted/60 hover:text-red-400 transition"
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
