import React, { memo } from 'react';
import { Sparkles, Play, X } from 'lucide-react';

export const NewTracksBanner = memo(function NewTracksBanner({
  notification,
  onPlay,
  onDismiss,
}) {
  if (!notification || !notification.count) return null;

  const firstTrack = notification.tracks?.[0];
  const count = notification.count;

  return (
    <aside
      aria-label="New songs notification"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-fade-in select-none pointer-events-auto"
    >
      <div className="relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#1c120e]/95 border border-accent/40 backdrop-blur-xl shadow-2xl shadow-accent/20 ring-1 ring-white/10">
        {/* Left: Animated Icon + Text */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse text-accent" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-accent">
                New Music Discovery
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            </div>
            <p className="text-xs font-semibold text-warm-white truncate mt-0.5">
              {count === 1 ? (
                <span>New track added: <span className="text-accent">{firstTrack?.title}</span></span>
              ) : (
                <span>{count} new songs added to your library</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Play Action & Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-bg-primary font-bold text-xs hover:scale-105 active:scale-95 transition shadow-lg shadow-accent/25"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            <span>Play Now</span>
          </button>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
});
