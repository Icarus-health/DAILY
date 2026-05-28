import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  isInterrupting: boolean;
}

export default function AudioVisualizer({ isPlaying, isInterrupting }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      const numWaves = 4;
      const waves = [
        { amplitude: isInterrupting ? 18 : isPlaying ? 12 : 1, freq: 0.05, speed: 0.08, color: "rgba(17, 17, 17, 0.45)" }, // Charcoal 1
        { amplitude: isInterrupting ? 14 : isPlaying ? 9 : 1, freq: 0.04, speed: -0.05, color: "rgba(17, 17, 17, 0.25)" }, // Charcoal 2
        { amplitude: isInterrupting ? 22 : isPlaying ? 15 : 2, freq: 0.03, speed: 0.06, color: "rgba(17, 17, 17, 0.6)" }, // Charcoal bold
        { amplitude: isInterrupting ? 10 : isPlaying ? 6 : 1, freq: 0.06, speed: -0.04, color: "rgba(17, 17, 17, 0.15)" } // Charcoal light
      ];

      phase += 0.05;

      for (let i = 0; i < numWaves; i++) {
        const wave = waves[i];
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = i === 2 ? 2.5 : 1.5;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * wave.freq + phase * wave.speed) * wave.amplitude * Math.sin(x * Math.PI / width);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resize);
    };
  }, [isPlaying, isInterrupting]);

  return (
    <div className="relative w-full h-16 bg-[#F9F9F8] rounded-xl overflow-hidden border border-black/10 flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <span className={`h-1.5 w-1.5 rounded-full ${isInterrupting ? 'bg-amber-600 animate-ping' : isPlaying ? 'bg-black animate-pulse' : 'bg-neutral-400'}`} />
        <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
          {isInterrupting ? "daily listening..." : isPlaying ? "daily speaking..." : "ready to read"}
        </span>
      </div>
    </div>
  );
}
