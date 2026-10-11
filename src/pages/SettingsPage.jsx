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
  Sparkles,
  LogOut,
  Key,
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAudioStore } from '../store/useAudioStore';
import { checkHealth, BASE_URL } from '../utils/api';

export function SettingsPage({ initialTab = 'appearance', onNavigate }) {
  const [activeTab, setActiveTab] = useState(initialTab.replace('settings:', '') || 'appearance');
  const [copiedToken, setCopiedToken] = useState(false);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: '' });
  const [isTestingServer, setIsTestingServer] = useState(false);

  const settings = useSettingsStore();
  const audioStore = useAudioStore();

  const testServerConnection = async () => {
    setIsTestingServer(true);
    try {
      const data = await checkHealth();
      setBackendHealth({ status: 'connected', message: `Connected to ${data.service || 'Vex-M API'}` });
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
    const fakeToken = 'v1.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.vexm_session_token_verified.9f8a8b...';
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
    { id: 'coral', name: 'Coral Pink', hex: '#ff7b72', bg: 'bg-[#ff7b72]' },
    { id: 'amber', name: 'Amber Gold', hex: '#f59e0b', bg: 'bg-[#f59e0b]' },
    { id: 'cyan', name: 'Neon Cyan', hex: '#06b6d4', bg: 'bg-[#06b6d4]' },
    { id: 'violet', name: 'Electric Violet', hex: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
    { id: 'emerald', name: 'Emerald', hex: '#10b981', bg: 'bg-[#10b981]' },
    { id: 'rose', name: 'Rose Crimson', hex: '#f43f5e', bg: 'bg-[#f43f5e]' },
    { id: 'lime', name: 'Electric Lime', hex: '#84cc16', bg: 'bg-[#84cc16]' },
    { id: 'sky', name: 'Sky Blue', hex: '#38bdf8', bg: 'bg-[#38bdf8]' },
  ];

  const themeList = [
    { id: 'warm-espresso', name: 'Warm Espresso (Default)', desc: 'Rich espresso brown surface with warm tones', border: 'border-[#38231a]' },
    { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', desc: 'Dark slate with electric neon accents', border: 'border-[#1e293b]' },
    { id: 'midnight-navy', name: 'Midnight Navy', desc: 'Deep sapphire navy with cold ambient', border: 'border-[#152042]' },
    { id: 'pure-black', name: 'OLED Pure Black', desc: 'Pitch black #000000 for battery saving & contrast', border: 'border-zinc-800' },
    { id: 'emerald-forest', name: 'Emerald Forest', desc: 'Deep luxury pine & sage dark green', border: 'border-[#142e23]' },
    { id: 'sunset-rose', name: 'Sunset Rose', desc: 'Burgundy wine & crimson velvet', border: 'border-[#361321]' },
    { id: 'amethyst-purple', name: 'Amethyst Purple', desc: 'Royal deep purple & violet gemstone', border: 'border-[#27143e]' },
    { id: 'retro-amber', name: 'Retro Amber', desc: 'Vintage warm dark gold obsidian', border: 'border-[#2f2410]' },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-28 text-warm-white select-none">
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
          {/* TAB: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-warm-white">Appearance</h2>
                <p className="text-xs text-warm-muted mt-1">Customize themes, accent hues, and lively animated backgrounds</p>
              </div>

              {/* Accent Color Chips */}
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
                <h3 className="text-sm font-semibold text-warm-white">Accent Color</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {accents.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => settings.setAccentColor(acc.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                        settings.accentColor === acc.id
                          ? 'border-accent bg-bg-active text-warm-white shadow-md'
                          : 'border-white/5 bg-bg-secondary hover:border-white/20 text-warm-muted'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${acc.bg} shadow-sm`} />
                      <span className="truncate">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lively Background Mode */}
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-warm-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Lively Animated Background</span>
                    </h3>
                    <p className="text-xs text-warm-muted">GPU-accelerated ambient visual aura with 60 FPS performance</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { id: 'aurora', name: 'Floating Aurora', desc: 'Organic drifting color orbs' },
                    { id: 'glow', name: 'Pulsing Glow', desc: 'Audio reactive breathing aura' },
                    { id: 'mesh', name: 'Animated Mesh', desc: 'Subtle gradient wave' },
                    { id: 'off', name: 'Static Minimal', desc: 'Clean static dark background' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => settings.setLivelyBackground(mode.id)}
                      className={`p-3 rounded-xl text-left border transition ${
                        settings.livelyBackground === mode.id
                          ? 'border-accent bg-bg-active text-accent shadow-md'
                          : 'border-white/5 bg-bg-secondary hover:border-white/20 text-warm-muted'
                      }`}
                    >
                      <p className="font-semibold text-xs text-warm-white">{mode.name}</p>
                      <p className="text-[10px] text-warm-muted mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Mode Grid */}
              <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
                <h3 className="text-sm font-semibold text-warm-white">Themes & Color Schemes (8 Options)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {themeList.map(thm => (
                    <button
                      key={thm.id}
                      onClick={() => settings.setTheme(thm.id)}
                      className={`p-3.5 rounded-2xl text-left border transition ${
                        settings.theme === thm.id
                          ? 'border-accent bg-bg-active shadow-md ring-1 ring-accent/30'
                          : 'border-white/5 bg-bg-secondary hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-bold text-xs ${settings.theme === thm.id ? 'text-accent' : 'text-warm-white'}`}>
                          {thm.name}
                        </p>
                        {settings.theme === thm.id && <Check className="w-3.5 h-3.5 text-accent" />}
                      </div>
                      <p className="text-[11px] text-warm-muted mt-1 leading-relaxed">{thm.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT */}
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
                        ID #{settings.account.telegramUserId || '007'}
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
                      <p className="text-xs font-semibold text-warm-white">User Identifier</p>
                      <p className="text-[11px] text-warm-muted">Your verified listener account identifier</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-warm-white">
                    ID #{settings.account.telegramUserId || '007'}
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

          {/* TAB: SERVER */}
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
              </div>
            </div>
          )}

          {/* TAB: SHORTCUTS */}
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
              <h2 className="text-2xl font-bold tracking-tight text-white">About Vex-M Music</h2>
              <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-3 text-xs leading-relaxed text-white/60">
                <p className="text-sm font-semibold text-white">Vex-M Web Player v2.0</p>
                <p>
                  High-performance on-demand streaming web application powered by next-generation music APIs and modern serverless architecture.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
