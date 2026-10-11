import { useEffect } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { seek } from './usePlayer';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = e => {
      // Ignore shortcut if user is typing in an input, textarea, or select
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        if (e.key === 'Escape') {
          e.target.blur();
          useAudioStore.getState().set({
            isNowPlayingOpen: false,
            isQueueOpen: false,
            isEqualizerOpen: false,
            isSearchModalOpen: false,
          });
        }
        return;
      }

      // 1. Global Search: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const s = useAudioStore.getState();
        s.set({ isSearchModalOpen: !s.isSearchModalOpen });
        return;
      }

      // 2. Escape: Close Modals
      if (e.key === 'Escape') {
        e.preventDefault();
        useAudioStore.getState().set({
          isNowPlayingOpen: false,
          isQueueOpen: false,
          isEqualizerOpen: false,
          isSearchModalOpen: false,
        });
        return;
      }

      // 3. Space or K: Toggle Play/Pause
      if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useAudioStore.getState().togglePlay();
        return;
      }

      // 4. Arrow Left: Seek -5s or Prev Track (with Shift)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          useAudioStore.getState().prev();
        } else {
          const ct = useAudioStore.getState().currentTime;
          seek(Math.max(0, ct - 5));
        }
        return;
      }

      // 5. Arrow Right: Seek +5s or Next Track (with Shift)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          useAudioStore.getState().next();
        } else {
          const { currentTime: ct, duration: d } = useAudioStore.getState();
          seek(Math.min(d, ct + 5));
        }
        return;
      }

      // 6. Arrow Up / Down: Volume control
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const s = useAudioStore.getState();
        s.setVolume(Math.min(1, s.volume + 0.05));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const s = useAudioStore.getState();
        s.setVolume(Math.max(0, s.volume - 0.05));
        return;
      }

      // 7. M: Toggle Mute
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        useAudioStore.getState().toggleMute();
        return;
      }

      // 8. L: Toggle Like
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const current = useAudioStore.getState().currentTrack;
        if (current) {
          useAudioStore.getState().toggleLike(current.id);
        }
        return;
      }

      // 9. Q: Toggle Queue
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        const s = useAudioStore.getState();
        s.set({ isQueueOpen: !s.isQueueOpen });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
