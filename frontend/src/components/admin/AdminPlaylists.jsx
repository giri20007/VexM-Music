import React, { useState, useEffect } from 'react';
import {
  ListMusic,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Music2,
  Check,
  X,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import {
  adminGetPlaylists,
  adminCreatePlaylist,
  adminUpdatePlaylist,
  adminDeletePlaylist,
} from '../../utils/adminApi';

export function AdminPlaylists() {
  const showToast = useAdminStore(s => s.showToast);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await adminGetPlaylists();
      setPlaylists(res.playlists || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch playlists', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsSaving(true);
    try {
      await adminCreatePlaylist({ name: newPlaylistName.trim(), trackIds: [] });
      showToast(`Playlist "${newPlaylistName}" created`, 'success');
      setNewPlaylistName('');
      setCreateModalOpen(false);
      fetchPlaylists();
    } catch (err) {
      showToast(err.message || 'Failed to create playlist', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async e => {
    e.preventDefault();
    if (!editingPlaylist || !editName.trim()) return;

    setIsSaving(true);
    try {
      await adminUpdatePlaylist(editingPlaylist.id, { name: editName.trim() });
      showToast('Playlist updated', 'success');
      setEditingPlaylist(null);
      fetchPlaylists();
    } catch (err) {
      showToast(err.message || 'Failed to update playlist', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async id => {
    try {
      await adminDeletePlaylist(id);
      showToast('Playlist deleted', 'success');
      fetchPlaylists();
    } catch (err) {
      showToast(err.message || 'Failed to delete playlist', 'error');
    }
  };

  const filtered = playlists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-warm-white select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-bg-card border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent font-extrabold text-sm uppercase tracking-wider">
            <ListMusic className="w-5 h-5" />
            <span>Playlist Management</span>
          </div>
          <p className="text-xs text-warm-muted leading-relaxed">
            Create featured collections, curate playlists for listeners, and manage track groupings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
          <button
            onClick={fetchPlaylists}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-warm-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search playlists..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-bg-secondary border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(pl => (
          <div
            key={pl.id}
            className="p-5 rounded-2xl bg-bg-card border border-white/5 hover:border-accent/40 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent/20 to-purple-500/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                <Music2 className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-warm-white truncate">{pl.name}</h4>
                <p className="text-[11px] text-warm-muted">
                  {pl.trackIds?.length || 0} Tracks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingPlaylist(pl);
                  setEditName(pl.name);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-warm-muted hover:text-white transition"
                title="Edit Playlist"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(pl.id)}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white transition"
                title="Delete Playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-warm-white">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <input
                type="text"
                required
                autoFocus
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold"
                >
                  {isSaving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-warm-white">Edit Playlist Name</h3>
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <input
                type="text"
                required
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPlaylist(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
