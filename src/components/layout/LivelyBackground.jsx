import React, { memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';

export const LivelyBackground = memo(function LivelyBackground() {
  const currentTrack = useAudioStore(s => s.currentTrack);
  const isPlaying = useAudioStore(s => s.isPlaying);

  const coverSrc = currentTrack ? getArtworkSrc(currentTrack, 300) : null;

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#050507]">
      {/* 1. Base Layer: Deep Obsidian Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D12] via-[#050507] to-[#050507]" />

      {/* 2. Soft Dynamic Artwork Tint (when track is active) */}
      {coverSrc && (
        <div
          className="absolute inset-0 opacity-[0.08] filter blur-[140px] scale-125 transition-all duration-1000 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverSrc})` }}
        />
      )}

      {/* 3. Layered Ambient Lighting Fields (Atmospheric light passing through dark glass) */}
      {/* Field 1: Electric Coral / Red Glow */}
      <div
        className={`absolute -top-32 -left-28 w-[640px] h-[640px] rounded-full bg-[#fa2d48]/14 filter blur-[150px] transition-opacity duration-1000 ${
          isPlaying ? 'opacity-70 scale-105' : 'opacity-35'
        }`}
      />

      {/* Field 2: Secondary Cyan Field */}
      <div
        className={`absolute top-1/3 -right-28 w-[600px] h-[600px] rounded-full bg-[#06b6d4]/10 filter blur-[160px] transition-opacity duration-1000 ${
          isPlaying ? 'opacity-60' : 'opacity-25'
        }`}
      />

      {/* Field 3: Supporting Violet Field */}
      <div
        className={`absolute -bottom-40 left-1/3 w-[680px] h-[680px] rounded-full bg-[#8b5cf6]/10 filter blur-[170px] transition-opacity duration-1000 ${
          isPlaying ? 'opacity-50' : 'opacity-20'
        }`}
      />

      {/* 4. Film Grain Texture for Luxury Depth */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  );
});
