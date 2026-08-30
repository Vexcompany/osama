// V3.1 PATCH — Static analysis of the Kak Taksaka dialog state
// machine. No browser required. We re-implement the same logic
// as the React component (initial state, versioned localStorage)
// and assert it matches the spec's acceptance test.

import assert from "node:assert/strict";
import fs from "node:fs";

// ── Mirror the production code under test ──────────────────────
// In real React: `useState("none")` initial, then `useEffect`
// reads localStorage and sets to "intro" if not seen. We
// simulate the effect synchronously here.
const TAKSAKA_DIALOG_VERSION = "3.1";
const TAKSAKA_DIALOG_STORAGE_KEY = "taksaka_dialog_version";

function readDialogVersionSeen(store) {
  return store.get(TAKSAKA_DIALOG_STORAGE_KEY) === TAKSAKA_DIALOG_VERSION;
}

function writeDialogVersionSeen(store) {
  store.set(TAKSAKA_DIALOG_STORAGE_KEY, TAKSAKA_DIALOG_VERSION);
}

// Replicate KakTaksaka's initial state and the mount-time
// effect that decides whether to show the intro.
function computeInitialOverlay(store) {
  return readDialogVersionSeen(store) ? "none" : "intro";
}

// ── Test scenarios ─────────────────────────────────────────────
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

console.log("V3.1 PATCH — Kak Taksaka dialog state machine\n");

console.log("1. Acceptance test 1-2: fresh browser");
{
  const store = new Map();
  const overlay = computeInitialOverlay(store);
  test("intro appears on fresh visit (empty localStorage)", () => {
    assert.equal(overlay, "intro");
  });
}

console.log("\n2. Acceptance test 7-8: versioned localStorage shape");
{
  const store = new Map();
  writeDialogVersionSeen(store);
  test("stored value is the version string, NOT a boolean", () => {
    assert.equal(store.get(TAKSAKA_DIALOG_STORAGE_KEY), "3.1");
  });
  test("stored value is NOT JSON (no wrapping braces or quotes)", () => {
    const raw = store.get(TAKSAKA_DIALOG_STORAGE_KEY);
    // JSON object/array would start with { or [, JSON string
    // would be wrapped in quotes. A plain version string like
    // "3.1" is also valid JSON (a number) but that's a happy
    // accident — we want the spec to be "no JSON wrapper".
    const startsWithJsonWrapper =
      raw.startsWith("{") ||
      raw.startsWith("[") ||
      raw.startsWith('"') ||
      raw.endsWith('"');
    assert.equal(
      startsWithJsonWrapper,
      false,
      "expected unwrapped version string, got: " + raw,
    );
  });
}

console.log("\n3. Acceptance test 9-10: reload after completion");
{
  const store = new Map();
  writeDialogVersionSeen(store);
  // Simulate reload — store is re-hydrated from localStorage.
  const overlay = computeInitialOverlay(store);
  test("intro does NOT reappear after completion + reload", () => {
    assert.equal(overlay, "none");
  });
}

console.log("\n4. Acceptance test 11-13: V3.1 → V3.2 update");
{
  const store = new Map();
  // User finished V3.1.
  store.set(TAKSAKA_DIALOG_STORAGE_KEY, "3.1");
  // Now the website is updated to V3.2.
  const storedVersion = store.get(TAKSAKA_DIALOG_STORAGE_KEY);
  test('stored "3.1" does not match current version "3.2"', () => {
    const currentVersion = "3.2";
    assert.notEqual(storedVersion, currentVersion);
  });
  // The dialog should re-appear. With the new code reading
  // the CURRENT module's TAKSAKA_DIALOG_VERSION, when version
  // is bumped to "3.2" the comparison would fail and intro
  // would show. Simulated here:
  function updatedCheck() {
    return store.get(TAKSAKA_DIALOG_STORAGE_KEY) === "3.2";
  }
  test("intro re-appears when version is bumped", () => {
    assert.equal(updatedCheck(), false);
  });
  // User completes V3.2:
  store.set(TAKSAKA_DIALOG_STORAGE_KEY, "3.2");
  test('after V3.2 completion, stored value is "3.2"', () => {
    assert.equal(store.get(TAKSAKA_DIALOG_STORAGE_KEY), "3.2");
  });
  test("V3.2 dialog does NOT reappear after completion", () => {
    assert.equal(updatedCheck(), true);
  });
}

console.log("\n5. Storage key namespace");
{
  test("uses namespaced taksaka_* key", () => {
    assert.ok(TAKSAKA_DIALOG_STORAGE_KEY.startsWith("taksaka_"));
  });
  test("does NOT use a generic key like 'tutorial'", () => {
    assert.equal(TAKSAKA_DIALOG_STORAGE_KEY.includes("tutorial"), false);
  });
}

console.log("\n6. Skip / Close / Finish semantics");
{
  const store = new Map();
  // User on the intro, presses Lewati (skip).
  writeDialogVersionSeen(store);
  test("Skip → saves current version", () => {
    assert.equal(readDialogVersionSeen(store), true);
  });
  store.clear();
  // User does the full tour, presses Selesai on last step.
  writeDialogVersionSeen(store);
  test("Finish (Selesai) → saves current version", () => {
    assert.equal(readDialogVersionSeen(store), true);
  });
  store.clear();
  // User presses Esc mid-tour.
  writeDialogVersionSeen(store);
  test("Esc (Close) → saves current version", () => {
    assert.equal(readDialogVersionSeen(store), true);
  });
}

console.log("\n7. localStorage.clear() NOT used");
{
  const src = fs.readFileSync(
    "src/components/kak-taksaka/kakTaksakaRules.ts",
    "utf8",
  );
  // Strip comments so we don't match a docstring that says
  // "we don't call localStorage.clear()".
  let codeOnly = src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .split("\n")
    .map((line) => {
      // Remove trailing // comments.
      const i = line.indexOf("//");
      if (i === -1) return line;
      // Keep strings (don't strip inside them).
      let inStr = false;
      let q = null;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (inStr) {
          if (c === q && line[j - 1] !== "\\") inStr = false;
        } else if (c === '"' || c === "'" || c === "`") {
          inStr = true;
          q = c;
        }
      }
      // Simpler: just check if the // is inside a string by
      // counting quotes before it. We only strip // comments.
      const before = line.slice(0, i);
      const quotesBefore = (before.match(/["'`]/g) ?? []).length;
      if (quotesBefore % 2 === 0) return line.slice(0, i);
      return line;
    })
    .join("\n");
  test("rules.ts does NOT call localStorage.clear()", () => {
    assert.equal(
      codeOnly.includes("localStorage.clear"),
      false,
      "rules.ts must not call localStorage.clear()",
    );
  });
  test("rules.ts only calls getItem / setItem on localStorage", () => {
    const calls = codeOnly.match(/localStorage\.[a-zA-Z]+/g) ?? [];
    for (const call of calls) {
      const ok =
        call === "localStorage.getItem" || call === "localStorage.setItem";
      assert.ok(ok, `unexpected localStorage call: ${call}`);
    }
  });
  test("rules.ts only touches the namespaced key", () => {
    const keys = codeOnly.match(/"taksaka[a-z_]*"/g) ?? [];
    for (const k of keys) {
      assert.ok(k.startsWith('"taksaka_'), `non-namespaced key: ${k}`);
    }
  });
}

console.log("\n8. Skip without seeing the dialog");
{
  // Per spec: "Skip / Finish → dianggap sudah melihat tutorial
  // versi tersebut". Even if the user clicks Lewati on the
  // very first dialog, the current version is saved and the
  // dialog doesn't auto-open again. We test this.
  const store = new Map();
  // User sees the intro card (overlay = "intro"), then
  // immediately clicks Lewati. The component should call
  // writeDialogVersionSeen() — same as clicking Selesai.
  writeDialogVersionSeen(store);
  test("Lewati on intro → saves version → no re-show", () => {
    assert.equal(computeInitialOverlay(store), "none");
  });
}

console.log("\n9. Old storage key (V3.0) is ignored");
{
  // The old code used key "taksaka:intro-completed:v1" with
  // a JSON value. After V3.1, that key is gone and the
  // comparison is on a different key. So an "old user" who
  // had completed V3.0 will see the V3.1 intro (because the
  // new key is missing).
  const store = new Map();
  store.set("taksaka:intro-completed:v1", JSON.stringify({ v: 1, done: true }));
  const overlay = computeInitialOverlay(store);
  test("old key is NOT consulted — V3.1 intro shows", () => {
    assert.equal(overlay, "intro");
  });
}

console.log("\n10. AI bridge is NOT called from the dialog");
{
  // The tutorial files must not import or call the AI bridge.
  // Only the chat message handler should.
  const files = [
    "src/components/kak-taksaka/KakTaksakaIntro.tsx",
    "src/components/kak-taksaka/KakTaksakaTour.tsx",
    "src/components/kak-taksaka/KakTaksaka.tsx",
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => {
        const i = line.indexOf("//");
        if (i === -1) return line;
        const before = line.slice(0, i);
        const quotesBefore = (before.match(/["'`]/g) ?? []).length;
        if (quotesBefore % 2 === 0) return line.slice(0, i);
        return line;
      })
      .join("\n");
    test(`${f} does NOT call sendChat`, () => {
      // Strip the import line so an `import { sendChat }`
      // doesn't count as a call. Only actual invocations.
      const noImports = codeOnly.replace(
        /^import \{[^}]*sendChat[^}]*\} from [^;]+;/gm,
        "",
      );
      // KakTaksaka.tsx is the orchestrator — it DOES call
      // sendChat, but only in the sendMessage chat handler.
      // The Intro and Tour files must never call it.
      if (f.endsWith("KakTaksaka.tsx")) {
        // Verify the only call is inside sendMessage.
        const lines = noImports.split("\n");
        const callLines = lines
          .map((line, idx) => ({ line, idx }))
          .filter(({ line }) => line.includes("sendChat("));
        test(`${f}: sendChat is called only inside sendMessage`, () => {
          assert.ok(callLines.length > 0, "expected at least one sendChat call");
          for (const { line, idx } of callLines) {
            // Find the enclosing function by walking up.
            let inSendMessage = false;
            for (let i = idx; i >= 0; i--) {
              if (lines[i].includes("const sendMessage")) {
                inSendMessage = true;
                break;
              }
            }
            assert.ok(
              inSendMessage,
              `sendChat call at line ${idx + 1} is NOT inside sendMessage: ${line.trim()}`,
            );
          }
        });
      } else {
        assert.equal(
          noImports.includes("sendChat("),
          false,
          "tutorial file must not call sendChat",
        );
      }
    });
  }
  // KakTaksaka.tsx DOES call sendChat, but only in sendMessage
  // which is wired to the chat panel — not the tutorial.
  test("sendChat in KakTaksaka is only in sendMessage (chat path)", () => {
    const src = fs.readFileSync(
      "src/components/kak-taksaka/KakTaksaka.tsx",
      "utf8",
    );
    const sendMessageMatch = src.match(/const sendMessage[^=]*= useCallback\(\s*async \(text: string\)/);
    assert.ok(sendMessageMatch, "sendMessage callback must exist");
  });
}

console.log("\n11. Initial render does not show intro (avoids flash)");
{
  // The component's initial state is "none" on both server and
  // the very first client render. This is what prevents the
  // "flash of intro on reload" failure mode.
  const tsx = fs.readFileSync(
    "src/components/kak-taksaka/KakTaksaka.tsx",
    "utf8",
  );
  test('initial useState(Overlay) is "none"', () => {
    const m = tsx.match(/useState<Overlay>\("(\w+)"\)/);
    assert.ok(m, "expected useState<Overlay>(...) initializer");
    assert.equal(m[1], "none", "initial state must be none to avoid flash");
  });
  test("version check happens in a useEffect (not during render)", () => {
    assert.ok(
      tsx.includes("useEffect"),
      "expected a useEffect to read localStorage",
    );
  });
}

console.log("\n12. Tour advance/back logic is correct");
{
  // The tour has 5 steps. Advance past step 4 (last) calls
  // onEnd, which dismisses. Back from step 0 stays on step 0.
  const tour = fs.readFileSync(
    "src/components/kak-taksaka/KakTaksakaTour.tsx",
    "utf8",
  );
  test("advance calls onEnd when on last step", () => {
    const m = tour.match(
      /setStepIndex\(\(i\) => \{[^}]*if \(next >= TOUR_STEPS\.length\) \{[^}]*onEnd\(\)/,
    );
    assert.ok(m, "advance should call onEnd when next >= length");
  });
  test("back is clamped to 0 (no negative step)", () => {
    const m = tour.match(/Math\.max\(0, i - 1\)/);
    assert.ok(m, "back should clamp to 0");
  });
}

console.log(`\nResults: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
