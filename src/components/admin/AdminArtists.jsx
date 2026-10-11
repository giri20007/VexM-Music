import React, { useState, useEffect } from 'react';
import { Users, Search, GitMerge, Edit2, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import {
  adminGetArtists,
  adminGetDuplicateArtists,
  adminMergeArtists,
  adminRenameArtist,
} from '../../utils/adminApi';
import { useAdminStore } from '../../store/useAdminStore';

export function AdminArtists() {
  const [artists, setArtists] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Merge modal state
  const [mergingSource, setMergingSource] = useState(null);
  const [targetArtist, setTargetArtist] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Rename modal state
  const [renamingArtist, setRenamingArtist] = useState(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const showToast = useAdminStore(s => s.showToast);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [artistData, dupData] = await Promise.all([
        adminGetArtists(),
        adminGetDuplicateArtists(),
      ]);
      setArtists(artistData.artists || []);
      setDuplicates(dupData.duplicates || []);
    } catch (err) {
      showToast(err.message || 'Failed to load artists data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMerge = async (source, target) => {
    if (!source || !target || source === target) return;
    setIsMerging(true);
    try {
      const res = await adminMergeArtists(source, target);
      showToast(res.message || 'Artists merged successfully', 'success');
      setMergingSource(null);
      setTargetArtist('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to merge artists', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleRename = async e => {
    e.preventDefault();
    if (!renamingArtist || !newName.trim()) return;
    setIsRenaming(true);
    try {
      const res = await adminRenameArtist(renamingArtist.name, newName.trim());
      showToast(res.message || 'Artist renamed', 'success');
      setRenamingArtist(null);
      setNewName('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to rename artist', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const filteredArtists = artists.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-warm-white">
            Artist Management & Deduplication
          </h2>
          <p className="text-xs text-warm-muted">
            Intelligently normalize artist names, merge spelling duplicates, and manage portraits
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-bg-card hover:bg-bg-active border border-white/5 text-warm-white transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>

      {/* Duplicate Candidates Alert / Quick Merge Box */}
      {duplicates.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>Possible Duplicate Artists Detected ({duplicates.length} groups)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {duplicates.map((dup, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-warm-white truncate">
                    Canonical: <span className="text-accent">{dup.canonical}</span>
                  </p>
                  <p className="text-[11px] text-warm-muted truncate mt-0.5">
                    Variations: {dup.variations.join(', ')}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const other = dup.variations.find(v => v !== dup.canonical);
                    if (other) handleMerge(other, dup.canonical);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow hover:scale-105 transition flex-shrink-0"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Merge</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Artist Directory */}
      <div className="rounded-3xl bg-bg-card border border-white/5 p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
            <input
              type="search"
              placeholder="Search artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-secondary border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
            />
          </div>

          <span className="text-xs text-warm-muted">
            {filteredArtists.length} {filteredArtists.length === 1 ? 'artist' : 'artists'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredArtists.map(artist => (
            <div
              key={artist.name}
              className="p-3.5 rounded-2xl bg-bg-secondary border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 group transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-accent/20 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-xs text-accent">
                  {artist.thumbnail ? (
                    <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    (artist.name[0] || 'A').toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-warm-white truncate">{artist.name}</p>
                  <p className="text-[10px] text-warm-muted">
                    {artist.trackCount} tracks · {artist.albumCount} albums
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                <button
                  onClick={() => {
                    setRenamingArtist(artist);
                    setNewName(artist.name);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-warm-muted hover:text-white transition"
                  title="Rename artist"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setMergingSource(artist.name);
                    setTargetArtist('');
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent/20 text-warm-muted hover:text-accent transition"
                  title="Merge into another artist"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Merge Modal */}
      {mergingSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setMergingSource(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-warm-white">
              Merge Artist: <span className="text-accent">{mergingSource}</span>
            </h3>
            <p className="text-xs text-warm-muted leading-relaxed">
              Select or type the target canonical artist name. All tracks currently credited to "{mergingSource}" will be updated to point to the canonical artist.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-warm-muted">Target Canonical Artist</label>
              <input
                type="text"
                value={targetArtist}
                onChange={e => setTargetArtist(e.target.value)}
                placeholder="e.g. Sai Abhyankkar"
                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setMergingSource(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={!targetArtist.trim() || isMerging}
                onClick={() => handleMerge(mergingSource, targetArtist.trim())}
                className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 transition disabled:opacity-50"
              >
                {isMerging ? 'Merging...' : 'Confirm Merge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingArtist && (
        <form
          onSubmit={handleRename}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setRenamingArtist(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-bg-secondary border border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-warm-white">
              Rename Artist: <span className="text-accent">{renamingArtist.name}</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-warm-muted">New Artist Name</label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenamingArtist(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-warm-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || isRenaming}
                className="px-5 py-2 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-md shadow-accent/20 hover:scale-105 transition disabled:opacity-50"
              >
                {isRenaming ? 'Saving...' : 'Rename Artist'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
