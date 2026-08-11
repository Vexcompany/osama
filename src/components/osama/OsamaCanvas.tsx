"use client";

/**
 * OsamaCanvas — downloadable visual card for OSAMA case detail.
 *
 * Renders the underwater template image onto an HTML Canvas, overlays
 * dynamic Case ID, Message text, and optional Admin Reply in Handelson Two,
 * perfectly aligned with the notebook paper grid.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./OsamaCanvas.module.css";

// ─── constants ────────────────────────────────────────────────────────────────

/** Exact color for dynamic text overlaid on the canvas. */
const CANVAS_TEXT_COLOR = "#484f90";
const CANVAS_ADMIN_REPLY_COLOR = "#1d4ed8";

/** Internal canvas width & height (matches template native resolution). */
const CANVAS_W = 3375;
const CANVAS_H = 6000;

// Grid layout aligned with public/kak-taksaka/osama/canvas-template.jpg
// Line 1: Baked-in "Case ID:" label (X: 554–1094, Y: 1360)
const CASE_ID_VALUE_X = 1120;
const CASE_ID_VALUE_Y = 1360;

// Line 2: Baked-in "Message:" label (X: 468–1299, Y: 1530)
const MSG_VALUE_X = 1320;
const MSG_VALUE_Y = 1530;

const PAPER_RIGHT_X = 2870;
const WRAP_START_X = 700;

// Line Y positions for message body continuation (notebook paper ruled lines)
const MSG_LINE_YS = [1703, 1871, 2039, 2209, 2383, 2548];

// Admin reply slot near the turtle (baked-in ":" colon is at X: 645, Y: 2715)
const ADMIN_REPLY_START_X = 680;
const ADMIN_REPLY_LINE_YS = [
  2715, 2873, 3051, 3219, 3389, 3559, 3730, 3903, 4068, 4238,
];

// Font sizes in native canvas space
const FONT_SIZE_VALUE = 90;
const FONT_SIZE_WRAP = 95;
const FONT_SIZE_ADMIN_REPLY = 95;

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadFont(name: string, url: string): Promise<void> {
  const font = new FontFace(name, `url(${url})`);
  const loaded = await font.load();
  document.fonts.add(loaded);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const result: string[] = [];
  const paragraphs = text.split(/\r?\n/);
  for (const para of paragraphs) {
    if (para.trim() === "") {
      result.push("");
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
  adminReply?: string | null;
}

type CanvasState = "loading" | "ready" | "error";

export function OsamaCanvas({ caseId, message, adminReply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CanvasState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setState("loading");
      setErrorMsg("");

      try {
        const [templateImg] = await Promise.all([
          loadImage("/kak-taksaka/osama/canvas-template.jpg"),
          loadFont("HandelsonTwo", "/kak-taksaka/osama/fonts/handelson-two.otf"),
        ]);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas element not available");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // 1. Draw background template
        ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

        // 2. Base text styles
        ctx.fillStyle = CANVAS_TEXT_COLOR;
        ctx.textBaseline = "alphabetic";

        // 3. Draw Case ID value on Line 1 next to "Case ID:" label
        ctx.font = `bold ${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        ctx.fillText(caseId, CASE_ID_VALUE_X, CASE_ID_VALUE_Y);

        // 4. Draw Message value on Line 2 next to "Message:" label, and wrap continuation below
        const msgInlineMaxW = PAPER_RIGHT_X - MSG_VALUE_X;
        const wrapMaxW = PAPER_RIGHT_X - WRAP_START_X;

        ctx.font = `${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        const m = message.trim();
        if (m.length > 0) {
          if (ctx.measureText(m).width <= msgInlineMaxW) {
            ctx.fillText(m, MSG_VALUE_X, MSG_VALUE_Y);
          } else {
            const allWords = m.split(/\s+/);
            let firstSeg = "";
            let firstWordCount = 0;
            for (let i = 0; i < allWords.length; i++) {
              const candidate =
                firstSeg.length === 0
                  ? allWords[i]!
                  : `${firstSeg} ${allWords[i]}`;
              if (ctx.measureText(candidate).width <= msgInlineMaxW) {
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
            ctx.fillText(firstSeg, MSG_VALUE_X, MSG_VALUE_Y);

            const remaining = allWords.slice(firstWordCount).join(" ");
            if (remaining.length > 0) {
              ctx.font = `${FONT_SIZE_WRAP}px "HandelsonTwo", cursive`;
              const wrappedLines = wrapText(ctx, remaining, wrapMaxW);
              for (
                let i = 0;
                i < Math.min(wrappedLines.length, MSG_LINE_YS.length);
                i++
              ) {
                ctx.fillText(wrappedLines[i]!, WRAP_START_X, MSG_LINE_YS[i]!);
              }
            }
          }
        }

        // 5. Draw Admin Reply near the turtle after the baked-in ":" colon indicator (X=645, Y=2715)
        const r = adminReply ? adminReply.trim() : "";
        if (r.length > 0) {
          ctx.fillStyle = CANVAS_ADMIN_REPLY_COLOR;
          ctx.font = `${FONT_SIZE_ADMIN_REPLY}px "HandelsonTwo", cursive`;
          const replyMaxW = PAPER_RIGHT_X - ADMIN_REPLY_START_X;
          const replyLines = wrapText(ctx, r, replyMaxW);

          for (
            let i = 0;
            i < Math.min(replyLines.length, ADMIN_REPLY_LINE_YS.length);
            i++
          ) {
            ctx.fillText(
              replyLines[i]!,
              ADMIN_REPLY_START_X,
              ADMIN_REPLY_LINE_YS[i]!,
            );
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
    return () => {
      cancelled = true;
    };
  }, [caseId, message, adminReply]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || state !== "ready") return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OSAMA-${caseId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

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
          {state === "loading"
            ? "Memuat…"
            : state === "error"
              ? "Gagal"
              : "⬇ Unduh Canvas"}
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

