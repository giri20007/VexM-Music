import React, { memo } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { streamUrl } from '../utils/api';

const dur = s => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '--:--');
const mb = b => (b ? `${(b / 1048576).toFixed(1)} MB` : '');

const Row = memo(function Row({ t, active, onPlay, onQueue }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl px-3 py-2 ${active ? 'bg-accent/15' : 'hover:bg-white/5'}`}>
      <button className="min-w-0 flex-1 text-left" onClick={() => onPlay(t)} aria-label={`Play ${t.title}`}>
        <p className={`truncate text-sm font-medium ${active ? 'text-accent' : ''}`}>{t.title}</p>
        <p className="truncate text-xs text-zinc-500">{t.artist} · {dur(t.duration)} · {mb(t.size)}</p>
      </button>
      <button className="btn h-9 w-9" aria-label={`Add ${t.title} to queue`} onClick={() => onQueue(t)}>＋</button>
      <a className="btn h-9 w-9" aria-label={`Open ${t.title}`} href={streamUrl(t.id)} target="_blank" rel="noreferrer">↗</a>
    </li>
  );
});

export default function Library({ lib }) {
  const currentId = useAudioStore(s => s.currentTrack?.id);
  const playTrack = useAudioStore(s => s.playTrack);
  const enqueue = useAudioStore(s => s.enqueue);

  return (
    <section aria-label="Library">
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="search" aria-label="Search library" placeholder="Search title, artist, album…"
          value={lib.query} onChange={e => lib.setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-card px-3 py-2 text-sm placeholder:text-zinc-500" />
        <select aria-label="Sort" value={lib.sort} onChange={e => lib.setSort(e.target.value)}
          className="rounded-xl border border-white/10 bg-ink px-2 text-sm">
          <option value="recent">Recent</option>
          <option value="alpha">A–Z</option>
          <option value="duration">Duration</option>
          <option value="size">Size</option>
        </select>
        <button className="btn h-10 w-10 border border-white/10" aria-label="Refresh library" onClick={lib.refresh}>⟳</button>
      </div>

      {lib.state === 'connecting' && (
        <div>
          <p role="status" className="mb-3 text-sm text-zinc-400">
            {lib.retry ? 'Backend is waking up, hang tight…' : 'Connecting to Vex-M...'}
          </p>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton mb-2 h-12" />)}
        </div>
      )}

      {lib.state === 'error' && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="mb-2">{lib.error}</p>
          <button className="rounded-full bg-white px-4 py-1.5 text-black" onClick={lib.refresh}>Try again</button>
        </div>
      )}

      {lib.state === 'ready' && lib.total === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="font-medium">No audio files yet</p>
          <p className="mb-3 text-sm text-zinc-400">Add audio to your configured Telegram source and refresh the library.</p>
          <button className="rounded-full bg-white px-4 py-1.5 text-sm text-black" onClick={lib.refresh}>Refresh</button>
        </div>
      )}

      {lib.state === 'ready' && lib.total > 0 && (
        <ul>
          {lib.items.map(t => <Row key={t.id} t={t} active={t.id === currentId} onPlay={playTrack} onQueue={enqueue} />)}
          {!lib.items.length && <p className="p-4 text-sm text-zinc-500">No matches.</p>}
        </ul>
      )}
    </section>
  );
}
