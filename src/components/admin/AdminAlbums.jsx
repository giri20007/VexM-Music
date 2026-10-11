import React, { useState, useEffect } from 'react';
import {
  Disc3,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  Music2,
  Calendar,
  User,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import {
  adminGetAlbums,
  adminUpdateAlbum,
  adminDeleteAlbum,
} from '../../utils/adminApi';
import { getArtworkSrc } from '../../utils/artworkGenerator';

export function AdminAlbums() {
  const showToast = useAdminStore(s => s.showToast);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [editName, setEditName] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editArtworkUrl, setEditArtworkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await adminGetAlbums();
      setAlbums(res.albums || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch albums', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleEditClick = alb => {
    setEditingAlbum(alb);
    setEditName(alb.name);
    setEditArtist(alb.artist || '');
    setEditArtworkUrl(alb.thumbnail || '');
  };

  const handleSaveAlbum = async e => {
    e.preventDefault();
    if (!editingAlbum || !editName.trim()) return;

    setIsSaving(true);
    try {
      await adminUpdateAlbum(editingAlbum.name, {
        newName: editName.trim(),
        artist: editArtist.trim(),
        artworkUrl: editArtworkUrl.trim(),
      });
      showToast(`Album "${editName}" updated successfully`, 'success');
      setEditingAlbum(null);
      fetchAlbums();
    } catch (err) {
      showToast(err.message || 'Failed to update album', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlbum = async albName => {
    try {
      await adminDeleteAlbum(albName);
      showToast(`Album "${albName}" disassociated`, 'success');
      setDeleteConfirm(null);
      fetchAlbums();
    } catch (err) {
      showToast(err.message || 'Failed to delete album', 'error');
    }
  };

  const filteredAlbums = albums.filter(
    a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.artist && a.artist.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in text-warm-white select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-bg-card border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent font-extrabold text-sm uppercase tracking-wider">
            <Disc3 className="w-5 h-5" />
            <span>Album Management</span>
          </div>
          <p className="text-xs text-warm-muted leading-relaxed">
            Manage discographies, edit album metadata, rename albums across all associated tracks, and assign artwork.
          </p>
        </div>

        <button
          onClick={fetchAlbums}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-warm-white transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search albums or artists..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-bg-secondary border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Album Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAlbums.map((alb, idx) => {
          const sampleTrack = alb.tracks?.[0] || { album: alb.name, artist: alb.artist, thumbnail: alb.thumbnail };
          const cover = getArtworkSrc(sampleTrack, 300);

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-bg-card/70 border border-white/5 hover:border-accent/40 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-bg-secondary border border-white/5 shadow-md relative">
                  <img
                    src={cover}
                    alt={alb.name}
                    className="w-full h-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-warm-white">
                    {alb.trackCount} {alb.trackCount === 1 ? 'Track' : 'Tracks'}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-warm-white truncate">{alb.name}</h4>
                  <p className="text-[11px] text-warm-muted truncate">{alb.artist || 'Various Artists'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleEditClick(alb)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-accent hover:text-bg-primary text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeleteConfirm(alb.name)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white transition"
                  title="Disassociate Album"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Album Modal */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-bg-secondary border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h3 className="text-base font-bold text-warm-white">
                Edit Album: <span className="text-accent">{editingAlbum.name}</span>
              </h3>
              <button
                onClick={() => setEditingAlbum(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-warm-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlbum} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-warm-muted font-semibold block">Album Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-warm-muted font-semibold block">Artist</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={e => setEditArtist(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-warm-muted font-semibold block">Artwork URL</label>
                <input
                  type="url"
                  value={editArtworkUrl}
                  onChange={e => setEditArtworkUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-warm-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-accent text-bg-primary text-xs font-bold shadow-lg shadow-accent/20 hover:scale-105 transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-bg-secondary border border-red-500/20 p-6 space-y-4 shadow-2xl text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-warm-white">Disassociate Album?</h3>
            <p className="text-xs text-warm-muted">
              Are you sure you want to disassociate tracks from album "{deleteConfirm}"? Tracks will remain in your library with album set to "Single".
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAlbum(deleteConfirm)}
                className="px-6 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg hover:scale-105 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
