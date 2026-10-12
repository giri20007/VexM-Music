import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getArtworkSrc } from '../../utils/artworkGenerator';
import { Activity, Radio, Waves, Maximize2, Minimize2, Sparkles } from 'lucide-react';

/**
 * High-Performance Client-Side Audio Visualizer
 * Reacts dynamically to Bass, Mids, Treble & Amplitude using Web Audio API AnalyserNode.
 * Modes:
 *   1. 'spectrum' - Rounded vertical frequency bars with multi-stop gradient and reflection
 *   2. 'wave'     - Flowing multi-layer organic bezier waveforms
 *   3. 'orbital'  - Modern 360° Hi-Fi Audio Wheel with Conical Gradient, Center Vinyl Hub & HUD Gauge
 */

// Seamless 360° Conical Colorway
// Electric Violet (#8B5CF6) -> Vivid Neon Magenta (#EC4899) -> Coral Flame (#F43F5E) -> Electric Cyan (#06B6D4) -> Royal Blue (#3B82F6) -> Electric Violet (#8B5CF6)
const COLOR_STOPS = [
  { pos: 0.0, r: 139, g: 92, b: 246 },  // #8B5CF6
  { pos: 0.2, r: 236, g: 72, b: 153 }, // #EC4899
  { pos: 0.4, r: 244, g: 63, b: 94 },  // #F43F5E
  { pos: 0.6, r: 6, g: 182, b: 212 },  // #06B6D4
  { pos: 0.8, r: 59, g: 130, b: 246 }, // #3B82F6
  { pos: 1.0, r: 139, g: 92, b: 246 }, // #8B5CF6
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

// Particle class for Orbital starfield
class Particle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, randomDist = false) {
    this.angle = Math.random() * Math.PI * 2;
    const minDim = Math.min(w, h);
    const baseR = minDim * 0.28;
    this.dist = randomDist ? baseR + Math.random() * (minDim * 0.22) : baseR;
    this.speed = 0.4 + Math.random() * 1.3;
    this.size = 1 + Math.random() * 2.2;
    this.alpha = 0.2 + Math.random() * 0.6;
    this.normAngle = this.angle / (Math.PI * 2);
  }

  update(w, h, bassEnergy) {
    this.dist += this.speed + bassEnergy * 3.8;
    this.alpha -= 0.004;
    if (this.dist > Math.max(w, h) * 0.58 || this.alpha <= 0) {
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
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(256));
  const peaksRef = useRef(new Float32Array(72));
  const energyRef = useRef(0);
  const impactRef = useRef(0);
  const shockwaveRef = useRef(0);
  const lastBeatAtRef = useRef(0);

  // Preload and cache track artwork for Vinyl Hub center
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

    const ctx = canvas.getContext('2d');
    let animationId;
    let width = (canvas.width = container.clientWidth * (window.devicePixelRatio || 1) || 500);
    let height = (canvas.height = container.clientHeight * (window.devicePixelRatio || 1) || 500);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = canvas.width = container.clientWidth * (window.devicePixelRatio || 1) || 500;
      height = canvas.height = container.clientHeight * (window.devicePixelRatio || 1) || 500;
    };

    window.addEventListener('resize', handleResize);

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 48 }, () => new Particle(width, height));
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const dpr = window.devicePixelRatio || 1;
      const minDim = Math.min(width, height);
      const analyser = window.__SPX_ANALYSER__;

      let freqData = new Uint8Array(256);
      let timeData = new Uint8Array(256);
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

      // Separate broad bands so the VFX can distinguish a kick from general motion.
      const bandAverage = (start, end) => {
        let total = 0;
        let count = 0;
        for (let i = start; i < end; i++) {
          total += freqData[i] || 0;
          count += 1;
        }
        return count ? total / (count * 255) : 0;
      };

      const rawBass = bandAverage(0, 10);
      const mids = bandAverage(10, 42);
      const treble = bandAverage(42, 128);
      const rawEnergy = rawBass * 0.55 + mids * 0.3 + treble * 0.15;
      const previousEnergy = energyRef.current;
      energyRef.current = previousEnergy * 0.84 + rawEnergy * 0.16;
      const transient = Math.max(0, rawBass - previousEnergy * 0.72);
      const now = performance.now();

      // A short cooldown prevents one sustained bass note from becoming a machine-gun flash.
      if (isLiveAudio && transient > 0.075 && rawBass > 0.22 && now - lastBeatAtRef.current > 120) {
        lastBeatAtRef.current = now;
        impactRef.current = Math.min(1, impactRef.current + Math.min(0.9, transient * 2.8));
        shockwaveRef.current = 1;
      }
      impactRef.current *= 0.88;
      shockwaveRef.current *= 0.94;

      smoothedBassRef.current = smoothedBassRef.current * 0.78 + rawBass * 0.22;
      const bass = prefersReducedMotion ? smoothedBassRef.current * 0.25 : smoothedBassRef.current;

      const smoothData = smoothedDataRef.current;
      for (let i = 0; i < 128; i++) {
        const target = (freqData[i] || 0) / 255;
        smoothData[i] = smoothData[i] * 0.82 + target * 0.18;
      }

      // Dynamic Radial Ambient Background Glow
      const ambientRadius = minDim * (0.35 + bass * 0.2);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(139, 92, 246, ${0.18 + bass * 0.22})`); // Electric Violet
      ambientGrad.addColorStop(0.35, `rgba(236, 72, 153, ${0.12 + bass * 0.16})`); // Vivid Neon Magenta
      ambientGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.08 + bass * 0.1})`); // Electric Cyan
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // MODE 1: SPECTRUM (Vertical Rounded Frequency Bars with Tri-Stop Gradient & Reflection)
      if (activeMode === 'spectrum') {
        const barCount = 44;
        const totalBarWidth = width * 0.88;
        const barWidth = totalBarWidth / barCount - 3 * dpr;
        const startX = (width - totalBarWidth) / 2;
        const baseHeight = height * 0.70;

        for (let i = 0; i < barCount; i++) {
          const binIdx = Math.floor((i / barCount) * 64);
          const val = isLiveAudio ? smoothData[binIdx] : 0.04;
          const barH = Math.max(6 * dpr, val * height * 0.58);
          const x = startX + i * (barWidth + 3 * dpr);
          const y = baseHeight - barH;

          // Multi-Stop Gradient: Base (Cyan) -> Mid (Magenta) -> Peak (Neon Coral)
          const grad = ctx.createLinearGradient(0, baseHeight, 0, y);
          grad.addColorStop(0, '#06b6d4');   // Electric Cyan
          grad.addColorStop(0.3, '#3b82f6'); // Royal Blue
          grad.addColorStop(0.65, '#ec4899'); // Vivid Magenta
          grad.addColorStop(1, '#f43f5e');   // Coral Flame

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [4 * dpr, 4 * dpr, 0, 0]);
          ctx.fill();

          // Mirrored Reflection with Fading Blur
          const reflH = barH * 0.28;
          const reflGrad = ctx.createLinearGradient(0, baseHeight, 0, baseHeight + reflH);
          reflGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
          reflGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
          reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = reflGrad;
          ctx.beginPath();
          ctx.roundRect(x, baseHeight + 3 * dpr, barWidth, reflH, [0, 0, 4 * dpr, 4 * dpr]);
          ctx.fill();
        }
      }

      // MODE 2: WAVE (Multi-Layer Flowing Bezier Waveforms with Gradient Accents)
      else if (activeMode === 'wave') {
        const points = 64;
        const step = width / (points - 1);
        const centerY = height * 0.52;

        const waveLayers = [
          { alpha: 0.2, amp: 1.1, color1: '#8b5cf6', color2: '#06b6d4', offset: 0 },
          { alpha: 0.45, amp: 0.8, color1: '#ec4899', color2: '#f43f5e', offset: 1.5 },
          { alpha: 0.95, amp: 0.55, color1: '#06b6d4', color2: '#ffffff', offset: 3.0 },
        ];

        waveLayers.forEach((layer, lIdx) => {
          ctx.beginPath();
          ctx.moveTo(0, centerY);

          for (let i = 0; i < points; i++) {
            const binIdx = Math.floor((i / points) * 64);
            const freqVal = smoothData[binIdx] || 0;
            const timeVal = ((timeData[i * 2] || 128) - 128) / 128;
            const displacement = isLiveAudio
              ? (timeVal * 0.6 + freqVal * 0.4) * (height * 0.32 * layer.amp)
              : Math.sin(Date.now() / 400 + i * 0.2 + layer.offset) * (height * 0.04);

            const x = i * step;
            const y = centerY + displacement;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              const prevX = (i - 1) * step;
              const prevBin = Math.floor(((i - 1) / points) * 64);
              const prevFreq = smoothData[prevBin] || 0;
              const prevTime = ((timeData[(i - 1) * 2] || 128) - 128) / 128;
              const prevDisp = isLiveAudio
                ? (prevTime * 0.6 + prevFreq * 0.4) * (height * 0.32 * layer.amp)
                : Math.sin(Date.now() / 400 + (i - 1) * 0.2 + layer.offset) * (height * 0.04);
              const prevY = centerY + prevDisp;
              const mx = (prevX + x) / 2;
              const my = (prevY + y) / 2;
              ctx.quadraticCurveTo(prevX, prevY, mx, my);
            }
          }

          const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
          waveGrad.addColorStop(0, layer.color1);
          waveGrad.addColorStop(1, layer.color2);

          ctx.strokeStyle = waveGrad;
          ctx.lineWidth = (lIdx === 2 ? 3.5 : 2) * dpr;
          ctx.shadowColor = layer.color1;
          ctx.shadowBlur = lIdx === 2 ? 16 : 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      // MODE 3: ROUND VFX / ORBITAL (360° Seamless Conical Wheel with Vinyl Platter & HUD Gauge)
      else {
        if (isPlaying) {
          rotationRef.current += 0.004 + bass * 0.01;
        }
        const rot = rotationRef.current;

        // Ambient Starfield Particles
        particlesRef.current.forEach(p => {
          p.update(width, height, isLiveAudio ? bass : 0.01);
          p.draw(ctx, cx, cy);
        });

        // 1. Center disc pulse: bass controls the body, transients control the hit.
        const discRadius = minDim * 0.22 * (1 + bass * 0.05 + impactRef.current * 0.035);
        const ringOuterRadius = discRadius + 18 * dpr;

        // A short-lived shockwave makes kick transients readable without overwhelming artwork.
        if (shockwaveRef.current > 0.015) {
          const shockRadius = ringOuterRadius + (1 - shockwaveRef.current) * minDim * 0.2;
          ctx.beginPath();
          ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${shockwaveRef.current * 0.28})`;
          ctx.lineWidth = Math.max(1, shockwaveRef.current * 5 * dpr);
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = shockwaveRef.current * 18 * dpr;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 2. 360° Symmetrical Radial Equalizer Bars with Seamless Angular Gradient
        const rayCount = 72;
        const rayBaseRadius = ringOuterRadius + 4 * dpr;

        if (!peaksRef.current || peaksRef.current.length !== rayCount) {
          peaksRef.current = new Float32Array(rayCount);
        }
        const peaks = peaksRef.current;
        const peakDecay = 1.0 * dpr;

        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2 + rot;
          // Symmetrical acoustic crest from bottom-center outward
          const half = rayCount / 2;
          const distFromHalf = Math.abs(i - half);
          const normalizedFreqIdx = Math.floor((1 - distFromHalf / half) * 54);
          const val = isLiveAudio ? smoothData[normalizedFreqIdx] : 0.05;
          const rayLen = Math.max(4 * dpr, val * minDim * 0.23 * (1 + bass * 0.32 + impactRef.current * 0.18));

          // Peak hold indicator physics
          if (rayLen >= peaks[i]) {
            peaks[i] = rayLen;
          } else {
            peaks[i] = Math.max(4 * dpr, peaks[i] - peakDecay);
          }

          const x1 = cx + Math.cos(angle) * rayBaseRadius;
          const y1 = cy + Math.sin(angle) * rayBaseRadius;
          const x2 = cx + Math.cos(angle) * (rayBaseRadius + rayLen);
          const y2 = cy + Math.sin(angle) * (rayBaseRadius + rayLen);

          // Continuous Angular Gradient Color
          const normAngle = ((i / rayCount) % 1 + 1) % 1;
          const col = getAngularColor(normAngle);

          // Radial Linear Gradient along bar
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

        // 3. Concentric HUD Gauge Rings (Two 1px rings with 15% opacity)
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
          const isMajor = t % 6 === 0; // 0°, 90°, 180°, 270°
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

        // 4. Monospace Curved Typography: "✦ HIGH FIDELITY • 360° AUDIO LAB • SPiDEYxFLASH ✦"
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot * 0.55); // Rotates smoothly with 33 RPM feel

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

        // 5. Obsidian Black Turntable Vinyl Platter
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
          // Sleek dark gradient label fallback
          const labelGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, labelRadius);
          labelGrad.addColorStop(0, '#2e1065');
          labelGrad.addColorStop(0.5, '#1e1b4b');
          labelGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = labelGrad;
          ctx.fillRect(-labelRadius, -labelRadius, labelRadius * 2, labelRadius * 2);

          // Stylized fallback branding
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `bold ${Math.max(8, labelRadius * 0.22)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VEX', 0, -labelRadius * 0.2);
          ctx.fillStyle = '#fa2d48';
          ctx.font = `bold ${Math.max(7, labelRadius * 0.18)}px sans-serif`;
          ctx.fillText('-M', 0, labelRadius * 0.2);
        }

        // Inner Vinyl Label Ring
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

        // 7. Glass Specular Gloss Sheen
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
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.45 + bass * 0.4 + impactRef.current * 0.25})`;
        ctx.lineWidth = (1.6 + impactRef.current * 1.2) * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

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
        aria-label="Audio Visualizer. Click to return to Album Artwork."
      />

      {interactive && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 pointer-events-auto shadow-lg">
            <button
              onClick={() => setVisualizerMode('orbital')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'orbital' || activeMode === 'round_vfx'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Round VFX mode"
              aria-label="Round VFX visualizer mode"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Round VFX</span>
            </button>

            <button
              onClick={() => setVisualizerMode('spectrum')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'spectrum'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Spectrum mode"
              aria-label="Spectrum visualizer mode"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spectrum</span>
            </button>

            <button
              onClick={() => setVisualizerMode('wave')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMode === 'wave'
                  ? 'bg-accent text-bg-primary shadow'
                  : 'text-warm-muted hover:text-white hover:bg-white/10'
              }`}
              title="Wave mode"
              aria-label="Wave visualizer mode"
            >
              <Waves className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wave</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-warm-muted hover:text-white hover:bg-white/15 transition shadow-lg"
                title="Fullscreen Visualizer"
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
 * Mini Beat Visualizer Component
 * Displays underneath playback controls. Clicking it triggers expansion.
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

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const analyser = window.__SPX_ANALYSER__;
      const barWidth = width / barCount - 1.5;

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const value = dataArray[index] || 0;
          const barHeight = Math.max(3, (value / 255) * height);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, '#00f2fe');
          grad.addColorStop(0.5, '#f093fb');
          grad.addColorStop(1, '#ff5858');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (isPlaying) {
        const time = Date.now() / 200;
        for (let i = 0; i < barCount; i++) {
          const val = (Math.sin(time + i * 0.5) + 1) / 2;
          const barHeight = Math.max(3, val * height * 0.7 + 3);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, '#00f2fe');
          grad.addColorStop(1, '#ff5858');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 1.5);
          const y = height - 3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, 3, 1);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

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
      aria-label="Open Full-Size Visualizer"
    >
      <canvas ref={canvasRef} width={width} height={height} className="rounded-lg pointer-events-none" />

      {/* Hover Expand Badge & Tooltip */}
      <div className="absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-xs flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>Open Visualizer</span>
      </div>
    </div>
  );
});
