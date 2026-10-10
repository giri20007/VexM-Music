import React, { useState, useEffect, useRef } from 'react';
import { streamUrl } from '../../utils/api';
import { useAudioStore } from '../../store/useAudioStore';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Wifi,
  FileCode,
  Layers,
  Clock,
} from 'lucide-react';
import { formatDuration, formatFileSize } from '../../utils/formatters';

const READY_STATES = [
  '0: HAVE_NOTHING (No information)',
  '1: HAVE_METADATA (Duration & dimensions known)',
  '2: HAVE_CURRENT_DATA (Current frame available)',
  '3: HAVE_FUTURE_DATA (Can play at least 2 frames)',
  '4: HAVE_ENOUGH_DATA (Can play smoothly to end)',
];

const NETWORK_STATES = [
  '0: NETWORK_EMPTY (Not yet initialized)',
  '1: NETWORK_IDLE (Active, network not downloading)',
  '2: NETWORK_LOADING (Browser is downloading data)',
  '3: NETWORK_NO_SOURCE (No audio source found)',
];

const MEDIA_ERROR_CODES = {
  1: 'MEDIA_ERR_ABORTED (User/client aborted fetch)',
  2: 'MEDIA_ERR_NETWORK (Network error occurred while fetching)',
  3: 'MEDIA_ERR_DECODE (Decoding error in media stream)',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED (Source format or MIME unsupported)',
};

/**
 * Isolated Audio Diagnostic Component (Phase 3 / Phase 14)
 * Bypasses custom controls, visualizers, DSP, and global state to test
 * native browser HTMLAudioElement streaming directly against the audio URL.
 */
export function IsolatedAudioTest({ track = null, onClose = null }) {
  const currentStoreTrack = useAudioStore(s => s.currentTrack);
  const activeTrack = track || currentStoreTrack;

  const audioRef = useRef(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [eventLogs, setEventLogs] = useState([]);
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
    paused: true,
    ended: false,
    muted: false,
    readyState: 0,
    networkState: 0,
    bufferedRanges: [],
    seekableRanges: [],
    error: null,
    hasStartedPlaying: false,
    lastEvent: 'NONE',
  });

  const [httpTestResult, setHttpTestResult] = useState(null);
  const [testingHttp, setTestingHttp] = useState(false);

  useEffect(() => {
    if (activeTrack) {
      const url = streamUrl(activeTrack.id);
      setTargetUrl(url);
      setEventLogs([
        { time: new Date().toLocaleTimeString(), event: 'INIT', details: `Source URL set to ${url}` },
      ]);
      setAudioState(s => ({
        ...s,
        currentTime: 0,
        duration: 0,
        paused: true,
        ended: false,
        readyState: 0,
        networkState: 0,
        bufferedRanges: [],
        seekableRanges: [],
        error: null,
        hasStartedPlaying: false,
        lastEvent: 'INIT',
      }));
    }
  }, [activeTrack?.id]);

  const logEvent = (eventName, details = '') => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLogs(prev => [{ time: timestamp, event: eventName, details }, ...prev.slice(0, 35)]);
  };

  const syncAudioState = eventName => {
    const el = audioRef.current;
    if (!el) return;

    const buffered = [];
    try {
      for (let i = 0; i < el.buffered.length; i++) {
        buffered.push({
          start: el.buffered.start(i).toFixed(2),
          end: el.buffered.end(i).toFixed(2),
        });
      }
    } catch { /* ignore */ }

    const seekable = [];
    try {
      for (let i = 0; i < el.seekable.length; i++) {
        seekable.push({
          start: el.seekable.start(i).toFixed(2),
          end: el.seekable.end(i).toFixed(2),
        });
      }
    } catch { /* ignore */ }

    const err = el.error
      ? {
          code: el.error.code,
          codeName: MEDIA_ERROR_CODES[el.error.code] || `CODE_${el.error.code}`,
          message: el.error.message || 'Unknown media error',
        }
      : null;

    setAudioState({
      currentTime: el.currentTime || 0,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
      paused: el.paused,
      ended: el.ended,
      muted: el.muted,
      readyState: el.readyState,
      networkState: el.networkState,
      bufferedRanges: buffered,
      seekableRanges: seekable,
      error: err,
      hasStartedPlaying: el.currentTime > 0 || !el.paused,
      lastEvent: eventName || 'STATE_SYNC',
    });
  };

  // Wire raw HTMLAudioElement events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const events = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'play',
      'playing',
      'pause',
      'waiting',
      'seeking',
      'seeked',
      'stalled',
      'suspend',
      'timeupdate',
      'ended',
      'error',
      'abort',
      'emptied',
    ];

    const handlers = {};
    events.forEach(evt => {
      handlers[evt] = e => {
        if (evt !== 'timeupdate') {
          const detail =
            evt === 'error' && el.error
              ? `Code: ${el.error.code} (${MEDIA_ERROR_CODES[el.error.code] || 'ERR'})`
              : evt === 'loadedmetadata'
              ? `Duration: ${el.duration?.toFixed(2)}s`
              : `t=${el.currentTime?.toFixed(2)}s`;
          logEvent(evt.toUpperCase(), detail);
        }
        syncAudioState(evt.toUpperCase());
      };
      el.addEventListener(evt, handlers[evt]);
    });

    return () => {
      events.forEach(evt => {
        if (handlers[evt]) el.removeEventListener(evt, handlers[evt]);
      });
    };
  }, [targetUrl]);

  const testHttpHeadAndRange = async () => {
    if (!targetUrl) return;
    setTestingHttp(true);
    setHttpTestResult(null);
    try {
      const startTime = performance.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023' },
      });
      const elapsed = (performance.now() - startTime).toFixed(1);
      const contentType = res.headers.get('content-type');
      const contentRange = res.headers.get('content-range');
      const acceptRanges = res.headers.get('accept-ranges');
      const contentLength = res.headers.get('content-length');
      const etag = res.headers.get('etag');

      let magicHeader = 'N/A';
      try {
        const arrayBuf = await res.clone().arrayBuffer();
        if (arrayBuf.byteLength >= 4) {
          const bytes = new Uint8Array(arrayBuf.slice(0, 4));
          magicHeader = Array.from(bytes)
            .map(b => String.fromCharCode(b))
            .join('')
            .replace(/[^\x20-\x7E]/g, '.');
        }
      } catch { /* ignore */ }

      setHttpTestResult({
        status: res.status,
        statusText: res.statusText,
        elapsed: `${elapsed} ms`,
        contentType,
        contentRange,
        acceptRanges,
        contentLength,
        etag,
        magicHeader,
        isAudio: contentType?.startsWith('audio/') || contentType?.includes('mpeg') || contentType?.includes('flac'),
      });
      logEvent('HTTP_RANGE_TEST', `Status ${res.status} (${elapsed}ms) - MIME: ${contentType}`);
    } catch (err) {
      setHttpTestResult({
        error: true,
        message: err.message,
      });
      logEvent('HTTP_RANGE_TEST_ERROR', err.message);
    } finally {
      setTestingHttp(false);
    }
  };

  const handleSeekOffset = delta => {
    const el = audioRef.current;
    if (el && Number.isFinite(el.duration)) {
      const target = Math.max(0, Math.min(el.duration, el.currentTime + delta));
      el.currentTime = target;
      logEvent('USER_SEEK', `Seeked to ${target.toFixed(2)}s`);
    }
  };

  if (!activeTrack) {
    return (
      <div className="p-6 rounded-3xl bg-bg-card border border-white/10 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <p className="text-sm font-bold text-warm-white">No Active Track Selected</p>
        <p className="text-xs text-warm-muted">Select a song from the library to inspect its isolated streaming pipeline.</p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-bg-secondary/95 border border-cyan-500/30 shadow-2xl backdrop-blur-2xl space-y-5 text-warm-white font-sans select-none max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-warm-white flex items-center gap-2">
              <span>Isolated Native Audio Pipeline Diagnostic</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Phase 3 / Dev Tool
              </span>
            </h3>
            <p className="text-xs text-warm-muted">Bypasses Web Audio DSP, React queue, and visualizers</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs text-warm-muted hover:text-white transition"
          >
            Close
          </button>
        )}
      </div>

      {/* Track & URL Metadata Banner */}
      <div className="p-3.5 rounded-2xl bg-bg-card/70 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-warm-muted font-mono">Testing Track</span>
          <span className="font-bold text-warm-white text-sm">{activeTrack.title}</span>
          <span className="text-warm-muted block">{activeTrack.artist} (ID: #{activeTrack.id})</span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-warm-muted font-mono">Target Stream URL</span>
          <code className="text-[11px] text-cyan-300 truncate block font-mono bg-black/40 p-1 rounded border border-white/5">
            {targetUrl}
          </code>
        </div>
      </div>

      {/* Native HTML5 Audio Element */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        <span className="block text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
          Native Browser &lt;audio controls&gt;
        </span>

        <audio
          ref={audioRef}
          src={targetUrl}
          controls
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-11 rounded-lg"
        />

        {/* Quick Test Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => audioRef.current?.play()}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 text-bg-primary text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition shadow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>audio.play()</span>
          </button>

          <button
            onClick={() => audioRef.current?.pause()}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>audio.pause()</span>
          </button>

          <button
            onClick={() => handleSeekOffset(-15)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Rewind className="w-3.5 h-3.5" />
            <span>-15s Seek</span>
          </button>

          <button
            onClick={() => handleSeekOffset(15)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>+15s Seek</span>
          </button>

          <button
            onClick={testHttpHeadAndRange}
            disabled={testingHttp}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500/30 transition"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{testingHttp ? 'Testing HTTP 206...' : 'Test HTTP 206 Range (bytes=0-1023)'}</span>
          </button>
        </div>
      </div>

      {/* HTTP Range Test Result */}
      {httpTestResult && (
        <div className="p-3.5 rounded-2xl bg-bg-card border border-purple-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              HTTP 206 Range Response Status: {httpTestResult.status} ({httpTestResult.statusText})
            </span>
            <span className="font-mono text-warm-muted text-[11px]">{httpTestResult.elapsed}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-warm-muted block text-[10px]">Content-Type</span>
              <span className="font-bold text-warm-white">{httpTestResult.contentType || 'none'}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-warm-muted block text-[10px]">Content-Range</span>
              <span className="font-bold text-cyan-300">{httpTestResult.contentRange || 'none'}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-warm-muted block text-[10px]">Content-Length</span>
              <span className="font-bold text-warm-white">{httpTestResult.contentLength || 'none'}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-warm-muted block text-[10px]">Binary Signature</span>
              <span className="font-bold text-emerald-400">{httpTestResult.magicHeader}</span>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-bg-card border border-white/5">
          <span className="block text-[10px] text-warm-muted uppercase">Ready State</span>
          <span className="font-bold text-cyan-300 text-[11px]">{READY_STATES[audioState.readyState]}</span>
        </div>

        <div className="p-3 rounded-2xl bg-bg-card border border-white/5">
          <span className="block text-[10px] text-warm-muted uppercase">Network State</span>
          <span className="font-bold text-warm-white text-[11px]">{NETWORK_STATES[audioState.networkState]}</span>
        </div>

        <div className="p-3 rounded-2xl bg-bg-card border border-white/5">
          <span className="block text-[10px] text-warm-muted uppercase">Current / Duration</span>
          <span className="font-bold text-warm-white">
            {formatDuration(audioState.currentTime)} / {formatDuration(audioState.duration)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-bg-card border border-white/5">
          <span className="block text-[10px] text-warm-muted uppercase">Buffered Time Ahead</span>
          <span className="font-bold text-emerald-400">
            {audioState.bufferedRanges.length > 0
              ? audioState.bufferedRanges.map(r => `${r.start}s - ${r.end}s`).join(', ')
              : '0.0s'}
          </span>
        </div>
      </div>

      {/* Media Error Alert if any */}
      {audioState.error && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{audioState.error.codeName}</p>
            <p className="text-[11px] text-red-300/80">{audioState.error.message}</p>
          </div>
        </div>
      )}

      {/* Real-Time Event Log Terminal */}
      <div className="p-3.5 rounded-2xl bg-black/70 border border-white/10 space-y-2 text-xs">
        <div className="flex items-center justify-between text-[11px] text-warm-muted font-mono border-b border-white/5 pb-1">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <FileCode className="w-3.5 h-3.5" />
            Media Event Stream Log (Real-time)
          </span>
          <span>{eventLogs.length} events recorded</span>
        </div>

        <div className="h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-warm-muted pr-1 no-scrollbar">
          {eventLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-2 hover:bg-white/5 px-1 py-0.5 rounded">
              <span className="text-warm-muted/60 text-[10px]">{log.time}</span>
              <span className={`font-bold ${log.event.includes('ERROR') ? 'text-red-400' : log.event === 'PLAYING' ? 'text-emerald-400' : 'text-cyan-300'}`}>
                [{log.event}]
              </span>
              <span className="text-warm-white/90 truncate">{log.details}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
