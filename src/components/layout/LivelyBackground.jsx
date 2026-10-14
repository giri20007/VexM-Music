import React, { memo } from 'react';

/**
 * Amazon Music iOS 17 Foundation Background
 * Deep midnight navy/slate foundation with subtle Amazon Music sapphire aura.
 * Hardware-rasterized by GPU with ZERO multi-pass blur filters for locked 60/120 FPS.
 */
export const LivelyBackground = memo(function LivelyBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#0b0e14]">
      {/* Deep Amazon Music Navy to Dark Slate Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#131b2e] via-[#0b0e14] to-[#07090d]" />

      {/* Subtle Top-Right Sapphire Glow (Amazon Music Signature) */}
      <div
        className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(0, 168, 225, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Subtle Bottom-Left Deep Violet Aura */}
      <div
        className="absolute bottom-10 -left-40 w-[550px] h-[550px] rounded-full pointer-events-none opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        }}
      />
    </div>
  );
});
