import React from 'react';

/**
 * Shimmering Glassmorphic Skeleton Components for Loading States
 */

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 bg-bg-card/40 border border-white/5 animate-pulse">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-6 h-4 bg-white/5 rounded" />
        <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="w-3/5 h-3.5 bg-white/10 rounded-md" />
          <div className="w-2/5 h-2.5 bg-white/5 rounded-md" />
        </div>
      </div>
      <div className="w-12 h-3 bg-white/5 rounded" />
    </div>
  );
}

export function TrackListSkeleton({ count = 8 }) {
  return (
    <div className="bg-bg-secondary/40 p-2 rounded-2xl border border-white/8 space-y-1">
      {Array.from({ length: count }).map((_, idx) => (
        <TrackRowSkeleton key={idx} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, aspect = 'square' }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-3 rounded-2xl bg-bg-card border border-white/5 space-y-3 animate-pulse"
        >
          <div className={`w-full aspect-${aspect} rounded-xl bg-white/10`} />
          <div className="space-y-1.5">
            <div className="w-4/5 h-3 bg-white/10 rounded" />
            <div className="w-1/2 h-2.5 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
