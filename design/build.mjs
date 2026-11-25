// Builds design/atlas.html: a 1024x1024 news atlas of Tuesday 24 November 2026.
// Deterministic: no randomness, no network. Map data: Natural Earth via world-atlas (data/).
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

const NEWS = new Set(['Ukraine', 'Israel', 'Palestine', 'Saudi Arabia', 'Iran', 'Iraq', 'United Kingdom',
  'Bangladesh', 'Malaysia', 'Senegal', 'Colombia', 'United States of America', 'Mexico', 'Cuba', 'Russia',
  'Turkey', 'Norway', 'Dem. Rep. Congo', 'Nigeria', 'South Africa', 'United Arab Emirates', 'Vietnam',
  'Pakistan', 'South Korea', 'China', 'Australia', 'Myanmar']);
let land = '', news = '';
for (const g of topo.objects.countries.geometries) {
  if (g.properties.name === 'Antarctica') continue;
  const d = geomPath(g);
  if (NEWS.has(g.properties.name)) news += d; else land += d;
}

// ---- stories ----------------------------------------------------------------------------------
// lead: card {x,y} in map coords, anchor {ax,ay} where the leader meets the card.
// off: badge offset from the true location, for crowded spots.
const LEAD = [
  { n: 1, loc: [35.14, 47.84], place: 'Zaporizhzhia, Ukraine', icon: 'block',
    hd: 'Russian strike kills 2, injures 44', dk: 'House destroyed, apartment block hit',
    card: [612, 8], anchor: [636, 68] },
  { n: 2, loc: [34.45, 31.5], place: 'Gaza', icon: 'target',
    hd: 'Israeli strike kills senior Hamas official', dk: 'Naim Abu Nahl, 50; four others hurt',
    card: [356, 158], anchor: [560, 182] },
  { n: 3, loc: [46.68, 24.71], place: 'Riyadh, Saudi Arabia', icon: 'drone',
    hd: 'Houthi drone hits Riyadh tower; 11 hurt', dk: 'Building in the financial district',
    card: [612, 372], anchor: [640, 372] },
  { n: 4, loc: [56.3, 26.5], place: 'Strait of Hormuz', icon: 'tanker',
    hd: 'Hormuz oil traffic down 40% as tanker attacks rise', dk: 'Iran: three ships hit mines, caught fire',
    card: [692, 300], anchor: [716, 300] },
  { n: 5, loc: [-121.96, 37.35], place: 'Silicon Valley, US', icon: 'chip',
    hd: 'Huang returns as Nvidia CEO; US blacklists Megaspeed', dk: 'Nvidia regains $952bn in market value',
    card: [8, 8], anchor: [46, 70] },
  { n: 6, loc: [44.0, 36.0], place: 'Iraq', icon: 'derrick',
    hd: 'Iraq orders takeover of Kurdish-held oilfields', dk: 'Al-Zaidi also orders crossings seized',
    card: [630, 78], anchor: [640, 138] },
  { n: 7, loc: [-0.12, 51.5], place: 'United Kingdom', icon: 'thermo',
    hd: 'Record 5,258 heat deaths in UK summer', dk: 'UK Health Security Agency estimate',
    card: [246, 84], anchor: [438, 108] },
  { n: 8, loc: [90.4, 23.8], place: 'Dhaka, Bangladesh', icon: 'plane',
    hd: 'Sheikh Hasina plans return from exile on 16 Dec', dk: 'Dhaka says she can only be extradited',
    card: [824, 78], anchor: [840, 140] },
  { n: 9, loc: [101.7, 3.14], place: 'Kuala Lumpur, Malaysia', icon: 'boat',
    hd: 'Malaysia to send thousands of Rohingya to Myanmar', dk: 'Five days after ICJ genocide ruling',
    card: [834, 226], anchor: [834, 262] },
  { n: 10, loc: [-17.45, 14.7], place: 'Dakar, Senegal', icon: 'trophy',
    hd: 'Senegal reinstated as AFCON 2025 champions', dk: 'Sport court rules against Morocco',
    card: [300, 322], anchor: [398, 322] },
  { n: 11, loc: [-75.5, 10.4], place: 'Cartagena, Colombia', icon: 'cart',
    hd: 'Gunmen hold 25 hostages in a supermarket', dk: 'Police and army deployed to the scene',
    card: [8, 300], anchor: [150, 300] },
  { n: 12, loc: [-73.95, 40.65], place: 'US federal court', icon: 'gavel',
    hd: 'Huawei guilty of trade-secrets conspiracy, fraud', dk: 'Jury clears it of racketeering charge',
    card: [212, 8], anchor: [226, 70] },
];

const LIST = [
  { region: 'The Americas' },
  { n: 13, loc: [-77.04, 38.9], off: [-14, 12], place: 'Washington', icon: 'podium',
    hd: 'Trump urges faster federal executions', dk: 'Attacks Newsom over 548 commuted death sentences' },
  { n: 14, loc: [-77.5, 40.6], off: [-20, -6], place: 'Pennsylvania, US', icon: 'syringe',
    hd: 'Ninth measles death in state outbreak', dk: 'Outbreak has spread to 46 counties' },
  { n: 15, loc: [-107.4, 24.8], place: 'Sinaloa, Mexico', icon: 'cuffs',
    hd: 'Mexico to try ‘El Chapo Isidro’ at home', dk: 'Drug, arms charges at home despite US bid' },
  { n: 16, loc: [-82.36, 23.1], place: 'Havana, Cuba', icon: 'cross',
    hd: 'WHO chief visits as Cuba’s health care falters', dk: 'Fuel shortages deepen the crisis' },
  { n: 17, loc: [-74.1, 4.6], place: 'Colombia', icon: 'car',
    hd: 'President blames ex-FARC rebels for car bomb', dk: 'Blast injured dozens; De la Espriella vows response' },
  { region: 'Europe' },
  { n: 18, loc: [37.6, 55.75], place: 'Moscow', icon: 'flame',
    hd: 'Putin: retaliation ‘inevitable’ for oil-plant strikes', dk: 'Drones cut Russian refining 45% since late Oct' },
  { n: 19, loc: [30.52, 39.78], off: [-6, -12], place: 'Eskişehir, Türkiye', icon: 'heli',
    hd: 'Military helicopter crash kills five', dk: 'Second deadly army crash in days' },
  { n: 20, loc: [-0.12, 51.5], off: [4, 18], place: 'Champions League', icon: 'ball',
    hd: 'Arsenal held 1-1 by Dortmund', dk: 'Real Madrid rout PSV 5-1' },
  { n: 21, loc: [10.75, 59.9], place: 'Norway', icon: 'gavel',
    hd: 'Cameroon separatist denies war crimes', dk: 'Lucas Cho Ayaba pleads not guilty' },
  { region: 'Africa' },
  { n: 22, loc: [30.25, 1.56], place: 'Bunia, DR Congo', icon: 'shield',
    hd: 'CRP rebels halt advance on Bunia', dk: 'Retreat after heavy clashes with the army' },
  { n: 23, loc: [13.16, 11.85], place: 'Borno, Nigeria', icon: 'book',
    hd: 'School enrolment nearly doubles in Borno', dk: 'Violence and poverty still keep many out' },
  { n: 24, loc: [28.05, -26.2], place: 'Johannesburg', icon: 'gavel',
    hd: 'Zimbabwean convicted of trying to fight for Russia', dk: 'Arrested at the airport on 8 November' },
  { region: 'Middle East' },
  { n: 25, loc: [34.45, 31.5], off: [-24, 4], place: 'Gaza', icon: 'virus',
    hd: 'Strikes kill 7 as meningitis spreads', dk: '272 cases in October, eight times the norm' },
  { n: 26, loc: [55.95, 25.8], off: [14, 12], place: 'Ras Al Khaimah, UAE', icon: 'bus',
    hd: 'Bus crash kills 13 in the UAE', dk: 'Crash in the emirate of Ras Al Khaimah' },
  { region: 'Asia' },
  { n: 27, loc: [105.83, 21.0], place: 'Hanoi, Vietnam', icon: 'burst',
    hd: 'Restaurant blast kills at least six', dk: 'At least 10 hurt in Dong Da district' },
  { n: 28, loc: [73.05, 33.7], place: 'Pakistan', icon: 'rocket',
    hd: 'Pakistani pilot set to fly to Tiangong', dk: 'Zeeshan Ali to spend a week on China’s station' },
  { n: 29, loc: [129.5, 37.5], place: 'South Korea', icon: 'jet',
    hd: 'Air-raid alert as Russian jets near airspace', dk: 'Several jets on the verge of entering' },
  { n: 30, loc: [121.47, 31.23], place: 'Shanghai, China', icon: 'lens',
    hd: 'Shanghai party chief Chen Jining probed', dk: 'Fourth Politburo member targeted since last year' },
  { n: 31, loc: [113.26, 23.13], place: 'China', icon: 'plane',
    hd: 'China Southern unit to buy 50 Boeing 737s', dk: 'Boeing’s first big China order in nearly a decade' },
  { n: 32, place: 'Cricket · India v UAE', icon: 'bat',
    hd: 'Sooryavanshi, 15, hits 204 off 53 balls', dk: '28 sixes, most ever in a senior men’s innings' },
  { region: 'Oceania' },
  { n: 33, loc: [149.13, -35.28], place: 'Canberra, Australia', icon: 'phone',
    hd: 'Tech giants face fines up to 5% of revenue', dk: 'Online-harm bill expected to pass this week' },
  { region: 'Worldwide' },
  { n: 34, place: 'World Food Programme', icon: 'wheat',
    hd: 'Wars choke food routes; aid for 7.3m at risk', dk: 'Grain is “not reaching” those in need, WFP says' },
  { n: 35, place: 'United Nations', icon: 'globe',
    hd: 'Guterres wants AI oversight deal within a year', dk: 'UN chief steps up AI push as term nears end' },
  { n: 36, place: 'UN Women', icon: 'person',
    hd: 'Five women killed every hour by partner, kin', dk: 'Global figure for 2025; home most dangerous place' },
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
const icon = (id, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24"><use href="#i-${id}"/></svg>`;
const symbols = Object.entries(I).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');

const graticule = [];
for (let lon = -120; lon <= 160; lon += 30) { const [x] = px(lon, 0); graticule.push(`M${x.toFixed(1)} 0V${MAP_H}`); }
for (const lat of [-30, 0, 30, 60]) { const [, y] = px(0, lat); graticule.push(`M0 ${y.toFixed(1)}H${W}`); }
const [, eqY] = px(0, 0);

let leaders = '', pins = '';
for (const s of LEAD) {
  const [x, y] = px(...s.loc);
  leaders += `<path class="ld" d="M${x.toFixed(1)} ${y.toFixed(1)}L${s.anchor[0]} ${s.anchor[1]}"/><circle class="ae" cx="${s.anchor[0]}" cy="${s.anchor[1]}" r="2"/>`;
  pins += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="pl" r="10"/><text class="pn" y="4">${s.n}</text></g>`;
}
for (const s of LIST) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc);
  const [dx, dy] = s.off ?? [0, 0];
  if (dx || dy) pins += `<path class="lk" d="M${x.toFixed(1)} ${y.toFixed(1)}l${dx} ${dy}"/><circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8"/>`;
  pins += `<g transform="translate(${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)})"><circle class="ps" r="8"/><text class="pm" y="3.3">${s.n}</text></g>`;
}

const cards = LEAD.map((s) => `
<div class="card" style="left:${s.card[0]}px;top:${s.card[1]}px">
  ${icon(s.icon)}
  <div><div class="kick"><b>${s.n}</b>${esc(s.place)}</div><div class="hd">${esc(s.hd)}</div><div class="dk">${esc(s.dk)}</div></div>
</div>`).join('');

const items = LIST.map((s) => s.region
  ? `<div class="reg">${s.region}</div>`
  : `<div class="it">${icon(s.icon, 'ic2')}<div><div class="pl2"><b>${s.n}</b>${esc(s.place)}</div><div class="h2">${esc(s.hd)}</div><div class="d2">${esc(s.dk)}</div></div></div>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--paper:#F4F0E6;--ink:#191C22;--mute:#5B5E66;--acc:#C0391F;--sea:#DAE3E3;--land:#E9E2D2;--news:#E7CBB8}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:var(--paper);color:var(--ink)}
body{position:relative;font-family:"Avenir Next Condensed","Avenir Next","Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.disp{font-family:Charter,"Bitstream Charter",Georgia,serif}
.top{position:absolute;left:20px;right:20px;top:12px;display:flex;justify-content:space-between;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid var(--ink);padding-bottom:5px}
.top .l{color:var(--acc)}
h1{position:absolute;left:18px;top:30px;font-size:54px;line-height:60px;font-weight:700;letter-spacing:-.01em}
.deck{position:absolute;right:20px;top:38px;width:300px;font-size:13.5px;line-height:17px;color:var(--ink);font-weight:500}
.deck b{color:var(--acc);font-weight:700}
.map{position:absolute;left:0;top:${MAP_Y}px;width:${W}px;height:${MAP_H}px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.map>svg{position:absolute;left:0;top:0}
.sea{fill:var(--sea)} .land{fill:var(--land);stroke:#F8F5EE;stroke-width:.6} .nw{fill:var(--news);stroke:#F8F5EE;stroke-width:.6}
.gr{fill:none;stroke:#C9D3D3;stroke-width:.6} .eq{fill:none;stroke:#B5C1C1;stroke-width:.8;stroke-dasharray:3 3}
.ld{fill:none;stroke:var(--acc);stroke-width:1.3} .ae{fill:var(--acc)}
.lk{fill:none;stroke:var(--ink);stroke-width:1} .dot{fill:var(--ink)}
.pl{fill:var(--acc);stroke:#fff;stroke-width:1.8} .pn{font:700 12px Charter,Georgia,serif;fill:#fff;text-anchor:middle}
.ps{fill:var(--ink);stroke:#fff;stroke-width:1.4} .pm{font:700 9.5px Charter,Georgia,serif;fill:#fff;text-anchor:middle}
.card{position:absolute;width:204px;display:flex;gap:7px;background:rgba(255,253,248,.96);border:1px solid var(--ink);border-left:3px solid var(--acc);padding:5px 7px 6px 6px}
.card>div{min-width:0}
.ic{width:24px;height:24px;flex:none;margin-top:3px}
svg use{fill:none;stroke:var(--ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
symbol .a{fill:var(--acc);stroke:none} symbol .as{stroke:var(--acc)}
.kick{font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);line-height:12px;white-space:nowrap}
.kick b,.pl2 b{font-family:Charter,Georgia,serif;color:var(--acc);font-size:12px;letter-spacing:0;margin-right:5px}
.hd{font-size:14px;line-height:15px;font-weight:700;margin-top:1px}
.dk{font-size:11px;line-height:13px;color:var(--mute);font-weight:500;margin-top:2px}
.also{position:absolute;left:20px;right:20px;top:${MAP_Y + MAP_H + 10}px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:4px}
.also .t{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.also .s{font-size:11px;color:var(--mute);font-weight:500}
.cols{position:absolute;left:20px;right:20px;top:${MAP_Y + MAP_H + 38}px;bottom:36px;column-count:4;column-gap:22px;column-fill:balance}
.reg{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);border-top:1px solid var(--ink);padding-top:3px;margin-bottom:5px;break-after:avoid}
.it{display:flex;gap:7px;margin-bottom:7px;break-inside:avoid}
.ic2{width:22px;height:22px;flex:none;margin-top:3px}
.pl2{font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);line-height:12px}
.pl2 b{font-size:11px;color:var(--ink)}
.h2{font-size:13px;line-height:14.5px;font-weight:700}
.d2{font-size:10.5px;line-height:12.5px;color:var(--mute);font-weight:500}
.foot{position:absolute;left:20px;right:20px;bottom:10px;border-top:1px solid var(--ink);padding-top:5px;font-size:10px;line-height:12px;color:var(--mute);font-weight:500;display:flex;justify-content:space-between}
.foot b{color:var(--ink)}
.key{position:absolute;left:824px;top:8px;width:192px;font-size:10px;line-height:13px;font-weight:500;color:var(--ink);background:rgba(255,253,248,.9);border:1px solid var(--ink);padding:5px 7px}
.key .t{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:2px}
.key i{display:inline-block;vertical-align:-2px;margin-right:4px}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>${symbols}</defs></svg>
<div class="top"><span class="l">One day on Earth</span><span>An atlas of the day’s news · 36 stories · 6 continents</span></div>
<h1 class="disp">Tuesday 24 November 2026</h1>
<div class="deck">Where the world’s news happened on one day. <b style="white-space:nowrap">Red pins 1–12</b> are the lead stories, told on the map; <b style="white-space:nowrap">black pins 13–36</b> run in the list below.</div>
<div class="map">
<svg width="${W}" height="${MAP_H}" viewBox="0 0 ${W} ${MAP_H}">
<rect class="sea" width="${W}" height="${MAP_H}"/>
<path class="gr" d="${graticule.join('')}"/>
<path class="land" d="${land}"/><path class="nw" d="${news}"/>
<path class="eq" d="M0 ${eqY.toFixed(1)}H${W}"/>
${leaders}
</svg>
${cards}
<div class="key"><div class="t">Where it happened</div>
<i><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#C0391F"/></svg></i>Lead story, card on map<br>
<i><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#191C22"/></svg></i>Also on Tuesday, listed below<br>
<i><svg width="12" height="10"><rect width="12" height="10" fill="#E7CBB8"/></svg></i>Country in the day’s news</div>
<svg width="${W}" height="${MAP_H}" viewBox="0 0 ${W} ${MAP_H}" style="pointer-events:none">${pins}</svg>
</div>
<div class="also"><span class="t">Also on Tuesday 24 November</span><span class="s">Numbers match the black pins · 34–36 are worldwide</span></div>
<div class="cols">${items}</div>
<div class="foot"><span><b>Sources:</b> Al Jazeera reports dated 24 Nov 2026; Wikipedia, Portal: Current events, 24 Nov 2026. Figures as reported; claims attributed.</span><span>Map: Natural Earth · pins approximate</span></div>
</body></html>`;

writeFileSync(new URL('atlas.html', here), html);
console.log('map height', MAP_H, 'stories', LEAD.length + LIST.filter((s) => s.n).length);
