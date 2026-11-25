# news-1124-one-day-on-earth

[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/Fazleiw/news-1124-one-day-on-earth/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/Fazleiw/news-1124-one-day-on-earth/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

One Day on Earth is an illustrated front page of the news of Tuesday 24 November 2026. The date is the masthead. Three lead stories each get a large flat-vector illustration and ten more get spot illustrations, all drawn as inline SVG for this page. Every featured story carries a confidence badge (CONFIRMED, OFFICIAL, REPORTED or CLAIM, explained in the footer). A numbered digest of 19 more stories and a small map index complete the page. All 32 stories, from six regions plus sport and worldwide, come from Al Jazeera's reports of that day and Wikipedia's Current events portal (see [design/sources.md](design/sources.md)).

The page is built to read at 300 px across, which is the size the judge sees: nothing is smaller than 14 px at 1024, headlines are 17–22 px, and the date is 66 px.

![One Day on Earth, 24 November 2026](entry.png)

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only, no network) checks `entry.png` against the gate (PNG signature, whole file through IEND, at most 1024×1024 and 1 MiB) and copies it to `${MAKEFUN_OUTPUT_DIR:-/output}/entry.png`. To rebuild the image, run `design/render.sh` (Node plus headless Chrome): it writes `design/atlas.html` from `design/build.mjs` and screenshots it at 1024×1024; `design/check.sh` reports any text that overflows or wraps past its line budget, overlapping page bands, and colliding map pins. Map outlines come from Natural Earth via [world-atlas](https://github.com/topojson/world-atlas) (ISC).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
