"use client";

/**
 * CanvasAspirationAdmin
 *
 * Renders the OSAMA canvas template with:
 *   - Case ID       (top line, after the "Case ID:" label)
 *   - Message       (next line, after the "Message:" label)
 *   - Admin reply   (below the message, in a "Balasan Admin" area
 *                    near the turtle, after a small ":" marker)
 *
 * The component:
 *   - Loads the underwater template image (same one used in
 *     the OSAMA case detail canvas).
 *   - Loads the HandelsonTwo font used by the existing canvas.
 *   - Measures the template's baked-in "Case ID:" and "Message:"
 *     labels from pixels and positions each value right after
 *     the label's measured right edge, so the inline run reads
 *     like one natural line ("Case ID: <value>").
 *   - Provides an admin reply text input whose value is drawn
 *     on the canvas at the area near the turtle, after a small
 *     ":" marker (the admin reply slot).
 *   - Renders a download button that exports the canvas as a
 *     high-resolution PNG.
 *
 * The input values are kept in local state for now; this
 * component is a self-contained preview/admin-reply tool.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./CanvasAspirationAdmin.module.css";

// ─── constants (mirror OsamaCanvas.tsx) ─────────────────────────
const CANVAS_W = 3375;
const CANVAS_H = 6000;

// Grid layout aligned with public/kak-taksaka/osama/canvas-template.jpg
const CASE_ID_VALUE_X = 1120;
const CASE_ID_VALUE_Y = 1360;

const MSG_VALUE_X = 1320;
const MSG_VALUE_Y = 1530;

const PAPER_RIGHT_X = 2870;
const WRAP_START_X = 700;

const MSG_LINE_YS = [1703, 1871, 2039, 2209, 2383, 2548];

const ADMIN_REPLY_START_X = 680;
const ADMIN_REPLY_LINE_YS = [
  2715, 2873, 3051, 3219, 3389, 3559, 3730, 3903, 4068, 4238,
];

const FONT_SIZE_VALUE = 90;
const FONT_SIZE_WRAP = 95;
const FONT_SIZE_ADMIN_REPLY = 95;

const TEXT_COLOR = "#484f90";
const ADMIN_TEXT_COLOR = "#1d4ed8";

const TEMPLATE_URL = "/kak-taksaka/osama/canvas-template.jpg";
const FONT_URL = "/kak-taksaka/osama/fonts/handelson-two.otf";

// ─── helpers ─────────────────────────────────────────────────────
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

// ─── component ───────────────────────────────────────────────────
interface Props {
  caseId?: string;
  message?: string;
  initialAdminReply?: string;
}

export function CanvasAspirationAdmin({
  caseId: initialCaseId = "OSM-00000-XXXXXX",
  message: initialMessage = "Tulis pesan di sini...",
  initialAdminReply = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [caseId, setCaseId] = useState(initialCaseId);
  const [message, setMessage] = useState(initialMessage);
  const [adminReply, setAdminReply] = useState(initialAdminReply);
  const [state, setState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Re-render the canvas whenever any of the inputs change.
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

        // Background.
        ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = TEXT_COLOR;
        ctx.textBaseline = "alphabetic";

        // 1. Case ID value on Line 1 next to "Case ID:" label
        ctx.font = `bold ${FONT_SIZE_VALUE}px "HandelsonTwo", cursive`;
        ctx.fillText(caseId, CASE_ID_VALUE_X, CASE_ID_VALUE_Y);

        // 2. Message value on Line 2 next to "Message:" label, wrap below
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

        // 3. Admin reply — drawn near the turtle after the baked-in ":" colon indicator (X=645, Y=2715)
        const r = adminReply.trim();
        if (r.length > 0) {
          ctx.fillStyle = ADMIN_TEXT_COLOR;
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

  // Download the current canvas as a high-res PNG.
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

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.title}>Canvas Aspirasi</h2>
        <p className={styles.subtitle}>
          Preview dan balas aspirasi. Hasil render mengikuti
          template underwater yang sama dengan Story Generator,
          dengan tambahan kolom Balasan Admin di area dekat
          kura-kura.
        </p>
      </header>

      <div className={styles.canvasShell}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label={`Canvas visual aspirasi dengan Case ID ${caseId}`}
          style={{ opacity: state === "ready" ? 1 : 0.4 }}
        />
        {state === "loading" && (
          <div className={styles.loadingOverlay} aria-live="polite">
            <span className={styles.loadingDot} />
            <span className={styles.loadingText}>Menyiapkan kanvas…</span>
          </div>
        )}
      </div>

      {state === "error" && (
        <p className={styles.errorNotice} role="alert">
          Gagal membuat canvas: {errorMsg}
        </p>
      )}

      <button
        type="button"
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={state !== "ready"}
        aria-label={`Unduh canvas aspirasi ${caseId} sebagai gambar PNG`}
      >
        {state === "loading"
          ? "Memuat…"
          : state === "error"
            ? "Gagal"
            : "⬇ Unduh Canvas (PNG)"}
      </button>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Case ID</span>
          <input
            type="text"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className={styles.input}
            placeholder="OSM-XXXXX-XXXXXX"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Pesan (dari user)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className={styles.textarea}
            placeholder="Tulis pesan aspirasi di sini..."
          />
        </label>

        <label className={`${styles.field} ${styles.fieldAdmin}`}>
          <span className={`${styles.fieldLabel} ${styles.fieldLabelAdmin}`}>
            Balasan Admin (di area dekat kura-kura, setelah tanda ":")
          </span>
          <textarea
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
            rows={3}
            className={`${styles.textarea} ${styles.textareaAdmin}`}
            placeholder="Tulis balasan resmi OSIS / PAGASKA..."
          />
        </label>
      </div>
    </div>
  );
}

export default CanvasAspirationAdmin;
