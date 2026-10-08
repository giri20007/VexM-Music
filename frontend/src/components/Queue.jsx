import React from 'react';
import { useAudioStore } from '../store/useAudioStore';

export default function Queue() {
  const queue = useAudioStore(s => s.queue);
  const currentId = useAudioStore(s => s.currentTrack?.id);
  const { playTrack, removeFromQueue, clearQueue, moveInQueue } = useAudioStore.getState();

  if (!queue.length) return <p className="p-6 text-center text-sm text-zinc-500">Queue is empty.</p>;
  return (
    <section aria-label="Queue">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{queue.length} tracks</p>
        <button className="text-sm text-zinc-400 hover:text-white" onClick={clearQueue}>Clear</button>
      </div>
      <ul>
        {queue.map((t, i) => (
          <li key={t.id} className={`flex items-center gap-1 rounded-xl px-3 py-2 ${t.id === currentId ? 'bg-accent/15' : 'hover:bg-white/5'}`}>
            <button className="min-w-0 flex-1 text-left" onClick={() => playTrack(t)} aria-label={`Play ${t.title}`}>
              <p className={`truncate text-sm ${t.id === currentId ? 'text-accent' : ''}`}>{t.title}</p>
              <p className="truncate text-xs text-zinc-500">{t.artist}</p>
            </button>
            <button className="btn h-8 w-8" aria-label="Move up" disabled={i === 0} onClick={() => moveInQueue(i, i - 1)}>↑</button>
            <button className="btn h-8 w-8" aria-label="Move down" disabled={i === queue.length - 1} onClick={() => moveInQueue(i, i + 1)}>↓</button>
            <button className="btn h-8 w-8" aria-label={`Remove ${t.title}`} onClick={() => removeFromQueue(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
