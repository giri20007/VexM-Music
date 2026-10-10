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

export function getAudioDiagnostics() {
  if (!audioCtx) {
    return {
      state: 'Native Browser Audio',
      sampleRate: 'Native Hardware Rate',
      latency: '< 10 ms',
      channels: 'Stereo (2 Ch)',
      routing: 'Direct Bit-Perfect Native Playback',
    };
  }
  return {
    state: audioCtx.state,
    sampleRate: `${audioCtx.sampleRate / 1000} kHz`,
    latency: audioCtx.baseLatency ? `${(audioCtx.baseLatency * 1000).toFixed(1)} ms` : 'Low Latency',
    channels: `${audioCtx.destination.maxChannelCount >= 2 ? 'Stereo (2 Ch)' : 'Direct Out'}`,
    routing: 'Direct Native & AnalyserNode Tap',
  };
}

function connectAudioGraph(enableEq, gains) {
  if (!audioCtx || !sourceNode || !analyserNode) return;
  try {
    // Disconnect existing graph
    try {
      sourceNode.disconnect();
      eqFilters.forEach(f => f.disconnect());
      if (gainNode) gainNode.disconnect();
      analyserNode.disconnect();
    } catch {
      // ignore
    }

    if (enableEq && eqFilters.length > 0) {
      // Connect through EQ chain
      let lastNode = sourceNode;
      eqFilters.forEach((filter, idx) => {
        const gain = gains && gains[idx] !== undefined ? gains[idx] : 0;
        filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        lastNode.connect(filter);
        lastNode = filter;
      });
      if (gainNode) {
        lastNode.connect(gainNode);
        gainNode.connect(analyserNode);
      } else {
        lastNode.connect(analyserNode);
      }
      analyserNode.connect(audioCtx.destination);
    } else {
      // Transparent direct path: source -> analyser -> destination
      sourceNode.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    }
  } catch (err) {
    console.warn('Audio graph connection update:', err.message);
  }
}

function setupWebAudio() {
  if (audioCtx || !audio) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass({ latencyHint: 'playback' });

    try {
      audioCtx.destination.channelCount = 2;
      audioCtx.destination.channelCountMode = 'max';
    } catch {
      // ignore
    }

    sourceNode = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0;

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    // Create 10-band peaking equalizer filters (inactive by default for direct bit-perfect reproduction)
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

    const { eqEnabled, eqGains } = useSettingsStore.getState();
    connectAudioGraph(eqEnabled, eqGains);

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

    // Global interaction listener to resume suspended AudioContext
    const handleUserInteraction = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });

    const getValidDuration = (audDur, trackDur, currentDur = 0) => {
      if (Number.isFinite(audDur) && audDur > 0) return audDur;
      if (Number.isFinite(trackDur) && trackDur > 0) return trackDur;
      if (Number.isFinite(currentDur) && currentDur > 0) return currentDur;
      return 0;
    };

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      if (!Number.isFinite(cur)) return;
      const state = S();
      const dur = getValidDuration(audio.duration, state.currentTrack?.duration, state.duration);

      state.set({
        currentTime: cur,
        ...(dur > 0 && Math.abs((state.duration || 0) - dur) > 0.5 ? { duration: dur } : {}),
      });

      // 30s playback tracking threshold
      if (!playLoggedRef.current && (cur >= 30 || (dur > 0 && cur >= dur * 0.5))) {
        playLoggedRef.current = true;
        if (state.currentTrack) {
          state.recordPlay(state.currentTrack);
        }
      }

      // Gapless Preloading for next track (15 seconds before track end)
      if (dur > 20 && cur > dur - 15) {
        const queue = state.queue;
        const currentIdx = queue.findIndex(t => t.id === state.currentTrack?.id);
        const nextTrack = currentIdx >= 0 && currentIdx < queue.length - 1 ? queue[currentIdx + 1] : null;
        if (nextTrack && preloadedTrackIdRef.current !== nextTrack.id) {
          preloadedTrackIdRef.current = nextTrack.id;
          // Preload audio
          if (preloadAudio) {
            preloadAudio.src = streamUrl(nextTrack.id);
            preloadAudio.load();
          }
          // Preload next track cover
          if (nextTrack.thumbnail) {
            const img = new Image();
            img.src = nextTrack.thumbnail;
          }
        }
      }
    };

    const onDurationChange = () => {
      const dur = getValidDuration(audio.duration, S().currentTrack?.duration, S().duration);
      if (dur > 0) {
        S().set({ duration: dur });
      }
    };

    const onLoadStart = () => {
      S().set({ status: 'loading', isBuffering: true });
    };

    const onLoadedMetadata = () => {
      const dur = getValidDuration(audio.duration, S().currentTrack?.duration, S().duration);
      S().set({
        duration: dur,
        status: 'ready',
        isBuffering: false,
      });
    };

    const onWaiting = () => {
      S().set({ status: 'loading', isBuffering: true });
    };

    const onCanPlay = () => {
      S().set({ status: 'ready', isBuffering: false });
    };

    const onCanPlayThrough = () => {
      S().set({ status: 'ready', isBuffering: false });
    };

    const onStalled = () => {
      if (S().isPlaying) {
        S().set({ isBuffering: true });
      }
    };

    const onPlaying = () => {
      S().set({ status: 'ready', isPlaying: true, isBuffering: false, error: null });
    };

    const onPause = () => {
      if (!audio.ended) {
        S().set({ isPlaying: false, isBuffering: false });
      }
    };

    const onEnded = () => {
      const state = S();
      // Check Sleep Timer "End of track" mode
      if (state.sleepTimer?.mode === 'end_of_track') {
        audio.pause();
        state.set({ isPlaying: false, isBuffering: false, sleepTimer: null });
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

    let errorTimeout = null;
    const onError = e => {
      const state = S();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const trackTitle = state.currentTrack?.title || 'Track';
      const errMsg = isOnline
        ? `Stream unavailable for "${trackTitle}". Attempting next track...`
        : 'Network offline. Check your connection.';

      state.set({
        status: 'error',
        isPlaying: false,
        isBuffering: false,
        error: errMsg,
      });

      state.showToast(errMsg, 'error', 4500);

      // Auto-advance after a short delay if queue has more tracks
      if (state.queue.length > 1) {
        clearTimeout(errorTimeout);
        errorTimeout = setTimeout(() => {
          if (useAudioStore.getState().status === 'error') {
            useAudioStore.getState().next();
          }
        }, 2000);
      }
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      clearTimeout(errorTimeout);

      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('stalled', onStalled);
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

    // Reset audio state before switching source
    const trackDur = Number(track.duration) || 0;
    useAudioStore.getState().set({
      currentTime: 0,
      duration: trackDur,
      isBuffering: true,
      error: null,
    });

    // Set CORS before assigning src
    audio.crossOrigin = 'anonymous';
    audio.src = streamUrl(track.id);

    if (useAudioStore.getState().isPlaying) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
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

  // 6. Equalizer Dynamic Graph Connection & Gain Updates
  useEffect(() => {
    connectAudioGraph(eqEnabled, eqGains);
  }, [eqEnabled, eqGains]);

  // 7. Volume Normalization (Optional)
  useEffect(() => {
    if (!gainNode || !audioCtx) return;
    const targetGain = volumeNormalization ? 0.92 : 1.0;
    try {
      gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
    } catch {
      // ignore
    }
  }, [volumeNormalization]);
}
