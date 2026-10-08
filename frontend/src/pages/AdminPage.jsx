import React, { useEffect, useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Music2,
  Mic2,
  Radio,
  Database,
  Server,
  Clock,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Users,
} from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminLibrary } from '../components/admin/AdminLibrary';
import { AdminLyrics } from '../components/admin/AdminLyrics';
import { AdminArtists } from '../components/admin/AdminArtists';
import { AdminTelegram } from '../components/admin/AdminTelegram';
import { AdminCache } from '../components/admin/AdminCache';
import { AdminSystem } from '../components/admin/AdminSystem';
import { AdminLogs } from '../components/admin/AdminLogs';

export function AdminPage({ onBackToApp }) {
  const isAuthenticated = useAdminStore(s => s.isAuthenticated);
  const isCheckingAuth = useAdminStore(s => s.isCheckingAuth);
  const checkAuth = useAdminStore(s => s.checkAuth);
  const logout = useAdminStore(s => s.logout);
  const activeTab = useAdminStore(s => s.activeTab);
  const setActiveTab = useAdminStore(s => s.setActiveTab);
  const toasts = useAdminStore(s => s.toasts);
  const dismissToast = useAdminStore(s => s.dismissToast);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-xs text-warm-muted">
        Verifying administrator session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onBackToApp={onBackToApp} />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'library', label: 'Library & Tracks', icon: Music2 },
    { id: 'artists', label: 'Artist Manager', icon: Users },
    { id: 'lyrics', label: 'Lyrics Editor', icon: Mic2 },
    { id: 'telegram', label: 'Telegram & Sync', icon: Radio },
    { id: 'cache', label: 'Cache Manager', icon: Database },
    { id: 'system', label: 'System Telemetry', icon: Server },
    { id: 'logs', label: 'Audit Logs', icon: Clock },
  ];

  return (
    <div className="min-h-screen flex bg-bg-primary text-warm-white select-none">
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`p-3.5 rounded-2xl shadow-2xl text-xs font-semibold pointer-events-auto cursor-pointer animate-fade-in border ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
                : t.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/30'
                : 'bg-bg-secondary text-warm-white border-white/10'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Left Admin Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-bg-secondary border-r border-white/5 flex flex-col justify-between p-4 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary shadow-lg shadow-accent/20">
                <Shield className="w-5 h-5 fill-bg-primary stroke-bg-primary" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-warm-white block">
                  SPiDEY<span className="text-accent">x</span>FLASH
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                  Admin Panel
                </span>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-white/5 text-warm-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {tabs.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-bg-active text-accent shadow-inner'
                      : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-1 pt-4 border-t border-white/5">
          <button
            onClick={onBackToApp}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-warm-muted hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Player</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Mobile Bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-bg-secondary">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-bg-card text-warm-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-warm-white">SPiDEYxFLASH Admin</span>
          </div>
          <button
            onClick={onBackToApp}
            className="text-xs text-accent font-semibold"
          >
            Exit
          </button>
        </div>

        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24">
          {activeTab === 'dashboard' && <AdminDashboard onNavigateTab={setActiveTab} />}
          {activeTab === 'library' && <AdminLibrary />}
          {activeTab === 'artists' && <AdminArtists />}
          {activeTab === 'lyrics' && <AdminLyrics />}
          {activeTab === 'telegram' && <AdminTelegram />}
          {activeTab === 'cache' && <AdminCache />}
          {activeTab === 'system' && <AdminSystem />}
          {activeTab === 'logs' && <AdminLogs />}
        </div>
      </main>
    </div>
  );
}
