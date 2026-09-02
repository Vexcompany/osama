#!/usr/bin/env python3
"""Hand-polish pass: the craft details that make Obsidian Platinum read
expensive rather than merely recoloured. Every replacement is asserted to
match exactly once, so a silent no-op cannot pass."""
import pathlib
import sys

ROOT = pathlib.Path("/home/user/osama")

EDITS = {
    "src/app/page.module.css": [
        (
            "   Deep-ocean visual language, lightweight surfaces, responsive rhythm.",
            "   Obsidian platinum language, lightweight surfaces, responsive rhythm.",
        ),
        # Hero title: heavier weight + tighter optical tracking.
        (
            """.heroTitle {
  margin: 0;
  max-width: 900px;
  font-family: var(--font-display);
  font-size: clamp(42px, 7.1vw, 78px);
  font-weight: 750;
  line-height: 1.02;
  letter-spacing: -0.045em;""",
            """.heroTitle {
  margin: 0;
  max-width: 900px;
  font-family: var(--font-display);
  font-size: clamp(42px, 7.1vw, 78px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: var(--track-display);""",
        ),
        # Accent line: platinum foil with a slow travelling sheen.
        (
            """@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .heroAccent {
    background: var(--grad-accent);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 0 22px rgba(217, 223, 232, 0.28));
  }
}""",
            """@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .heroAccent {
    /* Platinum foil: an off-size gradient lets a highlight travel across
       the letterforms, which is what makes metal read as metal. */
    background: linear-gradient(
      100deg,
      #8f99a9 0%,
      #dfe4ec 22%,
      #ffffff 38%,
      #c9d1dd 54%,
      #98a2b2 72%,
      #e8ecf3 88%,
      #8f99a9 100%
    );
    background-size: 240% 100%;
    background-position: 18% 0;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 0 26px rgba(217, 223, 232, 0.2));
    animation: foilSheen 11s ease-in-out infinite;
  }
}

@keyframes foilSheen {
  0%,
  100% {
    background-position: 18% 0;
  }
  50% {
    background-position: 72% 0;
  }
}""",
        ),
        # Accent underline: cool neutral instead of a saturated bloom.
        (
            """  background: linear-gradient(90deg, rgba(217, 223, 232, 0), rgba(217, 223, 232, 0.22), rgba(217, 223, 232, 0));
  filter: blur(0.5px);
  z-index: -1;""",
            """  background: linear-gradient(90deg, rgba(217, 223, 232, 0), rgba(217, 223, 232, 0.18), rgba(217, 223, 232, 0));
  filter: blur(0.5px);
  z-index: -1;""",
        ),
        # Eyebrows share one tracking token.
        (
            """  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-mid);""",
            """  font-size: 11px;
  font-weight: 700;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--ink-mid);""",
        ),
        (
            """.sectionEyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;""",
            """.sectionEyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--track-eyebrow);""",
        ),
        (
            """.formInfoEyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;""",
            """.formInfoEyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--track-eyebrow);""",
        ),
        # Feature cards: shared radius token + permanent specular sheen.
        (
            """  min-height: 215px;
  padding: 22px 20px 24px;
  border: 1px solid rgba(208, 216, 228, 0.12);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(15, 18, 25, 0.82), rgba(11, 13, 18, 0.8)),
    rgba(11, 13, 18, 0.72);""",
            """  min-height: 215px;
  padding: 22px 20px 24px;
  border: 1px solid rgba(208, 216, 228, 0.1);
  border-radius: var(--r-xl);
  background:
    var(--grad-sheen),
    linear-gradient(180deg, rgba(15, 18, 25, 0.82), rgba(11, 13, 18, 0.8)),
    rgba(11, 13, 18, 0.72);""",
        ),
        # Index numerals: a touch more presence, still quiet.
        (
            """  letter-spacing: -0.02em;
  color: rgba(217, 223, 232, 0.13);
  font-variant-numeric: tabular-nums;""",
            """  letter-spacing: -0.02em;
  color: rgba(217, 223, 232, 0.16);
  font-variant-numeric: tabular-nums;""",
        ),
        # Form card: token radius, crisp 1px edge instead of a soft 2px bar.
        (
            """  padding: 28px 27px 25px;
  border: 1px solid rgba(208, 216, 228, 0.22);
  border-radius: 24px;
  background:
    radial-gradient(70% 38% at 50% -14%, rgba(217, 223, 232, 0.13), transparent 72%),""",
            """  padding: 28px 27px 25px;
  border: 1px solid rgba(208, 216, 228, 0.22);
  border-radius: var(--r-xl);
  background:
    radial-gradient(70% 38% at 50% -14%, rgba(217, 223, 232, 0.13), transparent 72%),""",
        ),
        (
            """.formCard::before {
  content: "";
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(242, 245, 250, 0.7), rgba(217, 223, 232, 0.4), transparent);
  opacity: 0.9;
  filter: blur(0.4px);
}""",
            """.formCard::before {
  /* A single crisp hairline reads as machined; a thick blurred bar does not. */
  content: "";
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(242, 245, 250, 0.85), rgba(217, 223, 232, 0.35), transparent);
  opacity: 0.95;
}""",
        ),
        # Rules cards: token radius + sheen.
        (
            """  padding: 26px 25px 27px;
  border: 1px solid rgba(208, 216, 228, 0.14);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(15, 18, 25, 0.9), rgba(11, 13, 18, 0.86)),
    rgba(11, 13, 18, 0.86);""",
            """  padding: 26px 25px 27px;
  border: 1px solid rgba(208, 216, 228, 0.14);
  border-radius: var(--r-xl);
  background:
    var(--grad-sheen),
    linear-gradient(180deg, rgba(15, 18, 25, 0.9), rgba(11, 13, 18, 0.86)),
    rgba(11, 13, 18, 0.86);""",
        ),
        # Reduced motion must also stop the foil sheen.
        (
            """  .ctaPrimary::after {
    display: none;
  }""",
            """  .ctaPrimary::after {
    display: none;
  }

  .heroAccent {
    animation: none;
  }""",
        ),
    ],
    "src/components/nav/Navbar.module.css": [
        (
            "   Navbar — floating ocean glass, compact and touch-friendly.",
            "   Navbar — floating obsidian glass, compact and touch-friendly.",
        ),
    ],
}

fail = 0
for rel, pairs in EDITS.items():
    p = ROOT / rel
    src = p.read_text(encoding="utf-8")
    for old, new in pairs:
        n = src.count(old)
        if n != 1:
            print(f"FAIL  {rel}: matched {n}x -> {old[:70]!r}")
            fail += 1
            continue
        src = src.replace(old, new)
    p.write_text(src, encoding="utf-8")
    print(f"ok    {rel} ({len(pairs)} edits)")

sys.exit(1 if fail else 0)
