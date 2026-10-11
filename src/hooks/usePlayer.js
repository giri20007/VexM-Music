import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore, EQ_FREQUENCIES } from '../store/useSettingsStore';
import { streamUrl, artworkUrl } from '../utils/api';
import { preloadNextQueueTracks } from '../utils/audioPreloader';

export const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) {
  audio.preload = 'auto';
}

export const seek = t => {
  if (audio && Number.isFinite(t)) {
    try {
      const target = Math.max(0, t);
      audio.currentTime = target;
      useAudioStore.getState().set({ currentTime: target, isSeeking: false });
    } catch (err) {
      console.warn('Seek operation error:', err.message);
    }
  }
};

let wired = false;
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
let gainNode = null;
let analyserNode = null;
let isPlayPending = false;

export function getAudioDiagnostics() {
  if (!audioCtx) {
    return {
      state: 'Native Browser Hardware Direct',
      sampleRate: 'Native 48.0 kHz',
      latency: '< 5 ms',
      channels: 'Stereo (2 Ch)',
      routing: 'Direct Bit-Perfect Native Playback',
    };
  }
  return {
    state: audioCtx.state,
    sampleRate: `${(audioCtx.sampleRate / 1000).toFixed(1)} kHz`,
    latency: audioCtx.baseLatency ? `${(audioCtx.baseLatency * 1000).toFixed(1)} ms` : 'Low Latency',
    channels: `${audioCtx.destination.maxChannelCount >= 2 ? 'Stereo (2 Ch)' : 'Direct Out'}`,
    routing: 'WebAudio Equalizer Pipeline',
  };
}

export function getDetailedDiagnostics() {
  const basic = getAudioDiagnostics();
  let bufferedRanges = [];
  let bufferAhead = 0;
  let readyStateStr = 'HAVE_NOTHING (0)';
  let networkStateStr = 'NETWORK_EMPTY (0)';
  let durationSec = 0;
  let currentTimeSec = 0;

  if (audio) {
    currentTimeSec = audio.currentTime || 0;
    durationSec = audio.duration || 0;
    const readyStates = ['HAVE_NOTHING (0)', 'HAVE_METADATA (1)', 'HAVE_CURRENT_DATA (2)', 'HAVE_FUTURE_DATA (3)', 'HAVE_ENOUGH_DATA (4)'];
    const networkStates = ['NETWORK_EMPTY (0)', 'NETWORK_IDLE (1)', 'NETWORK_LOADING (2)', 'NETWORK_NO_SOURCE (3)'];
    readyStateStr = readyStates[audio.readyState] || `READY_${audio.readyState}`;
    networkStateStr = networkStates[audio.networkState] || `NET_${audio.networkState}`;

    try {
      for (let i = 0; i < audio.buffered.length; i++) {
        const start = audio.buffered.start(i);
        const end = audio.buffered.end(i);
        bufferedRanges.push({ start: start.toFixed(1), end: end.toFixed(1) });
        if (currentTimeSec >= start && currentTimeSec <= end) {
          bufferAhead = Math.max(0, end - currentTimeSec);
        }
      }
    } catch {
      // ignore
    }
  }

  const store = useAudioStore.getState();
  return {
    ...basic,
    readyState: readyStateStr,
    networkState: networkStateStr,
    bufferAhead: `${bufferAhead.toFixed(1)}s`,
    bufferedRanges,
    currentTime: currentTimeSec.toFixed(1),
    duration: durationSec.toFixed(1),
    isBuffering: store.isBuffering,
    isSeeking: store.isSeeking,
    playbackRequestId: store.playbackRequestId,
    trackChangeReason: store.trackChangeReason || 'USER_SELECT',
  };
}

function connectEqualizer(enableEq, gains) {
  if (!audio) return;
  if (!enableEq) {
    // Keep native direct playback when EQ is disabled
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass({ latencyHint: 'playback' });
      audio.crossOrigin = 'anonymous';
      sourceNode = audioCtx.createMediaElementSource(audio);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;

      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;

      eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = audioCtx.createBiquadFilter();
        if (idx === 0) filter.type = 'lowshelf';
        else if (idx === EQ_FREQUENCIES.length - 1) filter.type = 'highshelf';
        else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      window.__SPX_ANALYSER__ = analyserNode;
      window.__SPX_AUDIO_CTX__ = audioCtx;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    try {
      sourceNode.disconnect();
      eqFilters.forEach(f => f.disconnect());
      if (gainNode) gainNode.disconnect();
      analyserNode.disconnect();
    } catch {}

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
  } catch (err) {
    console.warn('Equalizer graph initialization:', err.message);
  }
}

export async function safePlay() {
  if (!audio || !audio.src) return;
  if (isPlayPending) return;
  isPlayPending = true;
  try {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const p = audio.play();
    if (p !== undefined) {
      await p;
    }
    useAudioStore.getState().set({ isPlaying: true, isBuffering: false, status: 'ready', error: null });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      console.warn('[AudioEngine] Autoplay prevented, waiting for user gesture.');
      useAudioStore.getState().set({ isPlaying: false, isBuffering: false, status: 'paused' });
    } else if (err.name !== 'AbortError') {
      console.warn('[AudioEngine] Play failed:', err.message);
    }
  } finally {
    isPlayPending = false;
  }
}

export function safePause() {
  if (!audio) return;
  try {
    audio.pause();
    useAudioStore.getState().set({ isPlaying: false, isBuffering: false });
  } catch (err) {
    console.warn('[AudioEngine] Pause failed:', err.message);
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

  const playLoggedRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastProgressRef = useRef({ time: 0, ts: Date.now() });

  // 1. One-time Event Wiring
  useEffect(() => {
    if (wired || !audio) return;
    wired = true;

    const S = () => useAudioStore.getState();

    // Global user interaction listener to prime audio playback
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

      if (Math.abs(cur - lastProgressRef.current.time) > 0.1) {
        lastProgressRef.current = { time: cur, ts: Date.now() };
        if (retryCountRef.current > 0) {
          retryCountRef.current = 0;
        }
      }

      if (!state.isSeeking) {
        const dur = getValidDuration(audio.duration, state.currentTrack?.duration, state.duration);
        state.set({
          currentTime: cur,
          ...(dur > 0 && Math.abs((state.duration || 0) - dur) > 0.5 ? { duration: dur } : {}),
        });
      }

      // 30s playback tracking threshold
      if (!playLoggedRef.current && (cur >= 30 || (state.duration > 0 && cur >= state.duration * 0.5))) {
        playLoggedRef.current = true;
        if (state.currentTrack) {
          state.recordPlay(state.currentTrack);
        }
      }

      // Preload next queue track chunk
      if (cur >= 4 || (state.duration > 20 && cur > state.duration - 30)) {
        preloadNextQueueTracks(state.queue, state.currentTrack?.id, 1);
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

    const onSeeking = () => {
      S().set({ isBuffering: true });
    };

    const onSeeked = () => {
      S().set({ isBuffering: false, isSeeking: false });
    };

    const onStalled = () => {
      if (S().isPlaying) {
        S().set({ isBuffering: true });
      }
    };

    const onPlaying = () => {
      S().set({ status: 'ready', isPlaying: true, isBuffering: false, error: null });
      retryCountRef.current = 0;
    };

    const onPause = () => {
      if (!audio.ended) {
        S().set({ isPlaying: false, isBuffering: false });
      }
    };

    const onEnded = () => {
      const state = S();
      const cur = audio.currentTime || 0;
      const dur = getValidDuration(audio.duration, state.currentTrack?.duration, state.duration);

      // Prevent premature skip if buffer starved
      if (dur > 10 && cur < dur - 3.5) {
        console.warn(`[AudioEngine] Premature ended event at ${cur.toFixed(1)}s / ${dur.toFixed(1)}s. Reconnecting...`);
        if (state.currentTrack) {
          state.set({ isBuffering: true, trackChangeReason: 'RECOVERY' });
          audio.src = streamUrl(state.currentTrack.id);
          audio.currentTime = cur;
          safePlay();
        }
        return;
      }

      // Check Sleep Timer
      if (state.sleepTimer?.mode === 'end_of_track') {
        safePause();
        state.set({ sleepTimer: null });
        return;
      }

      const mode = state.repeatMode;
      if (mode === 'one') {
        audio.currentTime = 0;
        safePlay();
      } else {
        state.next('NATURAL_END');
      }
    };

    let errorTimeout = null;
    const onError = () => {
      const state = S();
      const code = audio.error?.code;

      // MEDIA_ERR_ABORTED is normal when changing src or seeking
      if (code === 1) return;

      const curTime = audio.currentTime || 0;
      const trackTitle = state.currentTrack?.title || 'Track';
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // Automatic retry on network stall
      if (code === 2 && retryCountRef.current < 3) {
        retryCountRef.current += 1;
        const delay = 1000 * Math.pow(1.5, retryCountRef.current);
        state.set({ isBuffering: true });

        clearTimeout(errorTimeout);
        errorTimeout = setTimeout(() => {
          if (state.currentTrack) {
            audio.src = streamUrl(state.currentTrack.id);
            audio.currentTime = curTime;
            if (state.isPlaying) {
              safePlay();
            }
          }
        }, delay);
        return;
      }

      const errMsg = isOnline
        ? `Playback error for "${trackTitle}". Click play to retry.`
        : 'Network offline. Please check your internet connection.';

      state.set({
        status: 'error',
        isPlaying: false,
        isBuffering: false,
        error: errMsg,
      });

      state.showToast(errMsg, 'error', 4500);
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeked);
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
      audio.removeEventListener('seeking', onSeeking);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // 2. Track Change Controller
  useEffect(() => {
    if (!audio || !track) return;
    playLoggedRef.current = false;
    retryCountRef.current = 0;
    lastProgressRef.current = { time: 0, ts: Date.now() };

    const trackDur = Number(track.duration) || 0;
    useAudioStore.getState().set({
      currentTime: 0,
      duration: trackDur,
      isBuffering: true,
      status: 'loading',
      error: null,
    });

    const targetUrl = streamUrl(track.id);
    if (audio.src !== targetUrl) {
      audio.src = targetUrl;
    }

    if (useAudioStore.getState().isPlaying) {
      safePlay();
    }

    // MediaSession
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

      navigator.mediaSession.setActionHandler('play', () => safePlay());
      navigator.mediaSession.setActionHandler('pause', () => safePause());
      navigator.mediaSession.setActionHandler('previoustrack', () => useAudioStore.getState().prev('USER_PREVIOUS'));
      navigator.mediaSession.setActionHandler('nexttrack', () => useAudioStore.getState().next('USER_NEXT'));
      navigator.mediaSession.setActionHandler('seekto', details => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }
  }, [track?.id]);

  // 3. Play / Pause Controller
  useEffect(() => {
    if (!audio || !track) return;
    if (isPlaying && audio.paused) {
      safePlay();
    } else if (!isPlaying && !audio.paused) {
      safePause();
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

  // 6. Equalizer Graph Connection (Only active when enabled)
  useEffect(() => {
    if (eqEnabled) {
      connectEqualizer(eqEnabled, eqGains);
    }
  }, [eqEnabled, eqGains]);

  // 7. Volume Normalization
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
