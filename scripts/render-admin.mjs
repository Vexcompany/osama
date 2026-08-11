// Render the CanvasAspirationAdmin component's expected
// output. We can't easily mount the React component
// without jsdom + a real browser, so we re-implement
// the same render logic here using @napi-rs/canvas and
// the same template / font / coordinates as the
// production code.
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "public/kak-taksaka/osama/canvas-template.jpg");
const FONT = path.join(ROOT, "public/kak-taksaka/osama/fonts/handelson-two.otf");
const OUT = path.join(ROOT, "scripts/out/admin.png");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

GlobalFonts.registerFromPath(FONT, "HandelsonTwo");

// (mirrors CanvasAspirationAdmin.tsx)
const CANVAS_W = 3375;
const CANVAS_H = 6000;
const CASE_ID_LABEL_LEFT  = 519;
const CASE_ID_LABEL_WIDTH = 761;
const MSG_LABEL_LEFT      = 486;
const MSG_LABEL_WIDTH     = 754;
const LABEL_VALUE_GAP     = 0;
const CASE_ID_VALUE_Y     = 1527;
const MSG_VALUE_Y         = 1699;
const ADMIN_REPLY_Y       = 2714;
const WRAP_START_X        = 680;
const PAPER_RIGHT_X       = 2870;
const ADMIN_REPLY_MARKER_X = 730;
const ADMIN_REPLY_TEXT_X   = 800;
const FONT_SIZE_VALUE        = 90;
const FONT_SIZE_WRAP         = 110;
const FONT_SIZE_ADMIN_LABEL  = 80;
const FONT_SIZE_ADMIN_REPLY  = 100;

const TEST_CASE_ID    = "OSM-56PYOW2-SBTQ8M";
const TEST_MESSAGE    = "Pagaska music bagus dan mantap sekali, mohon untuk terus ditingkatkan ke depannya agar OSIS semakin jaya!";
const TEST_ADMIN_REPLY = "Terima kasih atas aspirasinya! Kami akan segera menindaklanjuti hal ini.";

function wrapText(ctx, text, maxWidth) {
  const result = [];
  for (const para of text.split(/\r?\n/)) {
    if (para.trim() === "") {
      result.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(" ")) {
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

async function main() {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const tpl = await loadImage(TEMPLATE);
  ctx.drawImage(tpl, 0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = "#484f90";
  ctx.textBaseline = "alphabetic";

  // 1. Case ID value.
  ctx.font = `bold ${FONT_SIZE_VALUE}px "HandelsonTwo"`;
  const caseIdX = CASE_ID_LABEL_LEFT + CASE_ID_LABEL_WIDTH + LABEL_VALUE_GAP;
  ctx.fillText(TEST_CASE_ID, caseIdX, CASE_ID_VALUE_Y);

  // 2. Message value.
  ctx.font = `${FONT_SIZE_VALUE}px "HandelsonTwo"`;
  const msgX = MSG_LABEL_LEFT + MSG_LABEL_WIDTH + LABEL_VALUE_GAP;
  const msgMaxW = PAPER_RIGHT_X - msgX;
  const m = TEST_MESSAGE.trim();
  if (m.length > 0) {
    if (ctx.measureText(m).width <= msgMaxW) {
      ctx.fillText(m, msgX, MSG_VALUE_Y);
    } else {
      const allWords = m.split(/\s+/);
      let firstSeg = "";
      let firstWordCount = 0;
      for (let i = 0; i < allWords.length; i++) {
        const candidate =
          firstSeg.length === 0
            ? allWords[i]
            : `${firstSeg} ${allWords[i]}`;
        if (ctx.measureText(candidate).width <= msgMaxW) {
          firstSeg = candidate;
          firstWordCount = i + 1;
        } else {
          break;
        }
      }
      if (firstSeg.length === 0 && allWords.length > 0) {
        firstSeg = allWords[0];
        firstWordCount = 1;
      }
      ctx.fillText(firstSeg, msgX, MSG_VALUE_Y);

      const remaining = allWords.slice(firstWordCount).join(" ");
      if (remaining.length > 0) {
        ctx.font = `${FONT_SIZE_WRAP}px "HandelsonTwo"`;
        const wrapMaxW = PAPER_RIGHT_X - WRAP_START_X;
        const wrappedLines = wrapText(ctx, remaining, wrapMaxW);
        let y = MSG_VALUE_Y + 168;
        for (const line of wrappedLines) {
          ctx.fillText(line, WRAP_START_X, y);
          y += 168;
          if (y > 4750) break;
        }
      }
    }
  }

  // 3. Admin reply.
  if (TEST_ADMIN_REPLY.trim().length > 0) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${FONT_SIZE_ADMIN_LABEL}px "HandelsonTwo"`;
    ctx.fillText("Balasan Admin:", WRAP_START_X, ADMIN_REPLY_Y - 100);
    ctx.fillStyle = "#1d4ed8";
    ctx.font = `bold ${FONT_SIZE_ADMIN_REPLY}px "HandelsonTwo"`;
    ctx.fillText(":", ADMIN_REPLY_MARKER_X, ADMIN_REPLY_Y);
    const replyMaxW = PAPER_RIGHT_X - ADMIN_REPLY_TEXT_X;
    ctx.font = `${FONT_SIZE_ADMIN_REPLY}px "HandelsonTwo"`;
    const replyLines = wrapText(ctx, TEST_ADMIN_REPLY, replyMaxW);
    let replyY = ADMIN_REPLY_Y;
    for (const line of replyLines) {
      ctx.fillText(line, ADMIN_REPLY_TEXT_X, replyY);
      replyY += 168;
      if (replyY > 4500) break;
    }
  }

  fs.writeFileSync(OUT, canvas.toBuffer("image/png"));
  console.log("Wrote", OUT, `(${fs.statSync(OUT).size} bytes)`);
}

await main();
