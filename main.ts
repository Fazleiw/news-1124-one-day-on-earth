// One Day on Earth: an illustrated front page of the news of Tuesday 24 November 2026 (make.fun news-image-20261124).
// 32 stories: 4 leads and 8 cards with drawn scenes, a 20-line digest and a locator map, under the date as masthead.
// Node 22, standard library only, no network. The image is entry.png beside this file (built from design/ with
// design/render.sh). This program checks it against the gate and copies it, byte for byte, to
// ${MAKEFUN_OUTPUT_DIR:-/output}/entry.png. The check: at most 1 MiB; a PNG signature (a JPEG is refused, since its
// size is not read here); IHDR as the first chunk; width and height between 256 and 1024 px; and every chunk in bounds
// through IEND with no trailing bytes. Two runs write identical bytes because nothing is generated at run time.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1024;
const MIN_SIDE = 256;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];

function fail(msg) {
  console.error(`entry.png rejected: ${msg}`);
  process.exit(1);
}

const bytes = readFileSync(new URL('./entry.png', import.meta.url));

if (bytes.length > MAX_BYTES) fail(`${bytes.length} bytes is over ${MAX_BYTES}`);
const isPng = PNG_SIG.every((b, i) => bytes[i] === b);
const isJpeg = JPEG_SIG.every((b, i) => bytes[i] === b);
if (!isPng && !isJpeg) fail('neither a PNG nor a JPEG signature');
if (isJpeg) fail('JPEG is accepted by the gate but this entry ships a PNG; refusing to guess its dimensions');
if (bytes.toString('latin1', 12, 16) !== 'IHDR') fail('first chunk is not IHDR');

const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (!width || !height || width > MAX_SIDE || height > MAX_SIDE) fail(`${width}x${height} is outside 1..${MAX_SIDE}`);
if (width < MIN_SIDE || height < MIN_SIDE) fail(`${width}x${height} is under ${MIN_SIDE}px a side; the judge reads it shrunk`);

// Walk the chunks to prove the file is whole: every chunk in bounds, ending with IEND.
let off = 8, sawEnd = false;
while (off + 12 <= bytes.length) {
  const len = bytes.readUInt32BE(off);
  const type = bytes.toString('latin1', off + 4, off + 8);
  off += 12 + len;
  if (off > bytes.length) fail(`chunk ${type} runs past end of file`);
  if (type === 'IEND') { sawEnd = true; break; }
}
if (!sawEnd || off !== bytes.length) fail('PNG is truncated or has trailing bytes');

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), bytes);
console.log(`wrote ${join(outDir, 'entry.png')}: ${width}x${height}, ${bytes.length} bytes`);
