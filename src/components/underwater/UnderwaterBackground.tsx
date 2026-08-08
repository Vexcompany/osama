"use client";

/**
 * UnderwaterBackground
 *
 * A single full-screen <canvas> that draws the entire underwater scene:
 *   - Vertical gradient (deep abyss → surface light)
 *   - Caustic light rays
 *   - Floating bubbles
 *   - Drifting fish silhouettes
 *   - Tiny floating particles (plankton)
 *
 * Design constraints (from brief §6 and §7):
 *   - High visual quality, low rendering overhead.
 *   - One canvas, one rAF loop, GPU-friendly compositing.
 *   - Pauses when the tab is hidden or the user prefers reduced motion.
 *   - No DOM nodes per bubble / fish / particle.
 *   - No layout shift (the canvas is fixed and pointer-events:none).
 *
 * The component is a pure visual layer — it knows nothing about the form.
 */
import { useEffect, useRef } from "react";

import styles from "./UnderwaterBackground.module.css";

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wobblePhase: number;
  wobbleAmp: number;
  alpha: number;
}

interface Fish {
  x: number;
  y: number;
  size: number;
  vx: number;
  phase: number;
  tint: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface CausticRay {
  x: number;
  width: number;
  speed: number;
  alpha: number;
  phase: number;
}

export interface UnderwaterBackgroundProps {
  /** How dense the scene is. 0..1. Defaults to 1. */
  intensity?: number;
}

const MAX_BUBBLES = 22;
const MAX_FISH = 4;
const MAX_PARTICLES = 45;
const MAX_RAYS = 4;

export function UnderwaterBackground({ intensity = 1 }: UnderwaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // ---- setup ------------------------------------------------------------
    let dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
    let width = 0;
    let height = 0;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = () => {
      reducedMotion = reducedMotionQuery.matches;
    };
    reducedMotionQuery.addEventListener?.("change", onMotionChange);

    const bubbles: Bubble[] = [];
    const fish: Fish[] = [];
    const particles: Particle[] = [];
    const rays: CausticRay[] = [];

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

      // Re-seed the scene at the new size.
      bubbles.length = 0;
      fish.length = 0;
      particles.length = 0;
      rays.length = 0;

      const count = (n: number) => Math.round(n * intensity);
      for (let i = 0; i < count(MAX_BUBBLES); i++) {
        bubbles.push({
          x: rand(0, width),
          y: rand(0, height),
          r: rand(2, 9),
          vy: rand(0.15, 0.55),
          wobblePhase: rand(0, Math.PI * 2),
          wobbleAmp: rand(0.3, 1.2),
          alpha: rand(0.25, 0.6),
        });
      }
      for (let i = 0; i < count(MAX_FISH); i++) {
        fish.push({
          x: rand(0, width),
          y: rand(height * 0.25, height * 0.75),
          size: rand(18, 34),
          vx: rand(0.15, 0.45) * (Math.random() < 0.5 ? -1 : 1),
          phase: rand(0, Math.PI * 2),
          tint: rand(0, 1),
        });
      }
      for (let i = 0; i < count(MAX_PARTICLES); i++) {
        particles.push({
          x: rand(0, width),
          y: rand(0, height),
          vx: rand(-0.05, 0.05),
          vy: rand(-0.08, -0.02),
          size: rand(0.5, 1.8),
          alpha: rand(0.15, 0.45),
        });
      }
      for (let i = 0; i < count(MAX_RAYS); i++) {
        rays.push({
          x: rand(0, width),
          width: rand(80, 220),
          speed: rand(0.0008, 0.0024),
          alpha: rand(0.05, 0.12),
          phase: rand(0, Math.PI * 2),
        });
      }
    }

    // ---- draw helpers -----------------------------------------------------

    function drawGradient() {
      // Deep teal abyss at the bottom → brighter cyan near the surface.
      const g = ctx!.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#0a3b4d");
      g.addColorStop(0.35, "#0e5567");
      g.addColorStop(0.7, "#0a7088");
      g.addColorStop(1, "#06222e");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, width, height);

      // A subtle warm wash at the very top to suggest the surface.
      const top = ctx!.createLinearGradient(0, 0, 0, height * 0.35);
      top.addColorStop(0, "rgba(180, 230, 255, 0.18)");
      top.addColorStop(1, "rgba(180, 230, 255, 0)");
      ctx!.fillStyle = top;
      ctx!.fillRect(0, 0, width, height * 0.35);
    }

    function drawRays(t: number) {
      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      for (const r of rays) {
        const cx = r.x + Math.sin(t * r.speed * 0.5 + r.phase) * 30;
        const grad = ctx!.createLinearGradient(cx, 0, cx, height);
        grad.addColorStop(0, `rgba(180, 230, 255, ${r.alpha})`);
        grad.addColorStop(1, "rgba(180, 230, 255, 0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.moveTo(cx - r.width / 2, 0);
        ctx!.lineTo(cx + r.width / 2, 0);
        ctx!.lineTo(cx + r.width / 2 - 40, height);
        ctx!.lineTo(cx - r.width / 2 + 40, height);
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.restore();
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
      for (const f of fish) {
        const dir = f.vx > 0 ? 1 : -1;
        const x = f.x;
        const y = f.y + Math.sin(t * 0.001 + f.phase) * 6;
        const s = f.size;
        // body
        ctx!.beginPath();
        ctx!.fillStyle = f.tint > 0.5 ? "rgba(20, 70, 90, 0.55)" : "rgba(15, 55, 75, 0.6)";
        ctx!.ellipse(x, y, s * 0.9, s * 0.42, 0, 0, Math.PI * 2);
        ctx!.fill();
        // tail
        ctx!.beginPath();
        ctx!.moveTo(x - dir * s * 0.8, y);
        ctx!.lineTo(x - dir * s * 1.3, y - s * 0.3);
        ctx!.lineTo(x - dir * s * 1.3, y + s * 0.3);
        ctx!.closePath();
        ctx!.fill();
        // fin
        ctx!.beginPath();
        ctx!.moveTo(x, y - s * 0.2);
        ctx!.lineTo(x + dir * s * 0.2, y - s * 0.55);
        ctx!.lineTo(x + dir * s * 0.4, y - s * 0.2);
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
        // soft glow
        const g = ctx!.createRadialGradient(x, y, 0, x, y, b.r * 2);
        g.addColorStop(0, `rgba(220, 245, 255, ${b.alpha})`);
        g.addColorStop(0.5, `rgba(180, 230, 255, ${b.alpha * 0.3})`);
        g.addColorStop(1, "rgba(180, 230, 255, 0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r * 2, 0, Math.PI * 2);
        ctx!.fill();
        // crisp rim
        ctx!.lineWidth = 1;
        ctx!.strokeStyle = `rgba(230, 250, 255, ${b.alpha * 0.8})`;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r, 0, Math.PI * 2);
        ctx!.stroke();
        // highlight
        ctx!.fillStyle = `rgba(255, 255, 255, ${b.alpha * 0.9})`;
        ctx!.beginPath();
        ctx!.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function step(t: number) {
      if (reducedMotion) {
        // Draw a single static frame and stop the rAF loop.
        drawGradient();
        drawRays(0);
        drawParticles();
        drawFish(0);
        drawBubbles();
        return;
      }

      drawGradient();
      drawRays(t);

      // particles drift gently
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -2) {
          p.y = height + 2;
          p.x = rand(0, width);
        }
        if (p.x < -2) p.x = width + 2;
        if (p.x > width + 2) p.x = -2;
      }
      drawParticles();

      // fish swim and wrap
      for (const f of fish) {
        f.x += f.vx;
        if (f.vx > 0 && f.x > width + 60) f.x = -60;
        if (f.vx < 0 && f.x < -60) f.x = width + 60;
      }
      drawFish(t);

      // bubbles rise
      for (const b of bubbles) {
        b.y -= b.vy;
        b.wobblePhase += 0.02;
        if (b.y < -b.r * 2) {
          b.y = height + b.r * 2;
          b.x = rand(0, width);
          b.r = rand(2, 9);
          b.vy = rand(0.15, 0.55);
        }
      }
      drawBubbles();
    }

    let last = 0;
    function loop(t: number) {
      // Cap to ~60fps; t is in ms.
      if (t - last < 16) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      last = t;
      step(t);
      rafRef.current = requestAnimationFrame(loop);
    }

    // Visibility: pause when the tab is hidden to save battery.
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

    // Resize: debounced.
    let resizeTimer: number | undefined;
    function onResize() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
      }, 150);
    }
    window.addEventListener("resize", onResize);

    // Boot.
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
