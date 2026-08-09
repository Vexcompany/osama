# Kak Taksaka mascot assets

V3.2 ships a stylised Paskibra SVG (`mascot.svg`) as a placeholder.

## Replacing with the official raster artwork

When the final raster artwork is ready (the user-supplied
`photo_6325492207531528807_w.jpg` style illustration), drop the
file here as `mascot.png` (or `.webp`) and update the consumer:

- `src/components/kak-taksaka/KakTaksakaAvatar.tsx` currently
  renders an inline SVG. To use the raster, swap the `<svg>`
  for `<img src="/kak-taksaka/mascot.png" alt="Kak Taksaka" />`.

The public API (`<KakTaksakaAvatar size={n} expression={...} />`)
is unchanged; only the inner markup changes.

## Recommended raster specs

- Square (1:1), transparent PNG or WebP.
- Minimum 512×512, recommended 1024×1024 for retina.
- File size: < 300 KB.
- The official artwork should be a Paskibra character in dress
  uniform with the PAGASKA flag.

## File inventory

- `mascot.svg` — stylised Paskibra placeholder (current).
- (future) `mascot.png` / `mascot.webp` — official raster when supplied.
