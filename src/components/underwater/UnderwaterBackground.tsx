"use client";

/**
 * Premium obsidian ambience (V8).
 *
 * Cinematic dark scene rendered onto one canvas + one RAF loop:
 *
 *   - Multi-stop vertical gradient (no banding)
 *   - Cold specular wash near the top — light landing on black metal
 *   - Slow diagonal sheen bands, the way light travels over brushed steel
 *   - Soft platinum veils drifting across the ground
 *   - Sparse, dim motes (dust caught in the light — not bubbles)
 *   - Crisp film grain over the scene only (UI stays clean)
 *   - Vignette + depth falloff for readability
 *
 * The scene is rendered onto a low-resolution offscreen "light layer"
 * which is upscaled onto the main canvas. That trick gives every glow a
 * naturally soft, expensive look at a fraction of the fill cost, and it
 * makes the whole effect lightweight even on low-end phones.
 *
 * All positions are deterministic (seeded PRNG), so resizing the
 * viewport never makes the scene visibly jump. Intentionally no water,
 * no bubbles, no cartoon shapes — just light on a dark surface.
 *
 * NOTE: the folder/file is still named `underwater` for historical
 * reasons; the scene it paints is no longer water.
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

interface Veil {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface Sheen {
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
    const rand = mulberry32(20260902);

    const veils: Veil[] = [];
    for (let i = 0; i < 5; i += 1) {
      veils.push({
        x: 0.08 + rand() * 0.84,
        y: 0.04 + rand() * 0.5,
        r: 0.22 + rand() * 0.26,
        speed: 0.00003 + rand() * 0.00006,
        phase: rand() * Math.PI * 2,
        alpha: 0.035 + rand() * 0.035,
      });
    }

    const sheens: Sheen[] = [];
    for (let i = 0; i < 4; i += 1) {
      sheens.push({
        x: 0.1 + (i / 3) * 0.8 + (rand() - 0.5) * 0.1,
        w0: 0.01 + rand() * 0.02,
        w1: 0.05 + rand() * 0.07,
        len: 0.62 + rand() * 0.3,
        alpha: 0.03 + rand() * 0.035,
        drift: (rand() - 0.5) * 0.09,
        phase: rand() * Math.PI * 2,
      });
    }

    const motes: Mote[] = [];
    for (let i = 0; i < 18; i += 1) {
      motes.push({
        x: rand(),
        y: rand(),
        r: 0.6 + rand() * 1.4,
        speed: 0.000008 + rand() * 0.00002,
        phase: rand() * Math.PI * 2,
        alpha: 0.08 + rand() * 0.16,
      });
    }

    // Film-grain specks (static, deterministic).
    const grain: Array<[number, number, number]> = [];
    for (let i = 0; i < 150; i += 1) {
      grain.push([rand(), rand(), 0.014 + rand() * 0.026]);
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
      if (!reducedMotion && time - lastFrame < (width < 700 ? 44 : 34)) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      const w = light.width;
      const h = light.height;
      const t = reducedMotion ? 0 : time;

      // 1) Obsidian base — many stops avoid banding.
      const base = lctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#141821");
      base.addColorStop(0.16, "#10141c");
      base.addColorStop(0.36, "#0c0f16");
      base.addColorStop(0.56, "#090b11");
      base.addColorStop(0.76, "#07080d");
      base.addColorStop(0.9, "#05060a");
      base.addColorStop(1, "#040507");
      lctx.fillStyle = base;
      lctx.fillRect(0, 0, w, h);

      // 2) Specular wash — light landing on the top edge of dark metal.
      const specular = lctx.createRadialGradient(
        w * 0.5,
        -h * 0.1,
        0,
        w * 0.5,
        -h * 0.1,
        h * 0.95,
      );
      specular.addColorStop(0, `rgba(226, 233, 244, ${0.16 * strength})`);
      specular.addColorStop(0.32, `rgba(178, 190, 210, ${0.055 * strength})`);
      specular.addColorStop(1, "rgba(140, 152, 172, 0)");
      lctx.fillStyle = specular;
      lctx.fillRect(0, 0, w, h);

      // 3) Drifting platinum veils — large, soft, barely there.
      lctx.save();
      lctx.globalCompositeOperation = "screen";
      for (const v of veils) {
        const vx =
          v.x * w + (reducedMotion ? 0 : Math.sin(t * v.speed + v.phase) * w * 0.05);
        const pulse = reducedMotion
          ? 1
          : 0.72 + 0.28 * Math.sin(t * 0.0003 + v.phase * 2);
        const r = v.r * w;
        const g = lctx.createRadialGradient(vx, v.y * h, 0, vx, v.y * h, r);
        g.addColorStop(0, `rgba(214, 222, 234, ${v.alpha * strength * pulse})`);
        g.addColorStop(0.55, `rgba(166, 178, 197, ${v.alpha * 0.38 * strength * pulse})`);
        g.addColorStop(1, "rgba(132, 144, 164, 0)");
        lctx.fillStyle = g;
        lctx.fillRect(vx - r, v.y * h - r, r * 2, r * 2);
      }

      // 4) Sheen bands — light travelling slowly across brushed steel.
      for (const s of sheens) {
        const sx =
          s.x * w + (reducedMotion ? 0 : Math.sin(t * 0.00004 + s.phase) * s.drift * w);
        const w0 = s.w0 * w;
        const w1 = s.w1 * w;
        const len = s.len * h;
        const breathe = reducedMotion
          ? 1
          : 0.7 + 0.3 * Math.sin(t * 0.00022 + s.phase * 1.7);
        const sg = lctx.createLinearGradient(0, 0, 0, len);
        sg.addColorStop(0, `rgba(232, 238, 247, ${s.alpha * strength * breathe})`);
        sg.addColorStop(0.5, `rgba(186, 197, 214, ${s.alpha * 0.45 * strength * breathe})`);
        sg.addColorStop(1, "rgba(148, 160, 180, 0)");
        lctx.fillStyle = sg;
        lctx.beginPath();
        lctx.moveTo(sx - w0, 0);
        lctx.lineTo(sx + w0, 0);
        lctx.lineTo(sx + w1, len);
        lctx.lineTo(sx - w1, len);
        lctx.closePath();
        lctx.fill();
      }
      lctx.restore();

      // 5) Motes — sparse dust caught in the light, drifting upward.
      lctx.save();
      lctx.globalCompositeOperation = "lighter";
      for (const m of motes) {
        const my = ((m.y * h - t * m.speed * h) % (h + 40) + h + 40) % (h + 40) - 20;
        const twinkle = reducedMotion
          ? 1
          : 0.5 + 0.5 * Math.sin(t * 0.0007 + m.phase);
        const r = m.r;
        const g = lctx.createRadialGradient(
          m.x * w,
          my,
          0,
          m.x * w,
          my,
          r * 3,
        );
        g.addColorStop(0, `rgba(238, 243, 250, ${m.alpha * strength * twinkle})`);
        g.addColorStop(0.4, `rgba(196, 206, 222, ${m.alpha * 0.32 * strength * twinkle})`);
        g.addColorStop(1, "rgba(158, 170, 190, 0)");
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(m.x * w, my, r * 3, 0, Math.PI * 2);
        lctx.fill();
      }
      lctx.restore();

      // 6) Depth falloff — darker toward the bottom for focus/readability.
      const depth = lctx.createLinearGradient(0, h * 0.45, 0, h);
      depth.addColorStop(0, "rgba(2, 3, 5, 0)");
      depth.addColorStop(0.7, "rgba(2, 3, 5, 0.22)");
      depth.addColorStop(1, "rgba(1, 2, 3, 0.6)");
      lctx.fillStyle = depth;
      lctx.fillRect(0, h * 0.45, w, h * 0.55);

      const side = lctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, "rgba(1, 2, 3, 0.3)");
      side.addColorStop(0.22, "rgba(1, 2, 3, 0)");
      side.addColorStop(0.78, "rgba(1, 2, 3, 0)");
      side.addColorStop(1, "rgba(1, 2, 3, 0.3)");
      lctx.fillStyle = side;
      lctx.fillRect(0, 0, w, h);

      // ── Blit light layer → main canvas (upscaled = soft). ──
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(light, 0, 0, width, height);

      // 7) Crisp film grain over the scene only (UI stays clean).
      ctx.save();
      ctx.fillStyle = "#e6ebf3";
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
