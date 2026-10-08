import React, { useEffect, useState, useRef } from 'react';
import { Shield, Sparkles, AlertCircle, RefreshCw, Radio, Send, Key, Lock, User } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { adminLogin } from '../../utils/adminApi';

export function TelegramAuthScreen() {
  const [activeTab, setActiveTab] = useState('telegram'); // 'telegram' | 'password'
  const botUsername = useAuthStore(s => s.botUsername);
  const fetchBotConfig = useAuthStore(s => s.fetchBotConfig);
  const loginWithTelegram = useAuthStore(s => s.loginWithTelegram);
  const checkAuth = useAuthStore(s => s.checkAuth);
  const isLoggingIn = useAuthStore(s => s.isLoggingIn);
  const authError = useAuthStore(s => s.authError);

  // Server Pass credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);
  const [passError, setPassError] = useState('');

  const widgetContainerRef = useRef(null);

  useEffect(() => {
    fetchBotConfig();
  }, []);

  // Register global callback for Telegram Widget
  useEffect(() => {
    window.onTelegramAuth = async user => {
      if (user) {
        await loginWithTelegram(user);
      }
    };

    return () => {
      delete window.onTelegramAuth;
    };
  }, []);

  // Dynamically inject Telegram Login Widget script
  useEffect(() => {
    if (activeTab !== 'telegram' || !botUsername || !widgetContainerRef.current) return;

    widgetContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    widgetContainerRef.current.appendChild(script);
  }, [botUsername, activeTab]);

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setPassError('Username and password required');
      return;
    }

    setIsPassSubmitting(true);
    setPassError('');

    try {
      await adminLogin(username.trim(), password);
      await checkAuth();
    } catch (err) {
      setPassError(err.message || 'Invalid server credentials');
    } finally {
      setIsPassSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary text-warm-white select-none relative overflow-hidden font-sans">
      {/* Dynamic Animated Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-accent/20 via-fuchsia-600/15 to-rose-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-900/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md rounded-3xl bg-bg-secondary/90 border border-white/10 p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-fade-in text-center">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary shadow-xl shadow-accent/25 mx-auto relative group">
            <Radio className="w-8 h-8 fill-bg-primary stroke-bg-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-bg-primary" />
          </div>

          <div className="brand-neon-container inline-block">
            <h1 className="brand-text-neon text-3xl font-black tracking-wider">
              SPiDEY<span className="brand-x-neon">x</span>FLASH
            </h1>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-warm-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <p className="tracking-widest uppercase text-accent font-bold">Music Library</p>
          </div>
        </div>

        {/* Tab Selector: Telegram (Primary) vs Server Pass */}
        <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/5">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'telegram'
                ? 'bg-accent text-bg-primary shadow'
                : 'text-warm-muted hover:text-white'
            }`}
          >
            Continue with Telegram
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'password'
                ? 'bg-accent text-bg-primary shadow'
                : 'text-warm-muted hover:text-white'
            }`}
          >
            Server Pass
          </button>
        </div>

        {/* Tab 1: Telegram OAuth Widget */}
        {activeTab === 'telegram' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-warm-white">
                Telegram Account Login
              </p>
              <p className="text-xs text-warm-muted/70 leading-relaxed max-w-xs mx-auto">
                Authenticate with Telegram to stream high-fidelity audio directly from your channel storage.
              </p>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left font-medium animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span className="flex-1">{authError}</span>
              </div>
            )}

            <div className="py-2 flex flex-col items-center justify-center min-h-[64px]">
              {isLoggingIn ? (
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials on backend...</span>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center space-y-3">
                  <div
                    ref={widgetContainerRef}
                    className="flex items-center justify-center min-h-[44px]"
                  />

                  {botUsername && (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] text-warm-muted hover:text-accent font-medium transition pt-1"
                    >
                      <Send className="w-3 h-3 text-accent" />
                      <span>Open @{botUsername} in Telegram</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Server Pass / Admin Credentials Form */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-left">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Administrator Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Server Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {passError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-center font-medium">
                {passError}
              </div>
            )}

            <button
              type="submit"
              disabled={isPassSubmitting}
              className="w-full py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-102 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isPassSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Sign In with Server Pass</span>
              )}
            </button>
          </form>
        )}

        {/* Security & Admin Assurance Footer */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-warm-muted/60">
            <Shield className="w-3.5 h-3.5 text-accent/80" />
            <span>Server-side HMAC verification & encrypted session cookies</span>
          </div>
          <p className="text-[10px] text-warm-muted/40">
            Telegram User ID 5216415651 is automatically granted Admin authorization.
          </p>
        </div>
      </div>
    </div>
  );
}
