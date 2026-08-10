"use client";

/**
 * OsamaCanvas — downloadable visual card for OSAMA case detail.
 *
 * Renders the underwater template image onto an HTML Canvas, overlays
 * dynamic Case ID and Message text in Handelson Two, and exposes a
 * PNG download button.
 *
 * Nothing here calls an external API or consumes AI tokens.
 */ 

import { useEffect, useRef, useState } from "react";
import styles from "./OsamaCanvas.module.css";

// ─── constants ────────────────────────────────────────────────────────────────

/** Exact color for all dynamic text overlaid on the canvas. */
const CANVAS_TEXT_COLOR = "#484f90";

/** Internal canvas width (matches template native width for max sharpness). */
const CANVAS_W = 3375;
/** Internal canvas height (matches template native height). */
const CANVAS_H = 6000;

// Text layout (coordinates in native 3375×6000 space).
// The paper area runs roughly x: 550–2870, y: 1350–4870.
// The ruled lines on the paper are spaced ~168 px apart
// (lines at y ≈ 1358, 1527, 1699, 1870, 2035, 2205, 2379, …).
// The template already has the labels "Case ID:" and
// "Message:" baked in at the top of the paper (around
// y = 1527 and y = 1699), so we ONLY draw the dynamic
// values here. The case-id value lands on the first
// empty ruled line, the message body lands on the very
// next line, and multi-line messages continue on the
// following lines. Each value sits on a real ruled line
// so the writing lines up with the notebook lines.
const TEXT_START_X = 680;        // left margin inside paper
const TEXT_MAX_W   = 2050;       // max text width before wrapping
const CASE_ID_VALUE_Y = 1870;    // first empty ruled line
const MSG_BODY_START_Y = 2035;   // ruled line directly under the case id
const LINE_HEIGHT      = 168;    // matches the template's ruled-line spacing

// Font sizes in native canvas space (will look ~18-28 px at display size)
const FONT_SIZE_VALUE = 160;     // case id value
const FONT_SIZE_MSG   = 150;     // message body

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Load an Image from a URL and resolve when ready. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Load a FontFace and add it to document.fonts. */
async function loadFont(name: string, url: string): Promise<void> {
  const font = new FontFace(name, `url(${url})`);
  const loaded = await font.load();
  document.fonts.add(loaded);
}

/**
 * Wrap text into lines that fit within maxWidth.
 * Handles explicit newlines in the source string.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const result: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const para of paragraphs) {
    if (para.trim() === "") {
      result.push(""); // preserve blank lines
      continue;
    }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line !== "") {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  caseId: string;
  message: string;
}

type CanvasState = "loading" | "ready" | "error";

export function OsamaCanvas({ caseId, message }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CanvasState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Render the canvas whenever caseId or message change.
  useEffect(() => {
    let cancelled = false;

    async function render() {
      setState("loading");
      setErrorMsg("");

      try {
        // 1. Load assets in parallel.
        const [templateImg] = await Promise.all([
          loadImage("/kak-taksaka/osama/canvas-template.jpg"),
          loadFont("HandelsonTwo", "/kak-taksaka/osama/fonts/handelson-two.otf"),
        ]);

        if (cancelled) return;

        // 2. Get canvas context.
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas element not available");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        canvas.width  = CANVAS_W;
        canvas.height = CANVAS_H;

        // 3. Draw background template.
        ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

        // 4. Set shared text style.
        ctx.fillStyle = CANVAS_TEXT_COLOR;
        ctx.textBaseline = "alphabetic";

        // 5. Draw the case id value on the first empty line
        //    under the template's baked-in "Case ID:" label.
        //    The label itself is part of the template, so we
        //    do NOT draw it again here — drawing it would
        //    overlap the template's pre-printed label.
        ctx.font = `bold ${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        ctx.fillText(caseId, TEXT_START_X, CASE_ID_VALUE_Y);

        // 6. Draw the message body on the first empty line
        //    under the template's baked-in "Message:" label,
        //    then continue on subsequent ruled lines.
        ctx.font = `${FONT_SIZE_MSG}px "HandelsonTwo", cursive`;
        const lines = wrapText(ctx, message, TEXT_MAX_W);
        let y = MSG_BODY_START_Y;
        for (const line of lines) {
          ctx.fillText(line, TEXT_START_X, y);
          y += LINE_HEIGHT;
          // Stop before we reach the turtle / bottom artwork area (~y 4800)
          if (y > 4750) {
            ctx.fillText("…", TEXT_START_X, y);
            break;
          }
        }

        if (!cancelled) setState("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setState("error");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [caseId, message]);

  // ── download handler ────────────────────────────────────────────────────────

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || state !== "ready") return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OSAMA-${caseId}.png`;
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/png",
    );
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Canvas Aspirasi</span>
        <button
          className={styles.downloadBtn}
          onClick={handleDownload}
          disabled={state !== "ready"}
          aria-label={`Unduh canvas aspirasi ${caseId} sebagai gambar PNG`}
        >
          {state === "loading" ? "Memuat…" : state === "error" ? "Gagal" : "⬇ Unduh Canvas"}
        </button>
      </div>

      {state === "error" && (
        <p className={styles.errorNotice} role="alert">
          Gagal membuat canvas: {errorMsg}
        </p>
      )}

      <div className={styles.previewWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label={`Canvas visual aspirasi dengan Case ID ${caseId}`}
          style={{ opacity: state === "ready" ? 1 : 0.4 }}
        />
        {state === "loading" && (
          <div className={styles.loadingOverlay} aria-live="polite">
            <span className={styles.loadingDot} />
            <span className={styles.loadingText}>Membuat canvas…</span>
          </div>
        )}
      </div>
    </div>
  );
}
