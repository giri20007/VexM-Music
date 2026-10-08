import React, { useEffect, useRef } from 'react';
import {
  Play,
  ListPlus,
  ListMusic,
  Heart,
  Disc3,
  User,
  Info,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

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

  const [copied, setCopied] = React.useState(false);

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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#track:${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} - ${track.artist}`,
          text: `Listen to "${track.title}" on SPiDEYxFLASH`,
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

  // Adjust positioning to stay within viewport
  const posX = Math.min(position.x, window.innerWidth - 220);
  const posY = Math.min(position.y, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      style={{ top: `${Math.max(10, posY)}px`, left: `${Math.max(10, posX)}px` }}
      className="fixed z-50 w-56 rounded-2xl bg-[#1a100d]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-1.5 text-xs text-warm-white animate-fade-in select-none"
    >
      <div className="px-3 py-2 border-b border-white/5 mb-1">
        <p className="font-bold truncate text-white">{track.title}</p>
        <p className="text-[11px] text-warm-muted truncate">{track.artist}</p>
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
