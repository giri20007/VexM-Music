import React, { useState, useEffect } from 'react';
import {
  Image,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Sliders,
  AlertCircle,
  Eye,
  Upload,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import {
  adminGetLibrary,
  adminGetArtworkCandidates,
  adminOverrideArtwork,
  adminRescanArtwork,
  adminSaveArtwork,
} from '../../utils/adminApi';
import { getArtworkSrc, getTrackArtworkUrl } from '../../utils/artworkGenerator';

export function AdminArtwork() {
  const showToast = useAdminStore(s => s.showToast);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await adminGetLibrary({ q: searchTerm, limit: 100 });
      setTracks(res.items || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch tracks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [searchTerm]);

  const handleOpenArtworkModal = async track => {
    setSelectedTrack(track);
    setNewCoverUrl(track.thumbnail || '');
    setCustomInputUrl('');
    setCandidatesLoading(true);
    try {
      const res = await adminGetArtworkCandidates(track.id);
      setCandidates(res.candidates || []);
    } catch (err) {
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleSaveArtwork = async () => {
    if (!selectedTrack || !newCoverUrl) return;
    setIsSaving(true);
    try {
      await adminSaveArtwork(selectedTrack.id, newCoverUrl);
      showToast(`Artwork updated for "${selectedTrack.title}"`, 'success');
      setSelectedTrack(null);
      fetchTracks();
    } catch (err) {
      showToast(err.message || 'Failed to update artwork', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    try {
      showToast('Scanning Telegram media relationships...', 'info');
      const res = await adminRescanArtwork();
      showToast(`Rescan complete! Updated ${res.updatedCount || 0} covers`, 'success');
      fetchTracks();
    } catch (err) {
      showToast(err.message || 'Rescan failed', 'error');
    } finally {
      setIsRescanning(false);
    }
  };

  const currentCoverSrc = selectedTrack
    ? getArtworkSrc(selectedTrack, 400)
    : '';

  return (
    <div className="space-y-6 animate-fade-in text-warm-white select-none">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-bg-card border border-white/5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-accent font-extrabold text-sm uppercase tracking-wider">
            <Image className="w-5 h-5" />
            <span>Artwork & Cover Management</span>
          </div>
          <p className="text-xs text-warm-muted leading-relaxed">
            Manage album covers, match candidate artworks from Telegram, and preview side-by-side changes.
          </p>
        </div>

        <button
          onClick={handleRescan}
          disabled={isRescanning}
          className="px-4 py-2.5 rounded-xl bg-accent text-bg-primary font-bold text-xs shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRescanning ? 'animate-spin' : ''}`} />
          <span>Rescan All Telegram Covers</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by track title, artist, or album..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-bg-secondary border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tracks.map(track => {
          const thumb = getArtworkSrc(track, 300);
          return (
            <div
              key={track.id}
              className="p-4 rounded-2xl bg-bg-card/70 border border-white/5 hover:border-accent/40 transition group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-bg-secondary flex-shrink-0 border border-white/5 shadow-md">
                  <img
                    src={thumb}
                    alt={track.title}
                    className="w-full h-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-xs text-warm-white truncate">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-warm-muted truncate">
                    {track.artist}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-warm-muted/80 truncate max-w-full">
                    {track.album || 'Single'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenArtworkModal(track)}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-accent hover:text-bg-primary text-xs font-semibold text-warm-white transition flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Change Artwork</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Comparison Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-bg-secondary border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h3 className="text-lg font-bold text-warm-white">
                  Update Artwork: <span className="text-accent">{selectedTrack.title}</span>
                </h3>
                <p className="text-xs text-warm-muted">{selectedTrack.artist} • {selectedTrack.album}</p>
              </div>
              <button
                onClick={() => setSelectedTrack(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-warm-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-Side Current Cover vs New Cover */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-2 p-3 rounded-2xl bg-bg-card border border-white/5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-warm-muted">
                  CURRENT COVER
                </span>
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center">
                  <img
                    src={currentCoverSrc}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-2xl bg-bg-card border border-accent/30">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">
                  NEW COVER PREVIEW
                </span>
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-accent/20 flex items-center justify-center">
                  {newCoverUrl ? (
                    <img
                      src={newCoverUrl}
                      alt="New cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-warm-muted">Select a candidate below</span>
                  )}
                </div>
              </div>
            </div>

            {/* Candidates Picker */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-muted block">
                Available Candidates
              </span>

              {candidatesLoading ? (
                <div className="p-4 text-center text-xs text-warm-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  <span>Finding artwork candidates...</span>
                </div>
              ) : candidates.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {candidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewCoverUrl(cand.url)}
                      className={`p-2 rounded-xl border text-left transition flex flex-col items-center gap-2 ${
                        newCoverUrl === cand.url
                          ? 'border-accent bg-accent/10 shadow-lg shadow-accent/15'
                          : 'border-white/5 bg-bg-card hover:border-white/20'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/40">
                        <img src={cand.url} alt={cand.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-warm-white truncate w-full text-center">
                        {cand.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-warm-muted/60">No automated candidate covers found.</p>
              )}
            </div>

            {/* Custom URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-warm-muted block">
                Or Enter Custom Cover Image URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customInputUrl}
                  onChange={e => setCustomInputUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-bg-card border border-white/10 text-xs text-warm-white placeholder:text-warm-muted/50 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customInputUrl.trim()) setNewCoverUrl(customInputUrl.trim());
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Action Buttons: [Cancel] and [Save] */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setSelectedTrack(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-warm-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveArtwork}
                disabled={isSaving || !newCoverUrl}
                className="px-6 py-2.5 rounded-xl bg-accent text-bg-primary text-xs font-bold shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Artwork</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
