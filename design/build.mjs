// Builds design/atlas.html: a 1024x1024 illustrated front page of the world news of Tuesday 24 November 2026.
// Deterministic: no randomness, no clock, no network. Map data: Natural Earth via world-atlas (data/).
// CHECK=1 node design/build.mjs adds a layout checker to the page (overflow, overlap, pins); render.sh never sets it.
//
// Page, top to bottom: masthead (the date) / deck / region tally / 3 illustrated leads / 10 illustrated cards /
// map index + numbered digest / confidence key + sources. Every story traces to design/sources.md.
//
// Type scale, px at 1024 (nothing else is used): 66 date / 30 lead figure in art / 22 lead headline /
// 26 calendar day in art / 19 deck / 17 card headline, lead kickers / 16 digest / 15 kickers, decks, tally, key, footer / 14 confidence badges, pin numbers.
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('./', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('data/countries-110m.json', here)));

// ---- palette ----------------------------------------------------------------------------------
const PAPER = '#F4F0E6', INK = '#191C22', ACC = '#C0391F', TEAL = '#1F6B6E', OCHRE = '#C9952E';
const SMOKE = '#8E9094', WATER = '#A9C9C8', PANEL = '#E6E1D4', LIGHT = '#FBF8F1';

// ---- page bands (y, px at 1024) ---------------------------------------------------------------
const W = 1024, M = 20;
const HEAD_H = 80, DECK_Y = 90, TALLY_Y = 120, LEAD_Y = 152, LEAD_H = 228;
const CARD_Y = LEAD_Y + LEAD_H + 12, CARD_H = 162, CARD_GAP = 10;
const LOW_Y = CARD_Y + 2 * CARD_H + CARD_GAP + 12, FOOT_H = 48, FOOT_Y = W - FOOT_H;
const ART_H = 112, SPOT_H = 60;

// ---- projection (Miller, cropped) -------------------------------------------------------------
const MAP_W = 330, LON0 = -128, LON1 = 166, LAT_TOP = 72, LAT_BOT = -50, K = MAP_W / (LON1 - LON0);
const miller = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180)) * 180 / Math.PI;
const MAP_H = Math.round((miller(LAT_TOP) - miller(LAT_BOT)) * K);
const px = (lon, lat) => [(lon - LON0) * K, (miller(LAT_TOP) - miller(lat)) * K];

// ---- topojson decode --------------------------------------------------------------------------
const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
const arcs = topo.arcs.map((a) => {
  let x = 0, y = 0;
  return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
});
const ring = (idx) => {
  const pts = [];
  for (const i of idx) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    pts.push(...(pts.length ? a.slice(1) : a));
  }
  return pts;
};
const ringPath = (pts) => {
  let d = '';
  pts.forEach(([lo, la], i) => {
    const [x, y] = px(lo, Math.max(la, -80));
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  });
  return d + 'Z';
};
const geomPath = (g) => {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  return polys.map((p) => p.map((r) => ringPath(ring(r))).join('')).join('');
};
let land = '';
for (const g of topo.objects.countries.geometries) {
  if (g.properties.name !== 'Antarctica') land += geomPath(g);
}

// ---- illustration primitives ------------------------------------------------------------------
// Flat shapes only. Each scene is drawn from what the report says, so the picture cannot outrun the text.
const flame = (x, y, h, w, fill) =>
  `<path d="M${x} ${y}C${x - w} ${y - h * 0.35} ${x - w * 0.55} ${y - h * 0.7} ${x} ${y - h}` +
  `C${x + w * 0.4} ${y - h * 0.62} ${x + w * 0.95} ${y - h * 0.3} ${x} ${y}Z" fill="${fill}"/>`;
const fire = (x, y, s) => flame(x, y, 34 * s, 14 * s, ACC) + flame(x + 1, y, 18 * s, 7 * s, OCHRE);
const smoke = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SMOKE}"/>`).join('');
const burst = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
  }
  return `<path d="${d}Z" fill="${ACC}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.32).toFixed(1)}" fill="${OCHRE}"/>`;
};
const windows = (x0, y0, cols, rows, dx, dy, w, h, skip = () => false) => {
  let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!skip(c, r)) s += `<rect x="${x0 + c * dx}" y="${y0 + r * dy}" width="${w}" height="${h}" fill="${LIGHT}"/>`;
  }
  return s;
};
const chip = (x, y, s, die = OCHRE) => {
  let pins = '';
  for (let i = 0; i < 4; i++) {
    const o = (12 + i * 20) * s;
    pins += `M${x + o} ${y - 9 * s}v${9 * s}M${x + o} ${y + 84 * s}v${9 * s}M${x - 9 * s} ${y + o}h${9 * s}M${x + 84 * s} ${y + o}h${9 * s}`;
  }
  return `<path d="${pins}" stroke="${INK}" stroke-width="${5 * s}"/>` +
    `<rect x="${x}" y="${y}" width="${84 * s}" height="${84 * s}" rx="${7 * s}" fill="${INK}"/>` +
    `<rect x="${x + 22 * s}" y="${y + 22 * s}" width="${40 * s}" height="${40 * s}" fill="${die}"/>`;
};
const gavel = (x, y, s, a) =>
  `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">` +
  `<rect x="-5" y="0" width="10" height="62" rx="4" fill="${INK}"/>` +
  `<rect x="-26" y="-18" width="52" height="22" rx="5" fill="${INK}"/>` +
  `<rect x="-30" y="-20" width="8" height="26" rx="3" fill="${INK}"/><rect x="22" y="-20" width="8" height="26" rx="3" fill="${INK}"/></g>`;
const plane = (x, y, s, fill = INK) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">` +
  `<path d="M-40 -4H28C38 -4 44 0 44 0C44 0 38 4 28 4H-40Z"/><path d="M-4 -3L-22 -30H-12L12 -3ZM-4 3L-22 30H-12L12 3Z"/>` +
  `<path d="M-38 -3L-46 -16H-39L-28 -3Z"/></g>`;
const person = (x, y, s, fill = INK) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><circle cx="0" cy="-34" r="8"/>` +
  `<path d="M-10 -22H10L13 6H5L4 30H-4L-5 6H-13Z"/></g>`;
const art = (vw, vh, bg, body) =>
  `<svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet"><rect width="${vw}" height="${vh}" fill="${bg}"/>${body}</svg>`;

// ---- lead scenes (viewBox 320 x 112) ----------------------------------------------------------
const LEAD_ART = {
  // A tanker burning in the strait; the 40% fall is the reported figure. Mines are Iran's claim and are not drawn.
  hormuz: () => art(320, 112, '#DCE6E4', `
<path d="M0 0H86C70 12 54 16 30 18L0 20Z" fill="${OCHRE}"/><path d="M320 112H210C232 104 266 100 320 98Z" fill="${OCHRE}"/>
<rect y="74" width="320" height="38" fill="${WATER}"/><path d="M210 112C232 104 266 100 320 98V112Z" fill="${OCHRE}"/>
${smoke([[150, 26, 12], [168, 18, 14], [190, 14, 11], [134, 34, 9]])}
<path d="M30 70H252L236 94H46Z" fill="${INK}"/>
<rect x="44" y="40" width="34" height="30" fill="${INK}"/><rect x="50" y="30" width="12" height="12" fill="${INK}"/>
${windows(49, 46, 3, 1, 9, 0, 6, 6)}
<path d="M86 66H232" stroke="${INK}" stroke-width="4"/>
${fire(126, 68, 1.05)}${fire(154, 68, 1.45)}${fire(184, 68, 1)}
<path d="M234 10V40M224 30L234 42L244 30" fill="none" stroke="${ACC}" stroke-width="6" stroke-linejoin="round"/>
<text x="282" y="40" class="fig">−40%</text>`),

  // A five-storey block with a broken top corner, and a house in ruins beside it (as Ukrainian officials described).
  zaporizhzhia: () => art(320, 112, '#E4E0D6', `
<rect y="100" width="320" height="12" fill="${SMOKE}"/>
${smoke([[164, 30, 13], [182, 20, 15], [204, 14, 12], [224, 12, 9]])}
<path d="M34 100V22H136L150 34L140 44L156 56V100Z" fill="${INK}"/>
${windows(44, 30, 5, 5, 20, 14, 11, 8, (c, r) => c === 4 && r < 2)}
${fire(146, 46, 1.1)}
<path d="M196 100V74L226 54L256 74V100Z" fill="${INK}"/><path d="M188 76L226 48L240 58" fill="none" stroke="${PANEL}" stroke-width="5"/>
<path d="M222 100L230 80L244 86L252 100Z" fill="${PANEL}"/>
<path d="M262 100L272 88L284 96L298 86L306 100Z" fill="${INK}"/>`),

  // A chip, a value line climbing back, and a crate stopped at the border: Megaspeed on the export blacklist.
  nvidia: () => art(320, 112, '#E3E7DF', `
${chip(28, 20, 0.86)}
<path d="M128 96H232" stroke="${INK}" stroke-width="3"/>
<path d="M132 88L156 72L176 80L204 44L224 52" fill="none" stroke="${TEAL}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M214 34L232 38L224 56Z" fill="${TEAL}"/>
<rect x="248" y="50" width="52" height="44" fill="${OCHRE}"/><path d="M248 62H300M248 82H300" stroke="${INK}" stroke-width="3"/>
<circle cx="274" cy="44" r="24" fill="none" stroke="${ACC}" stroke-width="7"/><path d="M257 27L291 61" stroke="${ACC}" stroke-width="7"/>`),
};

// ---- card spots (viewBox 180 x 60) ------------------------------------------------------------
const SPOT = {
  // An air strike: a dashed fall from the sky onto a low row of buildings.
  gaza: () => art(180, 60, '#E8E2D4', `
<path d="M20 60V38H48V60ZM52 60V30H82V60ZM104 60V34H132V60ZM136 60V42H160V60Z" fill="${INK}"/>
<path d="M150 4L104 34" stroke="${ACC}" stroke-width="4" stroke-dasharray="7 6"/>${burst(92, 34, 20)}`),
  // A drone flying into a tall tower, the struck corner flashing.
  riyadh: () => art(180, 60, '#E8E3D2', `
<path d="M70 60V6H96V18L104 24L98 30V60Z" fill="${INK}"/>${windows(76, 34, 2, 3, 10, 8, 5, 4)}${burst(102, 22, 12)}
<path d="M146 10L112 20" stroke="${ACC}" stroke-width="3" stroke-dasharray="6 5"/>
<path d="M140 10L166 2L160 10L166 18Z" fill="${INK}"/>`),
  // A gavel coming down on a microchip.
  huawei: () => art(180, 60, '#E7E5DB', `
<rect x="40" y="50" width="100" height="10" fill="${INK}"/>${chip(68, 22, 0.3)}${gavel(122, 18, 0.62, 48)}
<path d="M88 8l-6-6M100 6V0M112 8l6-6" stroke="${ACC}" stroke-width="3"/>`),
  // A sun over a thermometer at the top of its scale.
  heat: () => art(180, 60, '#F0E2CE', `
<circle cx="66" cy="30" r="17" fill="${ACC}"/>
<path d="M66 4V9M66 51V56M40 30H45M87 30H92M48 12L52 16M84 12L80 16M48 48L52 44M84 48L80 44" stroke="${ACC}" stroke-width="4"/>
<rect x="110" y="6" width="14" height="40" rx="7" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<rect x="114" y="12" width="6" height="34" fill="${ACC}"/><circle cx="117" cy="48" r="9" fill="${ACC}" stroke="${INK}" stroke-width="3"/>`),
  // A plane flying home toward a calendar leaf: 16 December.
  hasina: () => art(180, 60, '#E5E9E3', `
<path d="M8 46C30 44 50 36 64 30" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="5 5"/>${plane(88, 26, 0.62)}
<rect x="122" y="6" width="44" height="50" rx="4" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<rect x="122" y="6" width="44" height="17" rx="3" fill="${ACC}"/>
<text x="144" y="20" class="cal">DEC</text><text x="144" y="50" class="day">16</text>`),
  // A supermarket front with a trolley sign, taped off.
  cartagena: () => art(180, 60, '#ECE6D8', `
<rect x="34" y="8" width="112" height="52" fill="${INK}"/>
<path d="M34 8H146V20H34Z" fill="${ACC}"/><path d="M48 8V20M62 8V20M76 8V20M90 8V20M104 8V20M118 8V20M132 8V20" stroke="${LIGHT}" stroke-width="5"/>
<rect x="46" y="26" width="46" height="26" fill="${LIGHT}"/>
<path d="M50 31H56L61 44H83L86 34H58" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<circle cx="64" cy="48" r="2.6" fill="${INK}"/><circle cx="80" cy="48" r="2.6" fill="${INK}"/>
<rect x="100" y="26" width="34" height="34" fill="${SMOKE}"/>
<path d="M10 52L170 40" stroke="${OCHRE}" stroke-width="7"/><path d="M24 51L30 50M48 49L54 48M72 47L78 47M96 45L102 45M120 44L126 43M144 42L150 41" stroke="${INK}" stroke-width="7"/>`),
  // The Cup of Nations trophy beside a ball.
  senegal: () => art(180, 60, '#E9E4D2', `
<path d="M70 4H110C110 26 100 36 90 36C80 36 70 26 70 4Z" fill="${OCHRE}"/>
<path d="M70 9H60C60 20 66 25 74 26M110 9H120C120 20 114 25 106 26" fill="none" stroke="${OCHRE}" stroke-width="4"/>
<rect x="86" y="36" width="8" height="10" fill="${OCHRE}"/><rect x="74" y="46" width="32" height="10" rx="2" fill="${INK}"/>
<circle cx="138" cy="42" r="14" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<path d="M138 35L145 40L142 48H134L131 40Z" fill="${INK}"/>`),
  // A pumpjack over the field.
  iraq: () => art(180, 60, '#E9E3D3', `
<rect y="54" width="180" height="6" fill="${OCHRE}"/>
<path d="M62 54L76 22L90 54" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M44 26L118 14" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<path d="M112 6C124 6 128 14 126 24L114 26Z" fill="${INK}"/><path d="M120 26V54" stroke="${INK}" stroke-width="3"/>
<circle cx="76" cy="21" r="5" fill="${ACC}"/><rect x="36" y="38" width="20" height="16" fill="${INK}"/>
<path d="M146 22C146 22 136 36 136 42A10 10 0 0 0 156 42C156 36 146 22 146 22Z" fill="${INK}"/>`),
  // People sent back across a border.
  rohingya: () => art(180, 60, '#DFE7E6', `
<path d="M40 2V60" stroke="${INK}" stroke-width="3" stroke-dasharray="6 5"/>
${person(78, 30, 0.82)}${person(104, 30, 0.82)}${person(130, 30, 0.82)}
<path d="M168 10H62" stroke="${ACC}" stroke-width="6"/><path d="M50 10L66 2V18Z" fill="${ACC}"/>`),
  // A phone carrying the fine: up to 5% of global revenue.
  australia: () => art(180, 60, '#ECE7D8', `
<rect x="64" y="2" width="38" height="58" rx="6" fill="${INK}"/><rect x="69" y="10" width="28" height="42" fill="${LIGHT}"/>
<text x="83" y="38" class="pct">5%</text>
<ellipse cx="128" cy="50" rx="16" ry="5" fill="${OCHRE}" stroke="${INK}" stroke-width="2"/>
<ellipse cx="128" cy="42" rx="16" ry="5" fill="${OCHRE}" stroke="${INK}" stroke-width="2"/>
<ellipse cx="128" cy="34" rx="16" ry="5" fill="${OCHRE}" stroke="${INK}" stroke-width="2"/>`),
};

// ---- stories ----------------------------------------------------------------------------------
// conf: CONFIRMED (in the record from an authority) / OFFICIAL (an official statement) /
//       REPORTED (carried by the outlets named) / CLAIM (one side's account, unverified).
// region feeds the tally; loc places the map pin (stories with no single place have none).
const LEAD = [
  { art: 'hormuz', loc: [56.3, 26.5], region: 'Middle East', place: 'Strait of Hormuz', conf: 'REPORTED',
    hd: 'Hormuz oil traffic down 40% as tanker attacks rise',
    dk: 'Iran says three ships hit mines and caught fire, as the US‑Israel war on Iran goes on.' },
  { art: 'zaporizhzhia', loc: [35.14, 47.84], region: 'Europe', place: 'Zaporizhzhia, Ukraine', conf: 'OFFICIAL',
    hd: 'Russian strike on Zaporizhzhia kills 2, injures 44',
    dk: 'A house destroyed and a five‑storey apartment block hit, Ukrainian officials said.' },
  { art: 'nvidia', loc: [-121.96, 37.35], region: 'Americas', place: 'United States · tech', conf: 'CONFIRMED',
    hd: 'Huang back as Nvidia CEO; US blacklists Megaspeed',
    dk: 'Nvidia regains $952bn in value; the firm at the centre of its spy scandal goes on the export list.' },
];
const CARDS = [
  { art: 'gaza', loc: [34.45, 31.5], region: 'Middle East', place: 'Gaza', conf: 'REPORTED',
    hd: 'Israeli strike kills senior Hamas official', dk: 'Naim Abu Nahl, 50; four others wounded' },
  { art: 'riyadh', loc: [46.68, 24.71], region: 'Middle East', place: 'Riyadh', conf: 'OFFICIAL',
    hd: 'Houthi drone hits tower, injuring 11', dk: 'Financial district, says Saudi civil defence' },
  { art: 'huawei', loc: [-73.95, 40.65], region: 'Americas', place: 'US', conf: 'CONFIRMED',
    hd: 'Huawei guilty of trade‑secrets conspiracy', dk: 'And fraud; jury clears it of racketeering' },
  { art: 'heat', loc: [-0.12, 51.5], region: 'Europe', place: 'UK', conf: 'OFFICIAL',
    hd: 'Record 5,258 heat deaths this summer', dk: 'UK Health Security Agency estimate' },
  { art: 'hasina', loc: [90.4, 23.8], region: 'Asia', place: 'Bangladesh', conf: 'CLAIM',
    hd: 'Hasina plans return from exile on 16 Dec', dk: 'Dhaka: she can return only by extradition' },
  { art: 'cartagena', loc: [-75.5, 10.4], region: 'Americas', place: 'Colombia', conf: 'REPORTED',
    hd: 'Armed men hold 25 hostages in supermarket', dk: 'Cartagena; police and army deployed' },
  { art: 'senegal', loc: [-17.45, 14.7], region: 'Africa', place: 'AFCON', conf: 'CONFIRMED',
    hd: 'Senegal reinstated as AFCON 2025 winners', dk: 'Sport court rules against Morocco' },
  { art: 'iraq', loc: [44.0, 36.19], region: 'Middle East', place: 'Iraq', conf: 'OFFICIAL',
    hd: 'Baghdad orders takeover of Kurdish oilfields', dk: 'PM also orders region’s crossings seized' },
  { art: 'rohingya', loc: [101.7, 3.14], region: 'Asia', place: 'Malaysia', conf: 'OFFICIAL',
    hd: 'Thousands of Rohingya to be sent to Myanmar', dk: 'Five days after ICJ genocide ruling' },
  { art: 'australia', loc: [149.13, -35.28], region: 'Oceania', place: 'Australia', conf: 'OFFICIAL',
    hd: 'Tech giants face fines up to 5% of revenue', dk: 'Online‑harm bill expected to pass this week' },
];
const DIGEST = [
  { loc: [34.45, 31.5], region: 'Middle East', place: 'Gaza', hd: 'strikes kill 7; meningitis cases up 8×' },
  { loc: [37.6, 55.75], region: 'Europe', place: 'Russia', hd: 'Putin vows retaliation for oil strikes' },
  { loc: [30.52, 39.78], region: 'Europe', place: 'Türkiye', hd: 'army helicopter crash kills five' },
  { loc: [10.75, 59.9], region: 'Europe', place: 'Norway', hd: 'Cameroon separatist denies war crimes' },
  { loc: [-77.04, 38.9], region: 'Americas', place: 'US', hd: 'Trump urges faster federal executions' },
  { loc: [-107.4, 24.8], region: 'Americas', place: 'Mexico', hd: 'to try ‘El Chapo Isidro’ despite US request' },
  { loc: [-82.36, 23.1], region: 'Americas', place: 'Cuba', hd: 'WHO chief visits as health care falters' },
  { loc: [-72.34, 18.54], region: 'Americas', place: 'Haiti', hd: 'Bukele details Salvadoran troop deaths' },
  { loc: [30.25, 1.56], region: 'Africa', place: 'DR Congo', hd: 'rebels halt advance on Bunia' },
  { loc: [13.15, 11.85], region: 'Africa', place: 'Nigeria', hd: 'Borno school enrolment nearly doubles' },
  { loc: [28.05, -26.2], region: 'Africa', place: 'S Africa', hd: 'Zimbabwean guilty over Russia bid' },
  { loc: [105.83, 21.0], region: 'Asia', place: 'Hanoi', hd: 'restaurant blast kills at least six' },
  { loc: [126.98, 37.57], region: 'Asia', place: 'S Korea', hd: 'air‑raid alert as Russian jets near' },
  { loc: [113.26, 23.13], region: 'Asia', place: 'China', hd: 'airline unit to buy 50 Boeing 737s' },
  { region: 'Sport', place: 'Football', hd: 'Arsenal 1‑1 Dortmund; Real 5‑1 PSV' },
  { region: 'Sport', place: 'Cricket', hd: 'Sooryavanshi, 15, hits 204 off 53 balls' },
  { region: 'Worldwide', place: 'WFP', hd: 'wars put food aid for 7.3 million at risk' },
  { region: 'Worldwide', place: 'UN Women', hd: '5 an hour killed by partner or kin' },
  { region: 'Worldwide', place: 'UN', hd: 'Guterres wants AI oversight deal in a year' },
];
// Numbering is assigned here, in reading order, so no literal can drift out of sync.
const ALL = [...LEAD, ...CARDS, ...DIGEST];
ALL.forEach((s, i) => { s.n = i + 1; });
const FEATURED = LEAD.length + CARDS.length;
const REGION_ORDER = ['Europe', 'Middle East', 'Americas', 'Asia', 'Africa', 'Oceania', 'Sport', 'Worldwide'];
const tally = REGION_ORDER.map((r) => [r, ALL.filter((s) => s.region === r).length]).filter(([, c]) => c);
if (tally.reduce((a, [, c]) => a + c, 0) !== ALL.length) throw new Error('a story has no region in REGION_ORDER');

// ---- map pins ---------------------------------------------------------------------------------
// Featured stories get a numbered red pin; off:[dx, dy] moves a crowded pin and draws a tick back to the place.
const PIN_OFF = { 1: [12, 6], 2: [2, -12], 3: [8, 0], 4: [-14, 4], 5: [-4, 14], 11: [12, -6], 7: [-6, -6], 6: [10, -2], 9: [2, 8], 8: [4, -6] };
const PIN = 18, PH = PIN / 2;
const f1 = (v) => +v.toFixed(1);
const geo = { pins: [] };
let dots = '', ticks = '', pins = '';
for (const s of DIGEST) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc).map(f1);
  dots += `<circle class="dot" cx="${x}" cy="${y}" r="3.2"/>`;
}
for (const s of [...LEAD, ...CARDS]) {
  const [x, y] = px(...s.loc).map(f1);
  const [dx, dy] = PIN_OFF[s.n] ?? [0, 0];
  const X = f1(x + dx), Y = f1(y + dy);
  if (dx || dy) ticks += `<path class="tk" d="M${x} ${y}L${X} ${Y}"/><circle class="ae" cx="${x}" cy="${y}" r="2.4"/>`;
  pins += `<g transform="translate(${X} ${Y})"><rect class="pr" x="${-PH}" y="${-PH}" width="${PIN}" height="${PIN}" rx="4"/><text class="pn" y="5">${s.n}</text></g>`;
  geo.pins.push({ n: s.n, x: X, y: Y });
}

// ---- render -----------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const conf = (c) => `<span class="cf ${c.toLowerCase()}"><i>${c}</i></span>`;
const num = (n) => `<span class="nb"><i>${n}</i></span>`;
const kicker = (s) => `<div class="kick">${num(s.n)}<span class="pc">${esc(s.place)}</span>${conf(s.conf)}</div>`;

const leads = LEAD.map((s) => `
<article class="lead">${LEAD_ART[s.art]()}${kicker(s)}<h2 class="hd">${esc(s.hd)}</h2><p class="dk">${esc(s.dk)}</p></article>`).join('');
const cards = CARDS.map((s) => `
<article class="card">${SPOT[s.art]()}${kicker(s)}<h3 class="h3">${esc(s.hd)}</h3><p class="dk">${esc(s.dk)}</p></article>`).join('');
const digest = DIGEST.map((s) => `
<li>${num(s.n)}<span class="di"><b>${esc(s.place)}:</b> ${esc(s.hd)}</span></li>`).join('');
const tallyHtml = tally.map(([r, c]) => `<span class="rg"><b><i>${c}</i></b><span>${r}</span></span>`).join('');

const graticule = [];
for (let lon = -120; lon <= 150; lon += 30) { const [x] = px(lon, 0); graticule.push(`M${x.toFixed(1)} 0V${MAP_H}`); }
for (const lat of [-30, 0, 30, 60]) { const [, y] = px(0, lat); graticule.push(`M0 ${y.toFixed(1)}H${MAP_W}`); }

// Layout checker (CHECK=1 only): measures the laid-out page, writes a JSON report into document.title.
const checker = !process.env.CHECK ? '' : `<script>try{
const out=[],G=${JSON.stringify(geo)},R=${PH};
const over=(e,tag)=>{if(e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1)out.push(tag+' overflows '+(e.scrollWidth-e.clientWidth)+'x'+(e.scrollHeight-e.clientHeight)+': '+e.textContent.slice(0,50))};
document.querySelectorAll('.lead,.card,.digest,.foot div,.deck,.tally').forEach(e=>over(e,e.className));
document.querySelectorAll('.di').forEach(e=>{const r=e.getBoundingClientRect(),q=e.closest('.digest').getBoundingClientRect(),c=e.closest('li').getBoundingClientRect();(r.right>c.right+.5||r.right>q.right+.5)&&out.push('digest item too wide by '+Math.round(r.right-c.right)+': '+e.textContent)});
document.querySelectorAll('.pc').forEach(e=>e.scrollWidth>e.clientWidth+1&&out.push('kicker clips: '+e.textContent));
document.querySelectorAll('.di').forEach(e=>{const n=Math.round(e.offsetHeight/parseFloat(getComputedStyle(e).lineHeight));n>1&&out.push('digest wraps '+n+': '+e.textContent)});
document.querySelectorAll('.hd,.h3,.dk').forEach(e=>{const n=Math.round(e.offsetHeight/parseFloat(getComputedStyle(e).lineHeight));n>2&&out.push(e.className+' '+n+' lines: '+e.textContent)});
const bands=[...document.querySelectorAll('.band')].map(e=>[e.dataset.b,e.getBoundingClientRect()]);
bands.forEach(([a,r],i)=>{bands.slice(i+1).forEach(([b,q])=>{if(r.bottom>q.top+.5&&q.bottom>r.top+.5&&r.right>q.left&&q.right>r.left)out.push('bands '+a+'/'+b+' overlap')});if(r.bottom>1024)out.push(a+' off page')});
bands.forEach(([a,r])=>{const e=document.querySelector('[data-b="'+a+'"]');const k=[...e.querySelectorAll('*')].reduce((m,c)=>Math.max(m,c.getBoundingClientRect().bottom),0);out.push('slack '+a+' '+Math.round(r.bottom-k))});
G.pins.forEach((a,i)=>G.pins.slice(i+1).forEach(b=>Math.abs(a.x-b.x)<2*R+2&&Math.abs(a.y-b.y)<2*R+2&&out.push('pins '+a.n+'/'+b.n)));
G.pins.forEach(p=>(p.x<R||p.y<R||p.x>${MAP_W}-R||p.y>${MAP_H}-R)&&out.push('pin '+p.n+' off map'));
const sz=new Set();document.querySelectorAll('body *:not(script)').forEach(e=>{if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))sz.add(parseFloat(getComputedStyle(e).fontSize))});
out.push('font sizes '+[...sz].sort((a,b)=>a-b).join(','));
document.title=JSON.stringify(out);
}catch(e){document.title=JSON.stringify(['checker error: '+e.message])}</script>`;

const SANS = '"Avenir Next Condensed","Avenir Next","Helvetica Neue",sans-serif';
const SERIF = 'Charter,"Bitstream Charter",Georgia,serif';
const LEAD_W = (W - 2 * M - 2 * 16) / 3, CARD_W = (W - 2 * M - 4 * 12) / 5;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>front page</title><style>
:root{--paper:${PAPER};--ink:${INK};--mute:#3E424A;--acc:${ACC};--teal:${TEAL};--ochre:${OCHRE};--sea:#D3DEE0;--land:#E3DBC8}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:var(--paper);color:var(--ink)}
body{position:relative;font:500 15px ${SANS};-webkit-font-smoothing:antialiased}
i{font-style:normal;text-box:trim-both cap alphabetic}
.band{position:absolute;left:${M}px;width:${W - 2 * M}px}
.head{position:absolute;left:0;top:0;width:${W}px;height:${HEAD_H}px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:space-between;padding:0 ${M}px}
h1{font:700 66px/1 ${SERIF};white-space:nowrap;letter-spacing:-.01em;text-box:trim-both cap alphabetic}
.strap{font:700 15px/19px ${SANS};letter-spacing:.08em;text-transform:uppercase;text-align:right}
.strap b{color:#F0A08C;font-weight:700}
.deck{top:${DECK_Y}px;height:24px;font:700 19px/22px ${SANS};letter-spacing:-.005em;white-space:nowrap;overflow:hidden}
.deck s{text-decoration:none;color:var(--acc);padding:0 5px}
.tally{top:${TALLY_Y}px;height:22px;display:flex;align-items:center;gap:14px;white-space:nowrap;overflow:hidden;font:700 15px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase}
.tally>.t{color:var(--mute)}
.rg{display:inline-flex;align-items:center;gap:6px}
.rg b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 4px;background:var(--teal);color:#fff;border-radius:3px;font:800 15px/1 ${SANS}}
.rg span{text-box:trim-both cap alphabetic}
.rule{position:absolute;left:${M}px;right:${M}px;height:3px;background:var(--ink)}
.leads{top:${LEAD_Y}px;height:${LEAD_H}px;display:grid;grid-template-columns:repeat(3,1fr);column-gap:16px}
.lead,.card{display:flex;flex-direction:column;overflow:hidden}
.lead>svg{display:block;width:${LEAD_W.toFixed(2)}px;height:${ART_H}px;flex:none}
.cards{top:${CARD_Y}px;height:${2 * CARD_H + CARD_GAP}px;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,${CARD_H}px);gap:${CARD_GAP}px 12px}
.card>svg{display:block;width:${CARD_W.toFixed(2)}px;height:${SPOT_H}px;flex:none}
.kick{display:flex;align-items:center;gap:6px;height:24px;flex:none;background:var(--ink);color:var(--paper);padding-right:3px}
.nb{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:24px;height:24px;padding:0 3px;background:var(--acc);color:#fff;font:800 15px/1 ${SANS}}
.pc{flex:1;min-width:0;font:700 15px/1 ${SANS};letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-box:trim-both cap alphabetic}
.cf{display:inline-flex;align-items:center;flex:none;height:19px;padding:0 5px;border-radius:2px;font:800 15px/1 ${SANS};letter-spacing:.02em}
.cf.confirmed{background:var(--paper);color:var(--ink)} .cf.official{background:var(--teal);color:#fff;box-shadow:0 0 0 1.5px var(--paper)}
.cf.reported{background:var(--ochre);color:var(--ink)} .cf.claim{background:var(--acc);color:#fff;box-shadow:0 0 0 1.5px var(--paper)}
.card .pc{letter-spacing:-.01em}
.card .cf{padding:0 4px;letter-spacing:.02em}
.hd{font:800 22px/24px ${SANS};margin-top:5px}
.h3{font:800 17px/19px ${SANS};margin-top:4px}
.dk{font:500 15px/17px ${SANS};color:var(--mute);margin-top:2px}
.lead .dk{line-height:18px}
.lead .pc{font-size:17px}
.fig{font:800 30px/1 ${SANS};fill:${ACC};text-anchor:middle}
.cal{font:800 16px/1 ${SANS};fill:#fff;text-anchor:middle;letter-spacing:.04em}
.day{font:800 26px/1 ${SANS};fill:${INK};text-anchor:middle}
.pct{font:800 19px/1 ${SANS};fill:${ACC};text-anchor:middle}
.low{top:${LOW_Y}px;bottom:${FOOT_H + 6}px;display:grid;grid-template-columns:${MAP_W}px 1fr;column-gap:18px}
.sec{display:flex;align-items:center;height:24px;background:var(--ink);color:var(--paper);padding:0 8px;font:800 15px/1 ${SANS};letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.sec span{text-box:trim-both cap alphabetic}
.map svg{display:block;margin-top:6px}
.sea{fill:var(--sea)} .land{fill:var(--land);stroke:#FBF8F1;stroke-width:.6}
.gr{fill:none;stroke:#C2CFD1;stroke-width:.6}
.dot{fill:var(--ink)} .tk{stroke:var(--acc);stroke-width:1.6} .ae{fill:var(--acc)}
.pr{fill:var(--acc);stroke:#fff;stroke-width:1.3}
.pn{font:800 15px ${SANS};fill:#fff;text-anchor:middle}
.legend{font:600 15px/18px ${SANS};color:var(--mute);margin-top:5px;white-space:nowrap}
.legend b{color:var(--acc)}
.digest{list-style:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-flow:column;grid-template-rows:repeat(10,auto);column-gap:16px;row-gap:0;margin-top:4px;overflow:hidden}
.digest li{display:flex;align-items:center;gap:7px;min-width:0}
.digest .nb{background:var(--ink);min-width:24px;height:20px;font-size:15px}
.di{font:500 16px/19px ${SANS};white-space:nowrap;min-width:0}
.di b{font-weight:800}
.foot{position:absolute;left:0;top:${FOOT_Y}px;width:${W}px;height:${FOOT_H}px;background:var(--ink);color:var(--paper);padding:5px ${M}px 0;font:500 15px/19px ${SANS}}
.foot div{white-space:nowrap;overflow:hidden}
.foot .cf{height:19px;margin:0 5px 0 14px;vertical-align:0} .foot .cf:first-child{margin-left:0}
.foot b{font-weight:800;color:#fff}
</style></head><body>
<header class="head"><h1>Tuesday 24 November 2026</h1>
<div class="strap"><b>One day</b><br>on Earth</div></header>
<div class="band deck" data-b="deck">Hormuz oil traffic down 40%<s>•</s>Russian strike on Zaporizhzhia<s>•</s>Huang back at Nvidia<s>•</s>Huawei guilty in US trial</div>
<div class="band tally" data-b="tally"><span class="t">${ALL.length} stories:</span>${tallyHtml}</div>
<div class="rule" style="top:${LEAD_Y - 9}px"></div>
<section class="band leads" data-b="leads">${leads}</section>
<section class="band cards" data-b="cards">${cards}</section>
<section class="band low" data-b="low">
<div class="map"><div class="sec"><span>Where it happened</span></div>
<svg width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
<rect class="sea" width="${MAP_W}" height="${MAP_H}"/><path class="gr" d="${graticule.join('')}"/><path class="land" d="${land}"/>
${dots}${ticks}${pins}</svg>
<div class="legend"><b>Red</b>: stories 1–${FEATURED} · dots: ${FEATURED + 1}–${FEATURED + DIGEST.filter((s) => s.loc).length} · Natural Earth</div></div>
<div><div class="sec"><span>Also on Tuesday 24 November</span></div><ol class="digest">${digest}</ol></div>
</section>
<footer class="foot">
<div>${conf('CONFIRMED')}in the record from an authority  ${conf('OFFICIAL')}an official statement  ${conf('REPORTED')}carried by the outlets named  ${conf('CLAIM')}one side’s account, unverified</div>
<div><b>Date check:</b> every story happened or was first reported on Tue 24 Nov 2026 (UTC or local). Sources: Al Jazeera, 24 Nov; Wikipedia Current events. Illustrations drawn for this page</div>
</footer>
${checker}
</body></html>`;

writeFileSync(new URL('atlas.html', here), html);
console.log('map', MAP_W + 'x' + MAP_H, 'stories', ALL.length, 'featured', FEATURED, 'pins', geo.pins.length);
