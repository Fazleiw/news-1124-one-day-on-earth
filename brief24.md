# Port the proven 25 Nov front page onto the 24 Nov news

You are working in `~/workspace/news-1124-one-day-on-earth/`. Node 22, standard library only, no network, no CSS frameworks, system fonts only.

## What exists

- `design/base-25.mjs` (417 lines) — the renderer that scored **0.987523, rank 15 of 7793** on the 25 Nov competition. Treat it as the reference design: type scale, band geometry, CSS, Miller-projection map, pin/legend logic, and the `CHECK=1` layout checker are all proven. **Reuse them verbatim.**
- `design/sources.md` — the only permitted factual input. 32 numbered rows for Tuesday 24 November 2026. Every headline, figure and place you emit must trace to one of those rows. Never invent a number, name, place or quote.
- `design/data/countries-110m.json` — map data, already present.
- `design/render.sh`, `design/check.sh` — headless Chrome render + checker driver, already present.
- `design/build.mjs` — the OLD 24 Nov renderer (423 lines, scored 0.7163). **Replace it.** It is the thing we are fixing.

## Your job

Copy `design/base-25.mjs` to `design/build.mjs` and change **only** the content layer. Keep every constant, helper, CSS rule, band value and checker line intact unless a change below requires otherwise.

### 1. Header and date

The page is **Tuesday 24 November 2026**, not Wednesday 25 November. Update: the file header comment, the masthead date string, every "on Wednesday" / "Also on Wednesday" string, and the closing line that restates the date. The date must remain the largest element on the page (96 px serif) because the judge is never told the date.

### 2. Story arrays — exact content, do not paraphrase

`src` is the row number in `design/sources.md`. `fig` is the one figure the card leads with. Use these verbatim strings.

```js
const LEAD = [
  { src: 1, art: 'hormuz', loc: [56.4, 26.6], region: 'Middle East', place: 'Strait of Hormuz',
    fig: '−40%', hd: 'Oil traffic through Hormuz falls 40% as tanker attacks mount' },
  { src: 2, art: 'zaporizh', loc: [35.14, 47.84], region: 'Europe', place: 'Zaporizhzhia, Ukraine',
    fig: '2 killed', hd: 'Russian strike kills two and injures 44 in Zaporizhzhia' },
  { src: 3, art: 'nvidia', loc: [-74.0, 40.71], region: 'Americas', place: 'New York',
    fig: '$952bn', hd: 'Nvidia regains $952bn as Huang returns and Megaspeed is blacklisted' },
  { src: 5, art: 'riyadh', loc: [46.68, 24.71], region: 'Middle East', place: 'Riyadh, Saudi Arabia',
    fig: '11 injured', hd: 'Houthi drone hits a tower in Riyadh’s financial district' },
];
const CARDS = [
  { src: 4, art: 'gaza', loc: [34.45, 31.5], region: 'Middle East', place: 'Gaza',
    fig: '50', hd: 'Israeli strike kills a senior Hamas official in Gaza' },
  { src: 6, art: 'huawei', loc: [-74.0, 40.71], region: 'Americas', place: 'New York',
    fig: 'Guilty', hd: 'US jury convicts Huawei of trade-secrets conspiracy and fraud' },
  { src: 7, art: 'heat', loc: [-0.13, 51.5], region: 'Europe', place: 'United Kingdom',
    fig: '5,258', hd: 'Record 5,258 heat deaths in the UK this summer' },
  { src: 8, art: 'hasina', loc: [90.4, 23.8], region: 'Asia', place: 'Dhaka, Bangladesh',
    fig: '16 Dec', hd: 'Hasina plans a return from exile; Dhaka demands extradition' },
  { src: 9, art: 'market', loc: [-75.5, 10.4], region: 'Americas', place: 'Cartagena, Colombia',
    fig: '25 held', hd: 'Armed men hold 25 hostages in a Cartagena supermarket' },
  { src: 10, art: 'trophy', loc: [-17.45, 14.7], region: 'Africa', place: 'Dakar, Senegal',
    fig: 'AFCON', hd: 'Court reinstates Senegal as 2025 Africa Cup winners' },
  { src: 11, art: 'oil', loc: [44.4, 33.3], region: 'Middle East', place: 'Baghdad, Iraq',
    fig: 'Takeover', hd: 'Iraq orders takeover of Kurdish-held oilfields and crossings' },
  { src: 13, art: 'fine', loc: [149.13, -35.28], region: 'Oceania', place: 'Canberra, Australia',
    fig: '5% of revenue', hd: 'Australia warns tech giants of fines up to 5% of global revenue' },
];
```

Digest rows, 20 of them, in this order (region blocks keep the legend chips running in order down the columns):

```js
  // Asia
  { src: 12, loc: [101.7, 3.14],  region: 'Asia',        hd: 'Malaysia to send Rohingya refugees back to Myanmar' },
  { src: 25, loc: [105.85, 21.03], region: 'Asia',       hd: 'Hanoi restaurant blast kills at least six' },
  { src: 26, loc: [126.98, 37.57], region: 'Asia',       hd: 'Air-raid alert as Russian jets near South Korea' },
  { src: 27, loc: [113.26, 23.13], region: 'Asia',       hd: 'China Southern unit to buy 50 Boeing 737-8s' },
  // Americas
  { src: 18, loc: [-77.04, 38.9],  region: 'Americas',   hd: 'Trump urges faster federal executions' },
  { src: 19, loc: [-99.13, 19.43], region: 'Americas',   hd: 'Mexico to try El Chapo Isidro despite US request' },
  { src: 20, loc: [-82.36, 23.1],  region: 'Americas',   hd: 'WHO chief visits Cuba as health care deteriorates' },
  { src: 21, loc: [-72.34, 18.54], region: 'Americas',   hd: 'Bukele details deaths of Salvadoran troops in Haiti' },
  // Europe
  { src: 15, loc: [37.6, 55.75],   region: 'Europe',     hd: 'Putin: retaliation for oil-plant strikes inevitable' },
  { src: 17, loc: [10.75, 59.91],  region: 'Europe',     hd: 'Cameroon separatist pleads not guilty to war crimes' },
  // Middle East
  { src: 14, loc: [34.45, 31.5],   region: 'Middle East', hd: 'Gaza: strikes kill 7 as meningitis cases hit 272' },
  { src: 16, loc: [30.52, 39.78],  region: 'Middle East', hd: 'Military helicopter crash in Türkiye kills five' },
  // Africa
  { src: 22, loc: [29.4, 1.6],     region: 'Africa',     hd: 'CRP rebels halt their advance on Bunia' },
  { src: 23, loc: [13.15, 11.85],  region: 'Africa',     hd: 'Borno school enrolment nearly doubles' },
  { src: 24, loc: [28.05, -26.2],  region: 'Africa',     hd: 'S Africa convicts a Zimbabwean who tried to fight for Russia' },
  // World (no single place: no `loc`, no pin, ink chip)
  { src: 28, region: 'World', hd: 'Arsenal 1-1 Dortmund; Real Madrid 5-1 PSV' },
  { src: 29, region: 'World', hd: 'Sooryavanshi, 15, hits 204 off 53 balls against UAE' },
  { src: 30, region: 'World', hd: 'WFP: wars put food aid for 7.3 million at risk' },
  { src: 31, region: 'World', hd: 'UN: five women killed every hour by a partner or relative' },
  { src: 32, region: 'World', hd: 'Guterres: agree on AI oversight within a year' },
```

Totals: 4 lead + 8 cards + 20 digest = **32**. Change the integrity assertion from 36 to 32 accordingly. Digest rows with no `loc` **must not be pinned**: guard the `for (const s of DIGEST)` dot loop with `if (!s.loc) continue`.

### 3. Artwork

Four lead scenes at viewBox **236×112**, eight spot scenes at **88×78**, same flat-vector style, same palette constants, same stroke weights as `base-25.mjs`. Keep `riyadh`, `huawei` and `market` from the base file as-is (they match src 5, 6 and 9). Write the rest:

Leads
- `hormuz` — a tanker hull low in the water on a sea band, red flame and dense smoke rising amidships, a second hull in the distance, a life ring or slick rings on the water. No mine is drawn: the mines are Iran's account, not established fact.
- `zaporizh` — a five-storey apartment block with a punched-out floor, dark smoke and dust, a rubble pile, one broken window grid column.
- `nvidia` — keep the base `chips` composition (market panel with a hard red line down, plus a microchip) and rename it `nvidia`.

Spots
- `gaza` — a low skyline with a collapsed building, a smoke plume, debris.
- `heat` — a sun disc and a thermometer filled red, a heat shimmer line.
- `hasina` — a jet climbing, a small calendar/date marker, motion dashes.
- `trophy` — a silver cup with a base and two handles, a small starburst.
- `oil` — an oil derrick on a horizon line with two tanks and a pipe.
- `fine` — a browser/screen panel with a large percent sign and a fine/penalty bar.

Every scene must read at 88×78 and at 236×112 without text. No scene may show anything the sources do not support.

### 4. Map, legend, tally

Regions in use: Middle East 6 (src 1, 4, 5, 11, 14, 16), Europe 4 (2, 7, 15, 17), Americas 7 (3, 6, 9, 18, 19, 20, 21), Asia 5 (8, 12, 25, 26, 27), Africa 4 (10, 22, 23, 24), Oceania 1 (13), World 5 (28–32). Tally must sum to 32 and the legend must include a World chip. Update the `PIN_OFF` table so no two pins collide — but do not move a pin more than ~12 px, and always draw the tick back to the true position.

The digest pin dots now include World rows with no `loc`; skip them.

### 5. Gates you must pass before you stop

Run all three and iterate until clean:

```
CHECK=1 node design/build.mjs && bash design/render.sh && bash design/check.sh
```

- Zero `CLIP`, zero `OFF BAND`, zero `OVERLAP`, zero `OFF PAGE`.
- Every band's printed slack must be `>= 0`.
- No text smaller than 15 px.
- `bash design/check.sh` prints a clean report (band slack 0 or positive, min font 15, pins inside the map).
- Build twice and confirm byte-identical output (`cmp design/atlas.html` on two runs) — the entry must be deterministic.
- Update `~/workspace/news-1124-one-day-on-earth/main.ts` header comment to say Tuesday 24 November 2026 and to describe the PNG check it performs. Run `MAKEFUN_OUTPUT_DIR=out node main.ts` and confirm `out/entry.png` is a 1024×1024 PNG under 1 MiB.
- Update `README.md` and `STATUS.md` to the current state (repo `Fazleiw/news-1124-one-day-on-earth`, handle `griffin`, Tuesday 24 November 2026, 32 stories).

Report at the end: band slack values, final PNG byte size, the number of stories, and anything you had to change in the base layout and why.
