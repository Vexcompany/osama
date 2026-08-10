// Re-implements the EXACT production canvas rendering
// from src/components/osama/OsamaCanvas.tsx, using
// @napi-rs/canvas. Produces a real PNG for visual
// verification, using the same font, baseline, and
// coordinate math as the production code.
//
// Usage: node scripts/render-canvas.mjs <variant>
//   variant: "current" (default) or "fixed"
//
// Requires @napi-rs/canvas to be installed (not in
// package.json — install ad-hoc with
//   npm install --no-save @napi-rs/canvas
// ).

import fs from "node:fs";
import path from "node:path";

let napi;
try {
  napi = await import("@napi-rs/canvas");
} catch {
  console.error(
    "@napi-rs/canvas is not installed. Run:\n" +
      "  npm install --no-save @napi-rs/canvas\n" +
      "and re-run this script.",
  );
  process.exit(1);
}
const { createCanvas, GlobalFonts, loadImage: napiLoadImage } = napi;

const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "public/kak-taksaka/osama/canvas-template.jpg");
const FONT_PATH = path.join(ROOT, "public/kak-taksaka/osama/fonts/handelson-two.otf");
const OUT_DIR = path.join(ROOT, "scripts/out");
fs.mkdirSync(OUT_DIR, { recursive: true });

GlobalFonts.registerFromPath(FONT_PATH, "HandelsonTwo");

// ─── Production constants (from OsamaCanvas.tsx) ─────────
const CANVAS_W = 3375;
const CANVAS_H = 6000;
const TEXT_START_X = 680;
const TEXT_MAX_W   = 2050;
const TEXT_COLOR = "#484f90";

// "current" = the original buggy code (label-drawing on
// top of the template's baked-in labels)
// "fixed"   = the patched code (values only, on the
// template's empty ruled lines)
const LAYOUTS = {
  current: {
    caseIdValueY: 1870,
    caseIdLabelY: 1700,
    msgBodyStartY: 2290,
    msgLabelY: 2100,
    lineHeight: 185,
    fontSizeValue: 160,
    fontSizeMsg: 150,
    fontSizeLabel: 140,
    drawLabels: true,
  },
  fixed: {
    caseIdValueY: 1870,
    caseIdLabelY: 0,
    msgBodyStartY: 2035,
    msgLabelY: 0,
    lineHeight: 168,
    fontSizeValue: 160,
    fontSizeMsg: 150,
    fontSizeLabel: 140,
    drawLabels: false,
  },
};

function wrapText(ctx, text, maxWidth) {
  const result = [];
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

async function render({ caseId, message, outputName, label, layout }) {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");

  const tplImg = await napiLoadImage(TEMPLATE);
  ctx.drawImage(tplImg, 0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = "alphabetic";

  if (layout.drawLabels) {
    ctx.font = `bold ${layout.fontSizeLabel}px "HandelsonTwo"`;
    ctx.fillText("Case ID:", TEXT_START_X, layout.caseIdLabelY);

    ctx.font = `bold ${layout.fontSizeLabel}px "HandelsonTwo"`;
    ctx.fillText(label, TEXT_START_X, layout.msgLabelY);
  }

  ctx.font = `bold ${layout.fontSizeValue}px "HandelsonTwo"`;
  ctx.fillText(caseId, TEXT_START_X, layout.caseIdValueY);

  ctx.font = `${layout.fontSizeMsg}px "HandelsonTwo"`;
  const lines = wrapText(ctx, message, TEXT_MAX_W);
  let y = layout.msgBodyStartY;
  for (const line of lines) {
    ctx.fillText(line, TEXT_START_X, y);
    y += layout.lineHeight;
    if (y > 4750) {
      ctx.fillText("…", TEXT_START_X, y);
      break;
    }
  }

  const out = path.join(OUT_DIR, `${outputName}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("Wrote", out, `(${fs.statSync(out).size} bytes)`);
}

const variant = process.argv[2] || "current";
const TEST_CASE_ID = "OSM-07820ME75F-WA6KEW";
const TEST_MESSAGE = "Verolyz";

if (LAYOUTS[variant]) {
  await render({
    caseId: TEST_CASE_ID,
    message: TEST_MESSAGE,
    outputName: `${variant}-render`,
    label: "Message:",
    layout: LAYOUTS[variant],
  });

  // Also render a multi-line case for visual verification
  // of the line-height / wrap behaviour.
  await render({
    caseId: "OSM-07820ME75F-WA6KEW",
    message:
      "Halo kak, saya ingin menyampaikan aspirasi terkait kantin sekolah. Tolong lebih banyak variasi menu vegetarian ya, dan harga air mineralnya jangan naik terus. Terima kasih!",
    outputName: `${variant}-render-multiline`,
    label: "Message:",
    layout: LAYOUTS[variant],
  });
} else {
  console.log("Unknown variant:", variant);
  process.exit(1);
}
