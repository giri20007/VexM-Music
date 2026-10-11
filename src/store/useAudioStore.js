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
      isBuffering: false,
      isSeeking: false,
      playbackRequestId: 1,
      trackChangeReason: 'INITIAL', // INITIAL | USER_SELECT | USER_NEXT | USER_PREVIOUS | NATURAL_END | RECOVERY
      consecutiveFailureCount: 0,
      status: 'idle', // idle | loading | ready | error
      error: null,
      lastErrorDetails: null,
      toast: null, // { message: string, type: 'info' | 'error' | 'success', id: number }
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
      isSleepTimerOpen: false,

      // Sleep Timer
      sleepTimer: null, // { active: boolean, duration: number|string, remaining: number, mode: 'time'|'end_of_track', endsAt: number|null }

      // User Collections (Persisted Locally)
      likedTrackIds: [],
      recentlyPlayed: [],
      playHistory: [], // [{ id, title, artist, album, playedAt, playCount }]
      playlists: [
        {
          id: 'favorites',
          name: 'My Favorites',
          createdAt: Date.now(),
          trackIds: [],
        },
      ],

      // Actions
      playTrack: (track, newQueue = null, reason = 'USER_SELECT') => {
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
            isBuffering: true,
            isSeeking: false,
            playbackRequestId: (state.playbackRequestId || 0) + 1,
            trackChangeReason: reason,
            consecutiveFailureCount: 0,
            status: 'loading',
            error: null,
            lastErrorDetails: null,
            currentTime: 0,
            duration: Number(track.duration) || 0,
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

      next: (fallbackTracks = [], reason = 'USER_NEXT') => {
        const nextTrack = pickNextTrack(get(), 1);
        if (nextTrack) {
          get().playTrack(nextTrack, null, reason);
          return;
        }

        // Smart Queue Autoplay recommendation when queue reaches end and repeat is off
        const { currentTrack, repeatMode, queue } = get();
        if (repeatMode === 'off' && fallbackTracks.length > 0 && currentTrack) {
          // Priority 1: Same album
          let recommended = fallbackTracks.find(
            t => t.id !== currentTrack.id && t.album && t.album === currentTrack.album && !queue.some(q => q.id === t.id)
          );
          // Priority 2: Same artist
          if (!recommended) {
            recommended = fallbackTracks.find(
              t => t.id !== currentTrack.id && t.artist && t.artist === currentTrack.artist && !queue.some(q => q.id === t.id)
            );
          }
          // Priority 3: Any unplayed track
          if (!recommended) {
            recommended = fallbackTracks.find(
              t => t.id !== currentTrack.id && !queue.some(q => q.id === t.id)
            );
          }

          if (recommended) {
            get().playTrack(recommended, [...queue, recommended], 'AUTOPLAY_RECOMMENDED');
            return;
          }
        }

        set({ isPlaying: false, isBuffering: false });
      },

      prev: (reason = 'USER_PREVIOUS') => {
        // If track played for more than 3 seconds, restart it
        if (get().currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        const prevTrack = pickNextTrack(get(), -1);
        if (prevTrack) {
          get().playTrack(prevTrack, null, reason);
        }
      },

      togglePlay: () => {
        const { currentTrack } = get();
        if (!currentTrack) return;
        if (!audio) return;

        if (audio.paused) {
          set({ isBuffering: true, status: 'loading' });
          const p = audio.play();
          if (p !== undefined) {
            p.catch(err => {
              console.warn('[AudioEngine] audio.play() rejected:', err.name, err.message);
              if (err.name === 'NotAllowedError') {
                set({ isPlaying: false, isBuffering: false, status: 'paused' });
              } else if (err.name !== 'AbortError') {
                set({
                  isPlaying: false,
                  isBuffering: false,
                  status: 'error',
                  error: `Unable to start playback: ${err.message}`,
                });
              }
            });
          }
        } else {
          audio.pause();
          set({ isPlaying: false, isBuffering: false, status: 'paused' });
        }
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

      // Sleep Timer Actions
      setSleepTimerOpen: val => set({ isSleepTimerOpen: val }),

      setSleepTimer: secondsOrMode => {
        if (!secondsOrMode) {
          set({ sleepTimer: null });
          return;
        }

        if (secondsOrMode === 'end_of_track') {
          set({
            sleepTimer: {
              active: true,
              duration: 'end_of_track',
              remaining: 0,
              mode: 'end_of_track',
              endsAt: null,
            },
          });
          return;
        }

        if (typeof secondsOrMode === 'number') {
          const endsAt = Date.now() + secondsOrMode * 1000;
          set({
            sleepTimer: {
              active: true,
              duration: secondsOrMode,
              remaining: secondsOrMode,
              mode: 'time',
              endsAt,
            },
          });
        }
      },

      cancelSleepTimer: () => set({ sleepTimer: null }),

      // Play Count & History Tracking (threshold: 30s)
      recordPlay: track => {
        if (!track || !track.id) return;
        set(state => {
          const existing = state.playHistory.find(h => h.id === track.id);
          const playCount = (existing?.playCount || 0) + 1;
          const updatedHistory = [
            {
              id: track.id,
              title: track.title,
              artist: track.artist,
              album: track.album,
              playedAt: Date.now(),
              playCount,
            },
            ...state.playHistory.filter(h => h.id !== track.id),
          ].slice(0, 100);

          return { playHistory: updatedHistory };
        });
      },

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

      // Toast Alerts
      showToast: (message, type = 'info', durationMs = 4000) => {
        const id = Date.now();
        set({ toast: { message, type, id } });
        if (durationMs > 0) {
          setTimeout(() => {
            const current = get().toast;
            if (current && current.id === id) {
              set({ toast: null });
            }
          }, durationMs);
        }
      },
      clearToast: () => set({ toast: null }),
      setIsBuffering: isBuffering => set({ isBuffering }),

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
        playHistory: state.playHistory,
        playlists: state.playlists,
      }),
    }
  )
);
