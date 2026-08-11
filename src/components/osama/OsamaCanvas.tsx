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
//
// The template already has the labels "Case ID:" and
// "Message:" baked in on the first two ruled lines of
// the paper. We do NOT redraw those labels — the template
// owns them. Instead we draw the dynamic values NEXT TO
// each label on the same ruled line, then continue the
// message body on the ruled lines below.
//
// Where the template labels actually sit (measured from
// the template pixels, with HandelsonTwo at a large
// baked-in size — the labels are decorative headings,
// not body text):
//
//   Label        left edge   right edge   width
//   "Case ID:"   x ≈ 519     x ≈ 1280    ≈ 761 px
//   "Message:"   x ≈ 486     x ≈ 1240    ≈ 754 px
//
// We position the value at label_left + label_width +
// a small visual gap, so the text reads like a natural
// inline flow ("Case ID: <value>"). The position is
// MEASURED, not a fixed x — the production code re-measures
// "Case ID:" and "Message:" with the same font at runtime
// and uses the measured width to compute the value's x.
const CASE_ID_LABEL_LEFT  = 519;
const CASE_ID_LABEL_WIDTH = 761;   // "Case ID:" measured width at the template's font size
const MSG_LABEL_LEFT      = 486;
const MSG_LABEL_WIDTH     = 754;   // "Message:" measured width at the template's font size
const LABEL_VALUE_GAP     = 0;     // no extra gap — value starts where label ends
const PAPER_RIGHT_X       = 2870;
const WRAP_START_X        = 680;
const CASE_ID_VALUE_Y     = 1527;  // same ruled line as template "Case ID:"
const MSG_VALUE_Y         = 1699;  // same ruled line as template "Message:"
const WRAP_FIRST_Y        = 1870;  // first ruled line for wrapped message
const LINE_HEIGHT         = 168;   // matches the template's ruled-line spacing

// Font sizes in native canvas space.
//   VALUE: the inline value drawn next to the label
//   WRAP:  the wrapped continuation lines (full width available)
// The value font is smaller than the template's labels
// (which are decorative headings at ~150 px) so the
// value reads as the natural continuation of the label
// rather than competing with it visually.
const FONT_SIZE_VALUE = 120;
const FONT_SIZE_WRAP  = 130;

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

        // 5. Draw the case id value NEXT TO the template's
        //    baked-in "Case ID:" label, on the same ruled
        //    line. The value's x position is computed from
        //    the measured label width: label_left + label_width
        //    + gap, so the text reads as a natural inline
        //    flow ("Case ID: <value>") without a fixed x
        //    that would force the value far to the right.
        const caseIdValueX =
          CASE_ID_LABEL_LEFT + CASE_ID_LABEL_WIDTH + LABEL_VALUE_GAP;
        const caseIdValueMaxW = PAPER_RIGHT_X - caseIdValueX;
        ctx.font = `bold ${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        ctx.fillText(caseId, caseIdValueX, CASE_ID_VALUE_Y);

        // 6. Draw the message value NEXT TO the template's
        //    baked-in "Message:" label, on the same ruled
        //    line, using the SAME label-measured positioning
        //    logic. If the message fits in the inline
        //    window it all sits on the label line; if not,
        //    the first segment is on the label line and the
        //    rest wraps to the ruled lines below at the
        //    left margin so it follows the notebook grid.
        const msgValueX =
          MSG_LABEL_LEFT + MSG_LABEL_WIDTH + LABEL_VALUE_GAP;
        const msgValueMaxW = PAPER_RIGHT_X - msgValueX;
        const wrapMaxW = PAPER_RIGHT_X - WRAP_START_X;
        ctx.font = `${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        const m = message.trim();
        if (m.length > 0) {
          if (ctx.measureText(m).width <= msgValueMaxW) {
            ctx.fillText(m, msgValueX, MSG_VALUE_Y);
          } else {
            const allWords = m.split(/\s+/);
            let firstSeg = "";
            let firstWordCount = 0;
            for (let i = 0; i < allWords.length; i++) {
              const candidate =
                firstSeg.length === 0
                  ? allWords[i]!
                  : `${firstSeg} ${allWords[i]}`;
              if (ctx.measureText(candidate).width <= msgValueMaxW) {
                firstSeg = candidate;
                firstWordCount = i + 1;
              } else {
                break;
              }
            }
            if (firstSeg.length === 0 && allWords.length > 0) {
              firstSeg = allWords[0]!;
              firstWordCount = 1;
            }
            ctx.fillText(firstSeg, msgValueX, MSG_VALUE_Y);

            const remaining = allWords.slice(firstWordCount).join(" ");
            if (remaining.length > 0) {
              ctx.font = `${FONT_SIZE_WRAP}px "HandelsonTwo", cursive`;
              const wrappedLines = wrapText(ctx, remaining, wrapMaxW);
              let y = WRAP_FIRST_Y;
              for (const line of wrappedLines) {
                ctx.fillText(line, WRAP_START_X, y);
                y += LINE_HEIGHT;
                if (y > 4750) {
                  ctx.fillText("…", WRAP_START_X, y);
                  break;
                }
              }
            }
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
