#!/usr/bin/env python3
"""Dashboard + Kak Taksaka + shell polish for the Obsidian Platinum theme.

Includes the contrast repairs a plain recolour would silently break:
platinum gradients are light, so white text/icons on top of them must
become obsidian ink. Every edit asserts an exact single match.
"""
import pathlib
import sys

ROOT = pathlib.Path("/home/user/osama")

# (relative path, [(old, new), ...]) — plus simple global renames per file
EDITS = {
    "src/styles/dashboard.css": [
        (
            "   OSAMA Dashboard — Underwater Dark Theme",
            "   OSAMA Dashboard — Obsidian Platinum Theme",
        ),
        ("  /* Deep ocean palette */", "  /* Obsidian scale */"),
        ("  /* Bioluminescent accents */", "  /* Platinum accents */"),
        (
            "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');",
            "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@600;700;800&display=swap');",
        ),
        (
            "  --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;",
            "  --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;\n"
            "  --font-display: 'Sora', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;",
        ),
        # Contrast repair: these three sit on the light platinum gradient.
        ("  color: #fff;", "  color: var(--obsidian-900);"),
        # Display face + tighter tracking on the dashboard's own headings.
        (
            """.dash-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}""",
            """.dash-header__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}""",
        ),
        (
            """.aspiration-card__title {
  font-size: 14px;
  font-weight: 600;""",
            """.aspiration-card__title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.012em;""",
        ),
        (
            """.thread-subject__title {
  font-size: 16px;
  font-weight: 700;""",
            """.thread-subject__title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;""",
        ),
        (
            """.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 14px;
}""",
            """.timeline-title {
  /* Micro-label: small, wide-tracked, uppercase — the cheapest way to
     make a panel read considered rather than default. */
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}""",
        ),
    ],
    "src/components/kak-taksaka/KakTaksakaIntro.module.css": [
        ("   Kak Taksaka Intro — V4.0 Underwater Identity",
         "   Kak Taksaka Intro — V4.1 Obsidian Platinum Identity"),
        ("  /* Deep ocean — not generic glass */", "  /* Obsidian — not generic glass */"),
        ("/* Caustic light — top edge */", "/* Specular light — top edge */"),
        ("/* Subtle ocean floor bottom */", "/* Subtle ground falloff bottom */"),
        ("  /* Bioluminescent glow around avatar */", "  /* Platinum glow around avatar */"),
    ],
    "src/components/kak-taksaka/KakTaksakaTour.module.css": [
        ("   Kak Taksaka Tour — V4.0 Underwater Identity",
         "   Kak Taksaka Tour — V4.1 Obsidian Platinum Identity"),
        ("/* ─── Dim overlay — deep ocean atmosphere ───────────────────────────── */",
         "/* ─── Dim overlay — obsidian atmosphere ─────────────────────────────── */"),
        ("  /* Bioluminescent outline */", "  /* Platinum outline */"),
        ("  /* Deep ocean panel — NOT generic glassmorphism */",
         "  /* Obsidian panel — NOT generic glassmorphism */"),
        ("/* Caustic light accent — top left corner */",
         "/* Specular light accent — top left corner */"),
    ],
    # Comment-only: keeps the file header truthful after the restyle.
    "src/components/kak-taksaka/KakTaksakaTour.tsx": [
        (" * V4.0 — SMART SCROLL + UNDERWATER POLISH",
         " * V4.0 — SMART SCROLL + OBSIDIAN POLISH"),
    ],
    "src/app/osama/dashboard/[caseId]/CaseActions.tsx": [
        ("style.color = 'var(--glow-cyan)';", "style.color = 'var(--glow-platinum)';"),
    ],
    # The droplet emoji is the last water signifier in the dashboard chrome.
    "src/app/osama/dashboard/page.tsx": [
        ('<div className="dash-header__logo" aria-hidden="true">💧</div>',
         '<div className="dash-header__logo" aria-hidden="true">✦</div>'),
    ],
    "src/app/layout.tsx": [
        ('  themeColor: "#04121c",', '  themeColor: "#040507",'),
    ],
    "src/app/page.tsx": [
        (" *   - Hero section (full-viewport, deep-ocean composition)",
         " *   - Hero section (full-viewport, obsidian composition)"),
    ],
}

# whole-file token renames (names only — values already migrated)
RENAMES = {
    "src/styles/dashboard.css": [
        ("--ocean-", "--obsidian-"),
        ("--glow-cyan", "--glow-platinum"),
        ("--glow-teal", "--glow-steel"),
        ("--glow-blue", "--glow-ice"),
    ],
}

fail = 0
for rel, pairs in EDITS.items():
    p = ROOT / rel
    src = p.read_text(encoding="utf-8")
    for old, new in pairs:
        n = src.count(old)
        if old == "  color: #fff;":
            # exactly three, all on platinum gradients
            if n != 3:
                print(f"FAIL  {rel}: expected 3x 'color: #fff', found {n}")
                fail += 1
                continue
            src = src.replace(old, new)
            print(f"      {rel}: repaired {n} contrast cases")
            continue
        if n != 1:
            print(f"FAIL  {rel}: matched {n}x -> {old[:64]!r}")
            fail += 1
            continue
        src = src.replace(old, new)
    for old, new in RENAMES.get(rel, []):
        c = src.count(old)
        src = src.replace(old, new)
        print(f"      {rel}: renamed {old} -> {new} ({c}x)")
    p.write_text(src, encoding="utf-8")
    print(f"ok    {rel} ({len(pairs)} edits)")

sys.exit(1 if fail else 0)
