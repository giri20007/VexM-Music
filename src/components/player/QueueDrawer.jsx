import React from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { X, Trash2, Shuffle, ArrowUp, ArrowDown, Music2 } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { SafeImage } from '../ui/SafeImage';

export function QueueDrawer() {
  const isQueueOpen = useAudioStore(s => s.isQueueOpen);
  const setQueueOpen = useAudioStore(s => s.setQueueOpen);
  const queue = useAudioStore(s => s.queue);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const playTrack = useAudioStore(s => s.playTrack);
  const removeFromQueue = useAudioStore(s => s.removeFromQueue);
  const clearQueue = useAudioStore(s => s.clearQueue);
  const shuffleQueue = useAudioStore(s => s.shuffleQueue);
  const moveInQueue = useAudioStore(s => s.moveInQueue);

  if (!isQueueOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setQueueOpen(false)}
    >
      <div
        className="w-full max-w-md h-full bg-[#111622] border-l border-white/10 shadow-2xl flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#141a29]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Play Queue</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#00a8e1]/20 text-[#00a8e1] font-semibold">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <>
                <button
                  onClick={shuffleQueue}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition"
                  title="Shuffle queue"
                  aria-label="Shuffle queue"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={clearQueue}
                  className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition"
                  title="Clear queue"
                  aria-label="Clear queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setQueueOpen(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition"
              aria-label="Close queue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Now Playing section */}
          {currentTrack && (
            <div>
              <p className="text-[11px] font-bold tracking-wider text-[#00a8e1] uppercase mb-2">
                Now Playing
              </p>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#00a8e1]/10 border border-[#00a8e1]/30">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0d1117] flex-shrink-0">
                  <SafeImage
                    src={getArtworkSrc(currentTrack, 80)}
                    track={currentTrack}
                    alt={currentTrack.title}
                    size={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#00a8e1]">{currentTrack.title}</p>
                  <p className="truncate text-[11px] text-white/50">{currentTrack.artist}</p>
                </div>
                <span className="text-xs text-white/40 tabular-nums">
                  {formatDuration(currentTrack.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Up Next section */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-warm-muted uppercase mb-2">
              Up Next ({queue.filter(t => t.id !== currentTrack?.id).length})
            </p>

            {queue.length <= 1 ? (
              <div className="p-8 text-center text-warm-muted text-xs border border-dashed border-white/5 rounded-xl">
                <p>No more tracks in queue.</p>
                <p className="text-[11px] text-warm-muted/60 mt-1">
                  Click + on any track in your library to add it here.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((t, idx) => {
                  const isCurrent = t.id === currentTrack?.id;
                  if (isCurrent) return null;
                  const cover = getArtworkSrc(t, 80);

                  return (
                    <div
                      key={`${t.id}_${idx}`}
                      className="group flex items-center justify-between gap-2.5 p-2 rounded-xl bg-bg-card hover:bg-bg-cardHover border border-white/5 text-xs transition"
                    >
                      <div
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
                          <SafeImage src={cover} track={t} alt={t.title} size={80} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-warm-white group-hover:text-accent">
                            {t.title}
                          </p>
                          <p className="truncate text-[10px] text-warm-muted">{t.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveInQueue(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded text-warm-muted hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveInQueue(idx, idx + 1)}
                          disabled={idx === queue.length - 1}
                          className="p-1 rounded text-warm-muted hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromQueue(t.id)}
                          className="p-1 rounded text-warm-muted hover:text-red-400 ml-1"
                          title="Remove from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
