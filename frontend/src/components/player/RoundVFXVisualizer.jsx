import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Sparkles, Radio, Disc3, Volume2 } from 'lucide-react';

/**
 * Circular "SPiDEYxFLASH" Round VFX Audio Visualizer
 * Features:
 * - 360° Radial frequency spectrum equalizer
 * - Concentric spinning vinyl disc with subtle grooves
 * - Curved "SPiDEYxFLASH • HIGH FIDELITY • AUDIO LAB" perimeter branding
 * - Bass-reactive breathing neon coral (#FF6B6B) & pink glow
 * - Dynamic particle star halo reacting to beat energy
 */

class HaloParticle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, initial = false) {
    this.angle = Math.random() * Math.PI * 2;
    const baseR = Math.min(w, h) * 0.28;
    this.dist = initial ? baseR + Math.random() * 40 : baseR;
    this.speed = 0.4 + Math.random() * 1.2;
    this.size = 1 + Math.random() * 2.2;
    this.alpha = 0.2 + Math.random() * 0.7;
    this.hue = Math.random() > 0.4 ? 350 : 280; // Coral-pink or electric purple
  }

  update(w, h, bass) {
    this.dist += this.speed + bass * 3.5;
    this.alpha -= 0.005;
    if (this.dist > Math.min(w, h) * 0.48 || this.alpha <= 0) {
      this.reset(w, h, false);
    }
  }

  draw(ctx, cx, cy) {
    const x = cx + Math.cos(this.angle) * this.dist;
    const y = cy + Math.sin(this.angle) * this.dist;
    ctx.fillStyle = `hsla(${this.hue}, 90%, 65%, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const RoundVFXVisualizer = memo(function RoundVFXVisualizer({
  track,
  size = 380,
  className = '',
  interactive = true,
  onClick,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isPlaying = useAudioStore(s => s.isPlaying);

  const rotationRef = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(128));
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    const dpr = window.devicePixelRatio || 1;

    let width = (canvas.width = container.clientWidth * dpr || size * dpr);
    let height = (canvas.height = container.clientHeight * dpr || size * dpr);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = canvas.width = container.clientWidth * dpr || size * dpr;
      height = canvas.height = container.clientHeight * dpr || size * dpr;
    };

    window.addEventListener('resize', handleResize);

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 48 }, () => new HaloParticle(width, height));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const analyser = window.__SPX_ANALYSER__;

      let freqData = new Uint8Array(128);
      let timeData = new Uint8Array(128);
      let isLiveAudio = false;

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        isLiveAudio = true;
      } else if (isPlaying) {
        const t = Date.now() / 250;
        for (let i = 0; i < 128; i++) {
          freqData[i] = Math.max(15, Math.sin(t + i * 0.12) * 65 + Math.cos(t * 0.8 + i * 0.06) * 45 + 75);
          timeData[i] = 128 + Math.sin(t * 1.6 + i * 0.1) * 28;
        }
        isLiveAudio = true;
      }

      // Calculate Bass Energy (sub-frequencies 0..8)
      let rawBass = 0;
      for (let i = 0; i < 8; i++) rawBass += freqData[i] || 0;
      rawBass = rawBass / (8 * 255);

      smoothedBassRef.current = smoothedBassRef.current * 0.82 + rawBass * 0.18;
      const bass = smoothedBassRef.current;

      const smoothData = smoothedDataRef.current;
      for (let i = 0; i < 128; i++) {
        const target = (freqData[i] || 0) / 255;
        smoothData[i] = smoothData[i] * 0.76 + target * 0.24;
      }

      // Rotational progression
      if (isPlaying) {
        rotationRef.current += 0.005 + bass * 0.012;
      }
      const rot = rotationRef.current;

      // 1. Dynamic Ambient Radial Background Neon Glow (#FF6B6B)
      const ambientRadius = minDim * (0.34 + bass * 0.18);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(255, 107, 107, ${0.22 + bass * 0.3})`);
      ambientGrad.addColorStop(0.45, `rgba(244, 63, 94, ${0.12 + bass * 0.15})`);
      ambientGrad.addColorStop(0.75, `rgba(168, 85, 247, ${0.05 + bass * 0.08})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Cosmic Halo Particles
      particlesRef.current.forEach(p => {
        p.update(width, height, isLiveAudio ? bass : 0.02);
        p.draw(ctx, cx, cy);
      });

      // 3. Central Vinyl Disc Radii
      const discRadius = minDim * 0.22 * (1 + bass * 0.12);
      const ringOuterRadius = discRadius + 18 * dpr;

      // 4. 360° Radial Frequency Spectrum Equalizer Bars
      const rayCount = 64;
      const rayBaseRadius = ringOuterRadius + 4 * dpr;

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + rot;
        const binIdx = Math.floor((Math.abs(i - rayCount / 2) / (rayCount / 2)) * 52);
        const val = isLiveAudio ? smoothData[binIdx] : 0.06;
        const rayLen = Math.max(5 * dpr, val * minDim * 0.24 * (1 + bass * 0.3));

        const x1 = cx + Math.cos(angle) * rayBaseRadius;
        const y1 = cy + Math.sin(angle) * rayBaseRadius;
        const x2 = cx + Math.cos(angle) * (rayBaseRadius + rayLen);
        const y2 = cy + Math.sin(angle) * (rayBaseRadius + rayLen);

        const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        rayGrad.addColorStop(0, '#ff6b6b');
        rayGrad.addColorStop(0.5, '#f43f5e');
        rayGrad.addColorStop(1, '#c084fc');

        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 3.2 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // High frequency glow cap at the tip
        if (val > 0.45) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x2, y2, 2.2 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Outer Neon Perimeter Ring
      ctx.strokeStyle = `rgba(255, 107, 107, ${0.6 + bass * 0.4})`;
      ctx.lineWidth = 2.5 * dpr;
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 18 * (0.6 + bass * 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, ringOuterRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 6. Circular Typography: "✦ SPiDEYxFLASH • HIGH FIDELITY • AUDIO LAB ✦"
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * 0.7);

      const textRadius = (discRadius + ringOuterRadius) / 2;
      const brandString = '✦  SPiDEYxFLASH  •  HIGH FIDELITY  •  360° AUDIO LAB  ✦  ';
      const textLen = brandString.length;
      ctx.font = `bold ${Math.max(9, 10 * dpr)}px sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 + bass * 0.25})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < textLen; i++) {
        const char = brandString[i];
        const charAngle = (i / textLen) * Math.PI * 2;
        ctx.save();
        ctx.rotate(charAngle);
        ctx.translate(0, -textRadius);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // 7. Concentric Vinyl Grooves
      const grooveCounts = [0.88, 0.76, 0.64, 0.52];
      grooveCounts.forEach(factor => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius * factor, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 8. Vinyl Disc Center Core Body
      const vinylCoreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, discRadius);
      vinylCoreGrad.addColorStop(0, '#2d0f17');
      vinylCoreGrad.addColorStop(0.5, '#190a0f');
      vinylCoreGrad.addColorStop(0.9, '#0d0507');
      vinylCoreGrad.addColorStop(1, '#050203');

      ctx.fillStyle = vinylCoreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
      ctx.fill();

      // Disc Edge Neon Stroke
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + bass * 0.4})`;
      ctx.lineWidth = 1.8 * dpr;
      ctx.stroke();

      // 9. Center Spindle Disc Badge with SPiDEYxFLASH Neon Symbol
      const spindleRadius = discRadius * 0.38;
      const spindleGrad = ctx.createLinearGradient(
        cx - spindleRadius,
        cy - spindleRadius,
        cx + spindleRadius,
        cy + spindleRadius
      );
      spindleGrad.addColorStop(0, '#ff6b6b');
      spindleGrad.addColorStop(0.6, '#f43f5e');
      spindleGrad.addColorStop(1, '#8b5cf6');

      ctx.fillStyle = spindleGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, spindleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Center Spindle Hole (Center Dot)
      ctx.fillStyle = '#050203';
      ctx.beginPath();
      ctx.arc(cx, cy, spindleRadius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, size]);

  return (
    <div
      ref={containerRef}
      onClick={interactive ? onClick : undefined}
      className={`relative flex items-center justify-center select-none rounded-3xl overflow-hidden bg-bg-card/90 border border-white/10 shadow-2xl backdrop-blur-xl group cursor-pointer transition-all duration-300 ${className}`}
      style={{ width: '100%', height: '100%', minHeight: size }}
      role="region"
      aria-label="SPiDEYxFLASH Round VFX Audio Visualizer"
    >
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />

      {/* Floating Center Badge / Track Info snippet on hover */}
      {track && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
              <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-warm-white truncate">{track.title}</p>
              <p className="text-[10px] text-warm-muted truncate">{track.artist}</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/15 border border-accent/30">
            360° VFX
          </span>
        </div>
      )}
    </div>
  );
});
