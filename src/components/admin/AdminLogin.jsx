import React, { useState } from 'react';
import { Shield, Lock, User, Key, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';

export function AdminLogin({ onBackToApp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const login = useAdminStore(s => s.login);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMessage(res.error || 'Invalid credentials');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-8 shadow-2xl space-y-6">
        {/* Back link */}
        <button
          onClick={onBackToApp}
          className="flex items-center gap-1.5 text-xs text-warm-muted hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vex-M</span>
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent to-[#f43f5e] flex items-center justify-center text-bg-primary shadow-xl shadow-accent/20 mx-auto">
            <Shield className="w-7 h-7 fill-bg-primary stroke-bg-primary" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-warm-white">
            Vex<span className="text-[#fa2d48]">-</span>M
          </h2>
          <p className="text-xs uppercase tracking-widest font-semibold text-accent">
            Owner Admin Panel
          </p>
          <p className="text-xs text-warm-muted/70">
            Secure server-side authentication required.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-warm-muted block">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Admin username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-sm text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-warm-muted block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-sm text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-accent text-bg-primary font-bold text-sm shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-warm-muted/50">
          Admin access is restricted to system administrators.
        </p>
      </div>
    </div>
  );
}
