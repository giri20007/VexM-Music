import React from 'react';
import {
  Music2,
  Disc3,
  Users,
  Radio,
  Server,
  Database,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { adminSyncLibrary, adminRefreshLibrary, adminTestTelegram } from '../../utils/adminApi';
import { formatDuration, formatFileSize, formatDate } from '../../utils/formatters';

export function AdminDashboard({ onNavigateTab }) {
  const stats = useAdminStore(s => s.stats);
  const isStatsLoading = useAdminStore(s => s.isStatsLoading);
  const fetchStats = useAdminStore(s => s.fetchStats);
  const showToast = useAdminStore(s => s.showToast);

  const handleFullSync = async () => {
    try {
      showToast('Starting full Telegram library sync...', 'info');
      const res = await adminSyncLibrary();
      showToast(`Sync complete! Added: ${res.added}, Total: ${res.total}`, 'success');
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Sync failed', 'error');
    }
  };

  const handleRefresh = async () => {
    try {
      showToast('Checking for new Telegram tracks...', 'info');
      const res = await adminRefreshLibrary();
      showToast(`Refresh complete! Added: ${res.added}`, 'success');
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Refresh failed', 'error');
    }
  };

  const handleTestTg = async () => {
    try {
      showToast('Testing Telegram connection...', 'info');
      const res = await adminTestTelegram();
      if (res.success) {
        showToast(`Telegram Connected! Bot: @${res.botUsername}`, 'success');
      } else {
        showToast(`Telegram error: ${res.error}`, 'error');
      }
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Telegram test failed', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            System Overview
          </h2>
          <p className="text-xs text-warm-muted">
            Live telemetry and statistics from SPiDEYxFLASH
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-bg-card hover:bg-bg-active border border-white/5 text-xs font-semibold text-warm-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span>Quick Refresh</span>
          </button>

          <button
            onClick={handleFullSync}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/20 hover:scale-105 transition"
          >
            <Database className="w-3.5 h-3.5 fill-current" />
            <span>Full Telegram Sync</span>
          </button>
        </div>
      </div>

      {/* Top 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Tracks */}
        <div
          onClick={() => onNavigateTab('library')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tracks</span>
            <Music2 className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">
            {stats?.tracks?.toLocaleString() || '0'}
          </p>
          <span className="text-[10px] text-warm-muted block truncate">
            {formatDuration(stats?.totalDuration || 0)} total
          </span>
        </div>

        {/* Albums */}
        <div
          onClick={() => onNavigateTab('albums')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Albums</span>
            <Disc3 className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">
            {stats?.albums?.toLocaleString() || '0'}
          </p>
          <span className="text-[10px] text-warm-muted block">Categorized</span>
        </div>

        {/* Artists */}
        <div
          onClick={() => onNavigateTab('artists')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Artists</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">
            {stats?.artists?.toLocaleString() || '0'}
          </p>
          <span className="text-[10px] text-warm-muted block">Identified</span>
        </div>

        {/* Telegram Status */}
        <div
          onClick={() => onNavigateTab('telegram')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Telegram</span>
            <Radio className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                stats?.telegram?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <p className="text-base font-black text-warm-white truncate">
              {stats?.telegram?.connected ? 'Connected' : 'Offline'}
            </p>
          </div>
          <span className="text-[10px] text-warm-muted block truncate">
            {stats?.telegram?.channel || 'Source channel'}
          </span>
        </div>

        {/* Backend Health */}
        <div
          onClick={() => onNavigateTab('system')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Backend</span>
            <Server className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-base font-black text-warm-white">Online</p>
          </div>
          <span className="text-[10px] text-warm-muted block">
            {stats?.system ? `${Math.round(stats.system.uptime / 60)}m uptime` : 'Ready'}
          </span>
        </div>

        {/* Library Cache */}
        <div
          onClick={() => onNavigateTab('cache')}
          className="p-4 rounded-2xl bg-bg-card hover:bg-bg-cardHover border border-white/5 cursor-pointer transition space-y-2"
        >
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Library</span>
            <Database className="w-4 h-4 text-accent" />
          </div>
          <p className="text-base font-black text-warm-white truncate">
            {stats?.lastSync ? 'Synced' : 'Ready'}
          </p>
          <span className="text-[10px] text-warm-muted block truncate">
            {stats?.lastSync ? formatDate(stats.lastSync) : 'Never'}
          </span>
        </div>
      </div>

      {/* System Health Status Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-3xl bg-bg-card border border-white/5 space-y-4">
          <h3 className="text-base font-bold text-warm-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <span>Infrastructure Health</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-white/5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-warm-white">Telegram Media Storage</span>
              </div>
              <span className="text-warm-muted">
                {stats?.telegram?.connected ? 'MTProto Gateway Active' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-white/5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-warm-white">HTTP 206 Partial Stream Engine</span>
              </div>
              <span className="text-warm-muted">Non-blocking range requests active</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-white/5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-warm-white">Zero-Database Storage Architecture</span>
              </div>
              <span className="text-warm-muted">Free-tier compatible in-memory Maps + JSON cache</span>
            </div>
          </div>
        </div>

        {/* Quick Operations */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-bg-card border border-white/5 space-y-4">
          <h3 className="text-base font-bold text-warm-white">Quick Actions</h3>

          <div className="space-y-2">
            <button
              onClick={handleTestTg}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-secondary hover:bg-bg-active border border-white/5 text-xs text-warm-white transition font-medium"
            >
              <span>Test Telegram Connection</span>
              <Radio className="w-3.5 h-3.5 text-accent" />
            </button>

            <button
              onClick={() => onNavigateTab('logs')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-secondary hover:bg-bg-active border border-white/5 text-xs text-warm-white transition font-medium"
            >
              <span>View Audit Logs</span>
              <Clock className="w-3.5 h-3.5 text-accent" />
            </button>

            <button
              onClick={() => onNavigateTab('cache')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-secondary hover:bg-bg-active border border-white/5 text-xs text-warm-white transition font-medium"
            >
              <span>Manage Application Cache</span>
              <Database className="w-3.5 h-3.5 text-accent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
