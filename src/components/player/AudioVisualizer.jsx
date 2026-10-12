import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { Activity, Radio, Waves, Maximize2, Minimize2, Sparkles, Orbit } from 'lucide-react';

/**
 * Next-Generation "Beats" Audio Visualizer
 * High-performance, zero-latency audio engine with 4 fresh, vibrant modes:
 *   1. 'orbital'  - Orbit Beats: 360° Neon Turntable with physical bass-reactive vinyl bounce & HUD gauge
 *   2. 'nova'     - Cosmic Nova: Pulsating stellar core with gravitational light rays & particle burst
 *   3. 'spectrum' - Cyber Spectrum: Futuristic 3D studio equalizer with floating peak caps & glossy mirror reflection
 *   4. 'wave'     - Aurora Silk: Liquid flowing ribbon waveforms with organic harmonic resonance
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

// High-speed particle with radial velocity for Cosmic Nova & Orbit modes
class CosmicParticle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, randomDist = false) {
    this.angle = Math.random() * Math.PI * 2;
    const minDim = Math.min(w, h);
    const baseR = minDim * 0.26;
    this.dist = randomDist ? baseR + Math.random() * (minDim * 0.28) : baseR;
    this.speed = 0.6 + Math.random() * 1.6;
    this.size = 1 + Math.random() * 2.2;
    this.alpha = 0.3 + Math.random() * 0.65;
    this.paletteIdx = Math.floor((this.angle / (Math.PI * 2)) * RAY_COUNT) % RAY_COUNT;
  }

  update(w, h, bass, impact) {
    // Dynamic acceleration on drum drops
    this.dist += this.speed + bass * 2.8 + impact * 6.5;
    this.alpha -= 0.005;
    if (this.dist > Math.max(w, h) * 0.58 || this.alpha <= 0) {
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

export function AudioVisualizer({
  mode: propMode,
  onToggleFullscreen,
  onCollapse,
  interactive = true,
  className = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const currentTrack = useAudioStore(s => s.currentTrack);
  const storeMode = useSettingsStore(s => s.visualizerMode);
  const setVisualizerMode = useSettingsStore(s => s.setVisualizerMode);

  const activeMode = propMode || storeMode || 'orbital';
  const particlesRef = useRef([]);
  const rotationRef = useRef(0);

  // Precision audio & beat state refs
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(128));
  const peaksRef = useRef(new Float32Array(RAY_COUNT));
  const spectrumPeaksRef = useRef(new Float32Array(48));
  const impactRef = useRef(0);
  const shockwaveRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const energyHistoryRef = useRef(new Float32Array(35));
  const historyIdxRef = useRef(0);

  // Offscreen pre-rendered static platter & HUD gauge canvas
  const offscreenPlatterRef = useRef(null);
  const offscreenPlatterSizeRef = useRef(0);

  // Preload and cache track artwork for Center Vinyl Hub
  const artworkImageRef = useRef(null);
  const loadedTrackIdRef = useRef(null);

  useEffect(() => {
    if (!currentTrack) {
      artworkImageRef.current = null;
      loadedTrackIdRef.current = null;
      return;
    }
    if (loadedTrackIdRef.current === currentTrack.id && artworkImageRef.current) return;
    loadedTrackIdRef.current = currentTrack.id;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getArtworkSrc(currentTrack, 300);
    img.onload = () => {
      artworkImageRef.current = img;
    };
    img.onerror = () => {
      artworkImageRef.current = null;
    };
  }, [currentTrack?.id, currentTrack?.thumbnail]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let animationId;

    const getClampedDpr = () => Math.min(window.devicePixelRatio || 1, 2.0);

    let dpr = getClampedDpr();
    let width = (canvas.width = Math.floor(container.clientWidth * dpr || 500));
    let height = (canvas.height = Math.floor(container.clientHeight * dpr || 500));

    const handleResize = () => {
      if (!container || !canvas) return;
      dpr = getClampedDpr();
      width = canvas.width = Math.floor(container.clientWidth * dpr || 500);
      height = canvas.height = Math.floor(container.clientHeight * dpr || 500);
      offscreenPlatterRef.current = null;
    };

    window.addEventListener('resize', handleResize);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particleCount = prefersReducedMotion ? 14 : 32;
    particlesRef.current = Array.from({ length: particleCount }, () => new CosmicParticle(width, height));

    /**
     * Pre-render static turntable platter, groove rings, and HUD typography once onto an offscreen canvas
     */
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

      // 2. Concentric Groove Rings
      const grooveRatios = [0.94, 0.88, 0.82, 0.76, 0.70, 0.64];
      oCtx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      oCtx.lineWidth = 1 * dpr;
      grooveRatios.forEach(ratio => {
        oCtx.beginPath();
        oCtx.arc(oCenter, oCenter, discRadius * ratio, 0, Math.PI * 2);
        oCtx.stroke();
      });

      // 3. Concentric HUD Guide Rings
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

      // 5. Monospace Curved Typography: "✦ HIGH FIDELITY • BEATS ENGINE • VEX-M ✦"
      const textRadius = (hudInnerRadius + hudOuterRadius) / 2;
      const brandString = '✦ HIGH FIDELITY • BEATS ENGINE • VEX-M ✦ ';
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

      // True Real-Time Beat & Kick Transient Detection
      if (isLiveAudio) {
        // Broad Sub-bass & Bass Kick Band: Bins 1..8 (40 Hz - 350 Hz)
        let bassSum = 0;
        let bassWeight = 0;
        for (let i = 1; i <= 8; i++) {
          const w = i <= 3 ? 1.6 : (i <= 5 ? 1.2 : 0.8);
          bassSum += (freqData[i] || 0) * w;
          bassWeight += w * 255;
        }
        const currentBass = bassSum / bassWeight;

        // Update running energy history buffer for dynamic adaptive threshold
        const history = energyHistoryRef.current;
        let histTotal = 0;
        for (let i = 0; i < history.length; i++) histTotal += history[i];
        const avgEnergy = histTotal / history.length;

        history[historyIdxRef.current] = currentBass;
        historyIdxRef.current = (historyIdxRef.current + 1) % history.length;

        // Instant Transient Kick Impulse Detection
        const transientDelta = currentBass - (smoothedBassRef.current || 0);
        const timeSinceLastBeat = now - lastBeatTimeRef.current;

        // Fast adaptive kick trigger:
        // Catches direct bass jumps above dynamic baseline or sharp rising transients
        if (
          ((currentBass > avgEnergy * 1.15 && currentBass - avgEnergy > 0.035) || transientDelta > 0.03) &&
          timeSinceLastBeat > 130
        ) {
          lastBeatTimeRef.current = now;
          const kickStrength = Math.min(1.0, (currentBass - avgEnergy) * 3.0 + Math.max(0, transientDelta) * 2.5);
          impactRef.current = Math.min(1.0, impactRef.current + Math.max(0.4, kickStrength));
          shockwaveRef.current = 1.0;
        }

        // Asymmetric zero-latency envelope follower: Instant attack on bass rise, smooth exponential acoustic release
        if (currentBass > smoothedBassRef.current) {
          smoothedBassRef.current = smoothedBassRef.current * 0.12 + currentBass * 0.88; // <1 frame attack
        } else {
          smoothedBassRef.current = smoothedBassRef.current * Math.pow(0.84, dt);
        }
      } else if (isPlaying) {
        // Synthesized acoustic drum engine synchronized to track playback time
        const track = useAudioStore.getState().currentTrack;
        const trackStr = track?.id ? String(track.id) : (track?.title || 'track');
        let hash = 0;
        for (let i = 0; i < trackStr.length; i++) hash = ((hash << 5) - hash + trackStr.charCodeAt(i)) | 0;
        const bpm = 118 + (Math.abs(hash) % 15);
        const beatPeriod = 60 / bpm;
        const curTime = (typeof useAudioStore !== 'undefined' && useAudioStore.getState().currentTime) || (now / 1000);
        const beatPhase = (curTime % beatPeriod) / beatPeriod;

        const kickEnvelope = Math.pow(Math.max(0, 1 - beatPhase), 2.6);
        const offBeatPhase = ((curTime + beatPeriod * 0.5) % beatPeriod) / beatPeriod;
        const offBeatEnvelope = Math.pow(Math.max(0, 1 - offBeatPhase), 3.2) * 0.45;
        const groove = Math.max(kickEnvelope, offBeatEnvelope);

        if (beatPhase < 0.08 && now - lastBeatTimeRef.current > beatPeriod * 750) {
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
          timeData[i] = Math.round(128 + Math.sin(curTime * 20 + i * 0.4) * 35 * (groove + 0.2));
        }
        smoothedBassRef.current = 0.18 + kickEnvelope * 0.62;
      } else {
        smoothedBassRef.current *= Math.pow(0.85, dt);
      }

      // Smooth decay for beat impact & shockwave
      impactRef.current *= Math.pow(0.86, dt);
      shockwaveRef.current *= Math.pow(0.92, dt);

      const bass = prefersReducedMotion ? smoothedBassRef.current * 0.25 : smoothedBassRef.current;
      const impact = prefersReducedMotion ? impactRef.current * 0.25 : impactRef.current;

      // Update smoothed spectrum bins with asymmetric attack/decay
      const smoothData = smoothedDataRef.current;
      for (let i = 0; i < 128; i++) {
        const target = (freqData[i] || 0) / 255;
        if (target > smoothData[i]) {
          smoothData[i] = smoothData[i] * 0.3 + target * 0.7; // Fast attack
        } else {
          smoothData[i] = smoothData[i] * Math.pow(0.85, dt) + target * (1 - Math.pow(0.85, dt));
        }
      }

      // Dynamic Ambient Radial Glow
      const ambientRadius = minDim * (0.36 + bass * 0.2);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(139, 92, 246, ${0.18 + bass * 0.22 + impact * 0.15})`);
      ambientGrad.addColorStop(0.35, `rgba(236, 72, 153, ${0.12 + bass * 0.14})`);
      ambientGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.06 + bass * 0.08})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // MODE 1: ORBIT BEATS (360° Neon Turntable with Living Vinyl Bass Bounce)
      // =========================================================================
      if (activeMode === 'orbital' || activeMode === 'round_vfx' || activeMode === 'orbit') {
        if (isPlaying) {
          rotationRef.current += (0.0035 + bass * 0.008) * dt;
        }
        const rot = rotationRef.current;

        // Ambient Starfield Particles
        particlesRef.current.forEach(p => {
          p.update(width, height, isLiveAudio || isPlaying ? bass : 0.01, impact);
          p.draw(ctx, cx, cy);
        });

        // Dynamic physical vinyl radius with drum bounce!
        const bounce = bass * 0.15 + impact * 0.18;
        const discRadius = minDim * 0.21 * (1 + bounce);
        const ringOuterRadius = discRadius * (224 / 188);

        // Expanding Kick Shockwave Ring
        if (shockwaveRef.current > 0.02) {
          const shockRadius = ringOuterRadius + (1 - shockwaveRef.current) * minDim * 0.22;
          ctx.beginPath();
          ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${shockwaveRef.current * 0.55})`;
          ctx.lineWidth = Math.max(1.5 * dpr, shockwaveRef.current * 4.5 * dpr);
          ctx.stroke();
        }

        // 360° Symmetrical Radial Equalizer Rays
        const rayBaseRadius = ringOuterRadius + 4 * dpr;
        const peaks = peaksRef.current;
        const peakDecay = 1.2 * dpr * dt;

        for (let i = 0; i < RAY_COUNT; i++) {
          const angle = (i / RAY_COUNT) * Math.PI * 2 + rot;
          const half = RAY_COUNT / 2;
          const distFromHalf = Math.abs(i - half);
          const logFactor = Math.pow(1 - distFromHalf / half, 1.5);
          const normalizedFreqIdx = Math.min(127, Math.floor(logFactor * 85));

          const val = isLiveAudio || isPlaying ? smoothData[normalizedFreqIdx] : 0.04;
          const rayLen = Math.max(4 * dpr, val * minDim * 0.23 * (1 + bass * 0.45 + impact * 0.35));

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

          // Luminous Peak Cap Dot
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

        // Draw Pre-rendered Offscreen Platter & HUD Gauge (Single Blit!)
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

        // Center Album Artwork Record Label (Bounces to the Kick)
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

        // Inner Label Ring & Center Spindle
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

        // Platter Outer Rim Accent
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.45 + bass * 0.4 + impact * 0.25})`;
        ctx.lineWidth = (1.5 + impact * 1.0) * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // =========================================================================
      // MODE 2: COSMIC NOVA (Pulsating Stellar Core with Gravitational Burst)
      // =========================================================================
      else if (activeMode === 'nova' || activeMode === 'cosmic') {
        if (isPlaying) {
          rotationRef.current += (0.005 + bass * 0.012) * dt;
        }
        const rot = rotationRef.current;

        // Particle Galaxy Swarm
        particlesRef.current.forEach(p => {
          p.update(width, height, isLiveAudio || isPlaying ? bass : 0.01, impact);
          p.draw(ctx, cx, cy);
        });

        // Dual Orbiting Energy Satellites
        for (let s = 0; s < 2; s++) {
          const satAngle = rot * 1.8 + s * Math.PI;
          const satDist = minDim * (0.34 + bass * 0.08);
          const sx = cx + Math.cos(satAngle) * satDist;
          const sy = cy + Math.sin(satAngle) * satDist;
          ctx.fillStyle = s === 0 ? '#06b6d4' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Radiant Stellar Rays shooting from core
        const novaRays = 48;
        const coreRadius = minDim * (0.16 + bass * 0.12 + impact * 0.15);

        for (let i = 0; i < novaRays; i++) {
          const angle = (i / novaRays) * Math.PI * 2 + rot;
          const freqIdx = Math.min(127, Math.floor(Math.pow(i / novaRays, 1.4) * 80));
          const val = isLiveAudio || isPlaying ? smoothData[freqIdx] : 0.04;
          const beamLen = Math.max(8 * dpr, val * minDim * 0.32 * (1 + bass * 0.45 + impact * 0.35));

          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const x1 = cx + cosA * coreRadius;
          const y1 = cy + sinA * coreRadius;
          const x2 = cx + cosA * (coreRadius + beamLen);
          const y2 = cy + sinA * (coreRadius + beamLen);

          const col = PRECOMPUTED_PALETTE[Math.floor((i / novaRays) * RAY_COUNT) % RAY_COUNT];

          ctx.strokeStyle = col.rgb;
          ctx.lineWidth = (2.2 + impact * 1.2) * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Star tip spark
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x2, y2, 1.8 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center Pulsing Artwork Core
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        ctx.clip();

        if (artworkImageRef.current && artworkImageRef.current.complete && artworkImageRef.current.naturalWidth > 0) {
          ctx.drawImage(artworkImageRef.current, -coreRadius, -coreRadius, coreRadius * 2, coreRadius * 2);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-coreRadius, -coreRadius, coreRadius * 2, coreRadius * 2);
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + impact * 0.4})`;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
        ctx.restore();

        // Outer Supernova Shockwave on Heavy Beat
        if (shockwaveRef.current > 0.02) {
          const novaWave = coreRadius + (1 - shockwaveRef.current) * minDim * 0.25;
          ctx.beginPath();
          ctx.arc(cx, cy, novaWave, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 63, 94, ${shockwaveRef.current * 0.5})`;
          ctx.lineWidth = shockwaveRef.current * 3.5 * dpr;
          ctx.stroke();
        }
      }

      // =========================================================================
      // MODE 3: CYBER SPECTRUM (3D Studio Equalizer with Gravity Peak Caps)
      // =========================================================================
      else if (activeMode === 'spectrum') {
        const barCount = 44;
        const totalBarWidth = width * 0.88;
        const barWidth = totalBarWidth / barCount - 3 * dpr;
        const startX = (width - totalBarWidth) / 2;
        const baseHeight = height * 0.70;

        const spectrumGrad = ctx.createLinearGradient(0, baseHeight, 0, baseHeight - height * 0.65);
        spectrumGrad.addColorStop(0, '#06b6d4');   // Electric Cyan
        spectrumGrad.addColorStop(0.35, '#3b82f6'); // Royal Blue
        spectrumGrad.addColorStop(0.7, '#ec4899');  // Vivid Magenta
        spectrumGrad.addColorStop(1, '#f43f5e');    // Coral Flame

        const reflGrad = ctx.createLinearGradient(0, baseHeight, 0, baseHeight + height * 0.2);
        reflGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        reflGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
        reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        const specPeaks = spectrumPeaksRef.current;
        const specDecay = 1.4 * dpr * dt;

        for (let i = 0; i < barCount; i++) {
          const logIdx = Math.min(127, Math.floor(Math.pow(i / barCount, 1.5) * 85));
          const val = isLiveAudio || isPlaying ? smoothData[logIdx] : 0.04;
          const barH = Math.max(6 * dpr, val * height * (0.50 + bass * 0.28 + impact * 0.25));
          const x = startX + i * (barWidth + 3 * dpr);
          const y = baseHeight - barH;

          // Peak holding physics
          if (barH >= specPeaks[i]) {
            specPeaks[i] = barH;
          } else {
            specPeaks[i] = Math.max(6 * dpr, specPeaks[i] - specDecay);
          }

          // Main vertical bar
          ctx.fillStyle = spectrumGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [4 * dpr, 4 * dpr, 0, 0]);
          ctx.fill();

          // Floating Studio Peak Cap
          const peakY = baseHeight - specPeaks[i] - 3 * dpr;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x, peakY, barWidth, 2.2 * dpr, 1 * dpr);
          ctx.fill();

          // Mirrored Reflection
          const reflH = barH * 0.26;
          ctx.fillStyle = reflGrad;
          ctx.beginPath();
          ctx.roundRect(x, baseHeight + 3 * dpr, barWidth, reflH, [0, 0, 4 * dpr, 4 * dpr]);
          ctx.fill();
        }
      }

      // =========================================================================
      // MODE 4: AURORA SILK (Flowing Liquid Ribbon Waveforms)
      // =========================================================================
      else {
        const points = 56;
        const step = width / (points - 1);
        const centerY = height * 0.52;

        const waveLayers = [
          { stroke: '#8b5cf6', width: 2 * dpr, amp: 1.0, alpha: 0.35, offset: 0 },
          { stroke: '#ec4899', width: 2.2 * dpr, amp: 0.75, alpha: 0.6, offset: 1.5 },
          { stroke: '#06b6d4', width: 3.2 * dpr, amp: 0.5, alpha: 1.0, offset: 3.0 },
        ];

        waveLayers.forEach(layer => {
          ctx.beginPath();
          ctx.moveTo(0, centerY);

          for (let i = 0; i < points; i++) {
            const binIdx = Math.min(127, Math.floor((i / points) * 54));
            const freqVal = smoothData[binIdx] || 0;
            const timeVal = ((timeData[i * 2] || 128) - 128) / 128;
            const displacement = isLiveAudio || isPlaying
              ? (timeVal * 0.6 + freqVal * 0.4) * (height * (0.26 + bass * 0.26 + impact * 0.22) * layer.amp)
              : Math.sin(now / 400 + i * 0.2 + layer.offset) * (height * 0.04);

            const x = i * step;
            const y = centerY + displacement;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              const prevX = (i - 1) * step;
              const prevBin = Math.min(127, Math.floor(((i - 1) / points) * 54));
              const prevFreq = smoothData[prevBin] || 0;
              const prevTime = ((timeData[(i - 1) * 2] || 128) - 128) / 128;
              const prevDisp = isLiveAudio || isPlaying
                ? (prevTime * 0.6 + prevFreq * 0.4) * (height * (0.26 + bass * 0.26 + impact * 0.22) * layer.amp)
                : Math.sin(now / 400 + (i - 1) * 0.2 + layer.offset) * (height * 0.04);
              const prevY = centerY + prevDisp;
              const mx = (prevX + x) / 2;
              const my = (prevY + y) / 2;
              ctx.quadraticCurveTo(prevX, prevY, mx, my);
            }
          }

          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = layer.width;
          ctx.globalAlpha = layer.alpha;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        });
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, activeMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-center rounded-3xl overflow-hidden bg-bg-card/90 border border-white/10 shadow-2xl backdrop-blur-xl select-none group ${className}`}
    >
      <canvas
        ref={canvasRef}
        onClick={interactive ? onCollapse : undefined}
        className="w-full h-full cursor-pointer transition-transform duration-500 group-hover:scale-101"
        aria-label="Audio Beats Visualizer. Click to return to Album Artwork."
      />

      {interactive && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 pointer-events-auto shadow-lg">
            <button
              onClick={() => setVisualizerMode('orbital')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'orbital' || activeMode === 'round_vfx' || activeMode === 'orbit'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Orbit Beats Mode"
              aria-label="Orbit Beats visualizer mode"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orbit Beats</span>
            </button>

            <button
              onClick={() => setVisualizerMode('nova')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'nova' || activeMode === 'cosmic'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Cosmic Nova Mode"
              aria-label="Cosmic Nova visualizer mode"
            >
              <Orbit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cosmic Nova</span>
            </button>

            <button
              onClick={() => setVisualizerMode('spectrum')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'spectrum'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Cyber Spectrum Mode"
              aria-label="Cyber Spectrum visualizer mode"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cyber Spectrum</span>
            </button>

            <button
              onClick={() => setVisualizerMode('wave')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'wave' || activeMode === 'aurora'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Aurora Silk Mode"
              aria-label="Aurora Silk visualizer mode"
            >
              <Waves className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aurora Silk</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-warm-muted hover:text-white hover:bg-white/15 transition shadow-lg"
                title="Fullscreen Beats"
                aria-label="Fullscreen visualizer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {onCollapse && (
              <button
                onClick={onCollapse}
                className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-warm-muted hover:text-white hover:bg-white/15 transition shadow-lg"
                title="Return to Album Artwork"
                aria-label="Return to album artwork"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {interactive && (
        <div className="absolute bottom-3 text-[10px] font-medium text-warm-muted/60 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          Click visualizer to return to album cover
        </div>
      )}
    </div>
  );
}

/**
 * Mini Beats Visualizer Component
 */
export const MiniBeatVisualizer = memo(function MiniBeatVisualizer({
  onExpand,
  width = 240,
  height = 24,
  barCount = 28,
}) {
  const canvasRef = useRef(null);
  const isPlaying = useAudioStore(s => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const barWidth = width / barCount - 1.5;

    const sharedGrad = ctx.createLinearGradient(0, height, 0, 0);
    sharedGrad.addColorStop(0, '#00f2fe');
    sharedGrad.addColorStop(0.5, '#f093fb');
    sharedGrad.addColorStop(1, '#ff5858');

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const analyser = window.__SPX_ANALYSER__;

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = sharedGrad;
        for (let i = 0; i < barCount; i++) {
          const index = Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.4) * (bufferLength / 2)));
          const value = dataArray[index] || 0;
          const barHeight = Math.max(3, (value / 255) * height);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (isPlaying) {
        const curTime = (typeof useAudioStore !== 'undefined' && useAudioStore.getState().currentTime) || (performance.now() / 1000);
        const beatPeriod = 0.48;
        const beatPhase = (curTime % beatPeriod) / beatPeriod;
        const kickEnvelope = Math.pow(Math.max(0, 1 - beatPhase), 2.5);
        ctx.fillStyle = sharedGrad;
        for (let i = 0; i < barCount; i++) {
          const val = i <= 6 ? (kickEnvelope * 0.8 + 0.15) : (Math.sin(curTime * 10 + i * 0.4) * 0.35 + 0.45);
          const barHeight = Math.max(3, val * height * 0.85);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 1.5);
          const y = height - 3;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, 3, 1);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, width, height, barCount]);

  return (
    <div
      onClick={onExpand}
      className="group relative flex items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/40 cursor-pointer transition-all duration-300 hover:scale-105 shadow-sm"
      title="Click to expand audio visualizer"
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-label="Open Full-Size Beats Visualizer"
    >
      <canvas ref={canvasRef} width={width} height={height} className="rounded-lg pointer-events-none" />

      <div className="absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-xs flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>Open Beats</span>
      </div>
    </div>
  );
});
