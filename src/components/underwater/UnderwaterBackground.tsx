"use client";

/**
 * UnderwaterBackground
 *
 * One canvas, no image/video assets, with a small number of hand-drawn
 * vector fish. Motion is intentionally slow and sparse so the scene feels
 * alive without turning the landing page into a CPU-heavy animation.
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

interface Caustic {
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  speed: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface Fish {
  x: number;
  y: number;
  speed: number;
  size: number;
  direction: 1 | -1;
  phase: number;
  sway: number;
  alpha: number;
  tint: "cyan" | "silver" | "gold" | "coral";
  striped: boolean;
}

export interface UnderwaterBackgroundProps {
  intensity?: number;
}

const MAX_BUBBLES = 12;
const MAX_CAUSTICS = 4;
const MAX_PARTICLES = 38;
const MAX_FISH = 10;

export function UnderwaterBackground({ intensity = 1 }: UnderwaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let width = 0;
    let height = 0;
    let frameBudget = 20;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = () => { reducedMotion = reducedMotionQuery.matches; };
    reducedMotionQuery.addEventListener?.("change", onMotionChange);

    const bubbles: Bubble[] = [];
    const caustics: Caustic[] = [];
    const particles: Particle[] = [];
    const fish: Fish[] = [];

    let oceanGradient: CanvasGradient | null = null;
    let surfaceLight: CanvasGradient | null = null;
    let bottomVignette: CanvasGradient | null = null;
    let leftVignette: CanvasGradient | null = null;
    let rightVignette: CanvasGradient | null = null;

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const count = (n: number) => Math.max(0, Math.round(n * Math.min(Math.max(intensity, 0), 1)));

    function createGradients() {
      oceanGradient = ctx!.createLinearGradient(0, 0, 0, height);
      oceanGradient.addColorStop(0, "#0a3554");
      oceanGradient.addColorStop(0.22, "#0b3e5d");
      oceanGradient.addColorStop(0.5, "#082d45");
      oceanGradient.addColorStop(0.77, "#061d2d");
      oceanGradient.addColorStop(1, "#030e17");

      surfaceLight = ctx!.createRadialGradient(
        width * 0.5,
        -height * 0.13,
        0,
        width * 0.5,
        -height * 0.13,
        Math.max(height * 0.85, 480),
      );
      surfaceLight.addColorStop(0, "rgba(135, 222, 248, 0.18)");
      surfaceLight.addColorStop(0.5, "rgba(94, 203, 237, 0.055)");
      surfaceLight.addColorStop(1, "rgba(94, 203, 237, 0)");

      bottomVignette = ctx!.createLinearGradient(0, height * 0.55, 0, height);
      bottomVignette.addColorStop(0, "rgba(1, 7, 11, 0)");
      bottomVignette.addColorStop(1, "rgba(1, 7, 11, 0.62)");

      leftVignette = ctx!.createLinearGradient(0, 0, width * 0.25, 0);
      leftVignette.addColorStop(0, "rgba(1, 7, 11, 0.3)");
      leftVignette.addColorStop(1, "rgba(1, 7, 11, 0)");

      rightVignette = ctx!.createLinearGradient(width, 0, width * 0.75, 0);
      rightVignette.addColorStop(0, "rgba(1, 7, 11, 0.3)");
      rightVignette.addColorStop(1, "rgba(1, 7, 11, 0)");
    }

    function seedFish() {
      fish.length = 0;

      const fishCount = count(width < 700 ? 7 : MAX_FISH);
      const tints: Fish["tint"][] = ["cyan", "silver", "gold", "coral"];

      for (let i = 0; i < fishCount; i += 1) {
        const size = rand(0.72, 1.24);
        fish.push({
          x: rand(-width * 0.05, width * 1.05),
          y: rand(height * 0.12, height * 0.78),
          speed: rand(0.08, 0.24) * (i % 3 === 0 ? 1.15 : 1),
          size,
          direction: Math.random() > 0.5 ? 1 : -1,
          phase: rand(0, Math.PI * 2),
          sway: rand(2, 7),
          alpha: rand(0.38, 0.72),
          tint: tints[i % tints.length],
          striped: i % 3 === 0,
        });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      frameBudget = width < 700 ? 34 : 20;

      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbles.length = 0;
      caustics.length = 0;
      particles.length = 0;
      createGradients();

      for (let i = 0; i < count(width < 700 ? 8 : MAX_BUBBLES); i += 1) {
        bubbles.push({
          x: rand(0, width),
          y: rand(0, height),
          r: rand(1, 4.5),
          vy: rand(0.1, 0.28),
          wobblePhase: rand(0, Math.PI * 2),
          wobbleAmp: rand(0.18, 0.55),
          alpha: rand(0.08, 0.22),
        });
      }

      for (let i = 0; i < count(width < 700 ? 3 : MAX_CAUSTICS); i += 1) {
        caustics.push({
          x: rand(-0.1, 0.9) * width,
          y: rand(0, height * 0.45),
          w: rand(160, 340),
          h: rand(55, 125),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.0001, 0.00024),
          alpha: rand(0.025, 0.065),
        });
      }

      for (let i = 0; i < count(width < 700 ? 24 : MAX_PARTICLES); i += 1) {
        particles.push({
          x: rand(0, width),
          y: rand(0, height),
          vx: rand(-0.035, 0.035),
          vy: rand(-0.1, -0.025),
          size: rand(0.35, 1.2),
          alpha: rand(0.07, 0.24),
        });
      }

      seedFish();
    }

    function drawGradient(t: number) {
      ctx!.fillStyle = oceanGradient!;
      ctx!.fillRect(0, 0, width, height);

      ctx!.fillStyle = surfaceLight!;
      ctx!.fillRect(0, 0, width, height);

      ctx!.save();
      ctx!.globalAlpha = 0.9;
      for (let i = 0; i < caustics.length; i += 1) {
        const c = caustics[i];
        const drift = Math.sin(t * c.speed + c.phase) * 36;
        ctx!.globalAlpha = c.alpha;
        ctx!.fillStyle = "#c8efff";
        ctx!.beginPath();
        ctx!.ellipse(c.x + drift, c.y, c.w / 2, c.h / 2, -0.2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();

      ctx!.fillStyle = bottomVignette!;
      ctx!.fillRect(0, height * 0.55, width, height * 0.45);

      ctx!.fillStyle = leftVignette!;
      ctx!.fillRect(0, 0, width * 0.25, height);

      ctx!.fillStyle = rightVignette!;
      ctx!.fillRect(width * 0.75, 0, width * 0.25, height);
    }

    function drawParticles() {
      ctx!.save();
      ctx!.fillStyle = "#d4f1fc";
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawBubbles() {
      ctx!.save();
      ctx!.strokeStyle = "rgba(220, 246, 255, 0.92)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < bubbles.length; i += 1) {
        const b = bubbles[i];
        const wobble = Math.sin(b.wobblePhase) * b.wobbleAmp;
        ctx!.globalAlpha = b.alpha;
        ctx!.beginPath();
        ctx!.arc(b.x + wobble, b.y, b.r, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function fishPalette(tint: Fish["tint"]) {
      switch (tint) {
        case "gold": return { body: "#efbf46", bodyDark: "#a77627", fin: "#f6cf71" };
        case "coral": return { body: "#ef845d", bodyDark: "#a84735", fin: "#ffb29c" };
        case "silver": return { body: "#a9c8d5", bodyDark: "#557887", fin: "#d6e9f0" };
        default: return { body: "#4bcde9", bodyDark: "#167a9c", fin: "#8ce7f6" };
      }
    }

    function drawFish(f: Fish, time: number) {
      const palette = fishPalette(f.tint);
      const x = f.x;
      const y = f.y + Math.sin(time * 0.0013 + f.phase) * f.sway;
      const s = f.size;
      const bodyW = 34 * s;
      const bodyH = 16 * s;

      ctx!.save();
      ctx!.translate(x, y);
      if (f.direction < 0) ctx!.scale(-1, 1);
      ctx!.globalAlpha = f.alpha;

      // Tail.
      ctx!.fillStyle = palette.fin;
      ctx!.beginPath();
      ctx!.moveTo(-bodyW * 0.48, 0);
      ctx!.lineTo(-bodyW * 0.78, -bodyH * 0.62);
      ctx!.lineTo(-bodyW * 0.7, bodyH * 0.62);
      ctx!.closePath();
      ctx!.fill();

      // Body.
      ctx!.fillStyle = palette.body;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, bodyW * 0.52, bodyH * 0.62, 0, 0, Math.PI * 2);
      ctx!.fill();

      // Rear shading.
      ctx!.fillStyle = palette.bodyDark;
      ctx!.globalAlpha = f.alpha * 0.48;
      ctx!.beginPath();
      ctx!.ellipse(-bodyW * 0.22, 0, bodyW * 0.16, bodyH * 0.48, 0, 0, Math.PI * 2);
      ctx!.fill();

      // Stripes are sparse so fish read as fish without becoming cartoonish.
      if (f.striped) {
        ctx!.globalAlpha = f.alpha * 0.72;
        ctx!.strokeStyle = palette.bodyDark;
        ctx!.lineWidth = Math.max(0.8, 1.3 * s);
        for (let i = -1; i <= 1; i += 1) {
          const sx = i * bodyW * 0.14;
          ctx!.beginPath();
          ctx!.moveTo(sx, -bodyH * 0.46);
          ctx!.lineTo(sx - bodyW * 0.035, bodyH * 0.46);
          ctx!.stroke();
        }
      }

      // Fin.
      ctx!.globalAlpha = f.alpha * 0.64;
      ctx!.fillStyle = palette.fin;
      ctx!.beginPath();
      ctx!.moveTo(bodyW * 0.03, -bodyH * 0.42);
      ctx!.lineTo(bodyW * 0.24, -bodyH * 0.94);
      ctx!.lineTo(bodyW * 0.29, -bodyH * 0.23);
      ctx!.closePath();
      ctx!.fill();

      // Eye.
      ctx!.globalAlpha = f.alpha * 0.95;
      ctx!.fillStyle = "#04131d";
      ctx!.beginPath();
      ctx!.arc(bodyW * 0.35, -bodyH * 0.12, Math.max(0.85, 1.15 * s), 0, Math.PI * 2);
      ctx!.fill();

      ctx!.restore();
    }

    function updateFish() {
      if (reducedMotion) return;
      for (let i = 0; i < fish.length; i += 1) {
        const f = fish[i];
        f.x += f.speed * f.direction;
        const buffer = 80 * f.size;
        if (f.direction > 0 && f.x > width + buffer) {
          f.x = -buffer;
          f.y = rand(height * 0.12, height * 0.78);
        } else if (f.direction < 0 && f.x < -buffer) {
          f.x = width + buffer;
          f.y = rand(height * 0.12, height * 0.78);
        }
      }
    }

    function updateAmbient() {
      if (reducedMotion) return;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -2) { p.y = height + 2; p.x = rand(0, width); }
        if (p.x < -2) p.x = width + 2;
        if (p.x > width + 2) p.x = -2;
      }

      for (let i = 0; i < bubbles.length; i += 1) {
        const b = bubbles[i];
        b.y -= b.vy;
        b.wobblePhase += 0.012;
        if (b.y < -b.r * 2) {
          b.y = height + b.r * 2;
          b.x = rand(0, width);
        }
      }

      updateFish();
    }

    let lastFrame = 0;
    function loop(time: number) {
      rafRef.current = requestAnimationFrame(loop);
      if (time - lastFrame < frameBudget) return;
      lastFrame = time;

      drawGradient(reducedMotion ? 0 : time);
      updateAmbient();
      drawParticles();

      if (!reducedMotion) {
        for (let i = 0; i < fish.length; i += 1) drawFish(fish[i], time);
      } else {
        for (let i = 0; i < fish.length; i += 1) drawFish(fish[i], 0);
      }

      drawBubbles();
    }

    let running = true;
    function onVisibility() {
      if (document.hidden) {
        running = false;
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!running) {
        running = true;
        lastFrame = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 140);
    }
    window.addEventListener("resize", onResize);

    resize();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionQuery.removeEventListener?.("change", onMotionChange);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
