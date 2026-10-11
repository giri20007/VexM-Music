import React, { memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';

export const LivelyBackground = memo(function LivelyBackground() {
  const isPlaying = useAudioStore(s => s.isPlaying);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* Deep Midnight Obsidian Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1018] via-[#090a10] to-[#06070a]" />

      {/* Fluid Radial Ambient Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(250,45,72,0.14),transparent)]" />

      {/* Floating Animated Mesh Orbs */}
      {/* Orb 1: Vex-M Crimson Glow */}
      <div
        className={`absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-[#fa2d48]/20 filter blur-[140px] animate-orb-1 transition-opacity duration-1000 ${
          isPlaying ? 'opacity-60 scale-105' : 'opacity-30'
        }`}
      />

      {/* Orb 2: Deep Violet Glow */}
      <div
        className={`absolute top-1/4 -right-32 w-[650px] h-[650px] rounded-full bg-[#8b5cf6]/18 filter blur-[150px] animate-orb-2 transition-opacity duration-1000 ${
          isPlaying ? 'opacity-50' : 'opacity-25'
        }`}
      />

      {/* Orb 3: Deep Sapphire Glow */}
      <div
        className={`absolute -bottom-48 left-1/4 w-[700px] h-[700px] rounded-full bg-[#0284c7]/14 filter blur-[160px] animate-orb-3 transition-opacity duration-1000 ${
          isPlaying ? 'opacity-40' : 'opacity-20'
        }`}
      />

      {/* Subtle Noise Texture for high-end look */}
      <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
    </div>
  );
});
