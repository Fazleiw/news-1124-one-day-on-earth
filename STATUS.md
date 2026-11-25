# Status: 25 Nov front page ported to the 24 Nov news

Repo `Fazleiw/news-1124-one-day-on-earth`, handle `griffin`. The page is Tuesday 24 November 2026, with 32 stories.

## What changed

- `design/build.mjs` is now a copy of `design/base-25.mjs`, the renderer that scored 0.9875 on 25 Nov, with only the content layer changed. Type scale, band geometry, CSS, the Miller map, pin and legend logic, and the `CHECK=1` checker are the base's.
- The page, top to bottom:
  - masthead `TUESDAY 24 NOVEMBER 2026` (96 px, the largest element)
  - a three-teaser deck (1 Hormuz, 6 Huawei, 10 Senegal)
  - 4 leads with scenes: Hormuz tanker burning, Zaporizhzhia block with a floor punched out, Nvidia (the base's market board and chip), Riyadh tower
  - 8 cards with spot scenes: Gaza, Huawei, UK heat, Hasina, Cartagena, AFCON, Iraq oil, Australia fines
  - a locator map: 12 numbered pins and 15 dots, five World rows unpinned
  - a 20-line digest, "Also on Tuesday 24 November 2026"
  - a closing line restating the date
- Integrity assertion: 32 rows, each `sources.md` row exactly once. Digest rows with no `loc` are not pinned.
- Changes to base layout and code:
  - Digest grid rows are `ceil(DIGEST.length / 2)`, so 10 for 20 rows; the base hard-coded 12 for 24.
  - Map note: "Squares 1–12, dots 13–27; 28–32 unpinned". A new assertion checks that unpinned rows close the digest.
  - `PIN_OFF` table redone for the new cluster (largest move 11 px, every moved pin drawn with a tick to its true place).
  - Footer sources line now reads Al Jazeera and Wikipedia.
  - Unused base scenes were removed. All helpers are kept.
- `main.ts` header comment describes the page and the PNG check. README is updated.

## Numbers measured

- `design/check.sh`: band slack `head 0 | deck 0 | leads 0 | seconds 0 | low 0 | foot 0`; inner room lead 3, card text 3, map col 0, digest col 0. No CLIP, OFF BAND, OVERLAP, OFF PAGE or pin collisions. Font sizes 15, 16, 17, 18, 19, 21, 25, 34, 96; min 15 px.
- Tally: Asia 5, Americas 7, Europe 4, Middle East 6, Africa 4, Oceania 1, World 5 = 32.
- `entry.png`: 1024×1024 RGB PNG, 336,185 bytes. `MAKEFUN_OUTPUT_DIR=out node main.ts` passes and writes the same bytes.
- Determinism: two builds give a byte-identical `design/atlas.html`; two renders give a byte-identical `entry.png`.

## Text shortened to fit (departures from the brief's verbatim strings)

The base digest column is about 285 px of 16 px text, one line per row. 17 of the brief's 20 digest lines were wider (up to 152 px over), so they were shortened. Each still traces to its row. The lead place, one card figure and the Nvidia headline were also shortened:

| src | brief | on the page |
|---|---|---|
| 12 | Malaysia to send Rohingya refugees back to Myanmar | Malaysia to send Rohingya back |
| 26 | Air-raid alert as Russian jets near South Korea | S Korea air-raid alert over Russian jets |
| 27 | China Southern unit to buy 50 Boeing 737-8s | China Southern unit to buy 50 737-8s |
| 19 | Mexico to try El Chapo Isidro despite US request | Mexico, not US, to try El Chapo Isidro |
| 20 | WHO chief visits Cuba as health care deteriorates | WHO chief visits Cuba as care falters |
| 21 | Bukele details deaths of Salvadoran troops in Haiti | Bukele details troop deaths in Haiti |
| 15 | Putin: retaliation for oil-plant strikes inevitable | Putin vows retaliation for oil-plant hits |
| 17 | Cameroon separatist pleads not guilty to war crimes | Cameroon rebel denies war crimes |
| 14 | Gaza: strikes kill 7 as meningitis cases hit 272 | Gaza: 7 killed; 272 meningitis cases |
| 16 | Military helicopter crash in Türkiye kills five | Türkiye military helicopter crash kills 5 |
| 23 | Borno school enrolment nearly doubles | Borno school rolls nearly double |
| 24 | S Africa convicts a Zimbabwean who tried to fight for Russia | S Africa convicts Russia army hopeful |
| 28 | Arsenal 1-1 Dortmund; Real Madrid 5-1 PSV | Arsenal 1-1 Dortmund; Real 5-1 PSV |
| 29 | Sooryavanshi, 15, hits 204 off 53 balls against UAE | Sooryavanshi, 15, hits 204 off 53 balls |
| 30 | WFP: wars put food aid for 7.3 million at risk | WFP: wars imperil food aid for 7.3m |
| 31 | UN: five women killed every hour by a partner or relative | UN: partners, kin kill 5 women an hour |
| 32 | Guterres: agree on AI oversight within a year | Guterres: AI oversight deal in a year |
| 3 (headline) | Nvidia regains $952bn as Huang returns and Megaspeed is blacklisted | Nvidia regains $952bn as Huang returns; Megaspeed blacklisted |
| 2 (place) | Zaporizhzhia, Ukraine | Zaporizhzhia |
| 13 (figure) | 5% of revenue | Up to 5% |

## Open points

- Card 5 (Gaza) leads with the figure "50", Abu Nahl's age, as the brief specifies. Above "Israeli strike kills a senior Hamas official" it may read as a death toll.
- Page numbers (1–32 in reading order) are not `sources.md` row numbers. The Map section of `sources.md` (pins 1–13, tally "Europe 5, Middle East 5…") describes the old page; it was not edited because it is the factual input.
- The Mexico City dot sits on the map's left edge (lon −99.1 against a crop at −100), so it is half clipped. This is inherited from the base crop.
- Rendering depends on the local Chrome build and macOS system fonts; byte identity holds on this machine.
- Not committed or pushed.
