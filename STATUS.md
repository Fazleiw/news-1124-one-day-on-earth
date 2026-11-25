# Status — v2 illustrated front page (25 Nov 2026)

## What changed

- `design/build.mjs` rewritten. The topojson decode and Miller projection are kept; the layout and all illustrations are new, as inline SVG in the same file.
- The page, top to bottom:
  - the masthead date `Tuesday 24 November 2026` (66 px, the largest element)
  - a one-line deck of four threads
  - a region tally, computed from the story data
  - 3 lead stories with large flat-vector scenes (Hormuz tanker ablaze, Zaporizhzhia block hit, Nvidia chip + blacklisted crate)
  - 10 cards with spot scenes
  - a 19-item numbered digest and a small map index (red numbered pins for 1–13, dots for 14–27)
  - a footer with the confidence key, the date check and the sources
- Every featured story carries a badge: CONFIRMED ×3, OFFICIAL ×6, REPORTED ×3, CLAIM ×1.
- Facts checked against `research/aj24.json`. That file holds titles and standfirsts only, not bodies, so details are limited to what those carry.
  - Fixed: El Chapo Isidro (Mexico will try him; the atlas said "faces US drug charges").
  - Dropped: the Ras Al Khaimah bus crash (no AJ report).
  - Restored: Borno school enrolment.
- `design/sources.md` renumbered to match the image, with a badge for each featured story. README and the `main.ts` header comment were updated to describe the new page.
- Removed the untracked `design/illustrations.mjs` left by an earlier, interrupted run. Its ideas were redrawn inside `build.mjs`.

## Numbers measured

- Gate: `GATE PASS median_stroke_300=5px pct_ge5px=53.8% min_css=14.0px(4.10@300) contrast_fails=none`
  - The median is an integer, and it sits on the floor. It would drop to 4 only if `pct_ge5px` fell below 50%, so the margin is 3.8 points (about 120 of 3,219 runs).
- `design/check.sh`: no overflow, no wraps past budget, no band overlap, no pin collisions. Font sizes used: 14, 15, 16, 17, 19, 22, 26, 30, 66.
- `entry.png`: 1024×1024 RGB PNG, 349,259 bytes.
- Determinism: two `render.sh` runs gave byte-identical PNGs (`cmp`). Two `main.ts` runs into separate output dirs also matched each other and `entry.png`.

## Story count

32 stories: 3 leads + 10 illustrated cards + 19 in the digest. By region: Europe 5, Middle East 5, Americas 7, Asia 5, Africa 4, Oceania 1, sport 2, worldwide 3.

## Not done / caveats

- `pct_ge5px` margin is modest (53.8% vs 50%). I did not push it higher: the only ways left were thicker type everywhere or dropping the decks, and the brief rules both out.
- Spot art is about 187×60 px at 1024 (about 55×18 at 300). It reads at 300 px as icon-level silhouettes (sun + thermometer, plane + calendar, pumpjack, trophy), not as detailed scenes.
- Rendering depends on the local Chrome build and the macOS fonts Charter and Avenir Next Condensed. Byte-identity holds on this machine; another machine may produce different pixels.
- Not pushed; no remote action taken.
