"use client";

/**
 * Premium underwater ambience (V7).
 *
 * Cinematic deep-ocean scene rendered onto one canvas + one RAF loop:
 *
 *   - Multi-stop vertical gradient (no banding)
 *   - Surface glow — the sense of looking up through water
 *   - Drifting caustic light pools near the surface
 *   - Soft god rays falling through the water
 *   - Slow luminous bokeh motes (dust suspended in light)
 *   - Crisp film grain over the ocean only (UI stays clean)
 *   - Depth haze + vignette for readability
 *
 * The scene is rendered onto a low-resolution offscreen "light layer"
 * which is upscaled onto the main canvas. That trick gives every glow a
 * naturally soft, expensive look at a fraction of the fill cost, and it
 * makes the whole effect lightweight even on low-end phones.
 *
 * All positions are deterministic (seeded PRNG), so resizing the
 * viewport never makes the scene visibly jump. Intentionally no fish,
 * no cartoon shapes — just light and water.
 */
import { useEffect, useRef } from "react";
import styles from "./UnderwaterBackground.module.css";

export interface UnderwaterBackgroundProps {
  intensity?: number;
}

/** Deterministic PRNG so the scene is identical on every render/resize. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pool {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface Ray {
  x: number;
  w0: number;
  w1: number;
  len: number;
  alpha: number;
  drift: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

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
    const strength = Math.min(Math.max(intensity, 0), 1);

    // Offscreen light layer — rendered at low res and upscaled for a
    // naturally soft, cinematic glow.
    const light = document.createElement("canvas");
    const lctx = light.getContext("2d");
    if (!lctx) return;

    // Deterministic scene seeds.
    const rand = mulberry32(20260830);

    const pools: Pool[] = [];
    for (let i = 0; i < 6; i += 1) {
      pools.push({
        x: 0.05 + rand() * 0.9,
        y: 0.03 + rand() * 0.34,
        r: 0.15 + rand() * 0.2,
        speed: 0.00004 + rand() * 0.00008,
        phase: rand() * Math.PI * 2,
        alpha: 0.05 + rand() * 0.05,
      });
    }

    const rays: Ray[] = [];
    for (let i = 0; i < 7; i += 1) {
      rays.push({
        x: 0.06 + (i / 6) * 0.88 + (rand() - 0.5) * 0.08,
        w0: 0.006 + rand() * 0.012,
        w1: 0.02 + rand() * 0.028,
        len: 0.5 + rand() * 0.26,
        alpha: 0.045 + rand() * 0.05,
        drift: (rand() - 0.5) * 0.07,
        phase: rand() * Math.PI * 2,
      });
    }

    const motes: Mote[] = [];
    for (let i = 0; i < 26; i += 1) {
      motes.push({
        x: rand(),
        y: rand(),
        r: 0.7 + rand() * 1.9,
        speed: 0.000012 + rand() * 0.00003,
        phase: rand() * Math.PI * 2,
        alpha: 0.12 + rand() * 0.24,
      });
    }

    // Film-grain specks (static, deterministic).
    const grain: Array<[number, number, number]> = [];
    for (let i = 0; i < 170; i += 1) {
      grain.push([rand(), rand(), 0.018 + rand() * 0.03]);
    }

    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
      // If the user turns motion back on after reduced-motion was active,
      // the loop is idle — resume it.
      if (!reducedMotion && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(draw);
      }
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

      // Light layer at ~1/3 resolution: small, fast, soft when upscaled.
      const s = 1 / 3;
      light.width = Math.max(1, Math.floor(width * s));
      light.height = Math.max(1, Math.floor(height * s));
    };

    const draw = (time: number) => {
      if (!reducedMotion && time - lastFrame < (width < 700 ? 40 : 32)) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      const w = light.width;
      const h = light.height;
      const t = reducedMotion ? 0 : time;

      // 1) Deep cinematic base — many stops avoid banding.
      const ocean = lctx.createLinearGradient(0, 0, 0, h);
      ocean.addColorStop(0, "#0e3f5e");
      ocean.addColorStop(0.16, "#0d4a6e");
      ocean.addColorStop(0.36, "#0a3a58");
      ocean.addColorStop(0.56, "#082e49");
      ocean.addColorStop(0.76, "#051f35");
      ocean.addColorStop(0.9, "#031524");
      ocean.addColorStop(1, "#010b13");
      lctx.fillStyle = ocean;
      lctx.fillRect(0, 0, w, h);

      // 2) Surface light — the feeling of looking upward through water.
      const surface = lctx.createRadialGradient(
        w * 0.5,
        -h * 0.06,
        0,
        w * 0.5,
        -h * 0.06,
        h * 0.92,
      );
      surface.addColorStop(0, `rgba(150, 232, 255, ${0.2 * strength})`);
      surface.addColorStop(0.35, `rgba(96, 205, 240, ${0.07 * strength})`);
      surface.addColorStop(1, "rgba(60, 170, 215, 0)");
      lctx.fillStyle = surface;
      lctx.fillRect(0, 0, w, h);

      // 3) Drifting caustic light pools.
      lctx.save();
      lctx.globalCompositeOperation = "screen";
      for (const p of pools) {
        const px =
          p.x * w + (reducedMotion ? 0 : Math.sin(t * p.speed + p.phase) * w * 0.04);
        const pulse = reducedMotion
          ? 1
          : 0.75 + 0.25 * Math.sin(t * 0.0004 + p.phase * 2);
        const r = p.r * w;
        const g = lctx.createRadialGradient(px, p.y * h, 0, px, p.y * h, r);
        g.addColorStop(0, `rgba(185, 240, 255, ${p.alpha * strength * pulse})`);
        g.addColorStop(0.55, `rgba(120, 215, 245, ${p.alpha * 0.4 * strength * pulse})`);
        g.addColorStop(1, "rgba(90, 195, 235, 0)");
        lctx.fillStyle = g;
        lctx.fillRect(px - r, p.y * h - r, r * 2, r * 2);
      }

      // 4) Soft god rays falling from the surface.
      for (const ray of rays) {
        const rx =
          ray.x * w + (reducedMotion ? 0 : Math.sin(t * 0.00005 + ray.phase) * ray.drift * w);
        const w0 = ray.w0 * w;
        const w1 = ray.w1 * w;
        const len = ray.len * h;
        const rg = lctx.createLinearGradient(0, 0, 0, len);
        rg.addColorStop(0, `rgba(178, 235, 252, ${ray.alpha * strength})`);
        rg.addColorStop(0.5, `rgba(130, 215, 244, ${ray.alpha * 0.5 * strength})`);
        rg.addColorStop(1, "rgba(100, 190, 230, 0)");
        lctx.fillStyle = rg;
        lctx.beginPath();
        lctx.moveTo(rx - w0, 0);
        lctx.lineTo(rx + w0, 0);
        lctx.lineTo(rx + w1, len);
        lctx.lineTo(rx - w1, len);
        lctx.closePath();
        lctx.fill();
      }
      lctx.restore();

      // 5) Bokeh motes — slow, luminous dust drifting upward.
      lctx.save();
      lctx.globalCompositeOperation = "lighter";
      for (const m of motes) {
        const my = ((m.y * h - t * m.speed * h) % (h + 40) + h + 40) % (h + 40) - 20;
        const twinkle = reducedMotion
          ? 1
          : 0.55 + 0.45 * Math.sin(t * 0.0009 + m.phase);
        const r = m.r;
        const g = lctx.createRadialGradient(
          m.x * w,
          my,
          0,
          m.x * w,
          my,
          r * 3,
        );
        g.addColorStop(0, `rgba(220, 248, 255, ${m.alpha * strength * twinkle})`);
        g.addColorStop(0.4, `rgba(160, 230, 252, ${m.alpha * 0.35 * strength * twinkle})`);
        g.addColorStop(1, "rgba(130, 220, 250, 0)");
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(m.x * w, my, r * 3, 0, Math.PI * 2);
        lctx.fill();
      }
      lctx.restore();

      // 6) Depth haze — darker toward the abyss for focus/readability.
      const depth = lctx.createLinearGradient(0, h * 0.45, 0, h);
      depth.addColorStop(0, "rgba(1, 9, 15, 0)");
      depth.addColorStop(0.7, "rgba(1, 9, 15, 0.2)");
      depth.addColorStop(1, "rgba(0, 6, 11, 0.55)");
      lctx.fillStyle = depth;
      lctx.fillRect(0, h * 0.45, w, h * 0.55);

      const side = lctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, "rgba(0, 6, 11, 0.26)");
      side.addColorStop(0.22, "rgba(0, 6, 11, 0)");
      side.addColorStop(0.78, "rgba(0, 6, 11, 0)");
      side.addColorStop(1, "rgba(0, 6, 11, 0.26)");
      lctx.fillStyle = side;
      lctx.fillRect(0, 0, w, h);

      // ── Blit light layer → main canvas (upscaled = soft). ──
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(light, 0, 0, width, height);

      // 7) Crisp film grain over the ocean only (UI stays clean).
      ctx.save();
      ctx.fillStyle = "#dff4ff";
      for (const [gx, gy, ga] of grain) {
        ctx.globalAlpha = ga * strength;
        ctx.fillRect(gx * width, gy * height, 1, 1);
      }
      ctx.restore();

      if (reducedMotion) return;
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
