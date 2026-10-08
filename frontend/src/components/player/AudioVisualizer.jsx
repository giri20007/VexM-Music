import React, { useEffect, useRef, memo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Activity, Radio, Waves, Maximize2, Minimize2, Sparkles } from 'lucide-react';

/**
 * High-Performance Client-Side Audio Visualizer
 * Reacts dynamically to Bass, Mids, Treble & Amplitude using Web Audio API AnalyserNode.
 * Modes:
 *   1. 'spectrum' - Rounded vertical frequency bars with gradient and peak falloff
 *   2. 'wave'     - Flowing multi-layer organic bezier waveforms
 *   3. 'orbital'  - Circular radial frequency rays with bass-pulsing vinyl ring & particle starfield
 */

// Particle class for Orbital starfield
class Particle {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, randomDist = false) {
    this.angle = Math.random() * Math.PI * 2;
    this.dist = randomDist ? Math.random() * (Math.min(w, h) * 0.45) : 30 + Math.random() * 20;
    this.speed = 0.5 + Math.random() * 1.5;
    this.size = 1 + Math.random() * 2;
    this.alpha = 0.1 + Math.random() * 0.6;
    this.hue = Math.random() > 0.5 ? 350 : 270; // Pink / Purple
  }

  update(w, h, bassEnergy) {
    this.dist += this.speed + bassEnergy * 4;
    this.alpha -= 0.003;
    if (this.dist > Math.max(w, h) * 0.6 || this.alpha <= 0) {
      this.reset(w, h, false);
    }
  }

  draw(ctx, cx, cy) {
    const x = cx + Math.cos(this.angle) * this.dist;
    const y = cy + Math.sin(this.angle) * this.dist;
    ctx.fillStyle = `hsla(${this.hue}, 85%, 65%, ${this.alpha})`;
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
  const storeMode = useSettingsStore(s => s.visualizerMode);
  const setVisualizerMode = useSettingsStore(s => s.setVisualizerMode);

  const activeMode = propMode || storeMode || 'orbital';
  const particlesRef = useRef([]);
  const rotationRef = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedDataRef = useRef(new Float32Array(128));

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
      particlesRef.current = Array.from({ length: 45 }, () => new Particle(width, height));
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const analyser = window.__SPX_ANALYSER__;

      let freqData = new Uint8Array(128);
      let timeData = new Uint8Array(128);
      let isLiveAudio = false;

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        isLiveAudio = true;
      } else if (isPlaying) {
        const t = Date.now() / 300;
        for (let i = 0; i < 128; i++) {
          freqData[i] = Math.max(10, Math.sin(t + i * 0.15) * 60 + Math.cos(t * 0.7 + i * 0.05) * 40 + 70);
          timeData[i] = 128 + Math.sin(t * 1.5 + i * 0.1) * 25;
        }
        isLiveAudio = true;
      }

      let rawBass = 0;
      for (let i = 0; i < 10; i++) rawBass += freqData[i] || 0;
      rawBass = rawBass / (10 * 255);

      smoothedBassRef.current = smoothedBassRef.current * 0.8 + rawBass * 0.2;
      const bass = prefersReducedMotion ? smoothedBassRef.current * 0.3 : smoothedBassRef.current;

      const smoothData = smoothedDataRef.current;
      for (let i = 0; i < 128; i++) {
        const target = (freqData[i] || 0) / 255;
        smoothData[i] = smoothData[i] * 0.75 + target * 0.25;
      }

      // Dynamic Radial Ambient Background Glow
      const ambientRadius = Math.min(width, height) * (0.35 + bass * 0.2);
      const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(255, 123, 114, ${0.15 + bass * 0.2})`);
      ambientGrad.addColorStop(0.5, `rgba(168, 85, 247, ${0.08 + bass * 0.12})`);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // MODE 1: SPECTRUM (Vertical Rounded Frequency Bars)
      if (activeMode === 'spectrum') {
        const barCount = 42;
        const totalBarWidth = width * 0.85;
        const dpr = window.devicePixelRatio || 1;
        const barWidth = totalBarWidth / barCount - 3.5 * dpr;
        const startX = (width - totalBarWidth) / 2;
        const baseHeight = height * 0.72;

        for (let i = 0; i < barCount; i++) {
          const binIdx = Math.floor((i / barCount) * 64);
          const val = isLiveAudio ? smoothData[binIdx] : 0.04;
          const barH = Math.max(6 * dpr, val * height * 0.55);
          const x = startX + i * (barWidth + 3.5 * dpr);
          const y = baseHeight - barH;

          const grad = ctx.createLinearGradient(0, baseHeight, 0, y);
          grad.addColorStop(0, '#ff7b72');
          grad.addColorStop(0.6, '#f43f5e');
          grad.addColorStop(1, '#c084fc');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [4 * dpr, 4 * dpr, 0, 0]);
          ctx.fill();

          const reflH = barH * 0.22;
          const reflGrad = ctx.createLinearGradient(0, baseHeight, 0, baseHeight + reflH);
          reflGrad.addColorStop(0, 'rgba(255, 123, 114, 0.25)');
          reflGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.fillStyle = reflGrad;
          ctx.beginPath();
          ctx.roundRect(x, baseHeight + 2, barWidth, reflH, [0, 0, 3, 3]);
          ctx.fill();
        }
      }

      // MODE 2: WAVE (Multi-Layer Flowing Bezier Waveforms)
      else if (activeMode === 'wave') {
        const points = 64;
        const step = width / (points - 1);
        const centerY = height * 0.52;
        const dpr = window.devicePixelRatio || 1;

        const waveLayers = [
          { alpha: 0.15, amp: 1.1, color: '#ff7b72', offset: 0 },
          { alpha: 0.35, amp: 0.8, color: '#f43f5e', offset: 1.5 },
          { alpha: 0.9, amp: 0.55, color: '#ffffff', offset: 3.0 },
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

          ctx.strokeStyle = layer.color;
          ctx.lineWidth = (lIdx === 2 ? 3 : 2) * dpr;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = lIdx === 2 ? 14 : 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      // MODE 3: ROUND VFX / ORBITAL (360° Radial Spectrum, Spinning Vinyl, SPiDEYxFLASH Typography & Ambient Glow)
      else {
        if (isPlaying) {
          rotationRef.current += 0.004 + bass * 0.01;
        }
        const rot = rotationRef.current;
        const dpr = window.devicePixelRatio || 1;
        const minDim = Math.min(width, height);

        particlesRef.current.forEach(p => {
          p.update(width, height, isLiveAudio ? bass : 0.01);
          p.draw(ctx, cx, cy);
        });

        // 1. Central Disc Geometry
        const discRadius = minDim * 0.22 * (1 + bass * 0.12);
        const ringOuterRadius = discRadius + 16 * dpr;

        // 2. 360° Radial Frequency Spectrum Equalizer Bars
        const rayCount = 64;
        const rayBaseRadius = ringOuterRadius + 4 * dpr;

        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2 + rot;
          const binIdx = Math.floor((Math.abs(i - rayCount / 2) / (rayCount / 2)) * 52);
          const val = isLiveAudio ? smoothData[binIdx] : 0.06;
          const rayLen = Math.max(4 * dpr, val * minDim * 0.23 * (1 + bass * 0.3));

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

          if (val > 0.45) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x2, y2, 2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 3. Outer Neon Perimeter Ring with coral glow
        ctx.strokeStyle = `rgba(255, 107, 107, ${0.5 + bass * 0.5})`;
        ctx.lineWidth = 2.2 * dpr;
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 14 * (0.6 + bass * 0.8);
        ctx.beginPath();
        ctx.arc(cx, cy, ringOuterRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. Curved Circular Typography: "✦ SPiDEYxFLASH • HIGH FIDELITY • AUDIO LAB ✦"
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot * 0.65);

        const textRadius = (discRadius + ringOuterRadius) / 2;
        const brandString = '✦  SPiDEYxFLASH  •  HIGH FIDELITY  •  360° AUDIO LAB  ✦  ';
        const textLen = brandString.length;
        ctx.font = `bold ${Math.max(8, 9.5 * dpr)}px sans-serif`;
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

        // 5. Concentric Vinyl Grooves
        const grooveCounts = [0.88, 0.74, 0.6, 0.46];
        grooveCounts.forEach(factor => {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, discRadius * factor, 0, Math.PI * 2);
          ctx.stroke();
        });

        // 6. Vinyl Disc Center Core Body
        const vinylCoreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, discRadius);
        vinylCoreGrad.addColorStop(0, '#2d0f17');
        vinylCoreGrad.addColorStop(0.5, '#190a0f');
        vinylCoreGrad.addColorStop(0.9, '#0d0507');
        vinylCoreGrad.addColorStop(1, '#050203');

        ctx.fillStyle = vinylCoreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + bass * 0.4})`;
        ctx.lineWidth = 1.6 * dpr;
        ctx.stroke();

        // 7. Center Spindle Disc Badge
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

        // Center Spindle Hole
        ctx.fillStyle = '#050203';
        ctx.beginPath();
        ctx.arc(cx, cy, spindleRadius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.2 * dpr;
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
          grad.addColorStop(0, '#ff7b72');
          grad.addColorStop(1, '#f43f5e');

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

          ctx.fillStyle = '#ff7b72';
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

