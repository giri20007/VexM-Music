import { create } from 'zustand';
import {
  adminLogin,
  adminLogout,
  adminGetMe,
  adminGetStats,
  getAdminToken,
} from '../utils/adminApi';

export const useAdminStore = create((set, get) => ({
  isAuthenticated: Boolean(getAdminToken()),
  isCheckingAuth: true,
  adminUser: null,
  activeTab: 'dashboard',
  stats: null,
  isStatsLoading: false,
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    set(state => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
  },

  dismissToast: id => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  setActiveTab: tab => set({ activeTab: tab }),

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const data = await adminGetMe();
      if (data && data.authenticated) {
        set({ isAuthenticated: true, adminUser: data.user, isCheckingAuth: false });
        get().fetchStats();
      } else {
        set({ isAuthenticated: false, adminUser: null, isCheckingAuth: false });
      }
    } catch {
      set({ isAuthenticated: false, adminUser: null, isCheckingAuth: false });
    }
  },

  login: async (username, password) => {
    try {
      const res = await adminLogin(username, password);
      set({ isAuthenticated: true, adminUser: res.user });
      get().showToast('Welcome to SPiDEYxFLASH Admin', 'success');
      get().fetchStats();
      return { success: true };
    } catch (err) {
      get().showToast(err.message || 'Login failed', 'error');
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    try {
      await adminLogout();
    } catch {
      // Ignore
    } finally {
      set({ isAuthenticated: false, adminUser: null, stats: null });
      get().showToast('Logged out of Admin Panel', 'info');
    }
  },

  fetchStats: async () => {
    set({ isStatsLoading: true });
    try {
      const stats = await adminGetStats();
      set({ stats, isStatsLoading: false });
    } catch (err) {
      set({ isStatsLoading: false });
    }
  },
}));
