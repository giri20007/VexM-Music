import React, { useState, useEffect } from 'react';
import {
  Palette,
  PlayCircle,
  Mic2,
  Sliders,
  Plug,
  Smartphone,
  Server,
  User,
  Database,
  Keyboard,
  Info,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  Key,
} from 'lucide-react';
import { useSettingsStore, EQ_PRESETS, EQ_FREQUENCIES } from '../store/useSettingsStore';
import { useAudioStore } from '../store/useAudioStore';
import { checkHealth, BASE_URL } from '../utils/api';
import { EqualizerModal } from '../components/player/EqualizerModal';

export function SettingsPage({ initialTab = 'account' }) {
  const [activeTab, setActiveTab] = useState(initialTab.replace('settings:', '') || 'account');
  const [copiedToken, setCopiedToken] = useState(false);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: '' });
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const settings = useSettingsStore();
  const audioStore = useAudioStore();

  const testServerConnection = async () => {
    setIsTestingServer(true);
    try {
      const data = await checkHealth();
      setBackendHealth({ status: 'connected', message: `Connected to ${data.service || 'SPiDEYxFLASH API'}` });
    } catch (err) {
      setBackendHealth({ status: 'error', message: err.message || 'Could not connect to backend' });
    } finally {
      setIsTestingServer(false);
    }
  };

  useEffect(() => {
    testServerConnection();
  }, []);

  const handleCopyToken = () => {
    const fakeToken = 'v1.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.spideyxflash_session_token_verified.9f8a8b...';
    navigator.clipboard?.writeText(fakeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const navCategories = [
    { id: 'appearance', label: 'Appearance', desc: 'Themes, colors, motion', icon: Palette },
    { id: 'playback', label: 'Playback', desc: 'Format, prefetch, speed', icon: PlayCircle },
    { id: 'lyrics', label: 'Lyrics', desc: 'Musixmatch, LRCLIB, sync style', icon: Mic2 },
    { id: 'equalizer', label: 'Equalizer', desc: 'Bands and presets', icon: Sliders },
    { id: 'integrations', label: 'Integrations', desc: 'Last.fm, Discord', icon: Plug },
    { id: 'offline', label: 'App & offline', desc: 'Install, updates, storage', icon: Smartphone },
    { id: 'server', label: 'Server & endpoints', desc: 'Address, connection', icon: Server, hasDot: true },
    { id: 'account', label: 'Account', desc: 'Profile, session, password', icon: User },
    { id: 'library', label: 'Library & data', desc: 'Sync, cache, export', icon: Database },
    { id: 'shortcuts', label: 'Keyboard shortcuts', desc: 'Key bindings', icon: Keyboard },
    { id: 'about', label: 'About', desc: 'Version, credits', icon: Info },
  ];

  const accents = [
    { id: 'coral', name: 'Coral Pink', bg: 'bg-[#ff7b72]' },
    { id: 'violet', name: 'Violet', bg: 'bg-[#a78bfa]' },
    { id: 'emerald', name: 'Emerald', bg: 'bg-[#34d399]' },
    { id: 'amber', name: 'Amber', bg: 'bg-[#fbbf24]' },
    { id: 'cyan', name: 'Cyan', bg: 'bg-[#22d3ee]' },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-6 pb-28 text-warm-white select-none">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Settings Left Navigation (Matches Screenshot 1) */}
        <div className="md:col-span-4 lg:col-span-3.5 space-y-1 bg-bg-secondary/40 p-2 rounded-3xl border border-white/5">
          {navCategories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                  isActive
                    ? 'bg-bg-active text-warm-white font-semibold shadow-inner'
                    : 'text-warm-muted hover:text-warm-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-warm-muted'}`} />
                  <div className="min-w-0">
                    <p className={`truncate text-sm ${isActive ? 'text-warm-white' : ''}`}>{cat.label}</p>
                    <p className="truncate text-[11px] text-warm-muted/70">{cat.desc}</p>
                  </div>
                </div>

                {cat.hasDot && (
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      backendHealth.status === 'connected'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : backendHealth.status === 'checking'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Settings Tab Detail Content View */}
        <div className="md:col-span-8 lg:col-span-8.5 bg-bg-secondary/70 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          {/* TAB: ACCOUNT (Matches Screenshot 1) */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-warm-white">Account</h2>
              </div>

              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bg-card border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#38231a] to-accent/30 flex items-center justify-center border border-white/10 text-accent font-black text-xl shadow-lg">
                    🕷
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-warm-white tracking-tight">
                      {settings.account.username}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-warm-muted mt-0.5">
                      <span>{settings.account.handle}</span>
                      <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
                        ID {settings.account.telegramUserId}
                      </span>
                    </div>
                    <p className="text-[11px] text-warm-muted/70 mt-1">
                      Member since {settings.account.memberSince}
                    </p>
                  </div>
                </div>

                <button className="px-4 py-1.5 rounded-full bg-bg-active hover:bg-white/10 border border-white/10 text-xs font-semibold text-warm-white transition">
                  Account
                </button>
              </div>

              {/* Session Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-warm-muted">Session</h4>

                <div className="p-4 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono text-warm-muted">#</span>
                    <div>
                      <p className="text-xs font-semibold text-warm-white">Telegram User ID</p>
                      <p className="text-[11px] text-warm-muted">Your linked Telegram account identifier</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-warm-white">
                    ID {settings.account.telegramUserId}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-warm-muted" />
                    <div>
                      <p className="text-xs font-semibold text-warm-white">Sign out</p>
                      <p className="text-[11px] text-warm-muted">Removes the session token from this device</p>
                    </div>
                  </div>
                  <button
                    onClick={() => settings.resetSettings()}
                    className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-xs font-semibold transition"
                  >
                    Sign out
                  </button>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-warm-muted">Security</h4>
                <p className="text-[11px] text-warm-muted/70">Requires a valid session</p>

                <div className="p-4 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-warm-muted" />
                    <div>
                      <p className="text-xs font-semibold text-warm-white">Change server password</p>
                      <p className="text-[11px] text-warm-muted">The shared password used for guest access</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-warm-muted" />
                    <div>
                      <p className="text-xs font-semibold text-warm-white">Update username & password</p>
                      <p className="text-[11px] text-warm-muted">Sign in with credentials instead of Telegram</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Token Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-warm-muted">Session token</h4>
                <div className="p-4 rounded-2xl bg-bg-card border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-warm-white">Token</p>
                      <p className="font-mono text-xs text-warm-muted mt-0.5">
                        v1.eyJhbGciOiJ... (517 chars)
                      </p>
                    </div>
                    <button
                      onClick={handleCopyToken}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-warm-white transition"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="pt-2 border-t border-white/5 text-[11px] text-warm-muted flex justify-between">
                    <span>Last update</span>
                    <span className="text-warm-white">just now</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Appearance</h2>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-warm-white">Accent Color</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {accents.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => settings.setAccentColor(acc.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                        settings.accentColor === acc.id
                          ? 'border-accent bg-bg-active shadow-md'
                          : 'border-white/5 bg-bg-secondary hover:border-white/20'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${acc.bg}`} />
                      <span>{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-warm-white">Theme Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'warm-dark', name: 'Warm Espresso (Default)' },
                    { id: 'midnight', name: 'Midnight Navy' },
                    { id: 'pure-black', name: 'OLED Pure Black' },
                  ].map(thm => (
                    <button
                      key={thm.id}
                      onClick={() => settings.setTheme(thm.id)}
                      className={`p-3 rounded-xl text-xs font-semibold text-center border transition ${
                        settings.theme === thm.id
                          ? 'border-accent bg-bg-active text-accent'
                          : 'border-white/5 bg-bg-secondary hover:bg-white/5 text-warm-muted'
                      }`}
                    >
                      {thm.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-white">Smooth Animations</p>
                  <p className="text-xs text-warm-muted">Enable micro-interactions and transitions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={e => settings.setAnimations(e.target.checked)}
                  className="w-5 h-5 rounded accent-accent cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB: PLAYBACK */}
          {activeTab === 'playback' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Playback Settings</h2>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-white">Autoplay next track</p>
                  <p className="text-xs text-warm-muted">Automatically play the next track in queue or library</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={e => settings.setAutoplay(e.target.checked)}
                  className="w-5 h-5 rounded accent-accent cursor-pointer"
                />
              </div>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-white">Volume Normalization</p>
                  <p className="text-xs text-warm-muted">Keeps volume levels balanced across different audio tracks</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.volumeNormalization}
                  onChange={e => settings.setVolumeNormalization(e.target.checked)}
                  className="w-5 h-5 rounded accent-accent cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB: LYRICS */}
          {activeTab === 'lyrics' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Lyrics Settings</h2>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-white">Synchronized LRC lyrics</p>
                  <p className="text-xs text-warm-muted">Highlight current line and sync with audio timestamp</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.syncLyrics}
                  onChange={e => settings.setSyncLyrics(e.target.checked)}
                  className="w-5 h-5 rounded accent-accent cursor-pointer"
                />
              </div>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-white">Auto-scroll</p>
                  <p className="text-xs text-warm-muted">Automatically follow along with playback</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoScroll}
                  onChange={e => settings.setAutoScroll(e.target.checked)}
                  className="w-5 h-5 rounded accent-accent cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB: EQUALIZER */}
          {activeTab === 'equalizer' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Equalizer</h2>
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-warm-white">Web Audio Equalizer</p>
                    <p className="text-xs text-warm-muted">Active preset: {settings.eqPreset}</p>
                  </div>
                  <button
                    onClick={() => audioStore.setEqualizerOpen(true)}
                    className="px-4 py-1.5 rounded-full bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20"
                  >
                    Open EQ Controls
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVER & ENDPOINTS */}
          {activeTab === 'server' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Server & Endpoints</h2>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        backendHealth.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-warm-white">
                        {backendHealth.status === 'connected' ? 'Connected' : 'Unavailable'}
                      </p>
                      <p className="text-xs text-warm-muted">{backendHealth.message}</p>
                    </div>
                  </div>

                  <button
                    onClick={testServerConnection}
                    disabled={isTestingServer}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-warm-white transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingServer ? 'animate-spin' : ''}`} />
                    <span>Test Connection</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5 text-xs text-warm-muted space-y-1 font-mono">
                  <p>API Base URL: {BASE_URL || 'Same-origin (/api)'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIBRARY & DATA */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Library & Data</h2>

              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-warm-white">Export Local Data</p>
                    <p className="text-xs text-warm-muted">Download settings and local playlist backups</p>
                  </div>
                  <button
                    onClick={() => {
                      const data = settings.exportSettings();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `spideyxflash_settings_${Date.now()}.json`;
                      a.click();
                    }}
                    className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-warm-white transition"
                  >
                    Export JSON
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-warm-white">Reset Local Data</p>
                    <p className="text-xs text-warm-muted">Clears cached settings and resets preferences</p>
                  </div>
                  <button
                    onClick={() => settings.resetSettings()}
                    className="px-4 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">Keyboard Shortcuts</h2>
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
                {[
                  { key: 'Space / K', action: 'Play / Pause' },
                  { key: '← / →', action: 'Seek backward / forward 5s' },
                  { key: 'Shift + ← / →', action: 'Previous / Next track' },
                  { key: 'M', action: 'Toggle Mute' },
                  { key: 'L', action: 'Like / Unlike current track' },
                  { key: 'Q', action: 'Toggle Queue drawer' },
                  { key: 'Ctrl + K / ⌘K', action: 'Global Search' },
                  { key: 'Esc', action: 'Close modal or search' },
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-xs">
                    <span className="text-warm-white font-medium">{s.action}</span>
                    <kbd className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-accent">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-bold tracking-tight text-warm-white">About SPiDEYxFLASH</h2>
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3 text-xs leading-relaxed text-warm-muted">
                <p className="text-sm font-semibold text-warm-white">SPiDEYxFLASH Audio Player v2.0</p>
                <p>
                  A premium, high-performance music streaming web application powered by Telegram free-tier media storage, Express backend on Render, and React frontend on Vercel.
                </p>
                <p className="pt-2 text-[11px] text-warm-muted/60">
                  Built with React, Tailwind CSS, Zustand, GramJS, Web Audio API.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
