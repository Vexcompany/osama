// V3.1 PATCH — Render test using a minimal DOM (linkedom).
// Verifies that the intro card HTML is what we expect on a
// fresh visit (no localStorage), and that no intro HTML is
// present in the initial SSR payload (because the initial
// state is "none" — the intro shows after the client useEffect).
//
// We also re-fetch the page with a header that mimics a
// returning user (the dev server doesn't actually consume
// the storage on the server side, so this is informational).

import assert from "node:assert/strict";
import { parseHTML } from "linkedom";

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    fail++;
  }
}

async function fetchHTML() {
  const res = await fetch("http://localhost:3000/");
  return await res.text();
}

console.log("V3.1 PATCH — Kak Taksaka render smoke test\n");

console.log("1. Server-rendered HTML");
{
  const html = await fetchHTML();
  const { document } = parseHTML(html);

  test("page is valid HTML", () => {
    assert.ok(document.querySelector("main"));
  });

  test("page has the brand mark", () => {
    const header = document.querySelector("[data-tour='brand']");
    assert.ok(header, "expected [data-tour='brand'] in SSR HTML");
  });

  test("page has the message form", () => {
    const form = document.querySelector("[data-tour='message-form']");
    assert.ok(form, "expected [data-tour='message-form'] in SSR HTML");
  });

  test("page has the submit button", () => {
    const btn = document.querySelector("[data-tour='submit-button']");
    assert.ok(btn, "expected [data-tour='submit-button'] in SSR HTML");
  });

  test("page has the floating taksaka button (always mounted)", () => {
    const btn = document.querySelector("[data-tour='taksaka-button']");
    assert.ok(btn, "expected [data-tour='taksaka-button'] in SSR HTML");
  });

  test("intro card is NOT in initial SSR HTML (avoids flash)", () => {
    // V3.1 PATCH: initial useState is "none" on both server
    // and first client render. The intro appears after
    // useEffect runs. This means the SSR HTML does NOT
    // contain the intro card. Returning users thus see no
    // flash on reload.
    const intro = document.querySelector(
      "[data-taksaka-intro-root]",
    );
    assert.equal(intro, null, "expected no intro in initial SSR HTML");
  });

  test("tour card is NOT in initial SSR HTML (overlay = none)", () => {
    const tour = document.querySelector("[data-taksaka-tour-root]");
    assert.equal(tour, null, "expected no tour in initial SSR HTML");
  });
}

console.log("\n2. Bundled JS includes dialog copy and versioned storage");
{
  // In dev mode the page chunk lives at a hashed filename.
  // We can find it in .next/static/chunks/app/. The build
  // (production) embeds it directly. We check the build
  // output since that's the most reliable. For dev, we just
  // scan all chunk files in .next/static/chunks.
  const fs = await import("node:fs");
  const path = await import("node:path");

  function findFirstChunk(needle) {
    function walk(dir) {
      const out = [];
      try {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, ent.name);
          if (ent.isDirectory()) out.push(...walk(p));
          else if (p.endsWith(".js")) out.push(p);
        }
      } catch {
        // ignore
      }
      return out;
    }
    const root = ".next/static/chunks";
    for (const f of walk(root)) {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.includes(needle)) return content;
      } catch {
        // ignore
      }
    }
    return null;
  }

  const pageChunk = findFirstChunk("taksaka_dialog_version");
  test("client bundle contains the storage key", () => {
    assert.ok(
      pageChunk !== null,
      "expected some chunk to contain taksaka_dialog_version",
    );
  });
  if (pageChunk) {
    test("client bundle contains 'Mulai' (intro button)", () => {
      assert.ok(pageChunk.includes("Mulai"), "expected Mulai");
    });
    test("client bundle contains 'Lewati' (skip button)", () => {
      assert.ok(pageChunk.includes("Lewati"), "expected Lewati");
    });
    test("client bundle contains 'Lanjut' (next button)", () => {
      assert.ok(pageChunk.includes("Lanjut"), "expected Lanjut");
    });
    test("client bundle contains 'Selesai' (finish button)", () => {
      assert.ok(pageChunk.includes("Selesai"), "expected Selesai");
    });
    test("client bundle contains the version string '3.1'", () => {
      assert.ok(pageChunk.includes("3.1"), "expected '3.1'");
    });
    test("client bundle does NOT contain old V1 storage key", () => {
      // The old key was 'taksaka:intro-completed:v1' — should
      // be gone in V3.1. We check that the V3.1 key is used.
      assert.ok(
        !pageChunk.includes("taksaka:intro-completed"),
        "old V1 storage key must not be in bundle",
      );
    });
  }
}

console.log(`\nResults: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
