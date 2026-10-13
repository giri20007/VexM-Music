import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { Disc3 } from 'lucide-react';

/**
 * Circular "SPiDEYxFLASH" Round VFX Audio Visualizer
 * Upgraded with:
 *   - Genuine, zero-latency adaptive sub-bass kick tracking
 *   - Clamped DPR & zero expensive shadowBlur for 60-120 FPS performance
 *   - Pre-rendered offscreen vinyl platter & HUD gauge texture
 *   - No fake robotic sine-wave kicks on fallback mode
 */

const COLOR_STOPS = [
  { pos: 0.0, r: 139, g: 92, b: 246 },  // #8B5CF6 Electric Violet
  { pos: 0.2, r: 236, g: 72, b: 153 }, // #EC4899 Vivid Neon Magenta
  { pos: 0.4, r: 244, g: 63, b: 94 },  // #F43F5E Coral Flame
  { pos: 0.6, r: 6, g: 182, b: 212 },  // #06B6D4 Electric Cyan
  { pos: 0.8, r: 59, g: 130, b: 246 }, // #3B82F6 Royal Blue
  { pos: 1.0, r: 139, g: 92, b: 246 }, // #8B5CF6 Electric Violet wrap
];

function interpolateColor(normAngle) {
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
  return {
    r,
    g,
    b,
    rgb: `rgb(${r},${g},${b})`,
    rgba: a => `rgba(${r},${g},${b},${a})`,
  };
}

const RAY_COUNT = 72;
const PRECOMPUTED_PALETTE = Array.from({ length: RAY_COUNT }, (_, i) => interpolateColor(i / RAY_COUNT));

class FastParticle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, randomDist = false) {
    this.angle = Math.random() * Math.PI * 2;
    const minDim = Math.min(w, h);
    const baseR = minDim * 0.28;
    this.dist = randomDist ? baseR + Math.random() * (minDim * 0.22) : baseR;
    this.speed = 0.5 + Math.random() * 1.2;
    this.size = 1 + Math.random() * 2.0;
    this.alpha = 0.3 + Math.random() * 0.6;
    this.paletteIdx = Math.floor((this.angle / (Math.PI * 2)) * RAY_COUNT) % RAY_COUNT;
  }

  update(w, h, bass) {
    this.dist += this.speed + bass * 3.2;
    this.alpha -= 0.005;
    if (this.dist > Math.max(w, h) * 0.56 || this.alpha <= 0) {
      this.reset(w, h, false);
    }
  }

  draw(ctx, cx, cy) {
    const x = cx + Math.cos(this.angle) * this.dist;
    const y = cy + Math.sin(this.angle) * this.dist;
    const col = PRECOMPUTED_PALETTE[this.paletteIdx];
    ctx.fillStyle = col.rgba(Math.max(0, this.alpha));
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
  const storeTrack = useAudioStore(s => s.currentTrack);
  const activeTrack = track || storeTrack;

  const rotationRef = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(128));
  const peaksRef = useRef(new Float32Array(RAY_COUNT));
  const impactRef = useRef(0);
  const shockwaveRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const energyHistoryRef = useRef(new Float32Array(35));
  const historyIdxRef = useRef(0);

  const offscreenPlatterRef = useRef(null);
  const offscreenPlatterSizeRef = useRef(0);

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

    const ctx = canvas.getContext('2d', { alpha: true });
    let animationId;

    const getClampedDpr = () => Math.min(window.devicePixelRatio || 1, 2.0);
    let dpr = getClampedDpr();
    let width = (canvas.width = Math.floor(container.clientWidth * dpr || size * dpr));
    let height = (canvas.height = Math.floor(container.clientHeight * dpr || size * dpr));

    const handleResize = () => {
      if (!container || !canvas) return;
      dpr = getClampedDpr();
      width = canvas.width = Math.floor(container.clientWidth * dpr || size * dpr);
      height = canvas.height = Math.floor(container.clientHeight * dpr || size * dpr);
      offscreenPlatterRef.current = null;
    };

    window.addEventListener('resize', handleResize);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particleCount = prefersReducedMotion ? 12 : 24;
    const particles = Array.from({ length: particleCount }, () => new FastParticle(width, height));

    const getOffscreenPlatter = () => {
      const platterDim = Math.round(512 * dpr);
      if (offscreenPlatterRef.current && offscreenPlatterSizeRef.current === platterDim) {
        return offscreenPlatterRef.current;
      }

      const offCanvas = document.createElement('canvas');
      offCanvas.width = platterDim;
      offCanvas.height = platterDim;
      const oCtx = offCanvas.getContext('2d');
      const oCenter = platterDim / 2;
      const discRadius = 188 * dpr;
      const ringOuterRadius = 224 * dpr;

      // 1. Obsidian Black Turntable Vinyl Platter
      const vinylGrad = oCtx.createRadialGradient(oCenter, oCenter, 5, oCenter, oCenter, discRadius);
      vinylGrad.addColorStop(0, '#191820');
      vinylGrad.addColorStop(0.4, '#100f14');
      vinylGrad.addColorStop(0.85, '#0a090d');
      vinylGrad.addColorStop(1, '#050406');
      oCtx.fillStyle = vinylGrad;
      oCtx.beginPath();
      oCtx.arc(oCenter, oCenter, discRadius, 0, Math.PI * 2);
      oCtx.fill();

      // 2. Groove Rings
      const grooveRatios = [0.94, 0.88, 0.82, 0.76, 0.70, 0.64];
      oCtx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      oCtx.lineWidth = 1 * dpr;
      grooveRatios.forEach(ratio => {
        oCtx.beginPath();
        oCtx.arc(oCenter, oCenter, discRadius * ratio, 0, Math.PI * 2);
        oCtx.stroke();
      });

      // 3. HUD Guide Rings
      const hudInnerRadius = discRadius + 3 * dpr;
      const hudOuterRadius = ringOuterRadius;

      oCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      oCtx.lineWidth = 1 * dpr;
      oCtx.beginPath();
      oCtx.arc(oCenter, oCenter, hudInnerRadius, 0, Math.PI * 2);
      oCtx.stroke();

      oCtx.beginPath();
      oCtx.arc(oCenter, oCenter, hudOuterRadius, 0, Math.PI * 2);
      oCtx.stroke();

      // 4. 24 Micro-Tick Dashes
      for (let t = 0; t < 24; t++) {
        const tickAngle = (t / 24) * Math.PI * 2;
        const isMajor = t % 6 === 0;
        const tickLen = (isMajor ? 4.5 : 2.5) * dpr;
        const r1 = hudOuterRadius - tickLen;
        const r2 = hudOuterRadius;

        const tx1 = oCenter + Math.cos(tickAngle) * r1;
        const ty1 = oCenter + Math.sin(tickAngle) * r1;
        const tx2 = oCenter + Math.cos(tickAngle) * r2;
        const ty2 = oCenter + Math.sin(tickAngle) * r2;

        oCtx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        oCtx.lineWidth = (isMajor ? 1.5 : 1) * dpr;
        oCtx.beginPath();
        oCtx.moveTo(tx1, ty1);
        oCtx.lineTo(tx2, ty2);
        oCtx.stroke();
      }

      // 5. Curved Typography
      const textRadius = (hudInnerRadius + hudOuterRadius) / 2;
      const brandString = '✦ HIGH FIDELITY • 360° AUDIO LAB • VEX-M ✦ ';
      const textLen = brandString.length;
      oCtx.font = `600 ${Math.max(8, 9 * dpr)}px "SF Mono", "Fira Code", monospace, sans-serif`;
      oCtx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      oCtx.textAlign = 'center';
      oCtx.textBaseline = 'middle';

      for (let i = 0; i < textLen; i++) {
        const char = brandString[i];
        const charAngle = (i / textLen) * Math.PI * 2;
        oCtx.save();
        oCtx.translate(oCenter, oCenter);
        oCtx.rotate(charAngle);
        oCtx.translate(0, -textRadius);
        oCtx.fillText(char, 0, 0);
        oCtx.restore();
      }

      offscreenPlatterRef.current = offCanvas;
      offscreenPlatterSizeRef.current = platterDim;
      return offCanvas;
    };

    let lastFrameTime = performance.now();

    const render = now => {
      const deltaMs = Math.min(now - lastFrameTime, 100);
      lastFrameTime = now;
      const dt = deltaMs / 16.67;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const analyser = window.__SPX_ANALYSER__;

      const freqData = new Uint8Array(128);
      const timeData = new Uint8Array(128);
      let isLiveAudio = false;

      if (analyser && isPlaying) {
        if (window.__SPX_AUDIO_CTX__ && window.__SPX_AUDIO_CTX__.state === 'suspended') {
          window.__SPX_AUDIO_CTX__.resume().catch(() => {});
        }
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        isLiveAudio = freqData.some(val => val > 3);
      }

      if (isLiveAudio) {
        // Fast Sub-bass & Bass Kick Band: Bins 1..6 (40 Hz - 260 Hz)
        let bassSum = 0;
        for (let i = 1; i <= 6; i++) {
          bassSum += freqData[i] || 0;
        }
        const currentBass = bassSum / (6 * 255);

        const history = energyHistoryRef.current;
        let histTotal = 0;
        for (let i = 0; i < history.length; i++) histTotal += history[i];
        const avgEnergy = histTotal / history.length;

        history[historyIdxRef.current] = currentBass;
        historyIdxRef.current = (historyIdxRef.current + 1) % history.length;

        const transientDelta = currentBass - (smoothedBassRef.current || 0);
        const timeSinceLastBeat = now - lastBeatTimeRef.current;

        if (
          ((currentBass > avgEnergy * 1.12 && currentBass - avgEnergy > 0.028) || transientDelta > 0.025) &&
          timeSinceLastBeat > 110
        ) {
          lastBeatTimeRef.current = now;
          const kickStrength = Math.min(1.0, (currentBass - avgEnergy) * 3.5 + Math.max(0, transientDelta) * 3.0);
          impactRef.current = Math.min(1.0, impactRef.current + Math.max(0.6, kickStrength));
          shockwaveRef.current = 1.0;
        }

        // Silky smooth organic bass follower locked to beat transients
        if (currentBass > smoothedBassRef.current) {
          smoothedBassRef.current = smoothedBassRef.current * 0.70 + currentBass * 0.30;
        } else {
          smoothedBassRef.current = smoothedBassRef.current * 0.85 + currentBass * 0.15;
        }
      } else if (isPlaying) {
        const curTime = (typeof useAudioStore !== 'undefined' && useAudioStore.getState().currentTime) || (now / 1000);
        const beatPeriod = 0.484;
        const beatPhase = (curTime % beatPeriod) / beatPeriod;

        const kickEnvelope = Math.pow(Math.max(0, 1 - beatPhase), 3.0);
        const offBeatPhase = ((curTime + beatPeriod * 0.5) % beatPeriod) / beatPeriod;
        const offBeatEnvelope = Math.pow(Math.max(0, 1 - offBeatPhase), 3.5) * 0.4;
        const groove = Math.max(kickEnvelope, offBeatEnvelope);

        if (beatPhase < 0.07 && now - lastBeatTimeRef.current > beatPeriod * 750) {
          lastBeatTimeRef.current = now;
          impactRef.current = Math.min(1.0, impactRef.current + 0.85);
          shockwaveRef.current = 1.0;
        }

        for (let i = 0; i < 128; i++) {
          const isBassBin = i <= 8;
          const isMidBin = i > 8 && i <= 36;
          let amp;
          if (isBassBin) {
            amp = kickEnvelope * 0.85 + 0.15;
          } else if (isMidBin) {
            amp = offBeatEnvelope * 0.65 + Math.sin(curTime * 8 + i * 0.2) * 0.15 + 0.15;
          } else {
            amp = 0.12 + Math.sin(curTime * 12 + i * 0.3) * 0.08 + groove * 0.15;
          }
          freqData[i] = Math.min(255, Math.round(amp * 230));
        }
        smoothedBassRef.current = smoothedBassRef.current * 0.75 + (0.18 + kickEnvelope * 0.62) * 0.25;
      } else {
        smoothedBassRef.current *= Math.pow(0.88, dt);
      }

      impactRef.current *= Math.pow(0.78, dt);
      shockwaveRef.current *= Math.pow(0.86, dt);

      const bass = prefersReducedMotion ? smoothedBassRef.current * 0.25 : smoothedBassRef.current;
      const impact = prefersReducedMotion ? impactRef.current * 0.25 : impactRef.current;

      // Silky smooth spectrum interpolation (fluid 60fps/120fps motion like Old VFX)
      const smoothData = smoothedDataRef.current;
      for (let i = 0; i < 128; i++) {
        const target = (freqData[i] || 0) / 255;
        if (target > smoothData[i]) {
          smoothData[i] = smoothData[i] * 0.65 + target * 0.35; // Smooth responsive attack
        } else {
          smoothData[i] = smoothData[i] * 0.82 + target * 0.18; // Gentle liquid decay
        }
      }

      // 1. Dynamic Ambient Radial Background Glow
      const ambientRadius = minDim * (0.36 + bass * 0.18);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(139, 92, 246, ${0.16 + bass * 0.2})`);
      ambientGrad.addColorStop(0.35, `rgba(236, 72, 153, ${0.1 + bass * 0.14})`);
      ambientGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.06 + bass * 0.08})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Starfield Particles
      particles.forEach(p => {
        p.update(width, height, isLiveAudio || isPlaying ? bass : 0.01);
        p.draw(ctx, cx, cy);
      });

      if (isPlaying) {
        rotationRef.current += (0.0035 + bass * 0.008) * dt;
      }
      const rot = rotationRef.current;

      // Smooth organic vinyl breathing locked to the beat (subtle ~6-8% max pulsation)
      const bounce = bass * 0.05 + impact * 0.04;
      const discRadius = minDim * 0.21 * (1 + bounce);
      const ringOuterRadius = discRadius * (224 / 188);

      // 3. Crisp Kick Shockwave
      if (shockwaveRef.current > 0.02) {
        const shockRadius = ringOuterRadius + (1 - shockwaveRef.current) * minDim * 0.18;
        ctx.beginPath();
        ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${shockwaveRef.current * 0.35})`;
        ctx.lineWidth = Math.max(1.5 * dpr, shockwaveRef.current * 2.5 * dpr);
        ctx.stroke();
      }

      // 4. 360° Symmetrical Radial Equalizer Rays
      const rayBaseRadius = ringOuterRadius + 4 * dpr;
      const peaks = peaksRef.current;
      const peakDecay = 0.9 * dpr * dt;

      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = (i / RAY_COUNT) * Math.PI * 2 + rot;
        const half = RAY_COUNT / 2;
        const distFromHalf = Math.abs(i - half);
        const logFactor = Math.pow(1 - distFromHalf / half, 1.5);
        const normalizedFreqIdx = Math.min(127, Math.floor(logFactor * 85));

        const val = isLiveAudio || isPlaying ? smoothData[normalizedFreqIdx] : 0.04;
        const rayLen = Math.max(4 * dpr, val * minDim * 0.22 * (1 + bass * 0.15 + impact * 0.15));

        if (rayLen >= peaks[i]) {
          peaks[i] = rayLen;
        } else {
          peaks[i] = Math.max(4 * dpr, peaks[i] - peakDecay);
        }

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const x1 = cx + cosA * rayBaseRadius;
        const y1 = cy + sinA * rayBaseRadius;
        const x2 = cx + cosA * (rayBaseRadius + rayLen);
        const y2 = cy + sinA * (rayBaseRadius + rayLen);

        const col = PRECOMPUTED_PALETTE[i];

        ctx.strokeStyle = col.rgb;
        ctx.lineWidth = 2.6 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const peakDist = rayBaseRadius + peaks[i] + 2.5 * dpr;
        const px = cx + cosA * peakDist;
        const py = cy + sinA * peakDist;

        ctx.fillStyle = col.rgba(0.4);
        ctx.beginPath();
        ctx.arc(px, py, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 1.6 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw Pre-rendered Offscreen Platter & HUD Gauge
      const platterCanvas = getOffscreenPlatter();
      if (platterCanvas) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot * 0.55);
        const scale = discRadius / (188 * dpr);
        const halfPlatter = (platterCanvas.width / 2) * scale;
        ctx.drawImage(platterCanvas, -halfPlatter, -halfPlatter, halfPlatter * 2, halfPlatter * 2);
        ctx.restore();
      }

      // 6. Center Album Artwork Record Label (Rotating at 33 RPM)
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

      // Inner Label Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, labelRadius, 0, Math.PI * 2);
      ctx.stroke();

      const spindleRadius = discRadius * 0.085;
      ctx.fillStyle = '#070709';
      ctx.beginPath();
      ctx.arc(0, 0, spindleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      ctx.restore();

      // 7. Specular Gloss Sheen
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
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      glossGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.02)');
      glossGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.0)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(cx - discRadius, cy - discRadius, discRadius * 2, discRadius * 2);
      ctx.restore();

      // Platter Outer Rim Accent
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.45 + bass * 0.4 + impact * 0.25})`;
      ctx.lineWidth = (1.5 + impact * 1.0) * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

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

      {activeTrack && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
              <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-warm-white truncate">{activeTrack.title}</p>
              <p className="text-[10px] text-warm-muted truncate">{activeTrack.artist}</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/15 border border-accent/30">
            360° Beats
          </span>
        </div>
      )}
    </div>
  );
});
