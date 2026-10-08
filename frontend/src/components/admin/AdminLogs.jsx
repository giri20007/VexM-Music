import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Trash2, Shield } from 'lucide-react';
import { adminGetLogs, adminClearLogs } from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';

export function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const showToast = useAdminStore(s => s.showToast);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminGetLogs(100);
      setLogs(data.logs || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClear = async () => {
    if (!confirm('Clear all audit logs?')) return;
    try {
      await adminClearLogs();
      showToast('Logs cleared', 'info');
      loadLogs();
    } catch (err) {
      showToast(err.message || 'Failed to clear logs', 'error');
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Audit Activity Logs
          </h2>
          <p className="text-xs text-warm-muted">
            Immutable in-memory log of recent administrative actions and sync events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-2 rounded-xl bg-bg-card hover:bg-bg-active border border-white/5 text-warm-white transition"
            title="Reload logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 border border-white/5 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-bg-card border border-white/5 overflow-hidden shadow-2xl p-4">
        {logs.length === 0 ? (
          <p className="p-12 text-center text-xs text-warm-muted">No activity logs recorded.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 no-scrollbar font-mono text-xs">
            {logs.map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-bg-secondary/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">
                    {log.action}
                  </span>
                  <span className="text-warm-white text-xs">
                    {JSON.stringify(log.details || {})}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-warm-muted">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
