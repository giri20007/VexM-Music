import { create } from 'zustand';
import { BASE_URL } from '../utils/api';

const TOKEN_KEY = 'spx_user_token';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || '',
  isAuthenticated: false,
  isCheckingAuth: true,
  authError: null,
  botUsername: '',
  isLoggingIn: false,

  setAuthToken: token => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      set({ token });
    } else {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: '' });
    }
  },

  fetchBotConfig: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/config`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.botUsername) {
          set({ botUsername: data.botUsername });
        }
      }
    } catch {
      // ignore
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true, authError: null });
    const currentToken = get().token || localStorage.getItem(TOKEN_KEY);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.authenticated && data.user) {
          set({
            user: data.user,
            isAuthenticated: true,
            isCheckingAuth: false,
            authError: null,
          });
          return true;
        }
      }

      // If unauthorized, clear state
      set({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    } catch (err) {
      set({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        authError: 'Could not connect to authentication service',
      });
      return false;
    }
  },

  loginWithTelegram: async authData => {
    set({ isLoggingIn: true, authError: null });
    try {
      const res = await fetch(`${BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Telegram authentication failed');
      }

      if (data.token) {
        get().setAuthToken(data.token);
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoggingIn: false,
        authError: null,
      });

      return { success: true, user: data.user };
    } catch (err) {
      set({
        isLoggingIn: false,
        authError: err.message || 'Login failed',
      });
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    try {
      const currentToken = get().token;
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      get().setAuthToken('');
      set({
        user: null,
        isAuthenticated: false,
        authError: null,
      });
    }
  },
}));
