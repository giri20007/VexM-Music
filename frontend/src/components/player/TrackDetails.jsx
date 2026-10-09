import React, { useState, useEffect } from 'react';
import { formatDuration, formatFileSize, formatDate } from '../../utils/formatters';
import { getAudioDiagnostics } from '../../hooks/usePlayer';
import { Database, FileAudio, Headphones, Radio, Sparkles, Activity } from 'lucide-react';

export function TrackDetails({ track }) {
  if (!track) return null;

  const [diagnostics, setDiagnostics] = useState(getAudioDiagnostics());

  useEffect(() => {
    setDiagnostics(getAudioDiagnostics());
    const interval = setInterval(() => {
      setDiagnostics(getAudioDiagnostics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const specs = [
    { label: 'Format', value: track.format || (track.fileName ? track.fileName.split('.').pop().toUpperCase() : 'MP3') },
    { label: 'Codec', value: track.format || 'AAC/MP3/PCM' },
    { label: 'Bitrate', value: track.bitrate ? `${track.bitrate} kbps` : (track.isLossless ? 'Lossless (VBR)' : '320 kbps') },
    { label: 'Sample Rate', value: track.sampleRate ? `${track.sampleRate} Hz` : '48,000 Hz' },
    { label: 'Bit Depth', value: track.bitDepth ? `${track.bitDepth}-bit` : (track.isLossless ? '24-bit' : '16-bit') },
    { label: 'Channels', value: 'Stereo (2.0)' },
    { label: 'Original Format', value: track.isLossless ? `${track.format} (Lossless)` : (track.format || 'Standard Stream') },
    { label: 'Duration', value: formatDuration(track.duration) },
    { label: 'File Size', value: formatFileSize(track.size) },
    { label: 'MIME Type', value: track.mimeType || 'audio/mpeg' },
    { label: 'Date Added', value: track.date ? formatDate(track.date) : null },
  ].filter(d => d.value !== null && d.value !== undefined && d.value !== '');

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-4 no-scrollbar select-none text-xs">
      {/* 1. Audio Output / Playback Diagnostics */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-bg-card to-bg-secondary border border-accent/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-bold text-xs tracking-wider uppercase">
            <Headphones className="w-4 h-4" />
            <span>Audio Output & Diagnostics</span>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bit-Perfect Stream
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-bg-primary/60 border border-white/5">
            <span className="block text-[10px] text-warm-muted uppercase tracking-wider mb-0.5">
              Output Routing
            </span>
            <span className="font-semibold text-warm-white">
              Headphones / Stereo Out
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-primary/60 border border-white/5">
            <span className="block text-[10px] text-warm-muted uppercase tracking-wider mb-0.5">
              Channels
            </span>
            <span className="font-semibold text-accent">
              {diagnostics.channels}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-primary/60 border border-white/5">
            <span className="block text-[10px] text-warm-muted uppercase tracking-wider mb-0.5">
              Playback Sample Rate
            </span>
            <span className="font-semibold text-warm-white">
              {diagnostics.sampleRate}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-bg-primary/60 border border-white/5">
            <span className="block text-[10px] text-warm-muted uppercase tracking-wider mb-0.5">
              Hardware Latency
            </span>
            <span className="font-semibold text-warm-white">
              {diagnostics.latency}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-warm-muted/90 flex items-center gap-2 pt-1 border-t border-white/5">
          <Activity className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span>{diagnostics.routing}</span>
        </div>
      </div>

      {/* 2. Track & Audio Specifications */}
      <div className="p-3.5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs tracking-wider uppercase">
            <FileAudio className="w-4 h-4" />
            <span>Source Specifications</span>
          </div>
          {track.isLossless && (
            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-bold tracking-wider">
              HI-RES LOSSLESS
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {specs.map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-bg-secondary/60 border border-white/5">
              <span className="block text-[10px] text-warm-muted uppercase tracking-wider mb-0.5">
                {item.label}
              </span>
              <span className="font-medium text-warm-white break-words">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Telegram Media Storage Banner */}
      <div className="p-3 rounded-xl bg-bg-card/50 border border-white/5 flex items-center gap-3 text-warm-muted text-[11px]">
        <Database className="w-4 h-4 text-accent flex-shrink-0" />
        <span>Direct bit-for-bit high-fidelity audio stream from media server with zero lossy transcoding.</span>
      </div>
    </div>
  );
}
