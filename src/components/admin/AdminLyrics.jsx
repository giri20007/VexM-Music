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
  Plus,
  Minus,
  ListOrdered,
  FileCode,
  Globe,
} from 'lucide-react';
import {
  adminGetLibrary,
  adminGetLyrics,
  adminSaveLyrics,
  adminDeleteLyrics,
} from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';
import { useAudioStore } from '../../store/useAudioStore';
import { parseLrc, formatTimeTag } from '../../utils/lrcParser';

const LANGUAGES = [
  'Tamil',
  'English',
  'Hindi',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Spanish',
  'Japanese',
  'Korean',
  'Other',
];

export function AdminLyrics() {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [lyricsType, setLyricsType] = useState('auto'); // auto | synced | plain
  const [lyricsLanguage, setLyricsLanguage] = useState('');
  const [editorMode, setEditorMode] = useState('interactive'); // 'interactive' | 'raw'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const showToast = useAdminStore(s => s.showToast);
  const currentTime = useAudioStore(s => s.currentTime);
  const playTrack = useAudioStore(s => s.playTrack);

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
        setLyricsLanguage(res.lyrics.language || '');
      } else {
        setLyricsText('');
        setLyricsLanguage('');
      }
    } catch {
      setLyricsText('');
      setLyricsLanguage('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTrack) return;
    setSaving(true);
    try {
      await adminSaveLyrics(selectedTrack.id, lyricsText, lyricsType, lyricsLanguage);
      showToast('Lyrics saved permanently to library', 'success');
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
      setLyricsLanguage('');
      showToast('Lyrics deleted', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete lyrics', 'error');
    }
  };

  const parsedLines = parseLrc(lyricsText);

  // Timing adjustment helpers
  const handleAdjustLineTime = (index, deltaSeconds) => {
    const lines = [...parsedLines];
    if (lines[index]) {
      lines[index].start = Math.max(0, (lines[index].start || lines[index].time || 0) + deltaSeconds);
      lines.sort((a, b) => (a.start || a.time) - (b.start || b.time));
      const serialized = lines
        .map(l => `${formatTimeTag(l.start || l.time)} ${l.text}`)
        .join('\n');
      setLyricsText(serialized);
    }
  };

  const handleSetCurrentTime = index => {
    const lines = [...parsedLines];
    if (lines[index]) {
      lines[index].start = Number(currentTime.toFixed(2));
      lines.sort((a, b) => (a.start || a.time) - (b.start || b.time));
      const serialized = lines
        .map(l => `${formatTimeTag(l.start || l.time)} ${l.text}`)
        .join('\n');
      setLyricsText(serialized);
    }
  };

  const handleLineTextChange = (index, newText) => {
    const lines = [...parsedLines];
    if (lines[index]) {
      lines[index].text = newText;
      const serialized = lines
        .map(l => `${formatTimeTag(l.start || l.time)} ${l.text}`)
        .join('\n');
      setLyricsText(serialized);
    }
  };

  const handleDeleteLine = index => {
    const lines = parsedLines.filter((_, i) => i !== index);
    const serialized = lines
      .map(l => `${formatTimeTag(l.start || l.time)} ${l.text}`)
      .join('\n');
    setLyricsText(serialized);
  };

  const handleAddLine = () => {
    const newTime = Number(currentTime.toFixed(2));
    const lines = [...parsedLines, { start: newTime, time: newTime, text: 'New lyric line' }];
    lines.sort((a, b) => (a.start || a.time) - (b.start || b.time));
    const serialized = lines
      .map(l => `${formatTimeTag(l.start || l.time)} ${l.text}`)
      .join('\n');
    setLyricsText(serialized);
  };

  const filteredTracks = tracks.filter(t =>
    `${t.title} ${t.artist}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-fade-in font-sans">
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
          Synchronized Lyrics Editor
        </h2>
        <p className="text-xs text-warm-muted">
          Add, adjust timing, and edit multilingual synchronized lyrics with permanent backend persistence
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

          <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1 no-scrollbar">
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

        {/* Right Column: Interactive Timing & LRC Editor (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-bg-card border border-white/5 p-6 space-y-4">
          {selectedTrack ? (
            <>
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-warm-white truncate">
                    {selectedTrack.title}
                  </h3>
                  <p className="text-xs text-warm-muted">{selectedTrack.artist}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playTrack(selectedTrack)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-warm-white transition"
                    title="Play track in player to adjust timing"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Audio</span>
                  </button>

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

              {/* Mode & Language Controls */}
              <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                {/* Mode Selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-secondary border border-white/5">
                  <button
                    onClick={() => setEditorMode('interactive')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      editorMode === 'interactive'
                        ? 'bg-accent text-bg-primary shadow'
                        : 'text-warm-muted hover:text-white'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Timing Editor</span>
                  </button>

                  <button
                    onClick={() => setEditorMode('raw')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      editorMode === 'raw'
                        ? 'bg-accent text-bg-primary shadow'
                        : 'text-warm-muted hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Raw LRC Text</span>
                  </button>
                </div>

                {/* Language Picker */}
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-warm-muted" />
                  <select
                    value={lyricsLanguage}
                    onChange={e => setLyricsLanguage(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-white/10 text-xs text-warm-white focus:outline-none"
                  >
                    <option value="">Auto / Default Language</option>
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Timing List Editor */}
              {editorMode === 'interactive' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-warm-muted px-1">
                    <span>
                      {parsedLines.length} timing lines · Current player time:{' '}
                      <span className="font-mono text-accent font-bold">
                        {currentTime.toFixed(2)}s
                      </span>
                    </span>
                    <button
                      onClick={handleAddLine}
                      className="flex items-center gap-1 text-xs text-accent hover:underline font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line</span>
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {parsedLines.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-bg-secondary/40 border border-white/5 text-center text-warm-muted text-xs space-y-2">
                        <p>No timed lyrics yet for this track.</p>
                        <button
                          onClick={handleAddLine}
                          className="px-4 py-1.5 rounded-xl bg-accent/20 border border-accent/40 text-accent font-bold text-xs hover:bg-accent/30 transition"
                        >
                          + Add First Lyric Line
                        </button>
                      </div>
                    ) : (
                      parsedLines.map((line, idx) => {
                        const lineTime = line.start !== undefined ? line.start : line.time;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-secondary border border-white/5 hover:border-white/10 text-xs transition"
                          >
                            {/* Timestamp tag */}
                            <span className="font-mono font-bold text-accent min-w-[65px] text-center bg-black/40 px-2 py-1 rounded-lg border border-white/5 text-[11px]">
                              {formatTimeTag(lineTime)}
                            </span>

                            {/* Text Input */}
                            <input
                              type="text"
                              value={line.text}
                              onChange={e => handleLineTextChange(idx, e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent text-xs"
                            />

                            {/* Timing buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleAdjustLineTime(idx, -0.5)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white"
                                title="-0.5s"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleAdjustLineTime(idx, 0.5)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white"
                                title="+0.5s"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleSetCurrentTime(idx)}
                                className="px-2 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 text-[10px] font-bold"
                                title="Set to current playback time"
                              >
                                Set Current
                              </button>
                              <button
                                onClick={() => handleDeleteLine(idx)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-warm-muted hover:text-red-400"
                                title="Delete line"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Raw LRC Text Mode */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-warm-muted">
                    <span>LRC Text (Format: <code>[mm:ss.xx] lyric text</code>)</span>
                    <span className="font-mono text-[11px] text-accent">
                      {parsedLines.length} synchronized lines parsed
                    </span>
                  </div>

                  <textarea
                    rows="14"
                    value={lyricsText}
                    onChange={e => setLyricsText(e.target.value)}
                    placeholder={`[00:12.50] First lyric line\n[00:17.20] Second lyric line\n[00:23.00] Chorus line`}
                    className="w-full p-4 rounded-2xl bg-bg-secondary border border-white/10 font-mono text-xs text-warm-white leading-relaxed placeholder:text-warm-muted/40 focus:outline-none focus:border-accent"
                  />
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
