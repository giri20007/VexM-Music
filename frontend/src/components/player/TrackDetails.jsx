import React from 'react';
import { formatDuration, formatFileSize, formatDate } from '../../utils/formatters';
import { ShieldCheck, Database, Radio, HardDrive, FileAudio } from 'lucide-react';

export function TrackDetails({ track }) {
  if (!track) return null;

  const details = [
    { label: 'Title', value: track.title },
    { label: 'Artist', value: track.artist },
    { label: 'Album', value: track.album !== 'Unknown Album' ? track.album : null },
    { label: 'Album Artist', value: track.albumArtist !== 'Unknown Artist' ? track.albumArtist : null },
    { label: 'Genre', value: track.genre || null },
    { label: 'Year', value: track.year || null },
    { label: 'Duration', value: formatDuration(track.duration) },
    { label: 'File Format', value: track.format || 'MP3' },
    { label: 'Bitrate', value: track.bitrate ? `${track.bitrate} kbps` : (track.isLossless ? 'Lossless (VBR)' : null) },
    { label: 'Sample Rate', value: track.sampleRate ? `${track.sampleRate} Hz` : null },
    { label: 'Bit Depth', value: track.bitDepth ? `${track.bitDepth}-bit` : null },
    { label: 'File Size', value: formatFileSize(track.size) },
    { label: 'MIME Type', value: track.mimeType },
    { label: 'File Name', value: track.fileName },
    { label: 'Telegram Message ID', value: track.messageId ? `#${track.messageId}` : null },
    { label: 'Date Added', value: track.date ? formatDate(track.date) : null },
  ].filter(d => d.value !== null && d.value !== undefined && d.value !== '');

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-4 no-scrollbar select-none text-xs">
      <div className="p-3.5 rounded-2xl bg-bg-card border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs tracking-wider uppercase">
          <FileAudio className="w-4 h-4" />
          <span>Audio Specifications</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {details.map((item, idx) => (
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

      <div className="p-3 rounded-xl bg-bg-card/50 border border-white/5 flex items-center gap-3 text-warm-muted text-[11px]">
        <Database className="w-4 h-4 text-accent flex-shrink-0" />
        <span>Stored securely on Telegram media servers & streamed directly without temporary disk storage.</span>
      </div>
    </div>
  );
}
