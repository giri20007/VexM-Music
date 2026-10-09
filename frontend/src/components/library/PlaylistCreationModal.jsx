import React, { useState } from 'react';
import { X, Plus, ListMusic, Sparkles } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

export function PlaylistCreationModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const createPlaylist = useAudioStore(s => s.createPlaylist);

  if (!isOpen) return null;

  const handleSubmit = e => {
    e.preventDefault();
    if (!name.trim()) return;
    const newPl = createPlaylist(name.trim());
    setName('');
    onClose();
    if (onCreated && newPl) {
      onCreated(newPl);
    }
  };

  const suggestions = ['Night Drives', 'Workout Fuel', 'Deep Focus', 'Chill Vibes', 'Lossless Gems'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <ListMusic className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-warm-white">Create New Playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-warm-muted">Playlist Name</label>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. My Favorite Bangers"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-sm text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
            />
          </div>

          {/* Quick Name Suggestions */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-warm-muted/70 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>Suggestions:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setName(s)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-warm-muted hover:text-white border border-white/5 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-bg-primary font-bold shadow-lg shadow-accent/25 hover:scale-105 active:scale-95 transition disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
