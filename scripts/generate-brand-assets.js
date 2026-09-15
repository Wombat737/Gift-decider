#!/usr/bin/env node
/**
 * On-brand placeholder icons / splash / favicon.
 * Coral field + white gift + sunshine ribbon — no Expo gray, no cream wash.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WHITE = [255, 255, 255, 255];
const CORAL = [232, 93, 76, 255]; // #E85D4C
const SUNSHINE = [245, 185, 66, 255]; // #F5B942
const INK = [23, 23, 23, 255]; // #171717
const TRANSPARENT = [0, 0, 0, 0];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = 0;
    pixels.copy(raw, o + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeCanvas(size, fill) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) pixels.set(fill, i * 4);
  return { size, pixels };
}

function setPx(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  canvas.pixels.set(color, (y * canvas.size + x) * 4);
}

function fillRect(canvas, x0, y0, x1, y1, color) {
  const xa = Math.max(0, Math.floor(x0));
  const ya = Math.max(0, Math.floor(y0));
  const xb = Math.min(canvas.size - 1, Math.ceil(x1));
  const yb = Math.min(canvas.size - 1, Math.ceil(y1));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) setPx(canvas, x, y, color);
  }
}

function fillRoundRect(canvas, x0, y0, x1, y1, r, color) {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  for (let y = Math.floor(ya); y <= Math.ceil(yb); y++) {
    for (let x = Math.floor(xa); x <= Math.ceil(xb); x++) {
      const dx = x < xa + r ? xa + r - x : x > xb - r ? x - (xb - r) : 0;
      const dy = y < ya + r ? ya + r - y : y > yb - r ? y - (yb - r) : 0;
      if (dx * dx + dy * dy <= r * r + r) setPx(canvas, x, y, color);
    }
  }
}

function fillCircle(canvas, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(canvas, x, y, color);
    }
  }
}

/** Gift box used for app icon, splash, adaptive foreground. */
function drawGift(canvas, { box, ribbon, pad = 0.22 }) {
  const s = canvas.size;
  const inner = s * (1 - pad * 2);
  const left = s * pad;
  const top = s * pad + inner * 0.08;
  const boxW = inner;
  const boxH = inner * 0.72;
  const radius = inner * 0.1;
  fillRoundRect(canvas, left, top + inner * 0.16, left + boxW, top + inner * 0.16 + boxH, radius, box);

  const lidH = inner * 0.16;
  fillRoundRect(canvas, left - inner * 0.03, top, left + boxW + inner * 0.03, top + lidH + inner * 0.04, radius * 0.8, box);

  const ribbonW = inner * 0.12;
  const cx = left + boxW / 2;
  fillRect(canvas, cx - ribbonW / 2, top, cx + ribbonW / 2, top + inner * 0.16 + boxH, ribbon);
  const bandY = top + lidH * 0.55;
  fillRect(canvas, left - inner * 0.03, bandY, left + boxW + inner * 0.03, bandY + ribbonW * 0.85, ribbon);

  const bowY = top - inner * 0.02;
  fillCircle(canvas, cx - inner * 0.13, bowY, inner * 0.11, ribbon);
  fillCircle(canvas, cx + inner * 0.13, bowY, inner * 0.11, ribbon);
  fillCircle(canvas, cx, bowY + inner * 0.02, inner * 0.07, ribbon);
}

function writePng(file, canvas) {
  fs.writeFileSync(file, encodePng(canvas.size, canvas.size, canvas.pixels));
  console.log('wrote', path.relative(process.cwd(), file), canvas.size);
}

const out = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(out, { recursive: true });

const icon = makeCanvas(1024, CORAL);
drawGift(icon, { box: WHITE, ribbon: SUNSHINE, pad: 0.24 });
writePng(path.join(out, 'icon.png'), icon);

const splash = makeCanvas(1024, TRANSPARENT);
drawGift(splash, { box: CORAL, ribbon: SUNSHINE, pad: 0.28 });
writePng(path.join(out, 'splash-icon.png'), splash);

const fg = makeCanvas(1024, TRANSPARENT);
drawGift(fg, { box: WHITE, ribbon: SUNSHINE, pad: 0.3 });
writePng(path.join(out, 'android-icon-foreground.png'), fg);

const bg = makeCanvas(1024, CORAL);
writePng(path.join(out, 'android-icon-background.png'), bg);

{
  const m = makeCanvas(1024, TRANSPARENT);
  drawGift(m, { box: INK, ribbon: WHITE, pad: 0.3 });
  for (let i = 0; i < 1024 * 1024; i++) {
    const o = i * 4;
    if (m.pixels[o + 3] === 0) continue;
    const isWhite = m.pixels[o] > 240 && m.pixels[o + 1] > 240 && m.pixels[o + 2] > 240;
    if (isWhite) m.pixels.set(TRANSPARENT, o);
    else m.pixels.set(INK, o);
  }
  writePng(path.join(out, 'android-icon-monochrome.png'), m);
}

const fav = makeCanvas(64, CORAL);
drawGift(fav, { box: WHITE, ribbon: SUNSHINE, pad: 0.22 });
writePng(path.join(out, 'favicon.png'), fav);
