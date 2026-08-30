"use client";

/**
 * Stable underwater ambience.
 *
 * Intentionally contains no fish or randomly regenerated actors. The scene is
 * deterministic across viewport changes so mobile browser chrome/scrolling
 * cannot visibly refresh the background. One canvas and one RAF loop keep the
 * effect lightweight while preserving the deep-ocean identity.
 */
import { useEffect, useRef } from "react";
import styles from "./UnderwaterBackground.module.css";

export interface UnderwaterBackgroundProps {
  intensity?: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface Speck {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

const BUBBLE_SEEDS: Bubble[] = [
  { x: 0.07, y: 0.78, r: 2.1, speed: 0.000022, phase: 0.2, alpha: 0.16 },
  { x: 0.15, y: 0.51, r: 3.4, speed: 0.000017, phase: 1.8, alpha: 0.12 },
  { x: 0.24, y: 0.88, r: 1.7, speed: 0.000025, phase: 2.7, alpha: 0.14 },
  { x: 0.34, y: 0.42, r: 2.7, speed: 0.000019, phase: 4.1, alpha: 0.1 },
  { x: 0.46, y: 0.71, r: 1.9, speed: 0.000024, phase: 0.9, alpha: 0.14 },
  { x: 0.58, y: 0.33, r: 2.5, speed: 0.000018, phase: 3.4, alpha: 0.1 },
  { x: 0.68, y: 0.81, r: 3.1, speed: 0.00002, phase: 5.2, alpha: 0.13 },
  { x: 0.79, y: 0.55, r: 1.8, speed: 0.000026, phase: 1.1, alpha: 0.12 },
  { x: 0.9, y: 0.72, r: 2.4, speed: 0.000021, phase: 4.7, alpha: 0.14 },
];

const SPECK_SEEDS: Speck[] = [
  { x: 0.08, y: 0.22, size: 0.8, alpha: 0.15 },
  { x: 0.17, y: 0.34, size: 0.6, alpha: 0.12 },
  { x: 0.28, y: 0.19, size: 0.9, alpha: 0.14 },
  { x: 0.38, y: 0.3, size: 0.55, alpha: 0.13 },
  { x: 0.49, y: 0.17, size: 0.7, alpha: 0.12 },
  { x: 0.6, y: 0.26, size: 0.85, alpha: 0.14 },
  { x: 0.73, y: 0.16, size: 0.65, alpha: 0.13 },
  { x: 0.84, y: 0.31, size: 0.9, alpha: 0.12 },
  { x: 0.94, y: 0.2, size: 0.55, alpha: 0.14 },
  { x: 0.12, y: 0.63, size: 0.7, alpha: 0.1 },
  { x: 0.3, y: 0.57, size: 0.55, alpha: 0.11 },
  { x: 0.52, y: 0.52, size: 0.75, alpha: 0.1 },
  { x: 0.76, y: 0.61, size: 0.6, alpha: 0.11 },
  { x: 0.91, y: 0.47, size: 0.8, alpha: 0.1 },
];

export function UnderwaterBackground({ intensity = 1 }: UnderwaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let lastFrame = 0;
    const bubbles = BUBBLE_SEEDS;
    const specks = SPECK_SEEDS;
    const strength = Math.min(Math.max(intensity, 0), 1);

    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      if (!reducedMotion && time - lastFrame < (width < 700 ? 40 : 32)) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      const w = width;
      const h = height;
      const t = reducedMotion ? 0 : time;

      // Deep-water base: the only full-canvas fill.
      const ocean = ctx.createLinearGradient(0, 0, 0, h);
      ocean.addColorStop(0, "#082d49");
      ocean.addColorStop(0.28, "#073653");
      ocean.addColorStop(0.58, "#062940");
      ocean.addColorStop(0.82, "#041b2b");
      ocean.addColorStop(1, "#020d17");
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, w, h);

      // Soft surface glow gives the feeling of looking upward through water.
      const surface = ctx.createRadialGradient(w * 0.5, -h * 0.08, 0, w * 0.5, -h * 0.08, h * 0.9);
      surface.addColorStop(0, `rgba(100, 218, 247, ${0.18 * strength})`);
      surface.addColorStop(0.38, `rgba(55, 172, 211, ${0.065 * strength})`);
      surface.addColorStop(1, "rgba(20, 110, 150, 0)");
      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, w, h);

      // Long, feathered sun rays. Their drift is subtle rather than flashy.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const rayDrift = reducedMotion ? 0 : Math.sin(t * 0.00012) * w * 0.035;
      for (let i = 0; i < 7; i += 1) {
        const x = w * (0.14 + i * 0.125) + rayDrift * (i % 2 ? 1 : -1);
        const spread = w * (0.025 + (i % 3) * 0.009);
        const ray = ctx.createLinearGradient(x, 0, x + spread, h * 0.72);
        ray.addColorStop(0, `rgba(151, 229, 249, ${0.065 * strength})`);
        ray.addColorStop(0.52, `rgba(95, 203, 232, ${0.018 * strength})`);
        ray.addColorStop(1, "rgba(70, 170, 205, 0)");
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(x - 3, 0);
        ctx.lineTo(x + 12, 0);
        ctx.lineTo(x + spread, h * 0.72);
        ctx.lineTo(x - spread * 0.18, h * 0.72);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Fine suspended particles. Deterministic positions mean resizing does
      // not cause the scene to visibly jump.
      ctx.save();
      ctx.fillStyle = "#bdeaf7";
      for (const p of specks) {
        ctx.globalAlpha = p.alpha * strength;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Slow bubbles add depth without requiring a particle simulation.
      ctx.save();
      ctx.strokeStyle = "rgba(207, 243, 253, 0.9)";
      ctx.lineWidth = 0.8;
      for (const b of bubbles) {
        const travel = ((b.y * h - t * b.speed * h) % (h + 80) + h + 80) % (h + 80) - 40;
        const wobble = reducedMotion ? 0 : Math.sin(t * 0.0007 + b.phase) * 3;
        ctx.globalAlpha = b.alpha * strength;
        ctx.beginPath();
        ctx.arc(b.x * w + wobble, travel, b.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Depth haze and vignette keep content readable in the center.
      const depth = ctx.createLinearGradient(0, h * 0.48, 0, h);
      depth.addColorStop(0, "rgba(0, 8, 14, 0)");
      depth.addColorStop(0.7, "rgba(0, 8, 14, 0.16)");
      depth.addColorStop(1, "rgba(0, 5, 10, 0.58)");
      ctx.fillStyle = depth;
      ctx.fillRect(0, h * 0.42, w, h * 0.58);

      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, "rgba(0, 5, 10, 0.24)");
      side.addColorStop(0.2, "rgba(0, 5, 10, 0)");
      side.addColorStop(0.8, "rgba(0, 5, 10, 0)");
      side.addColorStop(1, "rgba(0, 5, 10, 0.24)");
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    motionQuery.addEventListener?.("change", onMotionChange);
    window.addEventListener("resize", resize, { passive: true });
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      motionQuery.removeEventListener?.("change", onMotionChange);
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
