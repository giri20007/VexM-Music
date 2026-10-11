import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTrackArtworkUrl, getArtistAvatarUrl } from '../../utils/artworkGenerator';

/**
 * Resilient Image Component with Instant Deterministic Fallback
 * Uses referrerPolicy="no-referrer" to prevent CDN hotlink blocks on mobile carriers,
 * and eliminates opacity-0 dead square issues on mobile browsers.
 */
export function SafeImage({
  src,
  alt = 'Artwork',
  fallbackType = 'track', // 'track' | 'artist' | 'disc'
  track = null,
  artistName = '',
  size = 300,
  className = '',
  loading = 'eager',
  onLoad,
  onError,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  // Reset error state and check if image is already cached
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
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
    <div className={`relative overflow-hidden bg-white/[0.04] flex items-center justify-center ${className}`}>
      {/* Background skeleton only while genuinely waiting */}
      {!isLoaded && !hasError && src && (
        <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
      )}

      <img
        ref={imgRef}
        src={effectiveSrc}
        alt={alt}
        loading={loading}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={e => {
          setIsLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={e => {
          // If crossOrigin fails or CDN rejects, retry once without crossOrigin
          if (e.currentTarget.getAttribute('crossorigin')) {
            e.currentTarget.removeAttribute('crossorigin');
            e.currentTarget.src = effectiveSrc;
            return;
          }
          setHasError(true);
          setIsLoaded(true);
          if (onError) onError(e);
        }}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
}
