import React, { useState, useEffect } from 'react';
import {
  Mic2,
  Search,
  Save,
  Trash2,
  Play,
  Clock,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  adminGetLibrary,
  adminGetLyrics,
  adminSaveLyrics,
  adminDeleteLyrics,
} from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';
import { parseLrc } from '../../utils/lrcParser';

export function AdminLyrics() {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [lyricsType, setLyricsType] = useState('auto'); // auto | synced | plain
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const showToast = useAdminStore(s => s.showToast);

  useEffect(() => {
    adminGetLibrary({ limit: 50 }).then(data => {
      setTracks(data.items || []);
      if (data.items?.length > 0) {
        handleSelectTrack(data.items[0]);
      }
    });
  }, []);

  const handleSelectTrack = async track => {
    setSelectedTrack(track);
    setLoading(true);
    try {
      const res = await adminGetLyrics(track.id);
      if (res?.lyrics) {
        setLyricsText(res.lyrics.raw || '');
        setLyricsType(res.lyrics.type || 'auto');
      } else {
        setLyricsText('');
      }
    } catch {
      setLyricsText('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTrack) return;
    setSaving(true);
    try {
      await adminSaveLyrics(selectedTrack.id, lyricsText, lyricsType);
      showToast('Lyrics saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save lyrics', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTrack) return;
    if (!confirm(`Delete lyrics for "${selectedTrack.title}"?`)) return;
    try {
      await adminDeleteLyrics(selectedTrack.id);
      setLyricsText('');
      showToast('Lyrics deleted', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete lyrics', 'error');
    }
  };

  const parsedLines = parseLrc(lyricsText);

  const filteredTracks = tracks.filter(t =>
    `${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
          Synchronized Lyrics Editor
        </h2>
        <p className="text-xs text-warm-muted">
          Add or edit timestamped LRC format lyrics for tracks in your library
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Track Picker (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-bg-card border border-white/5 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-muted" />
            <input
              type="search"
              placeholder="Search tracks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-bg-secondary border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1 no-scrollbar">
            {filteredTracks.map(t => {
              const isSelected = selectedTrack?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTrack(t)}
                  className={`p-2.5 rounded-xl cursor-pointer text-xs transition ${
                    isSelected
                      ? 'bg-bg-active text-accent font-semibold border border-accent/20'
                      : 'hover:bg-bg-secondary text-warm-white'
                  }`}
                >
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-[10px] text-warm-muted">{t.artist}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: LRC Editor & Preview (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-bg-card border border-white/5 p-6 space-y-4">
          {selectedTrack ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-warm-white truncate">
                    {selectedTrack.title}
                  </h3>
                  <p className="text-xs text-warm-muted">{selectedTrack.artist}</p>
                </div>

                <div className="flex items-center gap-2">
                  {lyricsText && (
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-warm-muted hover:text-red-400 transition"
                      title="Delete lyrics"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Lyrics'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-warm-muted">
                  <span>LRC Content (Format: <code>[mm:ss.xx] lyric text</code>)</span>
                  <span className="font-mono text-[11px] text-accent">
                    {parsedLines.length} synchronized lines parsed
                  </span>
                </div>

                <textarea
                  rows="12"
                  value={lyricsText}
                  onChange={e => setLyricsText(e.target.value)}
                  placeholder={`[00:12.50] First lyric line\n[00:17.20] Second lyric line\n[00:23.00] Chorus line`}
                  className="w-full p-4 rounded-2xl bg-bg-secondary border border-white/10 font-mono text-xs text-warm-white leading-relaxed placeholder:text-warm-muted/40 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Real-time Timed Preview */}
              {parsedLines.length > 0 && (
                <div className="p-4 rounded-2xl bg-bg-secondary/60 border border-white/5 space-y-2">
                  <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
                    Real-time Parsed Preview
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs no-scrollbar">
                    {parsedLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-warm-muted flex-shrink-0 pt-0.5">
                          {line.time.toFixed(2)}s
                        </span>
                        <span className="text-warm-white font-medium">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-warm-muted text-xs">
              Select a track to edit or view its lyrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
