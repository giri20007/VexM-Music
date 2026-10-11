import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { Sparkles, Radio, Disc3, Volume2 } from 'lucide-react';

/**
 * Circular "SPiDEYxFLASH" Round VFX Audio Visualizer
 * Features:
 * - Seamless 360° Conical Colorway (Violet -> Magenta -> Coral -> Cyan -> Blue)
 * - Concentric rotating vinyl turntable platter with active album cover
 * - Audiophile HUD Gauge with dual 1px guide rings & 15° micro-ticks
 * - Monospace curved "✦ HIGH FIDELITY • 360° AUDIO LAB • SPiDEYxFLASH ✦" typography
 * - Smooth frame LERP physics & luminous bloom peak hold caps
 */

const COLOR_STOPS = [
  { pos: 0.0, r: 139, g: 92, b: 246 },  // #8B5CF6 Electric Violet
  { pos: 0.2, r: 236, g: 72, b: 153 }, // #EC4899 Vivid Neon Magenta
  { pos: 0.4, r: 244, g: 63, b: 94 },  // #F43F5E Coral Flame
  { pos: 0.6, r: 6, g: 182, b: 212 },  // #06B6D4 Electric Cyan
  { pos: 0.8, r: 59, g: 130, b: 246 }, // #3B82F6 Royal Blue
  { pos: 1.0, r: 139, g: 92, b: 246 }, // #8B5CF6 Electric Violet wrap
];

function getAngularColor(normAngle) {
  const norm = ((normAngle % 1) + 1) % 1;
  let p1 = COLOR_STOPS[0];
  let p2 = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (norm >= COLOR_STOPS[i].pos && norm <= COLOR_STOPS[i + 1].pos) {
      p1 = COLOR_STOPS[i];
      p2 = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = p2.pos - p1.pos;
  const factor = range > 0 ? (norm - p1.pos) / range : 0;
  const ease = 0.5 - 0.5 * Math.cos(factor * Math.PI);
  const r = Math.round(p1.r + (p2.r - p1.r) * ease);
  const g = Math.round(p1.g + (p2.g - p1.g) * ease);
  const b = Math.round(p1.b + (p2.b - p1.b) * ease);
  return { r, g, b, rgb: `rgb(${r},${g},${b})` };
}

class HaloParticle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, initial = false) {
    this.angle = Math.random() * Math.PI * 2;
    const baseR = Math.min(w, h) * 0.28;
    this.dist = initial ? baseR + Math.random() * 40 : baseR;
    this.speed = 0.4 + Math.random() * 1.3;
    this.size = 1 + Math.random() * 2.2;
    this.alpha = 0.2 + Math.random() * 0.6;
    this.normAngle = this.angle / (Math.PI * 2);
  }

  update(w, h, bass) {
    this.dist += this.speed + bass * 3.8;
    this.alpha -= 0.004;
    if (this.dist > Math.min(w, h) * 0.58 || this.alpha <= 0) {
      this.reset(w, h, false);
    }
  }

  draw(ctx, cx, cy) {
    const x = cx + Math.cos(this.angle) * this.dist;
    const y = cy + Math.sin(this.angle) * this.dist;
    const col = getAngularColor(this.normAngle);
    ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${this.alpha})`;
    ctx.shadowColor = col.rgb;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
  const storeTrack = useAudioStore(s => s.currentTrack);
  const activeTrack = track || storeTrack;

  const rotationRef = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(128));
  const peaksRef = useRef(new Float32Array(72));
  const particlesRef = useRef([]);

  const artworkImageRef = useRef(null);
  const loadedTrackIdRef = useRef(null);

  useEffect(() => {
    if (!activeTrack) {
      artworkImageRef.current = null;
      loadedTrackIdRef.current = null;
      return;
    }
    if (loadedTrackIdRef.current === activeTrack.id && artworkImageRef.current) return;
    loadedTrackIdRef.current = activeTrack.id;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getArtworkSrc(activeTrack, 300);
    img.onload = () => {
      artworkImageRef.current = img;
    };
    img.onerror = () => {
      artworkImageRef.current = null;
    };
  }, [activeTrack?.id, activeTrack?.thumbnail]);

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
        const t = Date.now() / 280;
        for (let i = 0; i < 128; i++) {
          freqData[i] = Math.max(12, Math.sin(t + i * 0.14) * 60 + Math.cos(t * 0.75 + i * 0.05) * 45 + 75);
          timeData[i] = 128 + Math.sin(t * 1.5 + i * 0.1) * 25;
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
        smoothData[i] = smoothData[i] * 0.82 + target * 0.18;
      }

      // Rotational progression
      if (isPlaying) {
        rotationRef.current += 0.004 + bass * 0.01;
      }
      const rot = rotationRef.current;

      // 1. Dynamic Ambient Radial Background Glow
      const ambientRadius = minDim * (0.35 + bass * 0.2);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(139, 92, 246, ${0.2 + bass * 0.25})`);
      ambientGrad.addColorStop(0.35, `rgba(236, 72, 153, ${0.12 + bass * 0.15})`);
      ambientGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.06 + bass * 0.08})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Cosmic Halo Particles
      particlesRef.current.forEach(p => {
        p.update(width, height, isLiveAudio ? bass : 0.01);
        p.draw(ctx, cx, cy);
      });

      // 3. Central Vinyl Disc Radii
      const discRadius = minDim * 0.22 * (1 + bass * 0.05);
      const ringOuterRadius = discRadius + 18 * dpr;

      // 4. 360° Symmetrical Radial Frequency Spectrum Equalizer Bars
      const rayCount = 72;
      const rayBaseRadius = ringOuterRadius + 4 * dpr;

      if (!peaksRef.current || peaksRef.current.length !== rayCount) {
        peaksRef.current = new Float32Array(rayCount);
      }
      const peaks = peaksRef.current;
      const peakDecay = 1.0 * dpr;

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + rot;
        const half = rayCount / 2;
        const distFromHalf = Math.abs(i - half);
        const normalizedFreqIdx = Math.floor((1 - distFromHalf / half) * 54);
        const val = isLiveAudio ? smoothData[normalizedFreqIdx] : 0.05;
        const rayLen = Math.max(4 * dpr, val * minDim * 0.23 * (1 + bass * 0.32));

        if (rayLen >= peaks[i]) {
          peaks[i] = rayLen;
        } else {
          peaks[i] = Math.max(4 * dpr, peaks[i] - peakDecay);
        }

        const x1 = cx + Math.cos(angle) * rayBaseRadius;
        const y1 = cy + Math.sin(angle) * rayBaseRadius;
        const x2 = cx + Math.cos(angle) * (rayBaseRadius + rayLen);
        const y2 = cy + Math.sin(angle) * (rayBaseRadius + rayLen);

        const normAngle = ((i / rayCount) % 1 + 1) % 1;
        const col = getAngularColor(normAngle);

        const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        rayGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.35)`);
        rayGrad.addColorStop(0.7, `rgba(${col.r}, ${col.g}, ${col.b}, 0.92)`);
        rayGrad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 2.8 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Glowing Bloom Tip & Floating Peak Cap
        const peakDist = rayBaseRadius + peaks[i] + 2.5 * dpr;
        const px = cx + Math.cos(angle) * peakDist;
        const py = cy + Math.sin(angle) * peakDist;

        ctx.shadowColor = col.rgb;
        ctx.shadowBlur = (val > 0.3 ? 12 : 6) * dpr;
        ctx.fillStyle = val > 0.4 ? '#ffffff' : col.rgb;
        ctx.beginPath();
        ctx.arc(px, py, (val > 0.4 ? 2.2 : 1.6) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Concentric HUD Gauge Rings (Two 1px rings with 15% opacity)
      const hudInnerRadius = discRadius + 3 * dpr;
      const hudOuterRadius = ringOuterRadius;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, hudInnerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, hudOuterRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 24 Micro-Tick Dashes at 15° increments along circumference
      for (let t = 0; t < 24; t++) {
        const tickAngle = (t / 24) * Math.PI * 2;
        const isMajor = t % 6 === 0;
        const tickLen = (isMajor ? 4.5 : 2.5) * dpr;
        const r1 = hudOuterRadius - tickLen;
        const r2 = hudOuterRadius;

        const tx1 = cx + Math.cos(tickAngle) * r1;
        const ty1 = cy + Math.sin(tickAngle) * r1;
        const tx2 = cx + Math.cos(tickAngle) * r2;
        const ty2 = cy + Math.sin(tickAngle) * r2;

        ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = (isMajor ? 1.5 : 1) * dpr;
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.stroke();
      }

      // 6. Monospace Curved Typography: "✦ HIGH FIDELITY • 360° AUDIO LAB • SPiDEYxFLASH ✦"
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * 0.55);

      const textRadius = (hudInnerRadius + hudOuterRadius) / 2;
      const brandString = '✦ HIGH FIDELITY • 360° AUDIO LAB • VEX-M ✦ ';
      const textLen = brandString.length;
      ctx.font = `600 ${Math.max(8, 9 * dpr)}px "SF Mono", "Fira Code", monospace, sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.65 + bass * 0.25})`;
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

      // 7. Obsidian Black Turntable Vinyl Platter
      const vinylGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, discRadius);
      vinylGrad.addColorStop(0, '#1a1921');
      vinylGrad.addColorStop(0.4, '#100f14');
      vinylGrad.addColorStop(0.85, '#0a090d');
      vinylGrad.addColorStop(1, '#050406');
      ctx.fillStyle = vinylGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Vinyl Groove Rings
      const grooveRatios = [0.94, 0.88, 0.82, 0.76, 0.70, 0.64];
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1 * dpr;
      grooveRatios.forEach(ratio => {
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 8. Center Album Artwork Record Label (Rotating at 33 RPM)
      const labelRadius = discRadius * 0.56;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      ctx.beginPath();
      ctx.arc(0, 0, labelRadius, 0, Math.PI * 2);
      ctx.clip();

      if (artworkImageRef.current && artworkImageRef.current.complete && artworkImageRef.current.naturalWidth > 0) {
        ctx.drawImage(
          artworkImageRef.current,
          -labelRadius,
          -labelRadius,
          labelRadius * 2,
          labelRadius * 2
        );
      } else {
        const labelGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, labelRadius);
        labelGrad.addColorStop(0, '#2e1065');
        labelGrad.addColorStop(0.5, '#1e1b4b');
        labelGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = labelGrad;
        ctx.fillRect(-labelRadius, -labelRadius, labelRadius * 2, labelRadius * 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `bold ${Math.max(8, labelRadius * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VEX', 0, -labelRadius * 0.2);
        ctx.fillStyle = '#fa2d48';
        ctx.font = `bold ${Math.max(7, labelRadius * 0.18)}px sans-serif`;
        ctx.fillText('-M', 0, labelRadius * 0.2);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, labelRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Center Spindle Hole
      const spindleRadius = discRadius * 0.085;
      ctx.fillStyle = '#070709';
      ctx.beginPath();
      ctx.arc(0, 0, spindleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Metallic Spindle Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      ctx.restore();

      // 9. Glass Specular Gloss Sheen
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
      ctx.clip();
      const glossGrad = ctx.createLinearGradient(
        cx - discRadius,
        cy - discRadius,
        cx + discRadius * 0.7,
        cy + discRadius * 0.7
      );
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
      glossGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
      glossGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.0)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(cx - discRadius, cy - discRadius, discRadius * 2, discRadius * 2);
      ctx.restore();

      // Platter Outer Rim Accent
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.45 + bass * 0.4})`;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, size, activeTrack?.id]);

  return (
    <div
      ref={containerRef}
      onClick={interactive ? onClick : undefined}
      className={`relative flex items-center justify-center select-none rounded-3xl overflow-hidden bg-bg-card/90 border border-white/10 shadow-2xl backdrop-blur-xl group cursor-pointer transition-all duration-300 ${className}`}
      style={{ width: '100%', height: '100%', minHeight: size }}
      role="region"
      aria-label="Vex-M Round VFX Audio Visualizer"
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
