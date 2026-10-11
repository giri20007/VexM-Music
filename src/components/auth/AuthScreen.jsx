import React, { useState } from 'react';
import { Radio, Lock, User, Sparkles, AlertCircle, RefreshCw, CheckCircle2, Music } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function AuthScreen() {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup'

  // Sign In state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const signIn = useAuthStore(s => s.signIn);
  const signUp = useAuthStore(s => s.signUp);
  const loginWithTelegram = useAuthStore(s => s.loginWithTelegram);

  // Setup Telegram login callback on window for official widget
  React.useEffect(() => {
    window.onTelegramAuth = async user => {
      try {
        setIsLoggingIn(true);
        const res = await loginWithTelegram(user);
        if (!res.success) {
          setLoginError(res.error || 'Telegram authentication failed.');
        }
      } catch (err) {
        setLoginError(err.message || 'Telegram login failed.');
      } finally {
        setIsLoggingIn(false);
      }
    };
  }, []);

  const handleSignIn = async e => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both username and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await signIn(loginUsername.trim(), loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Invalid username or password');
      }
    } catch (err) {
      setLoginError(err.message || 'Failed to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async e => {
    e.preventDefault();
    if (!signupUsername.trim() || !signupPassword.trim()) {
      setSignupError('Username and password are required');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 4) {
      setSignupError('Password must be at least 4 characters');
      return;
    }

    setIsSigningUp(true);
    setSignupError('');

    try {
      const res = await signUp(
        signupUsername.trim(),
        signupPassword,
        signupName.trim() || signupUsername.trim()
      );
      if (!res.success) {
        setSignupError(res.error || 'Registration failed');
      }
    } catch (err) {
      setSignupError(err.message || 'Failed to register account');
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary text-warm-white select-none relative overflow-hidden font-sans">
      {/* Dynamic Animated Lively Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-accent/25 via-fuchsia-600/15 to-rose-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-900/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md rounded-3xl bg-bg-secondary/90 border border-white/10 p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-fade-in text-center">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary shadow-xl shadow-accent/25 mx-auto relative group">
            <Radio className="w-8 h-8 fill-bg-primary stroke-bg-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-bg-primary" />
          </div>

          <div className="brand-neon-container inline-block">
            <h1 className="brand-text-neon text-3xl font-black tracking-wider">
              Vex<span className="text-[#fa2d48]">-</span>M
            </h1>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-warm-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <p className="tracking-widest uppercase text-accent font-bold">Music Library</p>
          </div>
        </div>

        {/* Auth Mode Toggle: [Sign In] vs [Sign Up] */}
        <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setLoginError('');
              setSignupError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'signin'
                ? 'bg-accent text-bg-primary shadow-md shadow-accent/20 scale-[1.02]'
                : 'text-warm-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setLoginError('');
              setSignupError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-accent text-bg-primary shadow-md shadow-accent/20 scale-[1.02]'
                : 'text-warm-muted hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* TAB 1: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-left animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5 text-left animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Display Name
              </label>
              <div className="relative">
                <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="text"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  placeholder="e.g. Music Fan"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Choose Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={signupUsername}
                  onChange={e => setSignupUsername(e.target.value)}
                  placeholder="Choose a username..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-warm-muted block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={signupConfirm}
                  onChange={e => setSignupConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent transition"
                />
              </div>
            </div>

            {signupError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{signupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSigningUp}
              className="w-full py-3 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
            >
              {isSigningUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Account & Listen</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & Aesthetics Guarantee Footer */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-warm-muted/70">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>High-Fidelity Audio Streaming • Lossless Quality</span>
          </div>
          <p className="text-[10px] text-warm-muted/40 font-mono">
            Vex-M Studio Audio Lab • Ultra Hi-Fi Player
          </p>
        </div>
      </div>
    </div>
  );
}
