// Generates the PWA icons as plain PNGs, so the repo needs no image tooling
// and no binary blobs that nobody can regenerate.
//
//   node scripts/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const INK = [6, 169, 77];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y);
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * A receipt: white slip on teal, with a torn bottom edge and three lines of
 * text. Recognisable at 48px on a crowded home screen.
 * `inset` leaves the safe area a maskable icon needs.
 */
const receipt = (size, inset) => (x, y) => {
  const u = size / 100;
  const pad = inset * size;
  const left = pad + (size - 2 * pad) * 0.22;
  const right = pad + (size - 2 * pad) * 0.78;
  const top = pad + (size - 2 * pad) * 0.14;
  const bottom = pad + (size - 2 * pad) * 0.86;

  if (x < left || x > right || y < top) return INK;

  // Torn bottom: a zigzag of five teeth.
  if (y > bottom - 5 * u) {
    const tooth = ((x - left) / ((right - left) / 5)) % 1;
    const depth = Math.abs(tooth - 0.5) * 2;
    if (y > bottom - 5 * u + depth * 5 * u) return INK;
  }

  // Text lines, the last one short like a total.
  const lines = [
    [0.3, 0.62],
    [0.44, 0.62],
    [0.58, 0.38],
  ];
  for (const [at, width] of lines) {
    const ly = top + (bottom - top) * at;
    if (y >= ly && y < ly + 4.5 * u && x > left + 6 * u && x < left + 6 * u + (right - left - 12 * u) * width) {
      return INK;
    }
  }

  return WHITE;
};

mkdirSync('public', { recursive: true });

const icons = [
  ['public/icon-192.png', 192, 0.06],
  ['public/icon-512.png', 512, 0.06],
  // Maskable icons get cropped to a circle on Android, so the art sits inside
  // the 80% safe area.
  ['public/icon-maskable.png', 512, 0.18],
];

for (const [path, size, inset] of icons) {
  writeFileSync(path, png(size, receipt(size, inset)));
  console.log(`wrote ${path} (${size}x${size})`);
}
