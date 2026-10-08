import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { adminGetCacheStats, adminClearCache } from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';

export function AdminCache() {
  const [stats, setStats] = useState(null);
  const [clearing, setClearing] = useState(false);
  const showToast = useAdminStore(s => s.showToast);

  const loadStats = async () => {
    try {
      const data = await adminGetCacheStats();
      setStats(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = async target => {
    if (!confirm(`Are you sure you want to clear the ${target} cache? (Telegram audio files will remain safe)`)) return;
    setClearing(true);
    try {
      await adminClearCache(target);
      showToast(`Cache for ${target} cleared`, 'info');
      loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to clear cache', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
          Cache Management
        </h2>
        <p className="text-xs text-warm-muted">
          Manage local metadata, artwork references, and lyrics memory caches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Metadata Overrides</span>
            <Database className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">
            {stats?.metadataOverridesCount || 0}
          </p>
          <button
            onClick={() => handleClear('metadata')}
            disabled={clearing}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 text-xs font-semibold border border-white/5 transition"
          >
            Clear Metadata Cache
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Custom Artwork</span>
            <Database className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">
            {stats?.customArtworkCount || 0}
          </p>
          <button
            onClick={() => handleClear('artwork')}
            disabled={clearing}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 text-xs font-semibold border border-white/5 transition"
          >
            Clear Artwork Cache
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-warm-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Lyrics Store</span>
            <Database className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-warm-white">Active</p>
          <button
            onClick={() => handleClear('lyrics')}
            disabled={clearing}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 text-xs font-semibold border border-white/5 transition"
          >
            Clear Lyrics Cache
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 text-xs text-warm-muted flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-accent flex-shrink-0" />
        <span>Clearing caches removes local memory and override JSON entries only. It never touches or modifies original Telegram audio files.</span>
      </div>
    </div>
  );
}
