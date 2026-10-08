import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const pickNextTrack = (state, direction) => {
  const { queue, currentTrack, shuffle, repeatMode } = state;
  if (!queue.length) return null;
  const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);

  if (shuffle && direction > 0 && queue.length > 1) {
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * queue.length);
    } while (nextIdx === currentIndex);
    return queue[nextIdx];
  }

  let nextIdx = currentIndex + direction;
  if (nextIdx >= queue.length) {
    if (repeatMode !== 'all') return null;
    nextIdx = 0;
  }
  if (nextIdx < 0) {
    nextIdx = repeatMode === 'all' ? queue.length - 1 : 0;
  }
  return queue[nextIdx];
};

export const useAudioStore = create(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      status: 'idle', // idle | loading | ready | error
      error: null,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      speed: 1,
      repeatMode: 'off', // off | all | one
      shuffle: false,

      // UI Modals / Drawers
      isNowPlayingOpen: false,
      isQueueOpen: false,
      isEqualizerOpen: false,
      isSearchModalOpen: false,

      // User Collections (Persisted Locally)
      likedTrackIds: [],
      recentlyPlayed: [],
      playlists: [
        {
          id: 'favorites',
          name: 'My Favorites',
          createdAt: Date.now(),
          trackIds: [],
        },
      ],

      // Actions
      playTrack: (track, newQueue = null) => {
        if (!track) return;
        set(state => {
          let updatedQueue = newQueue || state.queue;
          if (!updatedQueue.some(t => t.id === track.id)) {
            updatedQueue = [...updatedQueue, track];
          }

          // Add to recently played (max 30 items)
          const filteredRecents = state.recentlyPlayed.filter(t => t.id !== track.id);
          const updatedRecents = [track, ...filteredRecents].slice(0, 30);

          return {
            currentTrack: track,
            isPlaying: true,
            status: 'loading',
            error: null,
            currentTime: 0,
            duration: track.duration || 0,
            queue: updatedQueue,
            recentlyPlayed: updatedRecents,
          };
        });
      },

      playNext: track => {
        if (!track) return;
        set(state => {
          const currentIndex = state.queue.findIndex(t => t.id === state.currentTrack?.id);
          const filtered = state.queue.filter(t => t.id !== track.id);
          const insertIdx = currentIndex >= 0 ? currentIndex + 1 : 0;
          filtered.splice(insertIdx, 0, track);
          return { queue: filtered };
        });
      },

      enqueue: track => {
        if (!track) return;
        set(state => {
          if (state.queue.some(t => t.id === track.id)) return state;
          return { queue: [...state.queue, track] };
        });
      },

      enqueueAll: tracks => {
        if (!tracks || !tracks.length) return;
        set(state => {
          const existingIds = new Set(state.queue.map(t => t.id));
          const newTracks = tracks.filter(t => !existingIds.has(t.id));
          return { queue: [...state.queue, ...newTracks] };
        });
      },

      removeFromQueue: id => {
        set(state => ({
          queue: state.queue.filter(t => t.id !== id),
        }));
      },

      clearQueue: () => {
        set(state => ({
          queue: state.currentTrack ? [state.currentTrack] : [],
        }));
      },

      moveInQueue: (from, to) => {
        set(state => {
          if (to < 0 || to >= state.queue.length) return state;
          const q = [...state.queue];
          const [moved] = q.splice(from, 1);
          q.splice(to, 0, moved);
          return { queue: q };
        });
      },

      shuffleQueue: () => {
        set(state => {
          if (state.queue.length <= 1) return state;
          const current = state.currentTrack;
          const remaining = state.queue.filter(t => t.id !== current?.id);
          for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
          }
          return { queue: current ? [current, ...remaining] : remaining };
        });
      },

      next: () => {
        const nextTrack = pickNextTrack(get(), 1);
        if (nextTrack) {
          get().playTrack(nextTrack);
        } else {
          set({ isPlaying: false });
        }
      },

      prev: () => {
        // If track played for more than 3 seconds, restart it
        if (get().currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        const prevTrack = pickNextTrack(get(), -1);
        if (prevTrack) {
          get().playTrack(prevTrack);
        }
      },

      togglePlay: () => {
        const { currentTrack, isPlaying } = get();
        if (!currentTrack) return;
        set({ isPlaying: !isPlaying });
      },

      toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),

      cycleRepeat: () => {
        const modes = { off: 'all', all: 'one', one: 'off' };
        set(s => ({ repeatMode: modes[s.repeatMode] || 'off' }));
      },

      setVolume: vol => {
        const safe = Math.max(0, Math.min(1, vol));
        set({ volume: safe, isMuted: safe === 0 });
      },

      toggleMute: () => set(s => ({ isMuted: !s.isMuted })),

      setSpeed: speed => set({ speed }),

      // Liked Tracks
      toggleLike: trackId => {
        set(state => {
          const id = String(trackId);
          const isLiked = state.likedTrackIds.includes(id);
          const updated = isLiked
            ? state.likedTrackIds.filter(i => i !== id)
            : [...state.likedTrackIds, id];
          return { likedTrackIds: updated };
        });
      },

      isLiked: trackId => get().likedTrackIds.includes(String(trackId)),

      // Playlists
      createPlaylist: name => {
        if (!name || !name.trim()) return;
        const newPlaylist = {
          id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: name.trim(),
          createdAt: Date.now(),
          trackIds: [],
        };
        set(state => ({
          playlists: [...state.playlists, newPlaylist],
        }));
        return newPlaylist;
      },

      deletePlaylist: id => {
        set(state => ({
          playlists: state.playlists.filter(p => p.id !== id),
        }));
      },

      renamePlaylist: (id, newName) => {
        if (!newName || !newName.trim()) return;
        set(state => ({
          playlists: state.playlists.map(p =>
            p.id === id ? { ...p, name: newName.trim() } : p
          ),
        }));
      },

      addTrackToPlaylist: (playlistId, trackId) => {
        set(state => ({
          playlists: state.playlists.map(p => {
            if (p.id === playlistId && !p.trackIds.includes(trackId)) {
              return { ...p, trackIds: [...p.trackIds, trackId] };
            }
            return p;
          }),
        }));
      },

      removeTrackFromPlaylist: (playlistId, trackId) => {
        set(state => ({
          playlists: state.playlists.map(p => {
            if (p.id === playlistId) {
              return { ...p, trackIds: p.trackIds.filter(id => id !== trackId) };
            }
            return p;
          }),
        }));
      },

      // UI View controls
      setNowPlayingOpen: val => set({ isNowPlayingOpen: val }),
      setQueueOpen: val => set({ isQueueOpen: val }),
      setEqualizerOpen: val => set({ isEqualizerOpen: val }),
      setSearchModalOpen: val => set({ isSearchModalOpen: val }),

      // Direct state updates
      set,
    }),
    {
      name: 'spideyxflash_audio_state',
      partialize: state => ({
        currentTrack: state.currentTrack,
        queue: state.queue,
        volume: state.volume,
        isMuted: state.isMuted,
        speed: state.speed,
        repeatMode: state.repeatMode,
        shuffle: state.shuffle,
        likedTrackIds: state.likedTrackIds,
        recentlyPlayed: state.recentlyPlayed,
        playlists: state.playlists,
      }),
    }
  )
);
