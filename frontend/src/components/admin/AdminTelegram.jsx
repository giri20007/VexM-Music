import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  adminGetTelegramStatus,
  adminTestTelegram,
  adminSyncLibrary,
  adminRefreshLibrary,
} from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';

export function AdminTelegram() {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const showToast = useAdminStore(s => s.showToast);
  const fetchStats = useAdminStore(s => s.fetchStats);

  const loadStatus = async () => {
    try {
      const data = await adminGetTelegramStatus();
      setStatus(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await adminTestTelegram();
      if (res.success) {
        showToast(`Telegram verified! Bot username: @${res.botUsername}`, 'success');
      } else {
        showToast(`Telegram error: ${res.error}`, 'error');
      }
      loadStatus();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Telegram test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await adminSyncLibrary();
      setSyncResult(res);
      showToast(`Sync completed! ${res.total} total tracks in index.`, 'success');
      loadStatus();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
          Telegram Media Integration
        </h2>
        <p className="text-xs text-warm-muted">
          Manage MTProto audio streaming gateway and cloud channel synchronization
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="p-6 rounded-3xl bg-bg-card border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#38231a] to-accent/30 flex items-center justify-center text-accent shadow-md">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <h3 className="text-base font-bold text-warm-white">
                  {status?.connected ? 'Connected to Telegram' : 'Telegram Disconnected'}
                </h3>
              </div>
              <p className="text-xs text-warm-muted mt-0.5">
                Channel / Chat: <span className="text-warm-white font-mono">{status?.channelTitle || status?.chatId || 'Configured via TELEGRAM_CHAT_ID'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-warm-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {status?.lastError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            <strong>Connection Error:</strong> {status.lastError}
          </div>
        )}
      </div>

      {/* Synchronization Engine */}
      <div className="p-6 rounded-3xl bg-bg-card border border-white/5 space-y-4">
        <h3 className="text-base font-bold text-warm-white flex items-center gap-2">
          <Database className="w-4 h-4 text-accent" />
          <span>Controlled Library Synchronization</span>
        </h3>
        <p className="text-xs text-warm-muted leading-relaxed">
          Full synchronization connects to your Telegram channel history, identifies all audio documents, and indexes their format, bitrate, sample rate, and thumbnails without downloading complete audio files to the server.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleFullSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/20 hover:scale-105 transition disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{syncing ? 'Synchronizing with Telegram...' : 'Run Full Library Sync'}</span>
          </button>
        </div>

        {syncResult && (
          <div className="p-4 rounded-2xl bg-bg-secondary border border-emerald-500/20 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Synchronization Completed Successfully</span>
            </div>
            <p className="text-warm-muted">
              Total tracks in catalog: <strong className="text-warm-white">{syncResult.total}</strong> · Added new: <strong className="text-warm-white">{syncResult.added}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
