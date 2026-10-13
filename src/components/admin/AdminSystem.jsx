import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Clock, Activity, RefreshCw } from 'lucide-react';
import { adminGetSystem } from '../../utils/adminApi';
import { formatDuration } from '../../utils/formatters';

export function AdminSystem() {
  const [sys, setSys] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSystem = async () => {
    setLoading(true);
    try {
      const data = await adminGetSystem();
      setSys(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystem();
  }, []);

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            System & Diagnostics
          </h2>
          <p className="text-xs text-warm-muted">
            Live process telemetry, memory, Node runtime, and Vercel environment status
          </p>
        </div>

        <button
          onClick={loadSystem}
          className="p-2 rounded-xl bg-bg-card hover:bg-bg-active border border-white/5 text-warm-white transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>

      {sys ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-2">
            <span className="text-xs font-bold text-warm-muted uppercase tracking-wider block">
              Node Runtime
            </span>
            <p className="text-xl font-bold font-mono text-warm-white">{sys.nodeVersion}</p>
            <p className="text-xs text-warm-muted">{sys.platform} ({sys.arch})</p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-2">
            <span className="text-xs font-bold text-warm-muted uppercase tracking-wider block">
              Process Memory (RSS)
            </span>
            <p className="text-xl font-bold font-mono text-warm-white">
              {sys.processMemory?.rssMb || 0} MB
            </p>
            <p className="text-xs text-warm-muted">Heap Used: {sys.processMemory?.heapUsedMb || 0} MB</p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-2">
            <span className="text-xs font-bold text-warm-muted uppercase tracking-wider block">
              Server Uptime
            </span>
            <p className="text-xl font-bold font-mono text-warm-white">
              {formatDuration(sys.uptimeSeconds)}
            </p>
            <p className="text-xs text-warm-muted">Active Node process</p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-warm-muted text-xs">
          Loading system telemetry...
        </div>
      )}
    </div>
  );
}
