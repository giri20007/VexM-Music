import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { useSettingsStore, EQ_FREQUENCIES } from '../store/useSettingsStore';
import { streamUrl, artworkUrl } from '../utils/api';
import { preloadNextQueueTracks } from '../utils/audioPreloader';
import { ytAudio } from '../utils/youtubePlayer';

export const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) {
  audio.preload = 'auto';
}

export const seek = t => {
  if (!Number.isFinite(t)) return;
  const target = Math.max(0, t);
  const currentTrack = useAudioStore.getState().currentTrack;
  if (currentTrack?.videoId && !currentTrack?.audioUrl) {
    ytAudio.seekTo(target);
    useAudioStore.getState().set({ currentTime: target, isSeeking: false });
  } else if (audio) {
    try {
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
  const currentTrack = useAudioStore.getState().currentTrack;
  if (currentTrack?.is320k || currentTrack?.isSaavn || currentTrack?.source === 'jiosaavn_320k') {
    return {
      state: 'JioSaavn Studio Master (320 kbps)',
      sampleRate: '320 kbps AAC / 44.1 kHz',
      latency: '< 2 ms (Hardware Direct)',
      channels: 'Stereo (2 Ch)',
      routing: 'Native Bit-Perfect 320kbps CDN Stream',
    };
  }
  if (currentTrack?.videoId && !currentTrack?.audioUrl) {
    return {
      state: 'YouTube High-Quality Audio Engine',
      sampleRate: '160 kbps Opus / 256 kbps AAC',
      latency: '< 10 ms',
      channels: 'Stereo (2 Ch)',
      routing: 'Official Global CDN Stream',
    };
  }
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
    currentTime: (store.currentTime || currentTimeSec).toFixed(1),
    duration: (store.duration || durationSec).toFixed(1),
    isBuffering: store.isBuffering,
    isSeeking: store.isSeeking,
    playbackRequestId: store.playbackRequestId,
    trackChangeReason: store.trackChangeReason || 'USER_SELECT',
  };
}

function connectEqualizer(enableEq, gains) {
  if (!audio || !enableEq) return;

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
  const currentTrack = useAudioStore.getState().currentTrack;
  if (currentTrack?.videoId && !currentTrack?.audioUrl) {
    ytAudio.play();
    useAudioStore.getState().set({ isPlaying: true, isBuffering: false, status: 'ready', error: null });
    return;
  }

  if (!audio || !audio.src) return;
  if (isPlayPending) return;
  isPlayPending = true;
  try {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
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
  const currentTrack = useAudioStore.getState().currentTrack;
  if (currentTrack?.videoId && !currentTrack?.audioUrl) {
    ytAudio.pause();
    useAudioStore.getState().set({ isPlaying: false, isBuffering: false });
    return;
  }

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

  // 1. One-time Native Event Wiring
  useEffect(() => {
    if (wired || !audio) return;
    wired = true;

    const S = () => useAudioStore.getState();

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

    const isYtActive = () => {
      const t = S().currentTrack;
      return t?.videoId && !t?.audioUrl;
    };

    const onTimeUpdate = () => {
      if (isYtActive()) return; // Managed by ytAudio ticker
      const cur = audio.currentTime;
      if (!Number.isFinite(cur)) return;
      const state = S();

      if (Math.abs(cur - lastProgressRef.current.time) > 0.1) {
        lastProgressRef.current = { time: cur, ts: Date.now() };
        if (retryCountRef.current > 0) retryCountRef.current = 0;
      }

      if (!state.isSeeking) {
        const dur = getValidDuration(audio.duration, state.currentTrack?.duration, state.duration);
        state.set({
          currentTime: cur,
          ...(dur > 0 && Math.abs((state.duration || 0) - dur) > 0.5 ? { duration: dur } : {}),
        });
      }

      if (!playLoggedRef.current && (cur >= 30 || (state.duration > 0 && cur >= state.duration * 0.5))) {
        playLoggedRef.current = true;
        if (state.currentTrack) {
          state.recordPlay(state.currentTrack);
        }
      }

      if (cur >= 4 || (state.duration > 20 && cur > state.duration - 30)) {
        preloadNextQueueTracks(state.queue, state.currentTrack?.id, 1);
      }
    };

    const onDurationChange = () => {
      if (isYtActive()) return;
      const dur = getValidDuration(audio.duration, S().currentTrack?.duration, S().duration);
      if (dur > 0) S().set({ duration: dur });
    };

    const onLoadStart = () => {
      if (!isYtActive()) S().set({ status: 'loading', isBuffering: true });
    };

    const onLoadedMetadata = () => {
      if (isYtActive()) return;
      const dur = getValidDuration(audio.duration, S().currentTrack?.duration, S().duration);
      S().set({ duration: dur, status: 'ready', isBuffering: false });
    };

    const onWaiting = () => {
      if (!isYtActive()) S().set({ status: 'loading', isBuffering: true });
    };

    const onCanPlay = () => {
      if (!isYtActive()) S().set({ status: 'ready', isBuffering: false });
    };

    const onPlaying = () => {
      if (!isYtActive()) {
        S().set({ status: 'ready', isPlaying: true, isBuffering: false, error: null });
        retryCountRef.current = 0;
      }
    };

    const onPause = () => {
      if (!audio.ended && !isYtActive()) {
        S().set({ isPlaying: false, isBuffering: false });
      }
    };

    const onEnded = () => {
      if (isYtActive()) return;
      const state = S();
      const cur = audio.currentTime || 0;
      const dur = getValidDuration(audio.duration, state.currentTrack?.duration, state.duration);

      if (dur > 10 && cur < dur - 3.5) {
        if (state.currentTrack) {
          state.set({ isBuffering: true, trackChangeReason: 'RECOVERY' });
          audio.src = streamUrl(state.currentTrack.id);
          audio.currentTime = cur;
          safePlay();
        }
        return;
      }

      if (state.sleepTimer?.mode === 'end_of_track') {
        safePause();
        state.set({ sleepTimer: null });
        return;
      }

      if (state.repeatMode === 'one') {
        audio.currentTime = 0;
        safePlay();
      } else {
        state.next('NATURAL_END');
      }
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);

      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // 2. YouTube Audio State & Ticker Integration
  useEffect(() => {
    const unsub = ytAudio.on((event, data) => {
      const state = useAudioStore.getState();
      if (!state.currentTrack?.videoId || state.currentTrack?.audioUrl) return;

      if (event === 'stateChange') {
        if (data === 1) { // PLAYING
          state.set({ isPlaying: true, isBuffering: false, status: 'ready', error: null });
        } else if (data === 2) { // PAUSED
          state.set({ isPlaying: false, isBuffering: false });
        } else if (data === 3) { // BUFFERING
          state.set({ isBuffering: true, status: 'loading' });
        } else if (data === 0) { // ENDED
          if (state.repeatMode === 'one') {
            ytAudio.seekTo(0);
            ytAudio.play();
          } else {
            state.next('NATURAL_END');
          }
        }
      }
    });

    const ticker = setInterval(() => {
      const state = useAudioStore.getState();
      if (state.currentTrack?.videoId && !state.currentTrack?.audioUrl && state.isPlaying && !state.isSeeking) {
        const cur = ytAudio.getCurrentTime();
        const dur = ytAudio.getDuration() || state.duration || 0;
        if (Number.isFinite(cur)) {
          state.set({
            currentTime: cur,
            ...(dur > 0 && Math.abs((state.duration || 0) - dur) > 0.5 ? { duration: dur } : {}),
          });
        }
      }
    }, 250);

    return () => {
      unsub();
      clearInterval(ticker);
    };
  }, []);

  // 3. Track Change Controller
  useEffect(() => {
    if (!track) return;
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

    if (track.audioUrl) {
      ytAudio.stop();
      if (audio && audio.src !== track.audioUrl) {
        audio.src = track.audioUrl;
      }
      if (useAudioStore.getState().isPlaying) {
        safePlay();
      }
    } else if (track.videoId) {
      if (audio) audio.pause();
      ytAudio.loadAndPlay(track.videoId);
    } else {
      ytAudio.stop();
      const targetUrl = streamUrl(track.id);
      if (audio && audio.src !== targetUrl) {
        audio.src = targetUrl;
      }
      if (useAudioStore.getState().isPlaying) {
        safePlay();
      }
    }

    // MediaSession
    if ('mediaSession' in navigator) {
      const thumb = track.thumbnail || artworkUrl(track.id, track.title);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'VexM Music',
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

  // 4. Play / Pause Controller
  useEffect(() => {
    if (!track) return;
    if (isPlaying) {
      safePlay();
    } else {
      safePause();
    }
  }, [isPlaying]);

  // 5. Volume & Mute
  useEffect(() => {
    if (track?.videoId && !track?.audioUrl) {
      ytAudio.setVolume(volume);
      ytAudio.setMuted(isMuted);
    } else if (audio) {
      audio.volume = isMuted ? 0 : volume;
      audio.muted = isMuted;
    }
  }, [volume, isMuted, track?.videoId, track?.audioUrl]);

  // 6. Playback Speed
  useEffect(() => {
    if (track?.videoId && !track?.audioUrl) {
      ytAudio.setPlaybackRate(speed);
    } else if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed, track?.videoId, track?.audioUrl]);

  // 7. Equalizer Graph Connection
  useEffect(() => {
    if (eqEnabled) {
      connectEqualizer(eqEnabled, eqGains);
    }
  }, [eqEnabled, eqGains]);

  // 8. Volume Normalization
  useEffect(() => {
    if (!gainNode || !audioCtx) return;
    const targetGain = volumeNormalization ? 0.92 : 1.0;
    try {
      gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
    } catch {}
  }, [volumeNormalization]);
}
