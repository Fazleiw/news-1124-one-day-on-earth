// Builds design/atlas.html: a 1024x1024 front page of the world news of Tuesday 24 November 2026.
// Deterministic: no randomness, no clock, no network, system fonts only. Map data: Natural Earth via world-atlas (data/).
// CHECK=1 node design/build.mjs adds a layout checker to the page (clipping, band slack, pins, font sizes);
// render.sh never sets it. Every story, place and figure traces to a row of design/sources.md (src: row number).
//
// Page, top to bottom: masthead with the date / three-teaser deck / 4 lead stories with scenes / 8 second-tier
// stories with scenes / locator map + "Also on Tuesday" (20 one-liners) / closing line restating the date.
//
// Type scale, px at 1024 (nothing smaller than 15): 96 date / 34 lead figure / 25 second figure / 21 lead headline /
// 19 deck / 18 legend / 17 masthead strap, closing line / 16 card headline, digest, lead place / 15 place, numbers, sources.
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('./', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('data/countries-110m.json', here)));

// ---- palette ----------------------------------------------------------------------------------
// Paper, ink, one accent (figures, the strike marks) and one secondary (ochre). The six region colours appear only on
// number chips, map pins and the legend; each carries white numbers at >= 4.5:1.
const PAPER = '#F4F0E6', INK = '#191C22', ACC = '#C0391F', OCHRE = '#C9952E';
const MUTE = '#3E424A', PANEL = '#E4DED0', LIGHT = '#FBF8F1', SMOKE = '#8E9094', SEA = '#6F95A6', EUBLUE = '#22409A';
const REGION = {
  Asia: '#A8285F', Americas: '#2356A0', Europe: '#6A3D9A',
  'Middle East': '#8F5400', Africa: '#2C7232', Oceania: '#0B6E7A',
};
const REGION_ORDER = Object.keys(REGION);
const WORLD = INK; // stories with no single place (sport, UN and WFP figures) use an ink chip and have no pin

// ---- page bands (y, px at 1024) ---------------------------------------------------------------
const W = 1024, M = 20;
const HEAD_H = 118, DECK_Y = 126, DECK_H = 30, RULE_Y = 163, LEAD_Y = 172, LEAD_H = 256;
const SEC_Y = LEAD_Y + LEAD_H + 12, SEC_ROW = 112, SEC_GAP = 10, SEC_H = 2 * SEC_ROW + SEC_GAP;
const FOOT_H = 52, FOOT_Y = W - FOOT_H, LOW_Y = SEC_Y + SEC_H + 12, LOW_H = FOOT_Y - 6 - LOW_Y;
const COL_GAP = 14, COL_W = (W - 2 * M - 3 * COL_GAP) / 4;

// ---- projection (Miller, cropped to where the day's stories are) ------------------------------
const MAP_W = 304, LON0 = -100, LON1 = 166, LAT_TOP = 63, LAT_BOT = -42, K = MAP_W / (LON1 - LON0);
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
// Bold flat shapes, no hairlines: every scene has to stay an object at 300 px. Nothing is drawn that the row does not say.
const burst = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
  }
  return `<path d="${d}Z" fill="${ACC}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.34).toFixed(1)}" fill="${OCHRE}"/>`;
};
const chip = (x, y, s, die = OCHRE) => {
  let pins = '';
  for (let i = 0; i < 4; i++) {
    const o = (12 + i * 20) * s;
    pins += `M${x + o} ${y - 10 * s}v${10 * s}M${x + o} ${y + 84 * s}v${10 * s}M${x - 10 * s} ${y + o}h${10 * s}M${x + 84 * s} ${y + o}h${10 * s}`;
  }
  return `<path d="${pins}" stroke="${INK}" stroke-width="${7 * s}"/>` +
    `<rect x="${x}" y="${y}" width="${84 * s}" height="${84 * s}" rx="${7 * s}" fill="${INK}"/>` +
    `<rect x="${x + 22 * s}" y="${y + 22 * s}" width="${40 * s}" height="${40 * s}" fill="${die}"/>`;
};
const gavel = (x, y, s, a) =>
  `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})" fill="${INK}">` +
  `<rect x="-6" y="0" width="12" height="62" rx="4"/><rect x="-28" y="-20" width="56" height="26" rx="5"/>` +
  `<rect x="-32" y="-23" width="9" height="32" rx="3"/><rect x="23" y="-23" width="9" height="32" rx="3"/></g>`;
const person = (x, y, s, fill = INK) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><circle cx="0" cy="-34" r="8"/>` +
  `<path d="M-10 -22H10L13 6H5L4 30H-4L-5 6H-13Z"/></g>`;
const woman = (x, y, fill) =>
  `<g transform="translate(${x} ${y})" fill="${fill}"><circle cx="0" cy="-23" r="5"/><path d="M-4 -16H4L9 4H-9Z"/>` +
  `<rect x="-4" y="4" width="3" height="7"/><rect x="1" y="4" width="3" height="7"/></g>`;
const star = (cx, cy, r, fill) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2);
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
};
const art = (vw, vh, bg, body) =>
  `<svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid slice"><rect width="${vw}" height="${vh}" fill="${bg}"/>${body}</svg>`;

// ---- lead scenes (viewBox 236 x 112) ----------------------------------------------------------
const LEAD_ART = {
  // A tanker low in the water, burning amidships under heavy smoke; a second hull on the horizon. No mine is drawn:
  // the mines are Iran's account (sources.md, row 1).
  hormuz: () => art(236, 112, PANEL, `
<rect y="72" width="236" height="40" fill="${SEA}"/>
<path d="M0 98q10 -8 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" fill="none" stroke="${LIGHT}" stroke-width="4"/>
<path d="M178 64H230L226 74H182Z" fill="${MUTE}"/><rect x="180" y="54" width="10" height="10" fill="${MUTE}"/>
<circle cx="70" cy="32" r="11" fill="${SMOKE}"/><circle cx="84" cy="20" r="15" fill="${MUTE}"/><circle cx="104" cy="14" r="16" fill="${SMOKE}"/>
<circle cx="124" cy="10" r="15" fill="${MUTE}"/><circle cx="144" cy="8" r="12" fill="${SMOKE}"/><circle cx="160" cy="4" r="9" fill="${MUTE}"/>
<path d="M92 66Q78 52 88 40Q90 50 96 50Q92 34 106 24Q104 40 114 44Q118 36 116 30Q130 44 122 66Z" fill="${ACC}"/>
<path d="M98 66Q94 56 100 50Q104 56 108 54Q108 46 114 42Q120 54 116 66Z" fill="${OCHRE}"/>
<rect x="16" y="40" width="26" height="24" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><rect x="22" y="30" width="10" height="10" fill="${INK}"/>
<path d="M20 48H38" stroke="${INK}" stroke-width="4"/>
<path d="M6 64H170L160 84H16Z" fill="${INK}"/><path d="M48 62H84M128 62H162" stroke="${MUTE}" stroke-width="4"/>
<ellipse cx="96" cy="88" rx="30" ry="4" fill="none" stroke="${LIGHT}" stroke-width="3"/><ellipse cx="96" cy="94" rx="46" ry="6" fill="none" stroke="${LIGHT}" stroke-width="3"/>`),

  // A five-storey block with one floor punched out, smoke pouring from the hole, rubble and dust at its foot.
  zaporizh: () => art(236, 112, PANEL, `
<rect y="98" width="236" height="14" fill="${INK}"/>
<rect x="66" y="16" width="104" height="82" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
${[0, 1, 3, 4].flatMap((f) => [0, 1, 2, 3].map((c) => `<rect x="${76 + c * 22}" y="${22 + f * 16}" width="12" height="8" fill="${INK}"/>`)).join('')}
<path d="M152 18L160 30L154 42L162 54L156 70L164 82L160 96H170V18Z" fill="${PANEL}"/>
<path d="M152 18L160 30L154 42L162 54L156 70L164 82L160 96" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M70 50L82 47L96 52L110 46L124 51L138 47L150 52L148 66L134 70L120 65L104 70L88 64L72 68Z" fill="${INK}"/>
<circle cx="176" cy="44" r="11" fill="${MUTE}"/><circle cx="190" cy="30" r="14" fill="${INK}"/><circle cx="208" cy="18" r="15" fill="${MUTE}"/><circle cx="226" cy="8" r="12" fill="${INK}"/>
<circle cx="40" cy="88" r="10" fill="${SMOKE}"/><circle cx="24" cy="92" r="8" fill="${SMOKE}"/><circle cx="210" cy="90" r="10" fill="${SMOKE}"/>
<path d="M118 98L128 86L140 90L152 80L166 88L180 82L196 98Z" fill="${MUTE}"/>
<rect x="134" y="84" width="10" height="7" fill="${OCHRE}" transform="rotate(-18 139 87)"/><rect x="170" y="86" width="12" height="6" fill="${OCHRE}" transform="rotate(14 176 89)"/>`),

  // A market board with a red line falling hard, beside a microchip: chip stocks slide.
  nvidia: () => art(236, 112, PANEL, `
<rect x="10" y="10" width="146" height="92" rx="6" fill="${INK}"/>
<path d="M18 36H148M18 60H148M18 84H148" stroke="#394049" stroke-width="3"/>
<path d="M22 26L44 34L60 28L82 58L100 50L124 80L136 84" fill="none" stroke="${ACC}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M128 70L148 92L120 94Z" fill="${ACC}"/>
${chip(172, 30, 0.6)}`),

  // A tall tower over low buildings; a delta-wing drone on a dashed track, and the hit near the top.
  riyadh: () => art(236, 112, PANEL, `
<rect y="98" width="236" height="14" fill="${OCHRE}"/>
<path d="M14 98V64H44V98ZM48 98V76H74V98ZM160 98V70H190V98ZM194 98V80H222V98Z" fill="${MUTE}"/>
<path d="M90 98L98 10H126L134 98Z" fill="${INK}"/><path d="M104 10Q112 26 120 10Z" fill="${PANEL}"/>
<path d="M102 40H122M101 54H123M100 68H124M99 82H125" stroke="${LIGHT}" stroke-width="4"/>
<path d="M216 18L138 28" stroke="${ACC}" stroke-width="5" stroke-dasharray="9 7"/>
<path d="M196 18L230 4L222 18L230 32Z" fill="${INK}"/>
${burst(126, 28, 17)}`),
};

// ---- second-tier scenes (viewBox 88 x 78) -----------------------------------------------------
const SPOT = {
  // A low skyline with one building collapsed into a heap, smoke rising from it, debris in the air.
  gaza: () => art(88, 78, PANEL, `
<circle cx="46" cy="44" r="8" fill="${MUTE}"/><circle cx="54" cy="30" r="11" fill="${SMOKE}"/><circle cx="62" cy="14" r="10" fill="${SMOKE}"/>
<rect x="4" y="42" width="18" height="28" fill="${INK}"/><rect x="22" y="52" width="14" height="18" fill="${MUTE}"/>
<rect x="64" y="36" width="20" height="34" fill="${INK}"/><path d="M69 44H79M69 54H79" stroke="${LIGHT}" stroke-width="4"/>
<path d="M36 70L40 58L48 62L54 52L62 62L64 70Z" fill="${MUTE}"/><rect x="38" y="56" width="22" height="5" fill="${INK}" transform="rotate(-24 49 58)"/>
<rect x="30" y="40" width="5" height="5" fill="${INK}" transform="rotate(20 32 42)"/><rect x="66" y="26" width="4" height="4" fill="${INK}"/>
<rect y="70" width="88" height="8" fill="${OCHRE}"/>`),
  // A gavel coming down on a microchip.
  huawei: () => art(88, 78, PANEL, `
<rect x="6" y="68" width="76" height="10" fill="${INK}"/>${chip(14, 40, 0.3)}${gavel(58, 22, 0.55, 40)}
<path d="M36 22l-6-6M46 18V10M56 22l6-6" stroke="${ACC}" stroke-width="4"/>`),
  // A blazing sun, a thermometer filled red to the top, heat shimmer over the ground.
  heat: () => art(88, 78, PANEL, `
<path d="M28 2V8M28 44V50M4 26H10M46 26H52M11 9L15 13M41 39L45 43M11 43L15 39M41 13L45 9" stroke="${OCHRE}" stroke-width="4" stroke-linecap="round"/>
<circle cx="28" cy="26" r="13" fill="${OCHRE}"/>
<path d="M4 62q5 -6 10 0t10 0t10 0t10 0M4 72q5 -6 10 0t10 0t10 0t10 0" fill="none" stroke="${ACC}" stroke-width="3.5"/>
<rect x="60" y="6" width="16" height="56" rx="8" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<rect x="64" y="12" width="8" height="54" rx="4" fill="${ACC}"/>
<circle cx="68" cy="64" r="11" fill="${ACC}" stroke="${INK}" stroke-width="3"/>
<path d="M78 18H84M78 30H84M78 42H84" stroke="${INK}" stroke-width="3"/>`),
  // A jet climbing away on motion dashes, and a calendar with one date marked.
  hasina: () => art(88, 78, PANEL, `
<path d="M4 74L22 62M2 62L16 53M12 77L28 67" stroke="${MUTE}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 4"/>
<g transform="translate(36 48) rotate(-30)" fill="${INK}">
<path d="M-26 -4H16Q28 -4 30 0Q28 4 16 4H-26Z"/><path d="M-4 -3L-14 -24H-7L10 -3ZM-4 3L-14 24H-7L10 3Z"/><path d="M-26 -3L-32 -12H-26L-18 -3ZM-26 3L-32 12H-26L-18 3Z"/></g>
<rect x="56" y="6" width="28" height="28" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><rect x="56" y="6" width="28" height="8" fill="${ACC}"/>
<path d="M62 3V9M78 3V9" stroke="${INK}" stroke-width="3"/>
<path d="M62 20h3M69 20h3M76 20h3M62 27h3M69 27h3" stroke="${INK}" stroke-width="3"/><rect x="75" y="24" width="6" height="6" fill="${ACC}"/>`),
  // A supermarket front, trolley sign in the window, people walking out of the open door.
  market: () => art(88, 78, PANEL, `
<rect x="4" y="8" width="80" height="62" fill="${INK}"/>
<path d="M4 8H84V22H4Z" fill="${ACC}"/><path d="M14 8V22M28 8V22M42 8V22M56 8V22M70 8V22" stroke="${LIGHT}" stroke-width="6"/>
<rect x="10" y="28" width="34" height="24" fill="${LIGHT}"/>
<path d="M13 32H18L22 44H38L41 35H20" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<circle cx="24" cy="48" r="2.5" fill="${INK}"/><circle cx="36" cy="48" r="2.5" fill="${INK}"/>
<rect x="52" y="30" width="26" height="40" fill="${LIGHT}"/>
<rect y="70" width="88" height="8" fill="${MUTE}"/>
${person(58, 52, 0.6, OCHRE)}${person(72, 54, 0.6, OCHRE)}`),
  // A silver cup with two handles on a black base, stars around it.
  trophy: () => art(88, 78, PANEL, `
<path d="M28 16H16Q14 34 32 38M60 16H72Q74 34 56 38" fill="none" stroke="${INK}" stroke-width="4"/>
<path d="M26 8H62V26Q62 46 44 48Q26 46 26 26Z" fill="${SMOKE}" stroke="${INK}" stroke-width="3"/>
<path d="M33 14V30" stroke="${LIGHT}" stroke-width="4" stroke-linecap="round"/>
<rect x="40" y="48" width="8" height="10" fill="${SMOKE}" stroke="${INK}" stroke-width="3"/>
<rect x="28" y="58" width="32" height="8" fill="${INK}"/><rect x="22" y="66" width="44" height="8" fill="${INK}"/>
${star(12, 10, 8, OCHRE)}${star(78, 52, 7, OCHRE)}${star(76, 8, 5, OCHRE)}`),
  // An oil derrick on the horizon, piped to two storage tanks.
  oil: () => art(88, 78, PANEL, `
<rect y="64" width="88" height="14" fill="${OCHRE}"/>
<path d="M14 64L26 6L38 64M18 46H34M21 30H31M17 54L33 38M19 38L31 22" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M36 58H84" stroke="${MUTE}" stroke-width="5"/>
<rect x="46" y="36" width="16" height="28" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><rect x="66" y="30" width="18" height="34" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<path d="M46 46H62M66 42H84" stroke="${ACC}" stroke-width="4"/>`),
  // A screen with a big percent sign, and a red penalty bar under it.
  fine: () => art(88, 78, PANEL, `
<rect x="6" y="6" width="76" height="54" rx="4" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/>
<path d="M6 10Q6 6 10 6H78Q82 6 82 10V16H6Z" fill="${INK}"/><circle cx="13" cy="11" r="2" fill="${LIGHT}"/><circle cx="20" cy="11" r="2" fill="${LIGHT}"/>
<circle cx="32" cy="28" r="6" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="56" cy="47" r="6" fill="none" stroke="${INK}" stroke-width="5"/>
<path d="M60 22L28 54" stroke="${ACC}" stroke-width="6" stroke-linecap="round"/>
<rect x="6" y="66" width="76" height="10" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><rect x="8" y="68" width="30" height="6" fill="${ACC}"/>`),
};

// ---- stories ----------------------------------------------------------------------------------
// src: the row in design/sources.md. fig: the one figure the card leads with.
// loc: where the pin goes; stories with no single place (src 28-32) have none.
const LEAD = [
  { src: 1, art: 'hormuz', loc: [56.4, 26.6], region: 'Middle East', place: 'Strait of Hormuz',
    fig: '−40%', hd: 'Oil traffic through Hormuz falls 40% as tanker attacks mount' },
  { src: 2, art: 'zaporizh', loc: [35.14, 47.84], region: 'Europe', place: 'Zaporizhzhia',
    fig: '2 killed', hd: 'Russian strike kills two and injures 44 in Zaporizhzhia' },
  { src: 3, art: 'nvidia', loc: [-74.0, 40.71], region: 'Americas', place: 'New York',
    fig: '$952bn', hd: 'Nvidia regains $952bn as Huang returns; Megaspeed blacklisted' },
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
    fig: 'Up to 5%', hd: 'Australia warns tech giants of fines up to 5% of global revenue' },
];
// Grouped by region in legend order, so the chip colours run in blocks down the columns.
const DIGEST = [
  // Asia
  { src: 12, loc: [101.7, 3.14],  region: 'Asia',        hd: 'Malaysia to send Rohingya back' },
  { src: 25, loc: [105.85, 21.03], region: 'Asia',       hd: 'Hanoi restaurant blast kills at least six' },
  { src: 26, loc: [126.98, 37.57], region: 'Asia',       hd: 'S Korea air-raid alert over Russian jets' },
  { src: 27, loc: [113.26, 23.13], region: 'Asia',       hd: 'China Southern unit to buy 50 737-8s' },
  // Americas
  { src: 18, loc: [-77.04, 38.9],  region: 'Americas',   hd: 'Trump urges faster federal executions' },
  { src: 19, loc: [-99.13, 19.43], region: 'Americas',   hd: 'Mexico, not US, to try El Chapo Isidro' },
  { src: 20, loc: [-82.36, 23.1],  region: 'Americas',   hd: 'WHO chief visits Cuba as care falters' },
  { src: 21, loc: [-72.34, 18.54], region: 'Americas',   hd: 'Bukele details troop deaths in Haiti' },
  // Europe
  { src: 15, loc: [37.6, 55.75],   region: 'Europe',     hd: 'Putin vows retaliation for oil-plant hits' },
  { src: 17, loc: [10.75, 59.91],  region: 'Europe',     hd: 'Cameroon rebel denies war crimes' },
  // Middle East
  { src: 14, loc: [34.45, 31.5],   region: 'Middle East', hd: 'Gaza: 7 killed; 272 meningitis cases' },
  { src: 16, loc: [30.52, 39.78],  region: 'Middle East', hd: 'Türkiye military helicopter crash kills 5' },
  // Africa
  { src: 22, loc: [29.4, 1.6],     region: 'Africa',     hd: 'CRP rebels halt their advance on Bunia' },
  { src: 23, loc: [13.15, 11.85],  region: 'Africa',     hd: 'Borno school rolls nearly double' },
  { src: 24, loc: [28.05, -26.2],  region: 'Africa',     hd: 'S Africa convicts Russia army hopeful' },
  // World (no single place: no `loc`, no pin, ink chip)
  { src: 28, region: 'World', hd: 'Arsenal 1-1 Dortmund; Real 5-1 PSV' },
  { src: 29, region: 'World', hd: 'Sooryavanshi, 15, hits 204 off 53 balls' },
  { src: 30, region: 'World', hd: 'WFP: wars imperil food aid for 7.3m' },
  { src: 31, region: 'World', hd: 'UN: partners, kin kill 5 women an hour' },
  { src: 32, region: 'World', hd: 'Guterres: AI oversight deal in a year' },
];
// Numbering is assigned here, in reading order, so no literal can drift out of sync.
const ALL = [...LEAD, ...CARDS, ...DIGEST];
ALL.forEach((s, i) => { s.n = i + 1; });
const FEATURED = LEAD.length + CARDS.length;
const srcs = ALL.map((s) => s.src).sort((a, b) => a - b);
if (srcs.length !== 32 || srcs.some((v, i) => v !== i + 1)) throw new Error('every sources.md row must appear exactly once');
for (const s of ALL) if (!REGION[s.region] && s.region !== 'World') throw new Error('unknown region ' + s.region);
const tally = REGION_ORDER.map((r) => [r, ALL.filter((s) => s.region === r).length]);
const color = (s) => REGION[s.region] ?? WORLD;
const byRow = Object.fromEntries(ALL.map((s) => [s.src, s]));

// ---- map pins ---------------------------------------------------------------------------------
// Featured stories get a numbered pin in their region colour; off:[dx, dy] moves a crowded pin and draws a tick back.
const PIN_OFF = { 1: [11, 0], 2: [0, -7], 3: [-11, 0], 4: [-1, 10], 5: [-11, 0], 6: [11, 0], 11: [1, -3] };
const PIN = 18, PH = PIN / 2;
const f1 = (v) => +v.toFixed(1);
const geo = { pins: [] };
let dots = '', ticks = '', pins = '';
for (const s of DIGEST) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc).map(f1);
  dots += `<circle cx="${x}" cy="${y}" r="3.6" fill="${color(s)}" stroke="#fff" stroke-width="1"/>`;
}
for (const s of [...LEAD, ...CARDS]) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc).map(f1);
  const [dx, dy] = PIN_OFF[s.n] ?? [0, 0];
  const X = f1(x + dx), Y = f1(y + dy);
  if (dx || dy) ticks += `<path d="M${x} ${y}L${X} ${Y}" stroke="${INK}" stroke-width="2"/>`;
  pins += `<g transform="translate(${X} ${Y})"><rect x="${-PH}" y="${-PH}" width="${PIN}" height="${PIN}" rx="4" fill="${color(s)}" stroke="#fff" stroke-width="1.5"/><text class="pn" y="5.5">${s.n}</text></g>`;
  geo.pins.push({ n: s.n, x: X, y: Y });
}

// ---- render -----------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (s) => `<span class="nb" style="background:${color(s)}"><i>${s.n}</i></span>`;
const kicker = (s) => `<div class="kick">${num(s)}<span class="pc">${esc(s.place)}</span></div>`;

const leads = LEAD.map((s) => `
<article class="lead">${kicker(s)}${LEAD_ART[s.art]()}<div class="fig">${esc(s.fig)}</div><h2 class="hd">${esc(s.hd)}</h2></article>`).join('');
const cards = CARDS.map((s) => `
<article class="card">${kicker(s)}<div class="cb">${SPOT[s.art]()}<div class="tx"><div class="fig2">${esc(s.fig)}</div><h3 class="h3">${esc(s.hd)}</h3></div></div></article>`).join('');
const digest = DIGEST.map((s) => `
<li>${num(s)}<span class="di">${esc(s.hd)}</span></li>`).join('');
const worldN = ALL.filter((s) => s.region === 'World').length;
// The unpinned rows close the digest, so the map note can give them as one range.
const unpinned = ALL.filter((s) => !s.loc).map((s) => s.n);
if (unpinned.some((n, i) => n !== ALL.length - unpinned.length + 1 + i)) throw new Error('unpinned stories must close the digest');
const legend = [...tally, ...(worldN ? [['World', worldN]] : [])]
  .map(([r, c]) => `<span class="lg"><b style="background:${REGION[r] ?? WORLD}"></b>${r} ${c}</span>`).join('');
const teaser = (row, text) => `<span class="ts">${num(byRow[row])}<span>${esc(text)}</span></span>`;

// Layout checker (CHECK=1 only): measures the laid-out page, writes a JSON report into document.title.
const checker = !process.env.CHECK ? '' : `<script>try{
const out=[],G=${JSON.stringify(geo)},R=${PH};
const html=[...document.querySelectorAll('body *')].filter(e=>!e.closest('svg')&&e.tagName!=='SCRIPT');
const trimmed=(e)=>getComputedStyle(e).textBoxTrim!=='none'||[...e.querySelectorAll('*')].some(c=>getComputedStyle(c).textBoxTrim!=='none');
html.forEach(e=>{if(!e.clientWidth&&!e.clientHeight)return;const cs=getComputedStyle(e),dx=e.scrollWidth-e.clientWidth,dy=cs.overflow!=='visible'&&!trimmed(e)?e.scrollHeight-e.clientHeight:0;if(dx>1||dy>1)out.push('CLIP '+(e.className||e.tagName)+' '+dx+'x'+dy+': '+e.textContent.trim().slice(0,48))});
document.querySelectorAll('.lead,.card,.tx,.map,.also,.legend').forEach(e=>{const r=e.getBoundingClientRect();e.querySelectorAll('*').forEach(c=>{if(c.closest('svg')&&c.tagName!=='svg')return;const q=c.getBoundingClientRect();if(q.height&&(q.bottom>r.bottom+.5||q.right>r.right+.5))out.push('CLIP '+e.className+' child past edge: '+c.textContent.trim().slice(0,40))})});
const lines=(e)=>Math.round(e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight));
document.querySelectorAll('.hd').forEach(e=>lines(e)>3&&out.push('CLIP lead headline '+lines(e)+' lines: '+e.textContent));
document.querySelectorAll('.h3').forEach(e=>lines(e)>3&&out.push('CLIP card headline '+lines(e)+' lines: '+e.textContent));
document.querySelectorAll('.di,.fig,.fig2').forEach(e=>lines(e)>1&&out.push('CLIP wraps: '+e.textContent));
const bands=[...document.querySelectorAll('[data-b]')].map(e=>[e.dataset.b,e,e.getBoundingClientRect()]);
bands.forEach(([a,,r],i)=>{bands.slice(i+1).forEach(([b,,q])=>{if(r.bottom>q.top+.5&&q.bottom>r.top+.5)out.push('OVERLAP bands '+a+'/'+b)});if(r.bottom>1024.5||r.right>1024.5)out.push('OFF PAGE '+a)});
const slack=bands.map(([a,e,r])=>{const k=[...e.querySelectorAll('*')].filter(c=>!c.closest('svg')||c.tagName==='svg').reduce((m,c)=>Math.max(m,c.getBoundingClientRect().bottom),0);return a+' '+Math.round(r.bottom-k)});
out.push('band slack: '+slack.join(' | '));
bands.forEach(([a,e,r])=>e.querySelectorAll('*').forEach(c=>{if(c.closest('svg')&&c.tagName!=='svg')return;const q=c.getBoundingClientRect();if(q.bottom>r.bottom+.5)out.push('OFF BAND '+a+' by '+Math.round(q.bottom-r.bottom)+': '+((c.className.baseVal??c.className)||c.tagName)+' '+c.textContent.trim().slice(0,30))}));
const room=(sel)=>{let mn=1e9;document.querySelectorAll(sel).forEach(e=>{const b=e.getBoundingClientRect().bottom,k=[...e.children].reduce((m,c)=>Math.max(m,c.getBoundingClientRect().bottom),0);mn=Math.min(mn,b-k)});return Math.round(mn)};
out.push('inner room (min, px): lead '+room('.lead')+' | card text '+room('.tx')+' | map col '+room('.map')+' | digest col '+room('.also'));
G.pins.forEach((a,i)=>G.pins.slice(i+1).forEach(b=>Math.abs(a.x-b.x)<2*R+1&&Math.abs(a.y-b.y)<2*R+1&&out.push('PINS overlap '+a.n+'/'+b.n)));
G.pins.forEach(p=>(p.x<R||p.y<R||p.x>${MAP_W}-R||p.y>${MAP_H}-R)&&out.push('PIN off map '+p.n));
const sz=new Set();html.forEach(e=>{if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))sz.add(parseFloat(getComputedStyle(e).fontSize))});
document.querySelectorAll('svg text').forEach(e=>sz.add(parseFloat(getComputedStyle(e).fontSize)));
const s=[...sz].sort((a,b)=>a-b);out.push('font sizes '+s.join(','));out.push('min font '+s[0]+' px');
out.push(out.some(l=>/^(CLIP|OVERLAP|OFF|PINS|PIN )/.test(l))?'RESULT: problems above':'RESULT: no clipping, no overlap');
document.title=JSON.stringify(out);
}catch(e){document.title=JSON.stringify(['checker error: '+e.message])}</script>`;

const SANS = '"Avenir Next","Helvetica Neue",sans-serif';
const COND = '"Avenir Next Condensed","Avenir Next","Helvetica Neue",sans-serif';
const DATE = '"DIN Condensed","Avenir Next Condensed",sans-serif';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tuesday 24 November 2026</title><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:${PAPER};color:${INK}}
body{position:relative;font:500 16px ${SANS};-webkit-font-smoothing:antialiased}
i{font-style:normal;text-box:trim-both cap alphabetic}
[data-b]{position:absolute;left:${M}px;width:${W - 2 * M}px}
.head{left:0;top:0;width:${W}px;height:${HEAD_H}px;background:${INK};color:${PAPER};padding:13px ${M}px 0;display:flex;flex-direction:column;justify-content:space-between}
.strap{display:flex;justify-content:space-between;font:700 17px/1 ${SANS};letter-spacing:.09em;text-transform:uppercase;color:#E9E3D6}
.strap b{color:#F2A58F;font-weight:800}
h1{font:700 96px/1 ${DATE};white-space:nowrap;padding-bottom:12px;text-box:trim-both cap alphabetic;color:#fff}
.deck{top:${DECK_Y}px;height:${DECK_H}px;display:flex;align-items:stretch;justify-content:space-between;font:700 19px/1 ${SANS};white-space:nowrap}
.ts{display:flex;align-items:center;gap:8px}
.ts>span:last-child{text-box:trim-both cap alphabetic}
.deck .nb{height:${DECK_H}px;min-width:30px;font-size:18px}
.rule{position:absolute;left:${M}px;width:${W - 2 * M}px;top:${RULE_Y}px;height:3px;background:${INK}}
.nb{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:26px;height:26px;padding:0 4px;color:#fff;font:800 16px/1 ${SANS}}
.kick{display:flex;align-items:center;gap:8px;height:26px;flex:none;border-bottom:3px solid ${INK}}
.pc{flex:1;min-width:0;font:700 15px/1 ${SANS};letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-box:trim-both cap alphabetic}
.lead .pc{font-size:16px}
.leads{top:${LEAD_Y}px;height:${LEAD_H}px;display:grid;grid-template-columns:repeat(4,1fr);column-gap:${COL_GAP}px}
.lead,.card{display:flex;flex-direction:column;overflow:hidden;min-width:0}
.lead>svg{display:block;width:100%;height:108px;flex:none;margin-top:6px}
.fig{font:800 34px/38px ${COND};color:${ACC};margin-top:3px;white-space:nowrap;letter-spacing:-.005em}
.hd{font:700 21px/24px ${SANS};letter-spacing:-.012em}
.secs{top:${SEC_Y}px;height:${SEC_H}px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,${SEC_ROW}px);gap:${SEC_GAP}px ${COL_GAP}px}
.cb{display:flex;gap:8px;margin-top:5px;flex:1;min-height:0}
.cb>svg{display:block;width:78px;height:78px;flex:none}
.tx{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.fig2{font:800 25px/26px ${COND};color:${ACC};white-space:nowrap;margin-top:-3px}
.h3{font:600 16px/18px ${COND};margin-top:1px}
.low{top:${LOW_Y}px;height:${LOW_H}px;display:grid;grid-template-columns:${MAP_W}px 1fr;column-gap:20px}
.sec{display:flex;align-items:center;height:28px;background:${INK};color:${PAPER};padding:0 9px;font:800 16px/1 ${SANS};letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.sec span{text-box:trim-both cap alphabetic}
.map,.also{display:flex;flex-direction:column;min-width:0}
.map svg{display:block;margin-top:6px;flex:none}
.pn{font:800 15px ${SANS};fill:#fff;text-anchor:middle}
.legend{display:grid;grid-template-columns:repeat(2,1fr);row-gap:5px;margin-top:5px;font:700 16px/1 ${SANS}}
.lg{display:flex;align-items:center;gap:6px;white-space:nowrap;text-box:trim-both cap alphabetic}
.lg b{width:14px;height:14px;flex:none;border-radius:3px}
.mnote{font:500 15px/18px ${SANS};color:${MUTE};margin-top:auto}
.digest{list-style:none;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(${Math.ceil(DIGEST.length / 2)},1fr);column-gap:16px;margin-top:4px;flex:1}
.digest li{display:flex;align-items:center;gap:8px;min-width:0}
.digest .nb{min-width:28px;height:20px;font-size:15px}
.di{font:500 16px/19px ${SANS};white-space:nowrap;overflow:hidden;min-width:0}
.foot{left:0;top:${FOOT_Y}px;width:${W}px;height:${FOOT_H}px;background:${INK};color:#E9E3D6;padding:7px ${M}px 0;display:flex;flex-direction:column;gap:4px}
.foot div{white-space:nowrap;overflow:hidden}
.foot .c1{font:600 17px/20px ${SANS};color:#fff}
.foot .c1 b{color:#F2A58F;font-weight:800}
.foot .c2{font:500 15px/18px ${SANS};flex:1}
</style></head><body>
<header class="head" data-b="head"><div class="strap"><span><b>What happened in the world on Tuesday</b></span><span>${ALL.length} stories · five continents</span></div>
<h1>TUESDAY 24 NOVEMBER 2026</h1></header>
<div class="deck" data-b="deck">${teaser(1, 'Hormuz oil traffic down 40%')}${teaser(6, 'Huawei guilty in US trial')}${teaser(10, 'Senegal reinstated as AFCON winners')}</div>
<div class="rule"></div>
<section class="leads" data-b="leads">${leads}</section>
<section class="secs" data-b="seconds">${cards}</section>
<section class="low" data-b="low">
<div class="map"><div class="sec"><span>Where it happened</span></div>
<svg width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
<rect width="${MAP_W}" height="${MAP_H}" fill="#CFDCDF"/><path d="${land}" fill="#E3DBC8" stroke="#FBF8F1" stroke-width=".6"/>
${dots}${ticks}${pins}</svg>
<div class="legend">${legend}</div>
<div class="mnote">Squares ${LEAD[0].n}–${FEATURED}, dots ${FEATURED + 1}–${unpinned[0] - 1}; ${unpinned[0]}–${ALL.length} unpinned</div></div>
<div class="also"><div class="sec"><span>Also on Tuesday 24 November 2026</span></div><ol class="digest">${digest}</ol></div>
</section>
<footer class="foot" data-b="foot">
<div class="c1"><b>Tuesday 24 November 2026.</b> Every story on this page happened, or was first reported, on 24 November 2026.</div>
<div class="c2">Sources: Al Jazeera, Wikipedia Current events · Map: Natural Earth · Scenes drawn for this page</div>
</footer>
${checker}
</body></html>`;

writeFileSync(new URL('atlas.html', here), html);
console.log('map', MAP_W + 'x' + MAP_H, 'stories', ALL.length, 'featured', FEATURED, 'pins', geo.pins.length,
  'regions', tally.map(([r, c]) => r + ' ' + c).join(', ') + ', World ' + ALL.filter((s) => s.region === 'World').length);
