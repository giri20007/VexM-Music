import React, { useEffect, useState, useRef } from 'react';
import { Shield, Sparkles, AlertCircle, RefreshCw, Radio, Send, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function TelegramAuthScreen() {
  const botUsername = useAuthStore(s => s.botUsername);
  const fetchBotConfig = useAuthStore(s => s.fetchBotConfig);
  const loginWithTelegram = useAuthStore(s => s.loginWithTelegram);
  const isLoggingIn = useAuthStore(s => s.isLoggingIn);
  const authError = useAuthStore(s => s.authError);

  const [widgetLoaded, setWidgetLoaded] = useState(false);
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
    if (!botUsername || !widgetContainerRef.current) return;

    // Clear previous widget
    widgetContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    script.onload = () => setWidgetLoaded(true);

    widgetContainerRef.current.appendChild(script);
  }, [botUsername]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary text-warm-white select-none relative overflow-hidden font-sans">
      {/* Dynamic Animated Lively Background Glow */}
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

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-2" />

        {/* Subtitle instructions */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-warm-white">
            Continue with Telegram
          </p>
          <p className="text-xs text-warm-muted/70 leading-relaxed max-w-xs mx-auto">
            Log in with your Telegram account to access your high-fidelity music streaming library.
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left font-medium animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="flex-1">{authError}</span>
          </div>
        )}

        {/* Telegram Login Container */}
        <div className="py-2 flex flex-col items-center justify-center min-h-[64px]">
          {isLoggingIn ? (
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Telegram credentials on backend...</span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center space-y-3">
              {/* Telegram Widget Embed */}
              <div
                ref={widgetContainerRef}
                className="flex items-center justify-center min-h-[44px]"
              />

              {/* Telegram WebApp / Quick Bot Launcher */}
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

        {/* Security & Admin Assurance Footer */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-warm-muted/60">
            <Shield className="w-3.5 h-3.5 text-accent/80" />
            <span>Server-side HMAC verification & secure session encryption</span>
          </div>
          <p className="text-[10px] text-warm-muted/40">
            Telegram User ID 5216415651 is automatically granted Admin authorization.
          </p>
        </div>
      </div>
    </div>
  );
}
