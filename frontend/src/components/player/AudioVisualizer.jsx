import React, { useEffect, useRef } from 'react';
import { useAudioStore } from '../../store/useAudioStore';

export function AudioVisualizer({ width = 140, height = 28, barCount = 16, color = 'rgba(255, 123, 114, 0.85)' }) {
  const canvasRef = useRef(null);
  const isPlaying = useAudioStore(s => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Fetch Web Audio Analyser if initialized on window
      const analyser = window.__SPX_ANALYSER__;
      const barWidth = (width / barCount) - 1.5;

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

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (isPlaying) {
        // Fallback smooth pseudo-animation when Analyser is not attached
        const time = Date.now() / 200;
        for (let i = 0; i < barCount; i++) {
          const val = (Math.sin(time + i * 0.5) + 1) / 2;
          const barHeight = Math.max(3, val * height * 0.7 + 3);
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Static resting bars when paused
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 1.5);
          const y = height - 3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
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
  }, [isPlaying, width, height, barCount, color]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg pointer-events-none"
    />
  );
}
