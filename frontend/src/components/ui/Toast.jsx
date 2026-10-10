import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function ToastContainer() {
  const toast = useAudioStore(s => s.toast);
  const clearToast = useAudioStore(s => s.clearToast);

  if (!toast) return null;

  const iconMap = {
    error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-accent flex-shrink-0" />,
  };

  const bgMap = {
    error: 'bg-red-950/90 border-red-500/30 text-red-200',
    success: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
    info: 'bg-[#18111e]/95 border-accent/40 text-warm-white',
  };

  return (
    <div className="fixed bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up flex items-center justify-center px-4 max-w-md w-full">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl shadow-black/80 text-xs font-medium ${
          bgMap[toast.type] || bgMap.info
        }`}
      >
        {iconMap[toast.type] || iconMap.info}
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={clearToast}
          className="p-1 rounded-lg hover:bg-white/10 text-warm-muted hover:text-white transition"
          aria-label="Dismiss toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
