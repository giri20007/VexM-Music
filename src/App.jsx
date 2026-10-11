import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomPlayer } from './components/layout/BottomPlayer';
import { MobileNav } from './components/layout/MobileNav';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { LivelyBackground } from './components/layout/LivelyBackground';
import { NewTracksBanner } from './components/layout/NewTracksBanner';
import { AuthScreen } from './components/auth/AuthScreen';
import { ToastContainer } from './components/ui/Toast';

import { NowPlayingModal } from './components/player/NowPlayingModal';
import { QueueDrawer } from './components/player/QueueDrawer';
import { EqualizerModal } from './components/player/EqualizerModal';
import { SleepTimerModal } from './components/player/SleepTimerModal';
import { LanguagePreferenceModal } from './components/modals/LanguagePreferenceModal';

import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { SearchPage } from './pages/SearchPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { LikedSongsPage } from './pages/LikedSongsPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

import { useLibrary } from './hooks/useLibrary';
import { usePlayer } from './hooks/usePlayer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSettingsStore } from './store/useSettingsStore';
import { useAudioStore } from './store/useAudioStore';
import { useAuthStore } from './store/useAuthStore';
import { Radio, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isCheckingAuth = useAuthStore(s => s.isCheckingAuth);
  const user = useAuthStore(s => s.user);
  const checkAuth = useAuthStore(s => s.checkAuth);

  usePlayer();
  useKeyboardShortcuts();
  const lib = useLibrary();

  const isSleepTimerOpen = useAudioStore(s => s.isSleepTimerOpen);
  const setSleepTimerOpen = useAudioStore(s => s.setSleepTimerOpen);

  // Route state (e.g. 'home', 'library', 'search', 'albums', 'artists', 'liked', 'album:Name', 'artist:Name', 'playlist:id', 'settings:account', 'admin')
  const [currentRoute, setCurrentRoute] = useState('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  // Apply saved theme and accent colors on mount
  const theme = useSettingsStore(s => s.theme);
  const accentColor = useSettingsStore(s => s.accentColor);
  const setTheme = useSettingsStore(s => s.setTheme);
  const setAccentColor = useSettingsStore(s => s.setAccentColor);
  const hasConfiguredLanguage = useSettingsStore(s => s.hasConfiguredLanguage);
  const preferredLanguage = useSettingsStore(s => s.preferredLanguage);

  useEffect(() => {
    setTheme(theme);
    setAccentColor(accentColor);
    checkAuth();

    // Check if user has selected music language previously
    try {
      const savedLang = localStorage.getItem('vexm_preferred_language');
      if (!savedLang && !preferredLanguage && !hasConfiguredLanguage) {
        setLanguageModalOpen(true);
      }
    } catch {}
  }, []);

  // Handle URL hash routing if user enters /#admin or /#settings
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash) {
        setCurrentRoute(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = route => {
    setCurrentRoute(route);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Loading screen while validating initial session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-warm-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary shadow-xl shadow-accent/20 animate-pulse">
          <Radio className="w-7 h-7 fill-bg-primary stroke-bg-primary" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
          <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          <span>Verifying Vex-M session...</span>
        </div>
      </div>
    );
  }

  // 2. Authentication First Screen (Sign In & Sign Up)
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // 3. Admin Route Protection
  const isAdmin = user?.isAdmin || user?.role === 'ADMIN' || user?.role === 'admin' || user?.username?.toLowerCase() === 'spidey';
  if (currentRoute === 'admin') {
    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary text-warm-white select-none">
          <div className="max-w-md w-full p-8 rounded-3xl bg-bg-secondary border border-red-500/20 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-warm-white">Access Denied (403)</h2>
            <p className="text-xs text-warm-muted leading-relaxed">
              Admin privileges require administrator credentials. You are currently logged in as a standard listener.
            </p>
            <button
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/20 hover:scale-105 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Player</span>
            </button>
          </div>
        </div>
      );
    }

    return <AdminPage onBackToApp={() => navigate('home')} />;
  }

  // Derive header title
  let headerTitle = 'New';
  if (currentRoute === 'library') headerTitle = 'Library';
  else if (currentRoute === 'search') headerTitle = 'Search';
  else if (currentRoute.startsWith('albums') || currentRoute.startsWith('album:')) headerTitle = 'Albums';
  else if (currentRoute.startsWith('artists') || currentRoute.startsWith('artist:')) headerTitle = 'Artists';
  else if (currentRoute === 'liked') headerTitle = 'Liked Songs';
  else if (currentRoute.startsWith('playlist:')) headerTitle = 'Playlist';
  else if (currentRoute.startsWith('settings')) headerTitle = 'Settings';
  else if (currentRoute === 'recaps') headerTitle = 'Recaps';

  return (
    <div className="relative min-h-screen flex flex-col bg-bg-primary text-warm-white selection:bg-accent selection:text-bg-primary">
      {/* Dynamic Animated Lively Background */}
      <LivelyBackground />

      {/* Floating Top Notification for New Telegram Songs */}
      <NewTracksBanner
        notification={lib.newTracksNotification}
        onPlay={lib.playNewTracks}
        onDismiss={lib.dismissNewTracksNotification}
      />

      {/* Top Application Layout (Desktop Sidebar + Main Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar (Persistent on Desktop) */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={navigate}
        />

        {/* Right Scrollable Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pb-28 md:pb-24">
          <Header
            title={headerTitle}
            onToggleMobileNav={() => setMobileNavOpen(true)}
            onNavigate={navigate}
          />

          <main className="flex-1 flex flex-col">
            {currentRoute === 'home' && (
              <HomePage
                lib={lib}
                onNavigate={navigate}
                onOpenLanguageModal={() => setLanguageModalOpen(true)}
              />
            )}

            {currentRoute === 'library' && (
              <LibraryPage lib={lib} onNavigate={navigate} />
            )}

            {currentRoute === 'search' && (
              <SearchPage lib={lib} onNavigate={navigate} />
            )}

            {currentRoute === 'liked' && (
              <LikedSongsPage allTracks={lib.allItems} onNavigate={navigate} />
            )}

            {(currentRoute === 'albums' || currentRoute.startsWith('album:')) && (
              <AlbumsPage
                lib={lib}
                selectedAlbumName={currentRoute.startsWith('album:') ? currentRoute.replace('album:', '') : null}
                onNavigate={navigate}
                onBack={() => navigate('albums')}
              />
            )}

            {(currentRoute === 'artists' || currentRoute.startsWith('artist:')) && (
              <ArtistsPage
                lib={lib}
                selectedArtistName={currentRoute.startsWith('artist:') ? currentRoute.replace('artist:', '') : null}
                onNavigate={navigate}
                onBack={() => navigate('artists')}
              />
            )}

            {currentRoute.startsWith('playlist:') && (
              <PlaylistPage
                playlistId={currentRoute.replace('playlist:', '')}
                allTracks={lib.allItems}
                onBack={() => navigate('library')}
                onNavigate={navigate}
              />
            )}

            {currentRoute === 'recaps' && (
              <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
                <h2 className="text-2xl font-black text-warm-white">Your Listening Recap</h2>
                <div className="p-8 rounded-3xl bg-bg-card border border-white/5 space-y-4">
                  <p className="text-sm font-semibold text-accent">VexM Music Discovery</p>
                  <p className="text-xs text-warm-muted leading-relaxed max-w-lg">
                    You have discovered {lib.total} tracks across {lib.albums.length} albums and {lib.artists.length} artists in your music vault.
                  </p>
                </div>
              </div>
            )}

            {currentRoute.startsWith('settings') && (
              <SettingsPage
                initialTab={currentRoute}
                onNavigate={navigate}
              />
            )}
          </main>
        </div>
      </div>

      {/* Persistent Bottom Player */}
      <BottomPlayer />

      {/* Global Toast Notifications for Playback & System Alerts */}
      <ToastContainer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentRoute={currentRoute}
        onNavigate={navigate}
      />

      {/* Fullscreen Now Playing Modal */}
      <NowPlayingModal />

      {/* Preferred Music Language Modal (Prompts once on initial launch & via pill) */}
      <LanguagePreferenceModal
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
      />

      {/* Up Next / Queue Drawer */}
      <QueueDrawer />

      {/* Audio Equalizer Modal */}
      <EqualizerModal />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setSleepTimerOpen(false)}
      />

      {/* Global Search Command Palette (Ctrl+K / Cmd+K) */}
      <GlobalSearchModal
        allTracks={lib.allItems}
        onNavigate={navigate}
      />

      {/* Mobile Slide-Over Sidebar Drawer & Backdrop */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-bg-secondary border-r border-white/10 shadow-2xl flex flex-col animate-scale-up select-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('home');
                }}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary font-black shadow-md">
                  <Radio className="w-4 h-4 fill-bg-primary stroke-bg-primary" />
                </div>
                <span className="font-black text-sm text-warm-white tracking-tight">
                  Vex<span className="text-[#fa2d48]">-</span>M
                </span>
              </div>

              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/5 transition"
                aria-label="Close menu"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
              {[
                { id: 'home', label: 'Home' },
                { id: 'library', label: 'Library' },
                { id: 'search', label: 'Search' },
                { id: 'liked', label: 'Liked Songs' },
                { id: 'albums', label: 'Albums' },
                { id: 'artists', label: 'Artists' },
                { id: 'recaps', label: 'Recaps' },
                { id: 'settings', label: 'Settings' },
              ].map(item => {
                const isActive = currentRoute === item.id || currentRoute.startsWith(`${item.id}:`);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileNavOpen(false);
                      navigate(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition ${
                      isActive
                        ? 'bg-accent text-bg-primary font-bold shadow-md'
                        : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-bg-primary" />}
                  </button>
                );
              })}

              {/* Admin Link if Authorized */}
              {isAdmin && (
                <div className="pt-2 mt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      navigate('admin');
                    }}
                    className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                      currentRoute === 'admin'
                        ? 'bg-accent text-bg-primary'
                        : 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25'
                    }`}
                  >
                    <span>Admin Dashboard</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer User Footer */}
            {user && (
              <div className="p-3 border-t border-white/5 flex items-center justify-between bg-bg-card/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-accent text-xs font-bold border border-white/10">
                    {(user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-warm-white leading-tight">
                      {user.displayName || user.username}
                    </p>
                    <p className="truncate text-[10px] text-warm-muted leading-tight">
                      {isAdmin ? 'Administrator' : 'Listener'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    useAuthStore.getState().logout();
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
