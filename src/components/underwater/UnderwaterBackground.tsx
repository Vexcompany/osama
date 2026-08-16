"use client";

/**
 * UnderwaterBackground (V6 — refined)
 *
 * Full-screen canvas, calmer and more "expensive" than before:
 *   - Deep ocean gradient with a soft light cone from the surface
 *   - Slow caustic shimmer bands near the surface
 *   - Sparse, tiny plankton particles
 *   - Very few, faint bubbles (atmosphere, not decoration)
 *
 * The previous build drew schools of cartoon fish; V6 removes them
 * in favour of depth, light and stillness. The scene should feel
 * immersive but never busy, and it must stay cheap to run: one
 * canvas, one rAF loop, GPU-friendly fills.
 */
import { useEffect, useRef } from "react";
import styles from "./UnderwaterBackground.module.css";

interface Bubble {
  x: number; y: number; r: number; vy: number;
  wobblePhase: number; wobbleAmp: number; alpha: number;
}
interface Caustic {
  x: number; y: number; w: number; h: number;
  phase: number; speed: number; alpha: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number;
}

export interface UnderwaterBackgroundProps {
  intensity?: number;
}

const MAX_BUBBLES = 12;
const MAX_CAUSTICS = 4;
const MAX_PARTICLES = 46;

export function UnderwaterBackground({ intensity = 1 }: UnderwaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = () => { reducedMotion = reducedMotionQuery.matches; };
    reducedMotionQuery.addEventListener?.("change", onMotionChange);

    const bubbles: Bubble[] = [];
    const caustics: Caustic[] = [];
    const particles: Particle[] = [];

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbles.length = 0;
      caustics.length = 0;
      particles.length = 0;

      const count = (n: number) => Math.round(n * intensity);

      for (let i = 0; i < count(MAX_BUBBLES); i++) {
        bubbles.push({
          x: rand(0, width), y: rand(0, height),
          r: rand(1, 5), vy: rand(0.1, 0.32),
          wobblePhase: rand(0, Math.PI * 2),
          wobbleAmp: rand(0.2, 0.6),
          alpha: rand(0.08, 0.22),
        });
      }

      for (let i = 0; i < count(MAX_CAUSTICS); i++) {
        caustics.push({
          x: rand(-0.1, 0.9) * width,
          y: rand(0, height * 0.45),
          w: rand(160, 360),
          h: rand(60, 140),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.0001, 0.00028),
          alpha: rand(0.03, 0.07),
        });
      }

      for (let i = 0; i < count(MAX_PARTICLES); i++) {
        particles.push({
          x: rand(0, width), y: rand(0, height),
          vx: rand(-0.05, 0.05),
          vy: rand(-0.12, -0.03),
          size: rand(0.4, 1.4),
          alpha: rand(0.08, 0.3),
        });
      }
    }

    function drawGradient() {
      // Primary deep-ocean gradient — darkest at the top-most and
      // bottom edges, a faint band of light toward the mid-upper area.
      const g = ctx!.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#0a3350");
      g.addColorStop(0.22, "#0d3a55");
      g.addColorStop(0.5, "#08293d");
      g.addColorStop(0.78, "#061b2b");
      g.addColorStop(1, "#040f18");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, width, height);

      // Soft light cone falling from the surface.
      const light = ctx!.createRadialGradient(
        width * 0.5, -height * 0.15, 0,
        width * 0.5, -height * 0.15, height * 0.9,
      );
      light.addColorStop(0, "rgba(120, 205, 240, 0.16)");
      light.addColorStop(0.55, "rgba(120, 205, 240, 0.05)");
      light.addColorStop(1, "rgba(120, 205, 240, 0)");
      ctx!.fillStyle = light;
      ctx!.fillRect(0, 0, width, height);

      // Deep vignette at the bottom.
      const bot = ctx!.createLinearGradient(0, height * 0.6, 0, height);
      bot.addColorStop(0, "rgba(2, 8, 13, 0)");
      bot.addColorStop(1, "rgba(2, 8, 13, 0.55)");
      ctx!.fillStyle = bot;
      ctx!.fillRect(0, height * 0.6, width, height * 0.4);

      // Side vignettes for depth.
      const leftV = ctx!.createLinearGradient(0, 0, width * 0.22, 0);
      leftV.addColorStop(0, "rgba(2, 8, 13, 0.32)");
      leftV.addColorStop(1, "rgba(2, 8, 13, 0)");
      ctx!.fillStyle = leftV;
      ctx!.fillRect(0, 0, width * 0.22, height);

      const rightV = ctx!.createLinearGradient(width, 0, width * 0.78, 0);
      rightV.addColorStop(0, "rgba(2, 8, 13, 0.32)");
      rightV.addColorStop(1, "rgba(2, 8, 13, 0)");
      ctx!.fillStyle = rightV;
      ctx!.fillRect(width * 0.78, 0, width * 0.22, height);
    }

    function drawCaustics(t: number) {
      ctx!.save();
      for (const c of caustics) {
        const drift = Math.sin(t * c.speed + c.phase) * 40;
        const cx = c.x + drift;
        ctx!.globalAlpha = c.alpha;
        ctx!.fillStyle = "#bfe9ff";
        // Soft elliptical shimmer with a subtle inner highlight.
        ctx!.beginPath();
        ctx!.ellipse(cx, c.y, c.w / 2, c.h / 2, -0.2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawParticles() {
      ctx!.save();
      ctx!.fillStyle = "#cfeaf7";
      for (const p of particles) {
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawBubbles() {
      ctx!.save();
      ctx!.strokeStyle = "rgba(220, 245, 255, 0.9)";
      ctx!.lineWidth = 1;
      for (const b of bubbles) {
        const wobble = Math.sin(b.wobblePhase) * b.wobbleAmp;
        const x = b.x + wobble;
        const y = b.y;
        ctx!.globalAlpha = b.alpha;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function step(t: number) {
      drawGradient();

      if (!reducedMotion) {
        for (const p of particles) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -2) { p.y = height + 2; p.x = rand(0, width); }
          if (p.x < -2) p.x = width + 2;
          if (p.x > width + 2) p.x = -2;
        }
      }
      drawParticles();

      drawCaustics(reducedMotion ? 0 : t);

      if (!reducedMotion) {
        for (const b of bubbles) {
          b.y -= b.vy;
          b.wobblePhase += 0.014;
          if (b.y < -b.r * 2) {
            b.y = height + b.r * 2;
            b.x = rand(0, width);
            b.r = rand(1, 5);
            b.vy = rand(0.1, 0.32);
          }
        }
      }
      drawBubbles();
    }

    let last = 0;
    function loop(t: number) {
      if (t - last < 16) { rafRef.current = requestAnimationFrame(loop); return; }
      last = t;
      step(t);
      rafRef.current = requestAnimationFrame(loop);
    }

    let running = true;
    function onVisibility() {
      if (document.hidden) {
        running = false;
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!running) {
        running = true;
        rafRef.current = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resize(), 150);
    }
    window.addEventListener("resize", onResize);

    resize();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionQuery.removeEventListener?.("change", onMotionChange);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
