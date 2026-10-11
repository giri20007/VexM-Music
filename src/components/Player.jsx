import React from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { seek } from '../hooks/usePlayer';

const fmt = s => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function Progress() {
  const currentTime = useAudioStore(s => s.currentTime);
  const duration = useAudioStore(s => s.duration);
  return (
    <div>
      <input type="range" aria-label="Seek" min="0" max={duration || 0} step="1"
        value={Math.min(currentTime, duration || 0)} onChange={e => seek(+e.target.value)} />
      <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-400">
        <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
      </div>
    </div>
  );
}

export default function Player() {
  const s = useAudioStore();
  const t = s.currentTrack;
  const btn = 'btn h-11 w-11 text-xl';

  return (
    <section aria-label="Now playing" className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-card p-5 backdrop-blur">
      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.3em] text-zinc-500">Now Playing</p>
      <div className="mx-auto mb-5 flex aspect-square w-full max-w-[260px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-accent/30 to-white/5">
        <span className="select-none text-6xl font-black text-white/70">{t ? t.title[0]?.toUpperCase() : '♪'}</span>
      </div>
      <div className="mb-4 text-center">
        <h2 className="truncate text-lg font-semibold">{t ? t.title : 'Nothing playing'}</h2>
        <p className="truncate text-sm text-zinc-400">{t ? `${t.artist} · ${t.album}` : 'Pick a track from your library'}</p>
        <p role="status" className="h-5 text-xs text-zinc-400">
          {s.status === 'loading' && t && 'Loading…'}
          {s.status === 'error' && <span className="text-red-400">{s.error}</span>}
        </p>
      </div>
      <Progress />
      <div className="mt-3 flex items-center justify-between">
        <button className={`${btn} ${s.shuffle ? 'text-accent' : ''}`} aria-label="Shuffle" aria-pressed={s.shuffle} onClick={s.toggleShuffle}>⤮</button>
        <button className={btn} aria-label="Previous track" onClick={s.prev} disabled={!t}>⏮</button>
        <button className="btn h-14 w-14 bg-white text-2xl !text-black hover:!bg-zinc-200" aria-label={s.isPlaying ? 'Pause' : 'Play'}
          disabled={!t} onClick={() => s.set({ isPlaying: !s.isPlaying })}>
          {s.isPlaying ? '⏸' : '▶'}
        </button>
        <button className={btn} aria-label="Next track" onClick={s.next} disabled={!t}>⏭</button>
        <button className={`${btn} ${s.repeatMode !== 'off' ? 'text-accent' : ''}`} aria-label={`Repeat: ${s.repeatMode}`} onClick={s.cycleRepeat}>
          {s.repeatMode === 'one' ? '🔂' : '🔁'}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn h-9 w-9" aria-label={s.isMuted ? 'Unmute' : 'Mute'} onClick={() => s.set({ isMuted: !s.isMuted })}>
          {s.isMuted || s.volume === 0 ? '🔇' : '🔊'}
        </button>
        <input type="range" aria-label="Volume" min="0" max="1" step="0.01" value={s.isMuted ? 0 : s.volume}
          onChange={e => s.set({ volume: +e.target.value, isMuted: false })} />
        <select aria-label="Playback speed" value={s.speed} onChange={e => s.set({ speed: +e.target.value })}
          className="rounded-md border border-white/10 bg-ink px-2 py-1 text-xs">
          {SPEEDS.map(v => <option key={v} value={v}>{v}x</option>)}
        </select>
      </div>
    </section>
  );
}
