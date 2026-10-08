import React, { memo } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAudioStore } from '../../store/useAudioStore';

export const LivelyBackground = memo(function LivelyBackground() {
  const livelyBackground = useSettingsStore(s => s.livelyBackground || 'aurora');
  const isPlaying = useAudioStore(s => s.isPlaying);

  if (livelyBackground === 'off') return null;

  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden select-none">
      {/* 1. Aurora / Floating Orbs Mode */}
      {livelyBackground === 'aurora' && (
        <>
          {/* Top Left Orb */}
          <div
            className={`absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-accent/20 filter blur-[100px] animate-orb-1 transition-opacity duration-1000 ${
              isPlaying ? 'opacity-40' : 'opacity-20'
            }`}
          />
          {/* Center Right Orb */}
          <div
            className={`absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full bg-[#f43f5e]/15 filter blur-[120px] animate-orb-2 transition-opacity duration-1000 ${
              isPlaying ? 'opacity-35' : 'opacity-15'
            }`}
          />
          {/* Bottom Left Orb */}
          <div
            className={`absolute -bottom-40 left-1/4 w-[650px] h-[650px] rounded-full bg-[#8b5cf6]/15 filter blur-[130px] animate-orb-3 transition-opacity duration-1000 ${
              isPlaying ? 'opacity-30' : 'opacity-10'
            }`}
          />
        </>
      )}

      {/* 2. Pulsing Glow Mode */}
      {livelyBackground === 'glow' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-[700px] h-[700px] rounded-full bg-accent/25 filter blur-[140px] animate-pulse-glow transition-opacity duration-1000 ${
              isPlaying ? 'opacity-40' : 'opacity-15'
            }`}
          />
        </div>
      )}

      {/* 3. Subtle Animated Mesh Wave */}
      {livelyBackground === 'mesh' && (
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/30 via-transparent to-transparent animate-pulse-slow" />
      )}

      {/* Subtle Noise Texture for high-end look */}
      <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
    </div>
  );
});
