import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  ListPlus,
  ListMusic,
  Heart,
  Disc3,
  User,
  Info,
  Share2,
  Check,
  X,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';

export function TrackContextMenu({
  track,
  isOpen,
  onClose,
  position = { x: 0, y: 0 },
  onNavigate,
  onOpenDetails,
}) {
  const menuRef = useRef(null);
  const playTrack = useAudioStore(s => s.playTrack);
  const enqueue = useAudioStore(s => s.enqueue);
  const playNext = useAudioStore(s => s.playNext);
  const likedTrackIds = useAudioStore(s => s.likedTrackIds);
  const toggleLike = useAudioStore(s => s.toggleLike);

  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const isLiked = likedTrackIds.includes(String(track.id));
  const artworkUrl = getArtworkSrc(track, 120);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#track:${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} - ${track.artist}`,
          text: `Listen to "${track.title}" on Vex-M`,
          url: shareUrl,
        });
        onClose();
        return;
      } catch { /* fallback to copy */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1200);
    } catch {
      onClose();
    }
  };

  // Adjust positioning on desktop to prevent clipping
  const posX = Math.min(Math.max(10, position.x), typeof window !== 'undefined' ? window.innerWidth - 240 : 200);
  const posY = Math.min(Math.max(10, position.y), typeof window !== 'undefined' ? window.innerHeight - 380 : 300);

  // Mobile Bottom Sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Scrim */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          ref={menuRef}
          className="relative w-full max-w-lg bg-[#140c0a]/95 backdrop-blur-2xl border-t border-white/12 rounded-t-3xl p-5 pb-8 shadow-2xl z-10 text-warm-white animate-slide-up select-none max-h-[85vh] overflow-y-auto"
        >
          {/* Grab Handle */}
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Track Summary Header */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-white/10 mb-3">
            <img
              src={artworkUrl}
              alt={track.title}
              className="w-12 h-12 rounded-xl object-cover bg-surface-tertiary border border-white/10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base text-white truncate">{track.title}</h4>
              <p className="text-xs text-warm-muted truncate">{track.artist}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-1 text-sm font-semibold">
            <button
              onClick={() => {
                playTrack(track);
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
            >
              <Play className="w-5 h-5 text-accent" />
              <span>Play now</span>
            </button>

            <button
              onClick={() => {
                if (playNext) playNext(track);
                else enqueue(track);
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
            >
              <ListPlus className="w-5 h-5 text-warm-muted" />
              <span>Play next</span>
            </button>

            <button
              onClick={() => {
                enqueue(track);
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
            >
              <ListMusic className="w-5 h-5 text-warm-muted" />
              <span>Add to queue</span>
            </button>

            <button
              onClick={() => {
                toggleLike(track.id);
                onClose();
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-accent text-accent' : 'text-warm-muted'}`} />
              <span>{isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</span>
            </button>

            {track.album && track.album !== 'Unknown Album' && (
              <button
                onClick={() => {
                  if (onNavigate) onNavigate(`album:${track.album}`);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
              >
                <Disc3 className="w-5 h-5 text-warm-muted" />
                <span>Go to album ({track.album})</span>
              </button>
            )}

            {track.artist && track.artist !== 'Unknown Artist' && (
              <button
                onClick={() => {
                  if (onNavigate) onNavigate(`artist:${track.artist}`);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
              >
                <User className="w-5 h-5 text-warm-muted" />
                <span>Go to artist ({track.artist})</span>
              </button>
            )}

            {onOpenDetails && (
              <button
                onClick={() => {
                  onOpenDetails(track);
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition active:scale-[0.99]"
              >
                <Info className="w-5 h-5 text-warm-muted" />
                <span>Audio specs & info</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl hover:bg-white/10 text-left transition text-accent font-bold active:scale-[0.99]"
            >
              {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              <span>{copied ? 'Link Copied!' : 'Share track link'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Floating Dropdown
  return (
    <div
      ref={menuRef}
      style={{ top: `${posY}px`, left: `${posX}px` }}
      className="fixed z-50 w-60 rounded-2xl bg-[#1a100d]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-xs text-warm-white animate-fade-in select-none"
    >
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-white/5 mb-1">
        <img
          src={artworkUrl}
          alt=""
          className="w-8 h-8 rounded-lg object-cover bg-surface-tertiary border border-white/10 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate text-white">{track.title}</p>
          <p className="text-[11px] text-warm-muted truncate">{track.artist}</p>
        </div>
      </div>

      <button
        onClick={() => {
          playTrack(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
      >
        <Play className="w-4 h-4 text-accent" />
        <span>Play now</span>
      </button>

      <button
        onClick={() => {
          if (playNext) playNext(track);
          else enqueue(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
      >
        <ListPlus className="w-4 h-4 text-warm-muted" />
        <span>Play next</span>
      </button>

      <button
        onClick={() => {
          enqueue(track);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
      >
        <ListMusic className="w-4 h-4 text-warm-muted" />
        <span>Add to queue</span>
      </button>

      <button
        onClick={() => {
          toggleLike(track.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent text-accent' : 'text-warm-muted'}`} />
        <span>{isLiked ? 'Liked' : 'Like'}</span>
      </button>

      <div className="h-px bg-white/5 my-1" />

      {track.album && track.album !== 'Unknown Album' && (
        <button
          onClick={() => {
            if (onNavigate) onNavigate(`album:${track.album}`);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
        >
          <Disc3 className="w-4 h-4 text-warm-muted" />
          <span>Go to album</span>
        </button>
      )}

      {track.artist && track.artist !== 'Unknown Artist' && (
        <button
          onClick={() => {
            if (onNavigate) onNavigate(`artist:${track.artist}`);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
        >
          <User className="w-4 h-4 text-warm-muted" />
          <span>Go to artist</span>
        </button>
      )}

      {onOpenDetails && (
        <button
          onClick={() => {
            onOpenDetails(track);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition"
        >
          <Info className="w-4 h-4 text-warm-muted" />
          <span>View details</span>
        </button>
      )}

      <button
        onClick={handleShare}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition text-accent font-semibold"
      >
        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        <span>{copied ? 'Link Copied!' : 'Share track'}</span>
      </button>
    </div>
  );
}
