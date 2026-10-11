import { create } from 'zustand';
import { BASE_URL } from '../utils/api';

const TOKEN_KEY = 'spx_user_token';
const ADMIN_JWT_KEY = 'spx_admin_jwt';
const CURRENT_USER_KEY = 'spx_current_user';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || '',
  isAuthenticated: false,
  isCheckingAuth: true,
  authError: null,
  isLoggingIn: false,

  setAuthToken: (token, isAdmin = false) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (isAdmin) {
        localStorage.setItem(ADMIN_JWT_KEY, token);
      }
      set({ token });
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ADMIN_JWT_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      set({ token: '' });
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true, authError: null });
    const currentToken = get().token || localStorage.getItem(TOKEN_KEY);

    let cachedUser = null;
    try {
      const rawUser = localStorage.getItem(CURRENT_USER_KEY);
      if (rawUser) cachedUser = JSON.parse(rawUser);
    } catch {
      // ignore
    }

    // Try validating with backend /api/auth/me
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
          const isOwner =
            data.user.role === 'OWNER' ||
            data.user.isOwner === true ||
            String(data.user.telegramId || data.user.id) === '5216415651' ||
            data.user.username?.toLowerCase() === 'spidey';

          const isAdmin = isOwner || data.user.role === 'ADMIN' || data.user.isAdmin === true;

          const userObj = {
            ...data.user,
            isOwner,
            isAdmin,
            role: isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : (data.user.role || 'USER')),
          };

          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
          set({
            user: userObj,
            isAuthenticated: true,
            isCheckingAuth: false,
            authError: null,
          });
          return true;
        }
      }
    } catch (err) {
      // Offline fallback
    }

    // Fallback if local token and cached session exist
    if (currentToken && cachedUser) {
      const isOwner =
        cachedUser.role === 'OWNER' ||
        cachedUser.isOwner === true ||
        String(cachedUser.telegramId || cachedUser.id) === '5216415651' ||
        cachedUser.username?.toLowerCase() === 'spidey';

      const isAdmin = isOwner || cachedUser.role === 'ADMIN' || cachedUser.isAdmin === true;

      set({
        user: { ...cachedUser, isOwner, isAdmin, role: isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'USER') },
        isAuthenticated: true,
        isCheckingAuth: false,
        authError: null,
      });
      return true;
    }

    set({
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
    });
    return false;
  },

  signIn: async (username, password) => {
    set({ isLoggingIn: true, authError: null });

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const isOwner =
          data.user?.role === 'OWNER' ||
          data.user?.isOwner === true ||
          String(data.user?.telegramId || data.user?.id) === '5216415651' ||
          data.user?.username?.toLowerCase() === 'spidey';

        const isAdmin = isOwner || data.user?.role === 'ADMIN' || data.user?.isAdmin === true;

        const userObj = {
          ...data.user,
          isOwner,
          isAdmin,
          role: isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'USER'),
        };

        const token = data.token || `spx_session_${Date.now()}`;
        get().setAuthToken(token, isAdmin);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));

        set({
          user: userObj,
          isAuthenticated: true,
          isLoggingIn: false,
          authError: null,
        });
        return { success: true, user: userObj };
      }

      const errMsg = data.message || 'Invalid username or password.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
    } catch (err) {
      const errMsg = 'Unable to connect to the server. Please try again.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
    }
  },

  loginWithTelegram: async telegramPayload => {
    set({ isLoggingIn: true, authError: null });

    try {
      const res = await fetch(`${BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramPayload),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const isOwner =
          data.user?.role === 'OWNER' ||
          data.user?.isOwner === true ||
          String(data.user?.telegramId || data.user?.id) === '5216415651' ||
          data.user?.username?.toLowerCase() === 'spidey';

        const isAdmin = isOwner || data.user?.role === 'ADMIN' || data.user?.isAdmin === true;

        const userObj = {
          ...data.user,
          isOwner,
          isAdmin,
          role: isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'USER'),
        };

        const token = data.token || `spx_tg_session_${Date.now()}`;
        get().setAuthToken(token, isAdmin);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));

        set({
          user: userObj,
          isAuthenticated: true,
          isLoggingIn: false,
          authError: null,
        });
        return { success: true, user: userObj };
      }

      const errMsg = data.message || 'Telegram authentication could not be verified.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
    } catch (err) {
      const errMsg = 'Unable to connect to the server. Please try again.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
    }
  },

  signUp: async (username, password, displayName) => {
    set({ isLoggingIn: true, authError: null });

    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const userObj = {
          id: data.user?.id || `user_${Date.now()}`,
          username: data.user?.username || username,
          displayName: data.user?.displayName || displayName || username,
          role: 'USER',
          isAdmin: false,
          isOwner: false,
        };

        const token = data.token || `spx_user_${Date.now()}`;
        get().setAuthToken(token, false);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));

        set({
          user: userObj,
          isAuthenticated: true,
          isLoggingIn: false,
          authError: null,
        });
        return { success: true, user: userObj };
      }

      const errMsg = data.message || 'Unable to create account.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
    } catch (err) {
      const errMsg = 'Unable to connect to the server. Please try again.';
      set({ isLoggingIn: false, authError: errMsg });
      return { success: false, error: errMsg };
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
