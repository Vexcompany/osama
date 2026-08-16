"use client";

/**
 * OsamaCanvas — downloadable visual card for OSAMA case detail.
 *
 * Renders the underwater template image (template.jpg) onto an HTML Canvas,
 * positioning Case ID and Message text IN THE BLANK SPACE IN BETWEEN
 * notebook paper grid lines for a natural handwriting feel.
 */

import { useEffect, useRef, useState } from "react";
import styles from "./OsamaCanvas.module.css";

// ─── constants ────────────────────────────────────────────────────────────────

const CANVAS_TEXT_COLOR = "#484f90";

const CANVAS_W = 1440;
const CANVAS_H = 2560;

const TEMPLATE_URL = "/kak-taksaka/osama/template.jpg";
const FONT_URL = "/kak-taksaka/osama/fonts/handelson-two.otf";

const FONT_SIZE = 44;

// Paper ruled line midpoints (Y center of the blank space between line k and line k+1)
const Y_START = 441;
const SPACING = 72.25;
const GAP_MIDS = Array.from({ length: 25 }, (_, i) =>
  Math.floor(Y_START + i * SPACING + SPACING / 2.0),
);

const START_X = 280;
const PAPER_RIGHT_X = 1200;
const WRAP_MAX_W = PAPER_RIGHT_X - START_X;

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
          loadImage(TEMPLATE_URL),
          loadFont("HandelsonTwo", FONT_URL),
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
        ctx.font = `${FONT_SIZE}px "HandelsonTwo", cursive`;
        ctx.textBaseline = "middle";

        // 3. Row 1 (Gap Index 1, Y_mid ~ 549): Case ID: <value>
        const caseIdStr = `Case ID: ${caseId}`;
        ctx.fillText(caseIdStr, START_X, GAP_MIDS[1]!);

        // 4. Row 2 (Gap Index 2, Y_mid ~ 621): Message: <value line 1>
        const msgLabel = "Message: ";
        const labelWidth = ctx.measureText(msgLabel).width;
        const line1MaxW = WRAP_MAX_W - labelWidth;

        const words = message.trim().split(/\s+/);
        let line1Text = "";
        let idx = 0;
        while (idx < words.length) {
          const testText = line1Text
            ? `${line1Text} ${words[idx]}`
            : words[idx]!;
          if (ctx.measureText(testText).width <= line1MaxW) {
            line1Text = testText;
            idx++;
          } else {
            break;
          }
        }

        ctx.fillText(msgLabel, START_X, GAP_MIDS[2]!);
        ctx.fillText(line1Text, START_X + labelWidth, GAP_MIDS[2]!);

        // 5. Continuation lines on Gap Index 3, 4, 5...
        const remWords = words.slice(idx);
        let currGapIdx = 3;

        let currLine = "";
        for (const w of remWords) {
          const testLine = currLine ? `${currLine} ${w}` : w;
          if (ctx.measureText(testLine).width <= WRAP_MAX_W) {
            currLine = testLine;
          } else {
            if (currLine && currGapIdx < GAP_MIDS.length) {
              ctx.fillText(currLine, START_X, GAP_MIDS[currGapIdx]!);
              currGapIdx++;
            }
            currLine = w;
          }
        }

        if (currLine && currGapIdx < GAP_MIDS.length) {
          ctx.fillText(currLine, START_X, GAP_MIDS[currGapIdx]!);
        }

        // 6. Draw Admin Reply if exists
        if (adminReply && adminReply.trim()) {
          currGapIdx += 2; // Leave one blank line gap

          if (currGapIdx < GAP_MIDS.length) {
            const adminLabel = "Admin: ";
            const adminLabelWidth = ctx.measureText(adminLabel).width;
            const adminLine1MaxW = WRAP_MAX_W - adminLabelWidth;

            const adminWords = adminReply.trim().split(/\s+/);
            let adminLine1Text = "";
            let aIdx = 0;
            while (aIdx < adminWords.length) {
              const testText = adminLine1Text
                ? `${adminLine1Text} ${adminWords[aIdx]}`
                : adminWords[aIdx]!;
              if (ctx.measureText(testText).width <= adminLine1MaxW) {
                adminLine1Text = testText;
                aIdx++;
              } else {
                break;
              }
            }

            ctx.fillText(adminLabel, START_X, GAP_MIDS[currGapIdx]!);
            ctx.fillText(adminLine1Text, START_X + adminLabelWidth, GAP_MIDS[currGapIdx]!);
            currGapIdx++;

            const aRemWords = adminWords.slice(aIdx);
            let aCurrLine = "";
            for (const w of aRemWords) {
              const testLine = aCurrLine ? `${aCurrLine} ${w}` : w;
              if (ctx.measureText(testLine).width <= WRAP_MAX_W) {
                aCurrLine = testLine;
              } else {
                if (aCurrLine && currGapIdx < GAP_MIDS.length) {
                  ctx.fillText(aCurrLine, START_X, GAP_MIDS[currGapIdx]!);
                  currGapIdx++;
                }
                aCurrLine = w;
              }
            }
            if (aCurrLine && currGapIdx < GAP_MIDS.length) {
              ctx.fillText(aCurrLine, START_X, GAP_MIDS[currGapIdx]!);
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
          {state === "loading" ? (
            "Memuat…"
          ) : state === "error" ? (
            "Gagal"
          ) : (
            <>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
                <path d="M10 3 V12 M6.5 9 L10 12.5 L13.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16 H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Unduh Canvas
            </>
          )}
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


