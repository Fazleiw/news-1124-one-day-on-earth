// Builds design/atlas.html: a 1024x1024 news atlas of Tuesday 24 November 2026.
// Deterministic: no randomness, no network. Map data: Natural Earth via world-atlas (data/).
// CHECK=1 node design/build.mjs adds a layout checker to the page (collisions, inset, overflow); render.sh never sets it.
//
// Type scale, px at 1024 (nothing else is used): 56 masthead / 24 section tabs / 20 lead headline /
// 17 listed headline, continent labels, number badges, strip title / 15 kickers, strap, legend, sources.
// Light-on-ink bars are sized so the cap height sits centred with <=6.5px of ink above and below it:
// that sliver vanishes when the page is shrunk to 300px instead of smearing into the letters.
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('./', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('data/countries-110m.json', here)));

// ---- page bands ------------------------------------------------------------------------------
const W = 1024, HEAD_H = 76, STRIP_H = 24, FOOT_H = 23, GAP = 8;

// ---- projection (Miller, cropped) -------------------------------------------------------
const LON0 = -135, LAT_TOP = 70, LAT_BOT = -44, K = W / 300;
const miller = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180)) * 180 / Math.PI;
const MAP_Y = HEAD_H;
const MAP_H = Math.round((miller(LAT_TOP) - miller(LAT_BOT)) * K);
const px = (lon, lat) => [(lon - LON0) * K, (miller(LAT_TOP) - miller(lat)) * K];
const STRIP_Y = MAP_Y + MAP_H, LIST_Y = STRIP_Y + STRIP_H + GAP, FOOT_Y = W - FOOT_H;

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
// Lead stories: a card on the map, a red pin at loc, and a leader from the card edge to the pin.
// card:[x, y, w, lines] in map coords: w defaults to CARD_W, lines (of headline) to 2.
// from:[side, offset]: where the leader leaves the card, l/r edge at y offset, t/b edge at x offset.
const CARD_W = 200, INSET = 12, BADGE = 26, BAR_H = 23, LINE = 22;
const cardH = (lines) => BAR_H + 4 + lines * LINE + 6 + 1.5;
const LEAD = [
  { n: 1, loc: [35.14, 47.84], place: 'Zaporizhzhia',
    hd: 'Russian strike kills 2, injures 44', card: [606, 14], from: ['b', 14] },
  { n: 2, loc: [34.45, 31.5], place: 'Gaza',
    hd: 'Israeli strike kills senior Hamas official', card: [330, 357, 210], from: ['t', 170] },
  { n: 3, loc: [44.0, 36.19], place: 'Iraq',
    hd: 'Iraq to take over Kurdish oilfields', card: [626, 101, 170], from: ['l', 49] },
  { n: 5, loc: [-121.96, 37.35], place: 'Silicon Valley, US',
    hd: 'Huang back as Nvidia CEO; US blacklists Megaspeed', card: [14, 14, 200, 3], from: ['b', 31] },
  { n: 6, loc: [-73.95, 40.65], place: 'US federal court',
    hd: 'Huawei guilty of trade-secrets conspiracy, fraud', card: [238, 121, 210, 3], from: ['l', 22] },
  { n: 7, loc: [-0.12, 51.5], place: 'United Kingdom',
    hd: 'Record 5,258 heat deaths this summer', card: [229, 14, 190], from: ['r', 40] },
  { n: 8, loc: [90.4, 23.8], place: 'Dhaka, Bangladesh',
    hd: 'Hasina plans return from exile on 16 Dec', card: [812, 14], from: ['b', 110] },
  { n: 10, loc: [-75.5, 10.4], place: 'Cartagena, Colombia',
    hd: 'Gunmen hold 25 hostages in supermarket', card: [14, 336, 190, 3], from: ['t', 182] },
  { n: 11, loc: [-17.45, 14.7], place: 'Dakar, Senegal',
    hd: 'Senegal reinstated as AFCON 2025 winners', card: [244, 262, 210], from: ['t', 163] },
];

// The list: a 4x2 grid of sections, row 1 then row 2, numbered on from the leads in reading order.
// Every story with one place gets a black pin at loc (off:[dx, dy] moves a crowded pin and draws a tick);
// sport and worldwide stories have no single place and no pin.
const SECTIONS = [
  { tab: 'The Americas', items: [
    { loc: [-77.04, 38.9], off: [-22, 22], hd: 'Trump urges faster federal executions' },
    { loc: [-107.4, 24.8], hd: 'El Chapo Isidro faces US drug charges' },
    { loc: [-82.36, 23.1], hd: 'WHO chief visits Cuba as health care falters' },
    { loc: [-72.34, 18.54], off: [8, -8], hd: 'Bukele details troop deaths in Haiti' },
  ] },
  { tab: 'Europe', items: [
    { loc: [37.6, 55.75], hd: 'Putin vows to retaliate for oil-plant strikes' },
    { loc: [30.52, 39.78], hd: 'Army helicopter crash in Türkiye kills five' },
    { loc: [10.75, 59.9], hd: 'Separatist denies war crimes in Norway' },
  ] },
  { tab: 'Africa', items: [
    { loc: [30.25, 1.56], hd: 'Rebels halt advance on Bunia, DR Congo' },
    { loc: [28.05, -26.2], hd: 'Zimbabwean guilty over Russia fighting' },
  ] },
  { tab: 'Asia', items: [
    { loc: [105.83, 21.0], hd: 'Restaurant blast in Hanoi kills at least six' },
    { loc: [126.98, 37.57], off: [28, -10], hd: 'Air-raid alert as Russian jets near South Korea' },
    { loc: [113.26, 23.13], off: [8, 30], hd: 'China Southern unit to buy 50 Boeing 737s' },
    { loc: [101.7, 3.14], hd: 'Rohingya to be sent back to Myanmar' },
  ] },
  { tab: 'Middle East', items: [
    { loc: [46.68, 24.71], hd: 'Houthi drone attack on Riyadh tower hurts 11' },
    { loc: [34.45, 31.5], off: [-32, 4], hd: 'Strikes kill 7 in Gaza as meningitis spreads' },
    { loc: [56.3, 26.5], off: [-16, 44], hd: 'Oil traffic down 40% as tanker attacks rise' },
    { loc: [55.95, 25.8], off: [84, 22], hd: 'Bus crash kills 13 in Ras Al Khaimah, UAE' },
  ] },
  { tab: 'Oceania', items: [
    { loc: [149.13, -35.28], hd: 'Australia bill: tech fines up to 5% of revenue' },
  ] },
  { tab: 'Sport', items: [
    { hd: 'Arsenal 1‑1 Dortmund; Madrid beat PSV 5‑1' },
    { hd: 'Indian teen, 15, hits 204 off 53 balls' },
  ] },
  { tab: 'Worldwide', items: [
    { hd: 'WFP: wars put food aid for 7.3 million at risk' },
    { hd: 'Partners or kin killed five women an hour' },
    { hd: 'UN urges AI oversight deal within a year' },
  ] },
];
// Numbering is assigned here, in reading order, so no literal can drift out of sync.
LEAD.forEach((s, i) => { s.n = i + 1; });
let next = LEAD.length + 1;
for (const sec of SECTIONS) for (const it of sec.items) it.n = next++;
const LAST = next - 1;
const LISTED = SECTIONS.flatMap((s) => s.items);
const PINNED_LAST = Math.max(...LISTED.filter((i) => i.loc).map((i) => i.n));

// Continent names, set in open water (map coords, text centre).
const REGIONS = [
  ['THE AMERICAS', 100, 306], ['EUROPE', 462, 30], ['AFRICA', 272, 375],
  ['MIDDLE EAST', 900, 355], ['ASIA', 968, 196], ['OCEANIA', 880, 430],
];

// ---- render ----------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const badge = (n, cls) => `<span class="bd ${cls}"><i>${n}</i></span>`;
const f1 = (v) => +v.toFixed(1);

const graticule = [];
for (let lon = -120; lon <= 160; lon += 30) { const [x] = px(lon, 0); graticule.push(`M${x.toFixed(1)} 0V${MAP_H}`); }
for (const lat of [-30, 0, 30, 60]) { const [, y] = px(0, lat); graticule.push(`M0 ${y.toFixed(1)}H${W}`); }
const [, eqY] = px(0, 0);

const box = (s) => {
  const [x, y, w = CARD_W, lines = 2] = s.card;
  return { x, y, w, h: cardH(lines), lines };
};
const anchor = (s) => {
  const { x, y, w, h } = box(s), [side, o] = s.from;
  return side === 'l' ? [x, y + o] : side === 'r' ? [x + w, y + o] : side === 't' ? [x + o, y] : [x + o, y + h];
};

// Geometry, kept for the checker: pins {n, x, y} at badge centres.
const geo = { pins: [] };
// Draw order: leaders and ticks, then black pins, then red pins, so a lead pin is never covered.
let leaders = '', ticks = '', pinsK = '', pinsR = '';
const H = BADGE / 2;
const pin = (x, y, n, cls) => `<g transform="translate(${x} ${y})"><rect class="${cls}" x="${-H}" y="${-H}" width="${BADGE}" height="${BADGE}" rx="5"/><text class="pn" y="6">${n}</text></g>`;
for (const s of LEAD) {
  const [x, y] = px(...s.loc).map(f1);
  const [ax, ay] = anchor(s);
  leaders += `<path class="ld" data-n="${s.n}" d="M${x} ${y}L${ax} ${ay}"/><circle class="ae" cx="${ax}" cy="${ay}" r="3"/>`;
  pinsR += pin(x, y, s.n, 'pr');
  geo.pins.push({ n: s.n, x, y });
}
for (const s of LISTED) {
  if (!s.loc) continue;
  const [x, y] = px(...s.loc).map(f1);
  const [dx, dy] = s.off ?? [0, 0];
  if (dx || dy) ticks += `<path class="tk" d="M${x} ${y}l${dx} ${dy}"/><circle class="dot" cx="${x}" cy="${y}" r="2.5"/>`;
  pinsK += pin(f1(x + dx), f1(y + dy), s.n, 'pk');
  geo.pins.push({ n: s.n, x: f1(x + dx), y: f1(y + dy) });
}
const regionLabels = REGIONS.map(([t, x, y]) => `<text class="cl" x="${x}" y="${y}">${t}</text>`).join('');

const cards = LEAD.map((s) => {
  const { x, y, w, h } = box(s);
  return `
<div class="card" data-n="${s.n}" data-h="${h}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
  <div class="kick">${badge(s.n, 'r')}<span class="pc">${esc(s.place)}</span></div>
  <div class="hd">${esc(s.hd)}</div>
</div>`;
}).join('');

const cells = SECTIONS.map((sec) => `<div class="cell"><div class="tab"><span>${sec.tab}</span></div>${sec.items.map((s) => `
<div class="it">${badge(s.n, 'k')}<div class="h2">${esc(s.hd)}</div></div>`).join('')}</div>`).join('');

// Layout checker (CHECK=1 only): measures the laid-out page, writes a JSON report into document.title.
const checker = !process.env.CHECK ? '' : `<script>try{
const G=${JSON.stringify(geo)},R=${H},IN=${INSET},MW=${W},MH=${MAP_H},MY=${MAP_Y};
const out=[];const hit=(a,b,p=0)=>a.x<b.x+b.w+p&&b.x<a.x+a.w+p&&a.y<b.y+b.h+p&&b.y<a.y+a.h+p;
const cards=[...document.querySelectorAll('.card')].map(c=>{const r=c.getBoundingClientRect(),b=c.querySelector('.bd').getBoundingClientRect(),t=Math.min(r.top,b.top);return{n:+c.dataset.n,x:r.left,y:t-MY,w:r.width,h:r.bottom-t}});
const pins=G.pins.map(p=>({n:p.n,x:p.x-R,y:p.y-R,w:2*R,h:2*R,cx:p.x,cy:p.y}));
const labs=[...document.querySelectorAll('.cl')].map(t=>{const b=t.getBBox();return{n:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});
cards.forEach((a,i)=>{const m=[a.x,a.y,MW-a.x-a.w,MH-a.y-a.h].map(v=>Math.round(v*10)/10);if(Math.min(...m)<IN)out.push('card '+a.n+' inset l,t,r,b='+m.join(','));
  cards.slice(i+1).forEach(b=>hit(a,b,6)&&out.push('cards '+a.n+'/'+b.n));
  pins.forEach(p=>hit(a,p,2)&&out.push('card '+a.n+' covers pin '+p.n));
  labs.forEach(l=>hit(a,l,4)&&out.push('card '+a.n+' covers label '+l.n));});
labs.forEach(l=>{pins.forEach(p=>hit(l,p,2)&&out.push('label '+l.n+' on pin '+p.n));if(l.x<IN||l.x+l.w>MW-IN||l.y<IN||l.y+l.h>MH-IN)out.push('label '+l.n+' near frame')});
pins.forEach((a,i)=>pins.slice(i+1).forEach(b=>Math.abs(a.cx-b.cx)<2*R+3&&Math.abs(a.cy-b.cy)<2*R+3&&out.push('pins '+a.n+'/'+b.n)));
const near=(x1,y1,x2,y2,px,py)=>{const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x1+t*dx-px,y1+t*dy-py)};
const segs=[...document.querySelectorAll('.ld,.tk')].map(l=>{const v=[...l.getAttribute('d').matchAll(/[-\\d.]+/g)].map(Number);if(l.classList.contains('tk')){v[2]+=v[0];v[3]+=v[1]}return v.slice(0,4).concat(l.classList.contains('ld')?+l.dataset.n:-1)});
segs.forEach(([x1,y1,x2,y2,n],i)=>{const own=n>0?n:null;
  for(let k=1;k<60;k++){const x=x1+(x2-x1)*k/60,y=y1+(y2-y1)*k/60;
    cards.forEach(c=>c.n!==own&&x>c.x-3&&x<c.x+c.w+3&&y>c.y-3&&y<c.y+c.h+3&&out.push('line '+(own||'tick')+' crosses card '+c.n));
    labs.forEach(l=>x>l.x-2&&x<l.x+l.w+2&&y>l.y-2&&y<l.y+l.h+2&&out.push('line '+(own||'tick')+' crosses label '+l.n));}
  if(own)pins.forEach(p=>p.n!==own&&near(x1,y1,x2,y2,p.cx,p.cy)<R+4&&out.push('leader '+own+' grazes pin '+p.n));
  segs.slice(i+1).forEach(([a1,b1,a2,b2,m])=>{const d=(x2-x1)*(b2-b1)-(y2-y1)*(a2-a1);if(!d)return;
    const t=((a1-x1)*(b2-b1)-(b1-y1)*(a2-a1))/d,u=((a1-x1)*(y2-y1)-(b1-y1)*(x2-x1))/d;t>0&&t<1&&u>0&&u<1&&out.push('lines '+n+'/'+m+' cross')});});
document.querySelectorAll('.card').forEach(c=>{const h=c.querySelector('.hd'),n=Math.round((h.scrollHeight-10)/${LINE});c.scrollHeight>c.clientHeight+1&&out.push('card '+c.dataset.n+' overflows: '+n+' lines');});
document.querySelectorAll('.pc').forEach(d=>d.scrollWidth>d.clientWidth+1&&out.push('kicker clips: '+d.textContent));
document.querySelectorAll('.h2').forEach(d=>{const n=Math.round(d.offsetHeight/parseFloat(getComputedStyle(d).lineHeight));n>2&&out.push('list head '+n+' lines: '+d.textContent)});
const cols=document.querySelector('.cols');out.push('list slack '+Math.round(cols.getBoundingClientRect().bottom-Math.max(...[...document.querySelectorAll('.it')].map(e=>e.getBoundingClientRect().bottom))));
const tabs=[...document.querySelectorAll('.tab')].map(t=>t.getBoundingClientRect());
out.push('tab tops '+tabs.map(t=>Math.round(t.top)).join(','),'tab widths '+[...new Set(tabs.map(t=>Math.round(t.width)))].join(','));
const sz=new Set();document.querySelectorAll('body *:not(script)').forEach(e=>{if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))sz.add(parseFloat(getComputedStyle(e).fontSize))});
document.querySelectorAll('text').forEach(e=>sz.add(parseFloat(getComputedStyle(e).fontSize)));out.push('font sizes '+[...sz].sort((a,b)=>a-b).join(','));
document.title=JSON.stringify(out);
}catch(e){document.title=JSON.stringify(['checker error: '+e.message])}</script>`;

const SANS = '"Avenir Next Condensed","Avenir Next","Helvetica Neue",sans-serif';
const TEXT = '"Avenir Next","Helvetica Neue",sans-serif';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>atlas</title><style>
:root{--paper:#F4F0E6;--ink:#191C22;--mute:#3E424A;--acc:#C0391F;--sea:#D3DEE0;--land:#EAE3D2}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:1024px;overflow:hidden;background:var(--paper);color:var(--ink)}
body{position:relative;font:500 15px ${SANS};-webkit-font-smoothing:antialiased}
.cap{text-box:trim-both cap alphabetic}
.head{position:absolute;left:0;top:0;width:${W}px;height:${HEAD_H}px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:space-between;padding:0 20px}
h1{font:700 56px/1 Charter,"Bitstream Charter",Georgia,serif;letter-spacing:-.01em;text-box:trim-both cap alphabetic}
.strap{font:700 15px/16px ${SANS};letter-spacing:.07em;text-transform:uppercase;text-align:right;text-box:trim-both cap alphabetic}
.strap b{color:#F0A08C;font-weight:700}
.map{position:absolute;left:0;top:${MAP_Y}px;width:${W}px;height:${MAP_H}px;overflow:hidden}
.map>svg{position:absolute;left:0;top:0}
.sea{fill:var(--sea)} .land{fill:var(--land);stroke:#FBF8F1;stroke-width:.7}
.gr{fill:none;stroke:#C2CFD1;stroke-width:.6} .eq{fill:none;stroke:#A9B8BA;stroke-width:.8;stroke-dasharray:3 3}
.cl{font:700 17px ${SANS};letter-spacing:.15em;fill:#3A5560;text-anchor:middle}
.ld{fill:none;stroke:var(--acc);stroke-width:1.8} .ae{fill:var(--acc)}
.tk{fill:none;stroke:var(--ink);stroke-width:1.4} .dot{fill:var(--ink)}
.pr{fill:var(--acc);stroke:#fff;stroke-width:1.5} .pk{fill:var(--ink);stroke:#fff;stroke-width:1.5}
.pn{font:800 17px ${SANS};fill:#fff;text-anchor:middle}
.bd{display:inline-flex;align-items:center;justify-content:center;flex:none;width:${BADGE}px;height:${BADGE}px;border-radius:5px;color:#fff;font:800 17px/1 ${SANS}}
.bd i{font-style:normal;text-box:trim-both cap alphabetic}
.bd.r{background:var(--acc)} .bd.k{background:var(--ink)}
.card{position:absolute;background:#fff;border:1.5px solid var(--ink);border-top:0}
.kick{display:flex;align-items:center;gap:7px;height:${BAR_H}px;background:var(--ink);color:var(--paper);margin:0 -1.5px;padding-right:8px}
.pc{font:700 15px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;text-box:trim-both cap alphabetic}
.hd{font:800 20px/${LINE}px ${SANS};padding:4px 8px 6px}
.also{position:absolute;left:0;top:${STRIP_Y}px;width:${W}px;height:${STRIP_H}px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:space-between;padding:0 20px}
.also .t{font:700 17px/1 ${SANS};letter-spacing:.1em;text-transform:uppercase;text-box:trim-both cap alphabetic}
.also .s{font:700 15px/1 ${SANS};letter-spacing:.05em;text-transform:uppercase;text-box:trim-both cap alphabetic}
.also .s b{color:#F0A08C;font-weight:700}
.cols{position:absolute;left:20px;right:20px;top:${LIST_Y}px;bottom:${FOOT_H + GAP}px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:auto auto;column-gap:20px;row-gap:2px;align-content:start;overflow:hidden}
.tab{height:29px;display:flex;align-items:center;font:800 24px/1 ${SANS};letter-spacing:.08em;text-transform:uppercase;background:var(--ink);color:var(--paper);padding:0 8px;margin-bottom:8px;white-space:nowrap}
.tab span{text-box:trim-both cap alphabetic}
.it{display:flex;align-items:flex-start;gap:9px;margin-bottom:5px}
.it .bd{margin-top:-3px}
.h2{font:700 17px/20px ${TEXT};min-width:0}
.foot{position:absolute;left:0;top:${FOOT_Y}px;width:${W}px;height:${FOOT_H}px;background:var(--ink);color:var(--paper);display:flex;align-items:center;padding:0 20px;font:600 15px/1 ${SANS};letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.foot span{text-box:trim-both cap alphabetic}
</style></head><body>
<div class="head"><h1>Tuesday 24 November 2026</h1>
<div class="strap"><b>One day on Earth</b> · ${LAST} stories<br>6 regions · sport · worldwide</div></div>
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
<svg width="${W}" height="${MAP_H}" viewBox="0 0 ${W} ${MAP_H}" style="pointer-events:none">${ticks}${pinsK}${pinsR}</svg>
</div>
<div class="also"><span class="t">Also on Tuesday 24 November</span><span class="s"><b>Red 1–${LEAD.length}</b> lead stories · black ${LEAD.length + 1}–${PINNED_LAST} pinned · ${PINNED_LAST + 1}–${LAST} no single place, no pin</span></div>
<div class="cols">${cells}</div>
<div class="foot"><span>Sources: Al Jazeera reports and Wikipedia’s Current events portal, 24 Nov 2026 · figures as reported · map: Natural Earth</span></div>
${checker}
</body></html>`;

writeFileSync(new URL('atlas.html', here), html);
console.log('map height', MAP_H, 'stories', LAST, 'pinned', geo.pins.length);
