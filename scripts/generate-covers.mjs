// Generates simple placeholder PNG covers for all 9 templates.
// Run: node scripts/generate-covers.mjs
// For production-quality screenshots, use scripts/capture-template-covers.mjs instead.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public', 'templates', 'local');

const TEMPLATES = [
  { id: 'ledger', bg: [99, 102, 241] },
  { id: 'todo', bg: [16, 185, 129] },
  { id: 'checkin', bg: [139, 92, 246] },
  { id: 'personal-portfolio', bg: [49, 46, 129] },
  { id: 'product-landing', bg: [15, 23, 42] },
  { id: 'restaurant-menu', bg: [28, 25, 23] },
  { id: 'reading-notes', bg: [6, 78, 59] },
  { id: 'resume-page', bg: [30, 41, 59] },
  { id: 'content-calendar', bg: [59, 7, 100] },
];

function createPNG(width, height, r, g, b) {
  // Build raw pixel data: RGBA, row by row
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    rawData[rowStart] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = rowStart + 1 + x * 4;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
      rawData[offset + 3] = 255;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crc = crc32(crcData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeB, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC32 for PNG
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

for (const t of TEMPLATES) {
  const png = createPNG(800, 600, ...t.bg);
  const outPath = join(PUBLIC, t.id, 'cover.png');
  writeFileSync(outPath, png);
  console.log(`Created ${outPath}`);
}

console.log('\nDone. For production covers, run: node scripts/capture-template-covers.mjs');
