// Builds design/atlas.html: a 1024x1024 news atlas of Tuesday 24 November 2026.
// Deterministic: no randomness, no network. Map data: Natural Earth via world-atlas (data/).
// CHECK=1 node design/build.mjs adds a layout checker to the page (collisions, overflow); render.sh never sets it.
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('./', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('data/countries-110m.json', here)));

// ---- projection (Miller, cropped) -------------------------------------------------------
const W = 1024, LON0 = -135, LAT_TOP = 70, LAT_BOT = -44, K = W / 300;
const MAP_Y = 104;
const miller = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180)) * 180 / Math.PI;
const MAP_H = Math.round((miller(LAT_TOP) - miller(LAT_BOT)) * K);
const px = (lon, lat) => [(lon - LON0) * K, (miller(LAT_TOP) - miller(lat)) * K];

// ---- topojson decode ----------------------------------------------------------------------
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

// ---- stories ----------------------------------------------------------------------------------
// Lead cards are CARD_W x CARD_H, placed in map coords at card:[x,y], at least INSET from the frame.
// from:[side, offset] is where the leader leaves the card: l/r edge at y offset, t/b edge at x offset.
const CARD_W = 184, CARD_H = 80, INSET = 12, PIN_R = 9;
const LEAD = [
  { n: 1, loc: [35.14, 47.84], place: 'Zaporizhzhia, Ukraine', icon: 'block',
    hd: 'Russian strike kills 2, injures 44', dk: 'Apartment block also hit',
    card: [612, 12], from: ['l', 72] },
  { n: 2, loc: [34.45, 31.5], place: 'Gaza', icon: 'target',
    hd: 'Israeli strike kills senior Hamas official', dk: 'Naim Abu Nahl, 50; four hurt',
    card: [420, 298], from: ['t', 170] },
  { n: 3, loc: [46.68, 24.71], place: 'Riyadh, Saudi Arabia', icon: 'drone',
    hd: 'Houthi drone hits Riyadh tower; 11 hurt', dk: 'Building in financial district',
    card: [624, 298], from: ['t', 12] },
  { n: 4, loc: [56.3, 26.5], place: 'Strait of Hormuz', icon: 'tanker',
    hd: 'Hormuz oil traffic down 40% amid tanker attacks', dk: 'Iran says 3 ships hit mines',
    card: [622, 100], from: ['b', 36] },
  { n: 5, loc: [-121.96, 37.35], place: 'Silicon Valley, US', icon: 'chip',
    hd: 'Huang back as Nvidia CEO; US blacklists Megaspeed', dk: 'Nvidia regains $952bn in value',
    card: [12, 12], from: ['b', 33] },
  { n: 6, loc: [149.13, -35.28], place: 'Canberra, Australia', icon: 'phone',
    hd: 'Tech giants face fines of up to 5% of revenue', dk: 'Bill expected to pass this week',
    card: [828, 318], from: ['b', 134] },
  { n: 7, loc: [-0.12, 51.5], place: 'United Kingdom', icon: 'thermo',
    hd: 'Record 5,258 heat deaths in UK summer', dk: 'Estimate by UK health agency',
    card: [240, 104], from: ['r', 12] },
  { n: 8, loc: [90.4, 23.8], place: 'Dhaka, Bangladesh', icon: 'plane',
    hd: 'Sheikh Hasina plans return from exile on 16 Dec', dk: 'Dhaka says only by extradition',
    card: [828, 12], from: ['b', 132] },
  { n: 9, loc: [101.7, 3.14], place: 'Kuala Lumpur', icon: 'boat',
    hd: 'Malaysia to send Rohingya back to Myanmar', dk: '5 days after ICJ genocide ruling',
    card: [828, 230], from: ['l', 49] },
  { n: 10, loc: [-17.45, 14.7], place: 'Dakar, Senegal', icon: 'trophy',
    hd: 'Senegal reinstated as AFCON 2025 champions', dk: 'Sport court rules against Morocco',
    card: [216, 298], from: ['t', 172] },
  { n: 11, loc: [-75.5, 10.4], place: 'Cartagena, Colombia', icon: 'cart',
    hd: 'Gunmen hold 25 hostages in a supermarket', dk: 'Police and army deployed',
    card: [12, 298], from: ['t', 172] },
  { n: 12, loc: [-73.95, 40.65], place: 'US federal court', icon: 'gavel',
    hd: 'Huawei guilty of trade-secrets conspiracy, fraud', dk: 'Jury clears it of racketeering',
    card: [216, 12], from: ['b', 14] },
];

// The list, in a 4-column grid: row 1 holds the four big regions, row 2 the rest.
// Numbers run 13-30 in reading order (row by row). Sport and worldwide stories carry no pin.
const SECTIONS = [
  { region: 'The Americas', items: [
    { loc: [-77.04, 38.9], off: [-17, 14], place: 'Washington',
      hd: 'Trump urges faster federal executions', dk: 'Attacks Newsom over 548 commutations' },
    { loc: [-107.4, 24.8], place: 'Sinaloa, Mexico',
      hd: 'Mexico to try ‘El Chapo Isidro’', dk: 'Drug and weapons charges, despite US bid' },
    { loc: [-82.36, 23.1], place: 'Havana, Cuba',
      hd: 'WHO chief visits as Cuba’s health care falters', dk: 'Fuel shortages deepen the crisis' },
  ] },
  { region: 'Europe', items: [
    { loc: [37.6, 55.75], place: 'Moscow',
      hd: 'Putin: retaliation ‘inevitable’ for oil-plant strikes', dk: 'Russian refining down 45% since late Oct' },
    { loc: [30.52, 39.78], place: 'Eskişehir, Türkiye',
      hd: 'Military helicopter crash kills five', dk: 'Second deadly army crash in days' },
    { loc: [10.75, 59.9], place: 'Norway',
      hd: 'Cameroon separatist denies war crimes', dk: 'Lucas Cho Ayaba pleads not guilty' },
  ] },
  { region: 'Africa', items: [
    { loc: [30.25, 1.56], place: 'Bunia, DR Congo',
      hd: 'CRP rebels halt advance on Bunia', dk: 'Retreat after heavy clashes with army' },
    { loc: [13.16, 11.85], place: 'Borno, Nigeria',
      hd: 'School enrolment nearly doubles in Borno', dk: 'Violence and poverty keep many out' },
    { loc: [28.05, -26.2], off: [0, 17], place: 'Johannesburg',
      hd: 'Zimbabwean convicted of trying to fight for Russia', dk: 'Arrested at the airport on 8 November' },
  ] },
  { region: 'Asia', items: [
    { loc: [105.83, 21.0], place: 'Hanoi, Vietnam',
      hd: 'Restaurant blast kills at least six', dk: 'At least 10 hurt in Dong Da district' },
    { loc: [129.5, 37.5], place: 'South Korea',
      hd: 'Air-raid alert as Russian jets near airspace', dk: 'Several jets on the verge of entering' },
    { loc: [113.26, 23.13], place: 'China',
      hd: 'China Southern unit to buy 50 Boeing 737s', dk: 'First big China order in nearly a decade' },
  ] },
  { region: 'Middle East', items: [
    { loc: [44.0, 36.0], place: 'Iraq',
      hd: 'Iraq orders takeover of Kurdish-held oilfields', dk: 'Al-Zaidi also orders crossings seized' },
    { loc: [34.45, 31.5], off: [-15, 23], place: 'Gaza',
      hd: 'Strikes kill 7 as meningitis spreads', dk: '272 cases in October, 8 times the norm' },
  ] },
  { region: 'Sport', items: [
    { place: 'Champions League',
      hd: 'Arsenal held 1-1 by Dortmund', dk: 'Real Madrid rout PSV 5-1' },
    { place: 'Cricket · India v UAE',
      hd: 'Sooryavanshi, 15, hits 204 off 53 balls', dk: '28 sixes, a men’s senior record' },
  ] },
  { region: 'Worldwide', items: [
    { place: 'World Food Programme',
      hd: 'Wars choke food routes; aid for 7.3m at risk', dk: 'Grain is “not reaching” those in need' },
    { place: 'UN Women',
      hd: 'Five women killed every hour by partner, kin', dk: 'Global figure for 2025' },
  ] },
];
let next = 13;
for (const sec of SECTIONS) for (const it of sec.items) it.n = next++;
const LAST = next - 1;
const PINNED_LAST = Math.max(...SECTIONS.flatMap((s) => s.items).filter((i) => i.loc).map((i) => i.n));

// Continent names, set in open water (map coords, text centre).
const REGIONS = [
  ['THE AMERICAS', 104, 278], ['EUROPE', 440, 26], ['AFRICA', 452, 287],
  ['MIDDLE EAST', 694, 256], ['ASIA', 988, 156], ['OCEANIA', 912, 433],
];

// ---- icons (24x24, ink line + one accent) -------------------------------------------------------
const I = {
  block: '<path d="M5 21V6h9v4l-2 2 2 2v7z"/><path d="M8 9h2M8 13h2M8 17h3" /><path class="a" d="M17 9l1.5 2 2.5-1-1 2.5 2 1.5-2.5.5.5 2.5-2-1.5-1.5 2z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/><circle class="a" cx="12" cy="12" r="1.6"/>',
  drone: '<rect x="9" y="10" width="6" height="4" rx="1" class="a"/><path d="M9 11L5 7M15 11l4-4M9 13l-4 4M15 13l4 4"/><path d="M2 6h6M16 6h6M2 18h6M16 18h6"/>',
  tanker: '<path d="M2 15h20l-2 5H5z"/><path d="M6 15v-3h4v3M15 15V9h3v6"/><path class="a" d="M8 11c-1-2 1-3 0-6 2 1 3 3 2 6z"/><path d="M1 22h22" />',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect class="a" x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M12 2v4M15 2v4M9 18v4M12 18v4M15 18v4M2 9h4M2 12h4M2 15h4M18 9h4M18 12h4M18 15h4"/>',
  derrick: '<path d="M12 2L6 22M12 2l6 20M8.5 14h7M7.3 18h9.4M10 8h4"/><path d="M3 22h18"/><circle class="a" cx="12" cy="2.5" r="1.5"/>',
  thermo: '<path d="M10 4a2 2 0 014 0v10.5a4 4 0 11-4 0z"/><circle class="a" cx="12" cy="17.5" r="2.4"/><path class="as" d="M12 8v8"/><path d="M17 6h3M17 9h3M17 12h3"/>',
  plane: '<path class="a" d="M21 4c-1-1-2.5-.5-3.5.5L14 8 5 5.5 3.5 7l7 4-3.5 3.5-3-.5L3 15l4 1.5L8.5 20.5 10 19.5l-.5-3 3.5-3.5 4 7 1.5-1.5L16 9.5 19.5 6c1-1 1.5-2.5.5-3.5z"/>',
  boat: '<path d="M2 15h20l-3 5H5z"/><circle class="a" cx="8" cy="10" r="1.6"/><circle class="a" cx="12" cy="10" r="1.6"/><circle class="a" cx="16" cy="10" r="1.6"/><path d="M7 15v-2.5h10V15"/>',
  trophy: '<path class="a" d="M7 3h10v5a5 5 0 01-10 0z"/><path d="M7 5H4c0 3 1.5 4.5 3.5 4.5M17 5h3c0 3-1.5 4.5-3.5 4.5M12 13v4M8 21h8M9 17h6v4H9z"/>',
  cart: '<path d="M2 4h3l2.5 11h11L21 7H6.2"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path class="as" d="M13.5 8.5v3M13.5 13v.3"/>',
  gavel: '<path d="M13.5 3.5l6 6M11 6l6 6M12.3 4.8l-3 3 6 6 3-3z"/><path d="M11.5 11L4 18.5l1.5 1.5L13 12.5"/><path class="a" d="M14 21h8v-2h-8z"/>',
  podium: '<path d="M6 9h12l-1.5 12h-9z"/><path d="M4 9h16"/><circle class="a" cx="12" cy="5" r="2.2"/><path d="M12 7.2V9"/>',
  syringe: '<path d="M18 2l4 4M20 4l-3 3M17 7l-9.5 9.5-2-2L15 5z"/><path d="M5.5 14.5L3 17l4 4 2.5-2.5"/><path class="as" d="M10.5 9.5l2 2M8.5 11.5l2 2"/>',
  cuffs: '<circle cx="7" cy="15" r="4.5"/><circle cx="17" cy="15" r="4.5"/><path class="as" d="M10.5 9.5l3 0M7 10.5V7.5M17 10.5V7.5M7 7.5h10"/>',
  cross: '<circle cx="12" cy="12" r="9.5"/><path class="a" d="M10 6h4v4h4v4h-4v4h-4v-4H6v-4h4z"/>',
  car: '<path d="M3 17v-4l2-4h10l3 4h2v4z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/><path class="a" d="M17 2l1 3 3-1-1.5 2.8L22 8l-3 .5"/>',
  flame: '<path d="M4 22V10h4v12M10 22V6h4v16M2 22h18"/><path class="a" d="M18 22c-3 0-4-3-2-6 0 2 1.5 2 1.5 2 0-3 1-5 3-6-1 3 2 4 1 7-.5 2-2 3-3.5 3z"/>',
  heli: '<path d="M3 5h16M11 5v3"/><path d="M6 10h9a4 4 0 010 8H9l-3-4z"/><path d="M6 13H2l-1-2M9 21h9M12 18v3M15 18v3"/><circle class="a" cx="16" cy="12.5" r="1.6"/>',
  ball: '<circle cx="12" cy="12" r="9.5"/><path class="a" d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 7.5V2.5M16 10.4l5-1.5M14.5 15.1l3 4M9.5 15.1l-3 4M8 10.4L3 8.9"/>',
  book: '<path d="M2 5c3-1 7-1 10 1 3-2 7-2 10-1v14c-3-1-7-1-10 1-3-2-7-2-10-1z"/><path d="M12 6v14"/><path class="as" d="M5 9h4M5 12h4M15 9h4M15 12h4"/>',
  shield: '<path d="M12 2l8 3v6c0 5.5-3.5 9-8 11-4.5-2-8-5.5-8-11V5z"/><path class="as" d="M8 12l3 3 5-6"/>',
  virus: '<circle class="a" cx="12" cy="12" r="5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19"/>',
  bus: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 11h18M8 4v7M16 4v7"/><circle class="a" cx="7.5" cy="19.5" r="1.8"/><circle class="a" cx="16.5" cy="19.5" r="1.8"/>',
  burst: '<path class="a" d="M12 1.5l2 6 5.5-3-2.5 6 6 1.5-6 2.5 3 5.5-6-2.5-2 6-2-6-6 2.5 3-5.5-6-2.5 6-1.5-2.5-6 5.5 3z"/>',
  rocket: '<path d="M12 2c3.5 3 4.5 7.5 3.5 12.5h-7C7.5 9.5 8.5 5 12 2z"/><circle cx="12" cy="9" r="1.8"/><path d="M8.5 12L5 16v2l3.5-2M15.5 12L19 16v2l-3.5-2"/><path class="a" d="M10 15.5h4l-2 6.5z"/>',
  jet: '<path class="a" d="M12 1.5l1.5 6 8 6v2l-8-3-.5 5 3 2.5v1.5L12 20l-4 1.5V20l3-2.5-.5-5-8 3v-2l8-6z"/>',
  lens: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l7 7"/><path class="as" d="M7 10h6M10 7v6"/>',
  bat: '<path d="M4 20l9-9 3 3-9 9z"/><path d="M13 11l4.5-4.5M17 4l3 3"/><circle class="a" cx="18" cy="17" r="3"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 19h4"/><path class="as" d="M12 7v5M12 14v.3"/>',
  wheat: '<path d="M12 22V6"/><path class="a" d="M12 6c-3-1-3-4 0-5 3 1 3 4 0 5zM12 11c-3 0-5-2-5-4 3 0 5 1.5 5 4zM12 11c3 0 5-2 5-4-3 0-5 1.5-5 4zM12 16c-3 0-5-2-5-4 3 0 5 1.5 5 4zM12 16c3 0 5-2 5-4-3 0-5 1.5-5 4z"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19"/><rect class="a" x="15" y="15" width="8" height="8" rx="1"/>',
  person: '<circle cx="12" cy="5" r="3"/><path class="a" d="M12 9c-3 0-4.5 2-5 5l-2 5h5l.5 3.5h3L14 19h5l-2-5c-.5-3-2-5-5-5z"/>',
};


// ---- render ----------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const icon = (id) => `<svg class="ic" viewBox="0 0 24 24"><use href="#i-${id}"/></svg>`;
const symbols = Object.entries(I).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
const badge = (n, cls) => `<span class="bd ${cls}">${n}</span>`;
const f1 = (v) => +v.toFixed(1);

const graticule = [];
for (let lon = -120; lon <= 160; lon += 30) { const [x] = px(lon, 0); graticule.push(`M${x.toFixed(1)} 0V${MAP_H}`); }
for (const lat of [-30, 0, 30, 60]) { const [, y] = px(0, lat); graticule.push(`M0 ${y.toFixed(1)}H${W}`); }
const [, eqY] = px(0, 0);

const anchor = ({ card: [x, y], from: [side, o] }) =>
  side === 'l' ? [x, y + o] : side === 'r' ? [x + CARD_W, y + o] : side === 't' ? [x + o, y] : [x + o, y + CARD_H];

// Geometry, kept for the checker: pins {n, x, y} at badge centres, leaders [x1, y1, x2, y2, n].
const geo = { pins: [], leaders: [], cards: LEAD.map((s) => ({ n: s.n, x: s.card[0], y: s.card[1] })) };
// Draw order: link lines, then black pins, then red pins, so a lead pin is never covered.
let leaders = '', links = '', pinsK = '', pinsR = '';
for (const s of LEAD) {
  const [x, y] = px(...s.loc).map(f1);
  const [ax, ay] = anchor(s);
  geo.leaders.push([x, y, ax, ay, s.n]);
  leaders += `<path class="ld" d="M${x} ${y}L${ax} ${ay}"/><circle class="ae" cx="${ax}" cy="${ay}" r="2.2"/>`;
  pinsR += `<g transform="translate(${x} ${y})"><circle class="pr" r="${PIN_R}"/><text class="pn" y="3.6">${s.n}</text></g>`;
  geo.pins.push({ n: s.n, x, y });
}
for (const s of SECTIONS.flatMap((sec) => sec.items)) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc).map(f1);
  const [dx, dy] = s.off ?? [0, 0];
  if (dx || dy) links += `<path class="lk" d="M${x} ${y}l${dx} ${dy}"/><circle class="dot" cx="${x}" cy="${y}" r="2"/>`;
  pinsK += `<g transform="translate(${f1(x + dx)} ${f1(y + dy)})"><circle class="pk" r="${PIN_R}"/><text class="pn" y="3.6">${s.n}</text></g>`;
  geo.pins.push({ n: s.n, x: f1(x + dx), y: f1(y + dy) });
}
const regionLabels = REGIONS.map(([t, x, y]) => `<text class="cl" x="${x}" y="${y}">${t}</text>`).join('');

const cards = LEAD.map((s) => `
<div class="card" data-n="${s.n}" style="left:${s.card[0]}px;top:${s.card[1]}px">
  <div class="kick">${badge(s.n, 'r')}<span class="pc">${esc(s.place)}</span>${icon(s.icon)}</div>
  <div class="hd">${esc(s.hd)}</div><div class="dk">${esc(s.dk)}</div>
</div>`).join('');

const cells = SECTIONS.map((sec) => `<div class="cell"><div class="tab">${sec.region}</div>${sec.items.map((s) => `
<div class="it">${badge(s.n, 'k')}<div><div class="pl2">${esc(s.place)}</div><div class="h2">${esc(s.hd)}</div><div class="d2">${esc(s.dk)}</div></div></div>`).join('')}</div>`).join('')
  + `<div class="cell"><div class="tab">Sources</div><p class="src">Al Jazeera reports dated 24 Nov 2026 and Wikipedia’s Current events portal for that day. Figures as reported; claims attributed.</p><p class="src">Map: Natural Earth. Pins mark the city or country named in the report and are approximate.</p></div>`;

// Layout checker (CHECK=1 only): writes a JSON report into document.title for headless --dump-dom.
const checker = !process.env.CHECK ? '' : `<script>try{
const G=${JSON.stringify(geo)},CW=${CARD_W},CH=${CARD_H},R=${PIN_R},IN=${INSET},MW=${W},MH=${MAP_H},MY=${MAP_Y};
const out=[];const hit=(a,b,p=0)=>a.x<b.x+b.w+p&&b.x<a.x+a.w+p&&a.y<b.y+b.h+p&&b.y<a.y+a.h+p;
const cards=G.cards.map(c=>({n:c.n,x:c.x,y:c.y,w:CW,h:CH}));
const pins=G.pins.map(p=>({n:p.n,x:p.x-R,y:p.y-R,w:2*R,h:2*R,cx:p.x,cy:p.y}));
const labs=[...document.querySelectorAll('.cl')].map(t=>{const b=t.getBBox();return{n:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});
cards.forEach((a,i)=>{if(a.x<IN||a.y<IN||a.x+CW>MW-IN||a.y+CH>MH-IN)out.push('card '+a.n+' outside inset');
  cards.slice(i+1).forEach(b=>hit(a,b,6)&&out.push('cards '+a.n+'/'+b.n));
  pins.forEach(p=>hit(a,p,2)&&out.push('card '+a.n+' covers pin '+p.n));
  labs.forEach(l=>hit(a,l,2)&&out.push('card '+a.n+' covers label '+l.n));});
labs.forEach(l=>pins.forEach(p=>hit(l,p,1)&&out.push('label '+l.n+' on pin '+p.n)));
pins.forEach((a,i)=>pins.slice(i+1).forEach(b=>Math.hypot(a.cx-b.cx,a.cy-b.cy)<2*R+3&&out.push('pins '+a.n+'/'+b.n)));
const near=(x1,y1,x2,y2,px,py)=>{const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x1+t*dx-px,y1+t*dy-py)};
G.leaders.forEach(([x1,y1,x2,y2,n],i)=>{
  for(let k=1;k<40;k++){const x=x1+(x2-x1)*k/40,y=y1+(y2-y1)*k/40;
    cards.forEach(c=>c.n!==n&&x>c.x-3&&x<c.x+CW+3&&y>c.y-3&&y<c.y+CH+3&&out.push('leader '+n+' crosses card '+c.n));
    labs.forEach(l=>x>l.x&&x<l.x+l.w&&y>l.y&&y<l.y+l.h&&out.push('leader '+n+' crosses label '+l.n));}
  pins.forEach(p=>p.n!==n&&near(x1,y1,x2,y2,p.cx,p.cy)<R+3&&out.push('leader '+n+' grazes pin '+p.n));
  G.leaders.slice(i+1).forEach(([a1,b1,a2,b2,m])=>{const d=(x2-x1)*(b2-b1)-(y2-y1)*(a2-a1);if(!d)return;
    const t=((a1-x1)*(b2-b1)-(b1-y1)*(a2-a1))/d,u=((a1-x1)*(y2-y1)-(b1-y1)*(x2-x1))/d;t>0&&t<1&&u>0&&u<1&&out.push('leaders '+n+'/'+m+' cross')});});
document.querySelectorAll('.card').forEach(c=>{c.scrollHeight>c.clientHeight+1&&out.push('card '+c.dataset.n+' overflows by '+(c.scrollHeight-c.clientHeight));
  const h=c.querySelector('.hd');h.offsetHeight>2*parseFloat(getComputedStyle(h).lineHeight)+1&&out.push('card '+c.dataset.n+' head >2 lines');});
document.querySelectorAll('.dk,.d2,.pc,.pl2').forEach(d=>d.scrollWidth>d.clientWidth+1&&out.push('one-liner wraps/clips: '+d.textContent));
document.querySelectorAll('.h2').forEach(d=>d.offsetHeight>2*parseFloat(getComputedStyle(d).lineHeight)+1&&out.push('list head >2 lines: '+d.textContent));
const cols=document.querySelector('.cols');cols.scrollHeight>cols.clientHeight+1&&out.push('list overflows by '+(cols.scrollHeight-cols.clientHeight));
const tabs=[...document.querySelectorAll('.tab')].map(t=>t.getBoundingClientRect());
out.push('tab tops '+tabs.map(t=>Math.round(t.top)).join(','),'tab widths '+[...new Set(tabs.map(t=>Math.round(t.width)))].join(','),'list slack '+Math.round(cols.getBoundingClientRect().bottom-Math.max(...[...document.querySelectorAll('.it,.src')].map(e=>e.getBoundingClientRect().bottom))));
let min=99;document.querySelectorAll('body *').forEach(e=>{if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))min=Math.min(min,parseFloat(getComputedStyle(e).fontSize))});
document.querySelectorAll('text').forEach(e=>min=Math.min(min,parseFloat(getComputedStyle(e).fontSize)));out.push('min font '+min);
document.title=JSON.stringify(out);
}catch(e){document.title=JSON.stringify(['checker error: '+e.message])}</script>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>atlas</title><style>
:root{--paper:#F4F0E6;--ink:#191C22;--mute:#3E424A;--acc:#C0391F;--sea:#D8E2E3;--land:#E8E0CD}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:var(--paper);color:var(--ink)}
body{position:relative;font-family:"Avenir Next Condensed","Avenir Next","Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.disp{font-family:Charter,"Bitstream Charter",Georgia,serif}
.top{position:absolute;left:20px;right:20px;top:12px;display:flex;justify-content:space-between;font-size:11.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid var(--ink);padding-bottom:5px}
.top .l{color:var(--acc)}
h1{position:absolute;left:18px;top:32px;font-size:54px;line-height:60px;font-weight:700;letter-spacing:-.01em}
.key{position:absolute;right:20px;top:38px;width:292px;font-size:13px;line-height:20px;font-weight:600}
.key div{display:flex;align-items:center;gap:7px;height:20px}
.key em{font-style:normal;font-weight:500;color:var(--mute)}
.bd{display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;border-radius:50%;color:#fff;font:700 10.5px/1 Charter,Georgia,serif;letter-spacing:-.02em}
.bd.r{background:var(--acc)} .bd.k{background:var(--ink)} .bd.o{background:none;border:1.5px dashed var(--mute)}
.map{position:absolute;left:0;top:${MAP_Y}px;width:${W}px;height:${MAP_H}px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.map>svg{position:absolute;left:0;top:0}
.sea{fill:var(--sea)} .land{fill:var(--land);stroke:#F8F5EE;stroke-width:.6}
.gr{fill:none;stroke:#C6D1D2;stroke-width:.6} .eq{fill:none;stroke:#AEBBBC;stroke-width:.8;stroke-dasharray:3 3}
.cl{font:700 12px "Avenir Next Condensed","Avenir Next",sans-serif;letter-spacing:.3em;fill:#55707A;text-anchor:middle}
.ld{fill:none;stroke:var(--acc);stroke-width:1.4} .ae{fill:var(--acc)}
.lk{fill:none;stroke:var(--ink);stroke-width:1.1} .dot{fill:var(--ink)}
.pr{fill:var(--acc);stroke:#fff;stroke-width:1.5} .pk{fill:var(--ink);stroke:#fff;stroke-width:1.5}
.pn{font:700 10.5px Charter,Georgia,serif;fill:#fff;text-anchor:middle;letter-spacing:-.02em}
.card{position:absolute;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;background:rgba(255,253,248,.97);border:1px solid var(--ink);border-left:3px solid var(--acc);padding:5px 6px 0 7px}
.kick{display:flex;align-items:center;gap:6px;height:18px}
.pc{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mute);white-space:nowrap;overflow:hidden;flex:1}
.ic{width:18px;height:18px;flex:none}
svg use{fill:none;stroke:var(--ink);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
symbol .a{fill:var(--acc);stroke:none} symbol .as{stroke:var(--acc)}
.hd{font-size:15px;line-height:16px;font-weight:700;margin-top:3px;text-wrap:balance}
.dk{font-size:12px;line-height:14px;color:var(--mute);font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden}
.also{position:absolute;left:20px;right:20px;top:${MAP_Y + MAP_H + 10}px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:4px}
.also .t{font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.also .s{font-size:12px;color:var(--mute);font-weight:500}
.cols{position:absolute;left:20px;right:20px;top:${MAP_Y + MAP_H + 42}px;bottom:10px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:auto auto;column-gap:22px;row-gap:10px;align-content:start;overflow:hidden}
.tab{font-size:11.5px;line-height:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);border-bottom:1.5px solid var(--ink);padding-bottom:3px;margin-bottom:7px}
.it{display:flex;gap:8px;margin-bottom:10px}
.it>div{min-width:0;flex:1}
.it .bd{margin-top:-1px}
.pl2{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mute);line-height:14px;white-space:nowrap;overflow:hidden}
.h2{font-size:15px;line-height:16.5px;font-weight:700;margin-top:1px;text-wrap:balance}
.d2{font-size:12.5px;line-height:15px;color:var(--mute);font-weight:500;white-space:nowrap;overflow:hidden;margin-top:1px}
.src{font-size:12px;line-height:15px;color:var(--mute);font-weight:500;margin-bottom:6px}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>${symbols}</defs></svg>
<div class="top"><span class="l">One day on Earth</span><span>An atlas of the day’s news · ${LAST} stories across six regions</span></div>
<h1 class="disp">Tuesday 24 November 2026</h1>
<div class="key">
<div>${badge('1', 'r')}Red pins 1–12 <em>lead stories, told on the map</em></div>
<div>${badge('13', 'k')}Black pins 13–${PINNED_LAST} <em>also on Tuesday, listed below</em></div>
<div>${badge('', 'o')}${PINNED_LAST + 1}–${LAST} <em>sport and worldwide stories: no pin</em></div>
</div>
<div class="map">
<svg width="${W}" height="${MAP_H}" viewBox="0 0 ${W} ${MAP_H}">
<rect class="sea" width="${W}" height="${MAP_H}"/>
<path class="gr" d="${graticule.join('')}"/>
<path class="land" d="${land}"/>
<path class="eq" d="M0 ${eqY.toFixed(1)}H${W}"/>
${regionLabels}
${leaders}
</svg>
${cards}
<svg width="${W}" height="${MAP_H}" viewBox="0 0 ${W} ${MAP_H}" style="pointer-events:none">${links}${pinsK}${pinsR}</svg>
</div>
<div class="also"><span class="t">Also on Tuesday 24 November</span><span class="s">Numbers match the black pins · ${PINNED_LAST + 1}–${LAST} have no pin</span></div>
<div class="cols">${cells}</div>
${checker}
</body></html>`;

writeFileSync(new URL('atlas.html', here), html);
console.log('map height', MAP_H, 'stories', LEAD.length + SECTIONS.flatMap((s) => s.items).length);
