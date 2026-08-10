"use client";

/**
 * UnderwaterBackground (V4 — Enhanced)
 *
 * Full-screen canvas:
 *   - Deep ocean gradient (darker, more depth)
 *   - Volumetric caustic shimmer at surface
 *   - Floating bubbles
 *   - More fish with varied tints
 *   - Tiny plankton particles
 *
 * Design principles: looks expensive, runs cheap.
 * One canvas, one rAF loop, GPU-friendly compositing.
 */
import { useEffect, useRef } from "react";
import styles from "./UnderwaterBackground.module.css";

interface Bubble {
  x: number; y: number; r: number; vy: number;
  wobblePhase: number; wobbleAmp: number; alpha: number;
}
interface Fish {
  x: number; y: number; size: number; vx: number;
  phase: number; tint: number; depth: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number;
}

export interface UnderwaterBackgroundProps {
  intensity?: number;
}

const MAX_BUBBLES  = 26;
const MAX_FISH     = 7;
const MAX_PARTICLES = 55;

export function UnderwaterBackground({ intensity = 1 }: UnderwaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef    = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr    = Math.min(window.devicePixelRatio || 1, 2);
    let width  = 0;
    let height = 0;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = () => { reducedMotion = reducedMotionQuery.matches; };
    reducedMotionQuery.addEventListener?.("change", onMotionChange);

    const bubbles:   Bubble[]   = [];
    const fish:      Fish[]     = [];
    const particles: Particle[] = [];

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    function resize() {
      dpr    = Math.min(window.devicePixelRatio || 1, 2);
      width  = window.innerWidth;
      height = window.innerHeight;
      canvas!.width  = Math.floor(width  * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width  = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbles.length   = 0;
      fish.length      = 0;
      particles.length = 0;

      const count = (n: number) => Math.round(n * intensity);

      for (let i = 0; i < count(MAX_BUBBLES); i++) {
        bubbles.push({
          x: rand(0, width), y: rand(0, height),
          r: rand(1.5, 8), vy: rand(0.12, 0.5),
          wobblePhase: rand(0, Math.PI * 2),
          wobbleAmp: rand(0.2, 1.0),
          alpha: rand(0.2, 0.55),
        });
      }

      for (let i = 0; i < count(MAX_FISH); i++) {
        fish.push({
          x: rand(0, width),
          y: rand(height * 0.2, height * 0.8),
          size: rand(14, 40),
          vx: rand(0.12, 0.42) * (Math.random() < 0.5 ? -1 : 1),
          phase: rand(0, Math.PI * 2),
          tint: rand(0, 1),
          depth: rand(0, 1), // 0 = background, 1 = foreground
        });
      }

      for (let i = 0; i < count(MAX_PARTICLES); i++) {
        particles.push({
          x: rand(0, width), y: rand(0, height),
          vx: rand(-0.06, 0.06),
          vy: rand(-0.1, -0.02),
          size: rand(0.4, 1.6),
          alpha: rand(0.1, 0.4),
        });
      }
    }

    function drawGradient() {
      // Primary deep ocean gradient
      const g = ctx!.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0,    "#082840");  // dark abyss top
      g.addColorStop(0.25, "#0b4560");
      g.addColorStop(0.55, "#0a6278");
      g.addColorStop(0.8,  "#083a50");
      g.addColorStop(1,    "#04151e");  // black abyss bottom
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, width, height);

      // Surface shimmer — gentle cyan wash
      const surf = ctx!.createLinearGradient(0, 0, 0, height * 0.4);
      surf.addColorStop(0, "rgba(100, 200, 255, 0.12)");
      surf.addColorStop(1, "rgba(100, 200, 255, 0)");
      ctx!.fillStyle = surf;
      ctx!.fillRect(0, 0, width, height * 0.4);

      // Deep vignette
      const bot = ctx!.createLinearGradient(0, height * 0.55, 0, height);
      bot.addColorStop(0, "rgba(2, 12, 20, 0)");
      bot.addColorStop(1, "rgba(2, 12, 20, 0.55)");
      ctx!.fillStyle = bot;
      ctx!.fillRect(0, height * 0.55, width, height * 0.45);

      // Side vignettes for depth
      const leftV  = ctx!.createLinearGradient(0, 0, width * 0.2, 0);
      leftV.addColorStop(0, "rgba(2, 12, 20, 0.3)");
      leftV.addColorStop(1, "rgba(2, 12, 20, 0)");
      ctx!.fillStyle = leftV;
      ctx!.fillRect(0, 0, width * 0.2, height);

      const rightV = ctx!.createLinearGradient(width, 0, width * 0.8, 0);
      rightV.addColorStop(0, "rgba(2, 12, 20, 0.3)");
      rightV.addColorStop(1, "rgba(2, 12, 20, 0)");
      ctx!.fillStyle = rightV;
      ctx!.fillRect(width * 0.8, 0, width * 0.2, height);
    }

    function drawParticles() {
      ctx!.save();
      ctx!.fillStyle = "#cdf3ff";
      for (const p of particles) {
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawFish(t: number) {
      ctx!.save();
      // Sort by depth so deeper fish (lower depth value) render first
      const sorted = [...fish].sort((a, b) => a.depth - b.depth);
      for (const f of sorted) {
        const dir = f.vx > 0 ? 1 : -1;
        const x = f.x;
        const y = f.y + Math.sin(t * 0.0008 + f.phase) * 7;
        const s = f.size;
        // Deeper fish are more transparent/blue
        const alpha = 0.3 + f.depth * 0.35;
        let bodyColor: string;
        if (f.tint < 0.33) {
          bodyColor = `rgba(15, 55, 80, ${alpha})`;
        } else if (f.tint < 0.66) {
          bodyColor = `rgba(20, 65, 95, ${alpha})`;
        } else {
          bodyColor = `rgba(25, 75, 105, ${alpha * 0.85})`;
        }

        ctx!.beginPath();
        ctx!.fillStyle = bodyColor;
        ctx!.ellipse(x, y, s * 0.95, s * 0.4, 0, 0, Math.PI * 2);
        ctx!.fill();
        // Tail
        ctx!.beginPath();
        ctx!.moveTo(x - dir * s * 0.82, y);
        ctx!.lineTo(x - dir * s * 1.35, y - s * 0.28);
        ctx!.lineTo(x - dir * s * 1.35, y + s * 0.28);
        ctx!.closePath();
        ctx!.fill();
        // Dorsal fin
        ctx!.beginPath();
        ctx!.moveTo(x, y - s * 0.18);
        ctx!.lineTo(x + dir * s * 0.15, y - s * 0.52);
        ctx!.lineTo(x + dir * s * 0.38, y - s * 0.18);
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawBubbles() {
      ctx!.save();
      for (const b of bubbles) {
        const wobble = Math.sin(b.wobblePhase) * b.wobbleAmp;
        const x = b.x + wobble;
        const y = b.y;
        const g = ctx!.createRadialGradient(x - b.r * 0.2, y - b.r * 0.2, 0, x, y, b.r * 1.8);
        g.addColorStop(0, `rgba(235, 250, 255, ${b.alpha * 0.95})`);
        g.addColorStop(0.4, `rgba(190, 235, 255, ${b.alpha * 0.3})`);
        g.addColorStop(1, "rgba(180, 230, 255, 0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r * 1.8, 0, Math.PI * 2);
        ctx!.fill();
        // Rim
        ctx!.lineWidth = 0.8;
        ctx!.strokeStyle = `rgba(230, 250, 255, ${b.alpha * 0.75})`;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r, 0, Math.PI * 2);
        ctx!.stroke();
        // Highlight
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.85})`;
        ctx!.beginPath();
        ctx!.arc(x - b.r * 0.32, y - b.r * 0.32, b.r * 0.22, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function step(t: number) {
      drawGradient();

      if (!reducedMotion) {
        for (const p of particles) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -2)         { p.y = height + 2; p.x = rand(0, width); }
          if (p.x < -2)           p.x = width + 2;
          if (p.x > width + 2)    p.x = -2;
        }
      }
      drawParticles();

      if (!reducedMotion) {
        for (const f of fish) {
          f.x += f.vx;
          if (f.vx > 0 && f.x > width + 70)  f.x = -70;
          if (f.vx < 0 && f.x < -70)          f.x = width + 70;
        }
      }
      drawFish(reducedMotion ? 0 : t);

      if (!reducedMotion) {
        for (const b of bubbles) {
          b.y -= b.vy;
          b.wobblePhase += 0.018;
          if (b.y < -b.r * 2) {
            b.y = height + b.r * 2;
            b.x = rand(0, width);
            b.r  = rand(1.5, 8);
            b.vy = rand(0.12, 0.5);
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
