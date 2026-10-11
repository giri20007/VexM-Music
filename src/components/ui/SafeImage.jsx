import React, { useState, useEffect, useMemo } from 'react';
import { getTrackArtworkUrl, getArtistAvatarUrl } from '../../utils/artworkGenerator';

/**
 * Resilient Image Component with Instant Deterministic Fallback
 * Traps 404s, CORS failures, and broken URLs and smoothly falls back to a stylized SVG placeholder.
 */
export function SafeImage({
  src,
  alt = 'Track Artwork',
  fallbackType = 'track', // 'track' | 'artist' | 'disc'
  track = null,
  artistName = '',
  size = 300,
  className = '',
  loading = 'lazy',
  onLoad,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset error state when source URL changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  // Generate deterministic SVG fallback
  const fallbackSvgUrl = useMemo(() => {
    if (fallbackType === 'artist') {
      return getArtistAvatarUrl(artistName || alt || 'Artist', size);
    }
    return getTrackArtworkUrl(track || { title: alt, artist: artistName }, size);
  }, [fallbackType, track, alt, artistName, size]);

  const effectiveSrc = hasError || !src ? fallbackSvgUrl : src;

  return (
    <div className={`relative overflow-hidden bg-bg-card flex items-center justify-center ${className}`}>
      {/* Background Skeleton / Placeholder until loaded */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}

      <img
        src={effectiveSrc}
        alt={alt}
        loading={loading}
        onLoad={e => {
          setIsLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded || hasError ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
}
