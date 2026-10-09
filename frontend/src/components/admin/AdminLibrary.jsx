import React, { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Image,
  RefreshCw,
  Check,
  X,
  FileAudio,
  Radio,
  ExternalLink,
  Sparkles,
  Layers,
  Plus,
  Music,
  Link2,
  Play,
  Pause,
  Disc3,
} from 'lucide-react';
import {
  adminGetLibrary,
  adminCreateTrack,
  adminUpdateTrack,
  adminRemoveTrack,
  adminSaveArtwork,
  adminGetArtworkDiagnostics,
  adminGetArtworkCandidates,
} from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration, formatFileSize } from '../../utils/formatters';
import { artworkUrl } from '../../utils/api';

export function AdminLibrary() {
  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Add New Track Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    artist: '',
    audioUrl: '',
    artworkUrl: '',
    genre: 'Pop',
    album: '',
    year: new Date().getFullYear().toString(),
  });
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);

  // Edit Modal State
  const [editingTrack, setEditingTrack] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    album: '',
    albumArtist: '',
    genre: '',
    year: '',
    trackNumber: '',
    audioUrl: '',
    artworkUrl: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm Modal State
  const [deletingTrack, setDeletingTrack] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Artwork Diagnostic Modal State
  const [diagTrack, setDiagTrack] = useState(null);
  const [diagData, setDiagData] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Artwork Candidate Picker Modal State
  const [candidateTrack, setCandidateTrack] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [isApplyingCandidate, setIsApplyingCandidate] = useState(false);

  const showToast = useAdminStore(s => s.showToast);

  const handleOpenDiagnostics = async track => {
    setDiagTrack(track);
    setDiagLoading(true);
    try {
      const data = await adminGetArtworkDiagnostics(track.id);
      setDiagData(data);
    } catch (err) {
      showToast(err.message || 'Failed to load diagnostics', 'error');
    } finally {
      setDiagLoading(false);
    }
  };

  const handleOpenCandidates = async track => {
    setCandidateTrack(track);
    setCandidateLoading(true);
    try {
      const data = await adminGetArtworkCandidates(track.id);
      setCandidates(data.candidates || []);
    } catch (err) {
      showToast(err.message || 'Failed to load artwork candidates', 'error');
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleSelectCandidate = async candidate => {
    if (!candidateTrack) return;
    setIsApplyingCandidate(true);
    try {
      await adminSaveArtwork(candidateTrack.id, candidate.url);
      showToast(`Artwork updated to "${candidate.label}"`, 'success');
      if (editingTrack?.id === candidateTrack.id) {
        setEditForm(prev => ({ ...prev, artworkUrl: candidate.url }));
      }
      setCandidateTrack(null);
      fetchLibraryData(page, searchQuery);
    } catch (err) {
      showToast(err.message || 'Failed to apply candidate artwork', 'error');
    } finally {
      setIsApplyingCandidate(false);
    }
  };

  const fetchLibraryData = async (currentPage = 1, query = '') => {
    setLoading(true);
    try {
      const data = await adminGetLibrary({ q: query, page: currentPage, limit: 30 });
      setTracks(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast(err.message || 'Failed to load library', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLibraryData(1, searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateTrack = async e => {
    e.preventDefault();
    if (!addForm.title.trim() || !addForm.artist.trim()) {
      showToast('Track title and artist are required', 'error');
      return;
    }

    setIsCreatingTrack(true);
    try {
      await adminCreateTrack({
        title: addForm.title.trim(),
        artist: addForm.artist.trim(),
        audioUrl: addForm.audioUrl.trim(),
        artworkUrl: addForm.artworkUrl.trim(),
        genre: addForm.genre.trim(),
        album: addForm.album.trim(),
        year: addForm.year ? Number(addForm.year) : undefined,
      });

      showToast(`Track "${addForm.title}" added to library!`, 'success');
      setIsAddModalOpen(false);
      setAddForm({
        title: '',
        artist: '',
        audioUrl: '',
        artworkUrl: '',
        genre: 'Pop',
        album: '',
        year: new Date().getFullYear().toString(),
      });
      fetchLibraryData(1, searchQuery);
    } catch (err) {
      showToast(err.message || 'Failed to create track', 'error');
    } finally {
      setIsCreatingTrack(false);
    }
  };

  const handleOpenEdit = track => {
    setEditingTrack(track);
    setEditForm({
      title: track.title || '',
      artist: track.artist || '',
      album: track.album && track.album !== 'Unknown Album' ? track.album : '',
      albumArtist: track.albumArtist && track.albumArtist !== 'Unknown Artist' ? track.albumArtist : '',
      genre: track.genre || '',
      language: track.language || '',
      year: track.year ? String(track.year) : '',
      trackNumber: track.trackNumber ? String(track.trackNumber) : '',
      audioUrl: track.audioUrl || track.streamUrl || '',
      artworkUrl: track.thumbnail && !track.thumbnail.startsWith('/api/artwork') ? track.thumbnail : '',
    });
  };

  const handleArtworkFileUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setEditForm(prev => ({ ...prev, artworkUrl: ev.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddArtworkFileUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setAddForm(prev => ({ ...prev, artworkUrl: ev.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editingTrack) return;
    setSavingEdit(true);

    try {
      const updates = {
        title: editForm.title,
        artist: editForm.artist,
        album: editForm.album,
        albumArtist: editForm.albumArtist,
        genre: editForm.genre,
        language: editForm.language,
        audioUrl: editForm.audioUrl,
        year: editForm.year ? Number(editForm.year) : null,
        trackNumber: editForm.trackNumber ? Number(editForm.trackNumber) : null,
      };

      await adminUpdateTrack(editingTrack.id, updates);
      await adminSaveArtwork(editingTrack.id, editForm.artworkUrl || null);

      showToast('Track metadata and artwork updated successfully', 'success');
      setEditingTrack(null);
      fetchLibraryData(page, searchQuery);
    } catch (err) {
      showToast(err.message || 'Failed to save track', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTrack) return;
    setIsDeleting(true);

    try {
      await adminRemoveTrack(deletingTrack.id);
      showToast('Track removed from library catalog', 'info');
      setDeletingTrack(null);
      fetchLibraryData(page, searchQuery);
    } catch (err) {
      showToast(err.message || 'Failed to remove track', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection & Audio Store State
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const playTrack = useAudioStore(s => s.playTrack);
  const togglePlay = useAudioStore(s => s.togglePlay);

  const handleToggleSelect = id => {
    setSelectedTrackIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTrackIds.length === tracks.length) {
      setSelectedTrackIds([]);
    } else {
      setSelectedTrackIds(tracks.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedTrackIds.length) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedTrackIds.length} tracks from the library?`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      for (const id of selectedTrackIds) {
        await adminRemoveTrack(id);
      }
      showToast(`Successfully removed ${selectedTrackIds.length} tracks`, 'success');
      setSelectedTrackIds([]);
      fetchLibraryData(page, searchQuery);
    } catch (err) {
      showToast(err.message || 'Failed to delete selected tracks', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Library Management ({total.toLocaleString()} tracks)
          </h2>
          <p className="text-xs text-warm-muted">
            Manage metadata, edit track details, or modify catalog visibility
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Track</span>
          </button>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
            <input
              type="search"
              placeholder="Search library..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none"
            />
          </div>

          <button
            onClick={() => fetchLibraryData(page, searchQuery)}
            className="p-2 rounded-xl bg-bg-card hover:bg-bg-active border border-white/5 text-warm-white transition"
            title="Reload library"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedTrackIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-accent/15 border border-accent/30 text-xs font-semibold animate-scale-up">
          <span className="text-accent">
            {selectedTrackIds.length} track(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition font-bold disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBulkDeleting ? 'Deleting...' : 'Delete Selected'}</span>
            </button>
            <button
              onClick={() => setSelectedTrackIds([])}
              className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-warm-muted hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tracks Table */}
      <div className="rounded-3xl bg-bg-card border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-warm-white">
            <thead className="bg-bg-secondary text-[11px] font-bold uppercase tracking-wider text-warm-muted border-b border-white/5">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={tracks.length > 0 && selectedTrackIds.length === tracks.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-white/20 bg-bg-card accent-accent cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="p-4 w-12 text-center">ID</th>
                <th className="p-4">Track & Artist</th>
                <th className="p-4 hidden md:table-cell">Album</th>
                <th className="p-4 hidden sm:table-cell">Format</th>
                <th className="p-4 hidden lg:table-cell">Size</th>
                <th className="p-4 text-right">Duration</th>
                <th className="p-4 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tracks.map(t => {
                const cover = t.thumbnail || artworkUrl(t.id, t.title);
                const isSelected = selectedTrackIds.includes(t.id);
                const isThisPlaying = isPlaying && currentTrack?.id === t.id;

                return (
                  <tr
                    key={t.id}
                    className={`transition ${
                      isSelected ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-bg-active/40'
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(t.id)}
                        className="rounded border-white/20 bg-bg-card accent-accent cursor-pointer"
                      />
                    </td>

                    <td className="p-4 text-center font-mono text-warm-muted text-[11px]">
                      #{t.id}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={cover}
                          alt={t.title}
                          onError={e => {
                            e.currentTarget.src = artworkUrl(t.id, t.title);
                          }}
                          className="w-9 h-9 rounded-lg object-cover bg-bg-secondary flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-warm-white truncate max-w-xs sm:max-w-sm">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-warm-muted truncate">{t.artist}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 hidden md:table-cell text-warm-muted truncate max-w-xs">
                      {t.album !== 'Unknown Album' ? t.album : '—'}
                    </td>

                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-accent font-mono">
                        {t.format || 'MP3'}
                      </span>
                    </td>

                    <td className="p-4 hidden lg:table-cell text-warm-muted font-mono">
                      {formatFileSize(t.size)}
                    </td>

                    <td className="p-4 text-right font-mono text-warm-muted tabular-nums">
                      {formatDuration(t.duration)}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Audio Preview Action */}
                        <button
                          onClick={() => {
                            if (isThisPlaying) {
                              togglePlay();
                            } else {
                              playTrack(t, tracks);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isThisPlaying
                              ? 'text-accent bg-accent/20 shadow'
                              : 'text-warm-muted hover:text-white hover:bg-white/10'
                          }`}
                          title={isThisPlaying ? 'Pause Preview' : 'Play Preview'}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenCandidates(t)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-warm-muted hover:text-amber-300 transition"
                          title="Artwork Candidate Picker"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDiagnostics(t)}
                          className="p-1.5 rounded-lg hover:bg-accent/20 text-warm-muted hover:text-accent transition"
                          title="Artwork Pipeline Diagnostics"
                        >
                          <Image className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-warm-muted hover:text-white transition"
                          title="Edit metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTrack(t)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-warm-muted hover:text-red-400 transition"
                          title="Remove from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/5 bg-bg-secondary text-xs text-warm-muted">
            <span>
              Showing Page {page} of {totalPages} ({total} total tracks)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchLibraryData(page - 1, searchQuery)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchLibraryData(page + 1, searchQuery)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT METADATA MODAL */}
      {editingTrack && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setEditingTrack(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-warm-white">
                Edit Track Metadata (#{editingTrack.id})
              </h3>
              <button onClick={() => setEditingTrack(null)} className="text-warm-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-warm-muted">Track Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Artist</label>
                  <input
                    type="text"
                    value={editForm.artist}
                    onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Album</label>
                  <input
                    type="text"
                    value={editForm.album}
                    onChange={e => setEditForm({ ...editForm, album: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Genre</label>
                  <input
                    type="text"
                    value={editForm.genre}
                    onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Language</label>
                  <input
                    type="text"
                    placeholder="Tamil, English..."
                    value={editForm.language}
                    onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Year</label>
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Track #</label>
                  <input
                    type="number"
                    value={editForm.trackNumber}
                    onChange={e => setEditForm({ ...editForm, trackNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Audio Stream Link / Direct URL */}
              <div className="space-y-1">
                <label className="font-semibold text-warm-muted flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-accent" />
                  <span>Audio Stream Link / Direct File URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://... / audio stream link"
                  value={editForm.audioUrl}
                  onChange={e => setEditForm({ ...editForm, audioUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent font-mono text-xs"
                />
              </div>

              {/* Artwork Management: URL or Local File Upload + Live Preview */}
              <div className="space-y-2 p-3 rounded-2xl bg-bg-secondary/70 border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-warm-muted">Cover Artwork</label>
                  {editForm.artworkUrl && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, artworkUrl: '' })}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear Custom Cover
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    {editForm.artworkUrl ? (
                      <img src={editForm.artworkUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <img src={artworkUrl(editingTrack.id, editingTrack.title)} alt="Current" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      placeholder="Paste Image URL (https://...)"
                      value={editForm.artworkUrl}
                      onChange={e => setEditForm({ ...editForm, artworkUrl: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenCandidates(editingTrack)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold text-amber-300 transition border border-amber-500/30"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Candidate Picker</span>
                      </button>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-warm-white transition border border-white/10">
                        <span>Upload Custom Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleArtworkFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-warm-muted/60">
                        {editForm.artworkUrl?.startsWith('data:image') ? '✓ Custom file attached' : 'JPG, PNG, WebP'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold shadow-md shadow-accent/25 hover:scale-105 transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Metadata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / ADD NEW TRACK MODAL */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-warm-white">
                    Add New Track to Library
                  </h3>
                  <p className="text-[11px] text-warm-muted">
                    Publish music with direct audio links, cover art, and genre classification
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-warm-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrack} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-warm-muted">
                  Track Title <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starboy / Bohemian Rhapsody"
                  value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">
                    Artist <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Weeknd"
                    value={addForm.artist}
                    onChange={e => setAddForm({ ...addForm, artist: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Category / Genre</label>
                  <input
                    type="text"
                    placeholder="e.g. Pop, Hip-Hop, Rock, OST"
                    value={addForm.genre}
                    onChange={e => setAddForm({ ...addForm, genre: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-warm-muted flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-accent" />
                  <span>Audio URL / Stream Link</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3 (Direct streaming link or MP3/FLAC/AAC URL)"
                  value={addForm.audioUrl}
                  onChange={e => setAddForm({ ...addForm, audioUrl: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Album (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Singles / Greatest Hits"
                    value={addForm.album}
                    onChange={e => setAddForm({ ...addForm, album: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-warm-muted">Release Year</label>
                  <input
                    type="number"
                    placeholder="2026"
                    value={addForm.year}
                    onChange={e => setAddForm({ ...addForm, year: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Cover Image URL / Custom File Upload */}
              <div className="space-y-2 p-3 rounded-2xl bg-bg-secondary/70 border border-white/5">
                <label className="font-semibold text-warm-muted block">Cover Image Artwork</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    {addForm.artworkUrl ? (
                      <img src={addForm.artworkUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-warm-muted/40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      placeholder="Paste Image URL (https://...)"
                      value={addForm.artworkUrl}
                      onChange={e => setAddForm({ ...addForm, artworkUrl: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
                    />

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-warm-white transition border border-white/10">
                        <span>Upload Custom Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddArtworkFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-warm-muted/60">
                        {addForm.artworkUrl?.startsWith('data:image') ? '✓ Custom file attached' : 'JPG, PNG, WebP'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTrack}
                  className="px-6 py-2.5 rounded-xl bg-accent text-bg-primary font-bold shadow-lg shadow-accent/25 hover:scale-105 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingTrack ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding Track...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Publish to Library</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DANGEROUS ACTION CONFIRMATION MODAL */}
      {deletingTrack && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setDeletingTrack(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-bg-secondary border border-red-500/20 p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-red-400">
              Remove Track from Library?
            </h3>
            <p className="text-xs text-warm-muted leading-relaxed">
              This removes <strong className="text-warm-white font-semibold">"{deletingTrack.title}"</strong> from the SPiDEYxFLASH music player index.
            </p>
            <p className="text-[11px] p-3 rounded-xl bg-white/5 border border-white/5 text-warm-muted">
              🛡 <strong>Note:</strong> The original audio file will <span className="text-emerald-400">NOT</span> be deleted from your Telegram channel storage.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTrack(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-500/30 hover:bg-red-600 transition disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTWORK DIAGNOSTICS & TELEGRAM PIPELINE MODAL */}
      {diagTrack && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setDiagTrack(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up text-xs text-warm-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-warm-white">
                  Artwork Pipeline Diagnostics
                </h3>
                <p className="text-[11px] text-warm-muted">
                  How SPiDEYxFLASH matched this track's real Telegram cover
                </p>
              </div>
              <button onClick={() => setDiagTrack(null)} className="text-warm-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {diagLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-warm-muted">
                <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                <span>Analyzing Telegram artwork pipeline...</span>
              </div>
            ) : diagData ? (
              <div className="space-y-4">
                {/* Visual Preview */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-white/5">
                  <img
                    src={diagData.artworkUrl || artworkUrl(diagTrack.id, diagTrack.title)}
                    alt={diagTrack.title}
                    className="w-20 h-20 rounded-xl object-cover bg-bg-secondary border border-white/10 flex-shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-sm text-warm-white truncate">{diagTrack.title}</p>
                    <p className="text-xs text-warm-muted truncate">{diagTrack.artist}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/30">
                      {diagData.matchType || diagTrack.artworkType || 'telegram_media_group'}
                    </span>
                  </div>
                </div>

                {/* Score & Health Metric */}
                <div className="space-y-2 p-4 rounded-2xl bg-bg-card border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-warm-muted">Artwork Confidence Score</span>
                    <span className="font-mono font-bold text-accent">
                      {diagData.confidence ?? diagTrack.artworkConfidence ?? 90} / 100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-accent transition-all duration-500"
                      style={{ width: `${diagData.confidence ?? diagTrack.artworkConfidence ?? 90}%` }}
                    />
                  </div>
                </div>

                {/* Technical Diagnostic Attributes */}
                <div className="space-y-2 p-4 rounded-2xl bg-bg-card border border-white/5 text-[11px] font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-warm-muted">Telegram Message ID:</span>
                    <span className="text-warm-white font-semibold">#{diagData.telegramMsgId || diagTrack.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-warm-muted">Album Group Key:</span>
                    <span className="text-warm-white truncate max-w-xs">{diagData.albumArtworkId || 'album_' + diagTrack.album}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-warm-muted">Cache Sizing Options:</span>
                    <div className="flex items-center gap-2 text-accent">
                      <a href={`${artworkUrl(diagTrack.id, diagTrack.title)}?size=300`} target="_blank" rel="noreferrer" className="hover:underline">300px</a>
                      <span>·</span>
                      <a href={`${artworkUrl(diagTrack.id, diagTrack.title)}?size=600`} target="_blank" rel="noreferrer" className="hover:underline">600px</a>
                      <span>·</span>
                      <a href={`${artworkUrl(diagTrack.id, diagTrack.title)}?size=1000`} target="_blank" rel="noreferrer" className="hover:underline">1000px</a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-warm-muted">Is Real Telegram Photo:</span>
                    <span className={diagData.isRealTelegramCover ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {diagData.isRealTelegramCover ? 'YES (Confidence >= 75)' : 'Fallback / Embedded'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setDiagTrack(null)}
                className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold shadow-md shadow-accent/25 hover:scale-105 transition"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTWORK CANDIDATE PICKER MODAL */}
      {candidateTrack && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setCandidateTrack(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up text-xs text-warm-white max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <h3 className="text-base font-bold text-warm-white">
                    Artwork Candidates
                  </h3>
                </div>
                <p className="text-[11px] text-warm-muted truncate max-w-md">
                  Select a real Telegram cover, album sibling, or high-res artwork for <strong className="text-warm-white font-semibold">"{candidateTrack.title}"</strong>
                </p>
              </div>
              <button onClick={() => setCandidateTrack(null)} className="text-warm-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {candidateLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-warm-muted">
                  <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                  <span>Scanning Telegram channel and album matches...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-12 text-center text-warm-muted">
                  No additional artwork candidates found for this track.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidates.map((cand, idx) => {
                    const isCurrent = cand.url === candidateTrack.thumbnail || cand.source === 'current';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl bg-bg-card border transition flex flex-col justify-between gap-3 ${
                          isCurrent ? 'border-accent/40 bg-accent/5' : 'border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-bg-secondary border border-white/10 flex-shrink-0">
                            <img
                              src={cand.url}
                              alt={cand.label}
                              className="w-full h-full object-cover"
                              onError={e => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-bold text-xs text-warm-white line-clamp-2">
                              {cand.label}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                cand.confidence >= 85
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              }`}>
                                {cand.confidence}% match
                              </span>
                              <span className="text-[10px] text-warm-muted font-mono uppercase">
                                {cand.source.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          disabled={isApplyingCandidate || isCurrent}
                          onClick={() => handleSelectCandidate(cand)}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? 'bg-white/5 text-accent cursor-default'
                              : 'bg-accent text-bg-primary shadow-md shadow-accent/20 hover:scale-[1.02]'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active Cover</span>
                            </>
                          ) : (
                            <span>Set as Track Artwork</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/5 flex-shrink-0">
              <button
                onClick={() => setCandidateTrack(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
