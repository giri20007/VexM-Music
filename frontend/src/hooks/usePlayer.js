import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore, EQ_FREQUENCIES } from '../store/useSettingsStore';
import { streamUrl, artworkUrl } from '../utils/api';

export const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) {
  audio.preload = 'metadata';
  audio.crossOrigin = 'anonymous';
}

export const seek = t => {
  if (audio && Number.isFinite(t)) {
    audio.currentTime = t;
    useAudioStore.getState().set({ currentTime: t });
  }
};

let wired = false;
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
let gainNode = null;
let analyserNode = null;
let preloadAudio = typeof Audio !== 'undefined' ? new Audio() : null;
if (preloadAudio) {
  preloadAudio.preload = 'none';
}

function setupWebAudio() {
  if (audioCtx || !audio) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    sourceNode = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    // Create 10-band peaking equalizer filters
    eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = audioCtx.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    // Chain: source -> eq0 -> eq1 ... eq9 -> gain -> analyser -> destination
    let lastNode = sourceNode;
    eqFilters.forEach(f => {
      lastNode.connect(f);
      lastNode = f;
    });
    lastNode.connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    window.__SPX_ANALYSER__ = analyserNode;
    window.__SPX_AUDIO_CTX__ = audioCtx;
  } catch (err) {
    console.warn('Web Audio initialization skipped:', err.message);
  }
}

export function usePlayer() {
  const track = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const volume = useAudioStore(s => s.volume);
  const isMuted = useAudioStore(s => s.isMuted);
  const speed = useAudioStore(s => s.speed);
  const repeatMode = useAudioStore(s => s.repeatMode);

  const eqEnabled = useSettingsStore(s => s.eqEnabled);
  const eqGains = useSettingsStore(s => s.eqGains);
  const volumeNormalization = useSettingsStore(s => s.volumeNormalization);

  const isFirstPlay = useRef(true);
  const playLoggedRef = useRef(false);
  const preloadedTrackIdRef = useRef(null);

  // 1. One-time Event Wiring
  useEffect(() => {
    if (wired || !audio) return;
    wired = true;

    const S = () => useAudioStore.getState();

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      S().set({ currentTime: cur });

      // 30s playback tracking threshold
      const dur = audio.duration || S().currentTrack?.duration || 0;
      if (!playLoggedRef.current && (cur >= 30 || (dur > 0 && cur >= dur * 0.5))) {
        playLoggedRef.current = true;
        if (S().currentTrack) {
          S().recordPlay(S().currentTrack);
        }
      }

      // Gapless Preloading for next track (15 seconds before track end)
      if (dur > 20 && cur > dur - 15 && preloadAudio) {
        const queue = S().queue;
        const currentIdx = queue.findIndex(t => t.id === S().currentTrack?.id);
        const nextTrack = currentIdx >= 0 && currentIdx < queue.length - 1 ? queue[currentIdx + 1] : null;
        if (nextTrack && preloadedTrackIdRef.current !== nextTrack.id) {
          preloadedTrackIdRef.current = nextTrack.id;
          preloadAudio.src = streamUrl(nextTrack.id);
          preloadAudio.load();
        }
      }
    };

    const onLoadedMetadata = () => {
      S().set({
        duration: audio.duration || S().currentTrack?.duration || 0,
        status: 'ready',
      });
    };

    const onWaiting = () => {
      S().set({ status: 'loading' });
    };

    const onPlaying = () => {
      S().set({ status: 'ready', isPlaying: true });
    };

    const onPause = () => {
      if (!audio.ended) {
        S().set({ isPlaying: false });
      }
    };

    const onEnded = () => {
      const state = S();
      // Check Sleep Timer "End of track" mode
      if (state.sleepTimer?.mode === 'end_of_track') {
        audio.pause();
        state.set({ isPlaying: false, sleepTimer: null });
        return;
      }

      const mode = state.repeatMode;
      if (mode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        state.next();
      }
    };

    const onError = () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      S().set({
        status: 'error',
        isPlaying: false,
        error: isOnline
          ? 'Stream unavailable from Telegram. Retrying or check connection.'
          : 'Network offline',
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Sleep Timer Countdown Ticker (1 second interval)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const state = useAudioStore.getState();
      const st = state.sleepTimer;
      if (st && st.mode === 'time' && st.endsAt) {
        const remaining = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000));
        if (remaining <= 0) {
          if (audio) audio.pause();
          state.set({ isPlaying: false, sleepTimer: null });
        } else if (remaining !== st.remaining) {
          state.set({ sleepTimer: { ...st, remaining } });
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // 2. Track Change Wiring
  useEffect(() => {
    if (!audio || !track) return;
    playLoggedRef.current = false;
    preloadedTrackIdRef.current = null;

    if (isFirstPlay.current) {
      setupWebAudio();
      isFirstPlay.current = false;
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    audio.src = streamUrl(track.id);

    if (useAudioStore.getState().isPlaying) {
      audio.play().catch(e => {
        console.warn('Autoplay prevented or streaming issue:', e.message);
      });
    }

    // MediaSession API Integration (Lockscreen controls & artwork)
    if ('mediaSession' in navigator) {
      const thumb = track.thumbnail || artworkUrl(track.id, track.title);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'SPiDEYxFLASH',
        artwork: [
          { src: thumb, sizes: '96x96', type: 'image/jpeg' },
          { src: thumb, sizes: '128x128', type: 'image/jpeg' },
          { src: thumb, sizes: '256x256', type: 'image/jpeg' },
          { src: thumb, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => useAudioStore.getState().set({ isPlaying: true }));
      navigator.mediaSession.setActionHandler('pause', () => useAudioStore.getState().set({ isPlaying: false }));
      navigator.mediaSession.setActionHandler('previoustrack', () => useAudioStore.getState().prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => useAudioStore.getState().next());
      navigator.mediaSession.setActionHandler('seekto', details => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }
  }, [track?.id]);

  // 3. Play / Pause State
  useEffect(() => {
    if (!audio || !track) return;
    if (isPlaying && audio.paused) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      audio.play().catch(() => {});
    }
    if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  // 4. Volume & Mute
  useEffect(() => {
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // 5. Playback Speed
  useEffect(() => {
    if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed, track?.id]);

  // 6. Equalizer Gain Updates
  useEffect(() => {
    if (!eqFilters.length) return;
    eqFilters.forEach((filter, idx) => {
      const targetGain = eqEnabled && eqGains[idx] !== undefined ? eqGains[idx] : 0;
      filter.gain.setTargetAtTime(targetGain, audioCtx ? audioCtx.currentTime : 0, 0.05);
    });
  }, [eqEnabled, eqGains]);

  // 7. Volume Normalization
  useEffect(() => {
    if (!gainNode) return;
    const targetGain = volumeNormalization ? 0.85 : 1.0;
    gainNode.gain.setTargetAtTime(targetGain, audioCtx ? audioCtx.currentTime : 0, 0.05);
  }, [volumeNormalization]);
}
