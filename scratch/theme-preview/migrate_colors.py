#!/usr/bin/env python3
"""
Ocean -> Obsidian Platinum colour migration for OSIS Ngobrol Yuk.

Every distinct colour literal found in src/**/*.css (64 rgb triples + 50 hex
values, enumerated by grep) is mapped explicitly below, so the change is
auditable instead of a blind sed. Alpha channels are preserved. Anything not
listed falls through to a generic cool-hue -> steel remap and gets reported,
so nothing can silently keep an ocean tint.

globals.css is excluded: it is rewritten by hand as the new design system.
"""
import colorsys
import pathlib
import re
import sys

ROOT = pathlib.Path("/home/user/osama")

# rgb triple -> rgb triple (accent / platinum scale)
ACCENT = {
    (85, 215, 242): (217, 223, 232),   # --accent
    (47, 185, 224): (168, 178, 193),   # --accent-strong
    (140, 240, 255): (242, 245, 250),  # highlight
    (140, 236, 255): (240, 244, 250),
    (154, 223, 242): (226, 232, 240),
    (150, 210, 235): (208, 216, 228),  # hairline blue
    (100, 200, 240): (186, 197, 214),
    (200, 230, 245): (232, 238, 246),
    (210, 235, 250): (238, 242, 249),
    (0, 212, 255): (220, 228, 240),
    (20, 130, 170): (96, 109, 131),
    (14, 111, 151): (74, 83, 100),
    (0, 100, 200): (120, 136, 168),
    (0, 50, 120): (70, 80, 104),
    (0, 40, 100): (56, 64, 86),
    (0, 80, 180): (104, 120, 152),
    (59, 158, 255): (138, 166, 214),
    (10, 28, 60): (12, 14, 20),
    (14, 35, 75): (15, 18, 26),
}

# navy surfaces -> obsidian surfaces (lightness order preserved)
SURFACE = {
    (1, 6, 10): (2, 3, 5),
    (2, 10, 16): (4, 5, 8),
    (2, 10, 18): (4, 5, 8),
    (2, 12, 19): (5, 6, 9),
    (2, 12, 20): (5, 6, 9),
    (2, 14, 22): (5, 6, 10),
    (3, 14, 22): (5, 6, 10),
    (3, 14, 24): (5, 6, 10),
    (3, 15, 24): (6, 7, 10),
    (3, 34, 47): (9, 10, 14),
    (4, 13, 26): (6, 7, 10),
    (4, 16, 25): (7, 8, 11),
    (4, 18, 28): (7, 8, 12),
    (4, 19, 30): (8, 9, 13),
    (4, 20, 32): (8, 10, 14),
    (4, 22, 32): (9, 11, 15),
    (5, 16, 25): (7, 9, 12),
    (5, 20, 31): (8, 10, 14),
    (5, 22, 34): (9, 11, 16),
    (5, 24, 37): (10, 12, 17),
    (7, 24, 36): (10, 12, 17),
    (7, 27, 40): (11, 13, 18),
    (7, 28, 41): (11, 13, 19),
    (7, 28, 42): (11, 13, 19),
    (7, 29, 45): (12, 14, 20),
    (8, 28, 42): (12, 14, 20),
    (8, 36, 50): (13, 16, 22),
    (9, 28, 42): (12, 15, 20),
    (9, 30, 45): (13, 16, 22),
    (10, 32, 47): (14, 16, 22),
    (11, 39, 56): (15, 18, 25),
    (12, 42, 61): (17, 20, 27),
    (14, 40, 57): (16, 19, 25),
    (21, 51, 71): (24, 28, 36),
}

# semantic status colours keep their hue, lose the neon edge
STATUS = {
    (255, 130, 150): (255, 152, 168),
    (255, 217, 224): (255, 228, 233),
    (58, 18, 32): (42, 18, 26),
    (244, 196, 111): (232, 192, 122),
    (245, 158, 11): (224, 163, 60),
    (255, 210, 138): (240, 212, 154),
    (105, 223, 163): (116, 216, 168),
    (16, 185, 129): (47, 169, 126),
}

RGB_MAP = {**ACCENT, **SURFACE, **STATUS}

HEX_MAP = {
    # accent / platinum
    "55d7f2": "d9dfe8", "2fb9e0": "a8b2c1", "8cf0ff": "f2f5fa",
    "74e1f7": "e4e9f1", "72e0f6": "e4e9f1", "4fc9ee": "c7d0dc",
    "1c9fd0": "7e8899", "167aa3": "5d6779", "0e6f97": "4a5364",
    "03222f": "0a0c11", "00d4ff": "dce4f0", "00b8d9": "b9c3d2",
    "3b9eff": "8aa6d6",
    # surfaces
    "030d14": "040507", "041420": "07080c", "061724": "080a0e",
    "0a2232": "0b0d12", "0c2a3d": "0e1116", "0c2435": "0c0e13",
    "0d2738": "0d1015", "0e2a3d": "0e1116", "0e2b3e": "0f1218",
    "0a2030": "0a0c11", "040d1a": "040507", "071428": "07080c",
    "0a1e3d": "0a0c11", "0d2a52": "0d1017", "0e3a72": "111722",
    "1155a3": "1a2231", "08202f": "070910",
    # ink
    "e2f0ff": "f4f6fa", "eef9ff": "f4f6fa", "b6d3e4": "b7beca",
    "7fa3b8": "7e8695", "4f7086": "5a616e", "7ba8cc": "8a93a2",
    "4a6785": "5d6470",
    # status
    "69dfa3": "74d8a8", "10b981": "2fa97e", "f4c46f": "e8c07a",
    "f59e0b": "e0a33c", "ff8296": "ff98a8", "ffd9de": "ffe4e8",
    "ffd9dc": "ffe4e8", "ffd28a": "f0d49a", "ffe7c2": "f6e7c8",
    "3a1220": "2a1219", "0c2f22": "0e2a20",
}

RGB_RE = re.compile(r"rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,[^)]*)?\)")
HEX_RE = re.compile(r"#([0-9a-fA-F]{6})\b")

stats = {"rgb": 0, "hex": 0, "fallback": 0}
fallback_hits = set()


def remap_generic(r, g, b):
    """Cool-hued leftovers -> steel blue at ~12% saturation."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if not (0.44 <= h <= 0.75) or s < 0.12:
        return (r, g, b), False
    nr, ng, nb = colorsys.hls_to_rgb(0.606, l, min(s * 0.12, 0.12))
    return (round(nr * 255), round(ng * 255), round(nb * 255)), True


def sub_rgb(m):
    key = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    tail = m.group(4) or ""
    if key in RGB_MAP:
        stats["rgb"] += 1
        n = RGB_MAP[key]
    else:
        n, changed = remap_generic(*key)
        if not changed:
            return m.group(0)
        stats["fallback"] += 1
        fallback_hits.add(key)
    return f"rgba({n[0]}, {n[1]}, {n[2]}{tail})" if tail.startswith(",") else f"rgb({n[0]}, {n[1]}, {n[2]})"


def sub_hex(m):
    v = m.group(1).lower()
    if v in HEX_MAP:
        stats["hex"] += 1
        return "#" + HEX_MAP[v]
    r, g, b = int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
    n, changed = remap_generic(r, g, b)
    if not changed:
        return m.group(0)
    stats["fallback"] += 1
    fallback_hits.add((r, g, b))
    return "#{:02x}{:02x}{:02x}".format(*n)


apply = "--apply" in sys.argv
files = sorted(p for p in ROOT.glob("src/**/*.css") if p.name != "globals.css")

for path in files:
    src = path.read_text(encoding="utf-8")
    out = HEX_RE.sub(sub_hex, RGB_RE.sub(sub_rgb, src))
    if out != src:
        rel = path.relative_to(ROOT)
        if apply:
            path.write_text(out, encoding="utf-8")
        print(f"{'WROTE ' if apply else 'WOULD '} {rel}")

print(f"\nrgb literals remapped : {stats['rgb']}")
print(f"hex literals remapped : {stats['hex']}")
print(f"generic fallbacks     : {stats['fallback']} {sorted(fallback_hits) if fallback_hits else ''}")
print("mode:", "APPLIED" if apply else "DRY RUN")
