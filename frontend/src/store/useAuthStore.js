import { create } from 'zustand';
import { BASE_URL } from '../utils/api';

const TOKEN_KEY = 'spx_user_token';
const ADMIN_JWT_KEY = 'spx_admin_jwt';
const USERS_STORAGE_KEY = 'spx_registered_users';
const CURRENT_USER_KEY = 'spx_current_user';

// Helper to get local mock user registry for serverless / offline operation
function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

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

    // 1. Check local cached user first
    let cachedUser = null;
    try {
      const rawUser = localStorage.getItem(CURRENT_USER_KEY);
      if (rawUser) cachedUser = JSON.parse(rawUser);
    } catch {
      // ignore
    }

    // 2. Try validating with backend /api/auth/me
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
          const isAdmin =
            data.user.role === 'ADMIN' ||
            data.user.role === 'admin' ||
            data.user.username?.toLowerCase() === 'spidey';

          const userObj = {
            ...data.user,
            isAdmin,
            role: isAdmin ? 'ADMIN' : (data.user.role || 'user'),
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
      // Backend unavailable or serverless cold start - fallback to local cached session
    }

    // 3. Fallback: If local token & cached user exist
    if (currentToken && cachedUser) {
      const isAdmin =
        cachedUser.role === 'ADMIN' ||
        cachedUser.role === 'admin' ||
        cachedUser.username?.toLowerCase() === 'spidey';

      set({
        user: { ...cachedUser, isAdmin, role: isAdmin ? 'ADMIN' : 'user' },
        isAuthenticated: true,
        isCheckingAuth: false,
        authError: null,
      });
      return true;
    }

    // Unauthenticated state
    set({
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
    });
    return false;
  },

  signIn: async (username, password) => {
    set({ isLoggingIn: true, authError: null });

    // Step 1: Check Hardcoded Admin Credentials
    if (
      (username === 'Spidey' || username.toLowerCase() === 'spidey') &&
      password === 'MS710924'
    ) {
      const adminToken = `spx_admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const adminUser = {
        id: 'admin_spidey',
        username: 'Spidey',
        displayName: 'Spidey (Admin)',
        role: 'ADMIN',
        isAdmin: true,
      };

      get().setAuthToken(adminToken, true);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));

      // Also inform backend if available
      try {
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'Spidey', password: 'MS710924' }),
          credentials: 'include',
        });
      } catch {
        // Backend optional in local/mock mode
      }

      set({
        user: adminUser,
        isAuthenticated: true,
        isLoggingIn: false,
        authError: null,
      });

      return { success: true, user: adminUser };
    }

    // Step 2: Regular User Sign In (Try backend first)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const isAdmin =
          data.user?.role === 'ADMIN' ||
          data.user?.role === 'admin' ||
          data.user?.username?.toLowerCase() === 'spidey';

        const userObj = {
          ...data.user,
          isAdmin,
          role: isAdmin ? 'ADMIN' : 'user',
        };

        const token = data.token || `spx_user_${Date.now()}`;
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
    } catch {
      // Backend unavailable, fallback to local storage
    }

    // Step 3: Local Storage Fallback for Regular Users
    const users = getStoredUsers();
    const matched = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (matched) {
      const token = `spx_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const userObj = {
        id: matched.id,
        username: matched.username,
        displayName: matched.displayName || matched.username,
        role: 'user',
        isAdmin: false,
      };

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

    set({
      isLoggingIn: false,
      authError: 'Invalid username or password',
    });
    return { success: false, error: 'Invalid username or password' };
  },

  signUp: async (username, password, displayName) => {
    set({ isLoggingIn: true, authError: null });

    // Try backend registration
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
          role: 'user',
          isAdmin: false,
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
    } catch {
      // Backend unavailable, handle locally
    }

    // Local Storage registration
    const users = getStoredUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      set({ isLoggingIn: false, authError: 'Username already taken' });
      return { success: false, error: 'Username is already taken' };
    }

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      username,
      password,
      displayName: displayName || username,
      role: 'user',
      createdAt: Date.now(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    const token = `spx_user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const userObj = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: 'user',
      isAdmin: false,
    };

    get().setAuthToken(token, false);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));

    set({
      user: userObj,
      isAuthenticated: true,
      isLoggingIn: false,
      authError: null,
    });

    return { success: true, user: userObj };
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
