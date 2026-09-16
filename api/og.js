const zlib = require("zlib");

const W = 1200;
const H = 630;
const BG = [13, 12, 10];
const GOLD = [228, 184, 106];
const CREAM = [243, 236, 224];
const MUTED = [157, 148, 134];

const FONT = {
  " ": [0, 0, 0, 0, 0],
  A: [0x3e, 0x09, 0x09, 0x09, 0x3e],
  B: [0x3f, 0x25, 0x25, 0x25, 0x1a],
  C: [0x1e, 0x21, 0x21, 0x21, 0x12],
  D: [0x3f, 0x21, 0x21, 0x21, 0x1e],
  E: [0x3f, 0x25, 0x25, 0x21, 0x21],
  F: [0x3f, 0x05, 0x05, 0x01, 0x01],
  G: [0x1e, 0x21, 0x25, 0x25, 0x1d],
  H: [0x3f, 0x04, 0x04, 0x04, 0x3f],
  I: [0x21, 0x21, 0x3f, 0x21, 0x21],
  J: [0x10, 0x20, 0x20, 0x20, 0x1f],
  K: [0x3f, 0x04, 0x0a, 0x11, 0x20],
  L: [0x3f, 0x20, 0x20, 0x20, 0x20],
  M: [0x3f, 0x02, 0x04, 0x02, 0x3f],
  N: [0x3f, 0x02, 0x04, 0x08, 0x3f],
  O: [0x1e, 0x21, 0x21, 0x21, 0x1e],
  P: [0x3f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x1e, 0x21, 0x29, 0x11, 0x2e],
  R: [0x3f, 0x09, 0x19, 0x29, 0x26],
  S: [0x16, 0x25, 0x25, 0x25, 0x1a],
  T: [0x01, 0x01, 0x3f, 0x01, 0x01],
  U: [0x1f, 0x20, 0x20, 0x20, 0x1f],
  V: [0x0f, 0x10, 0x20, 0x10, 0x0f],
  W: [0x3f, 0x10, 0x08, 0x10, 0x3f],
  X: [0x31, 0x0a, 0x04, 0x0a, 0x31],
  Y: [0x03, 0x04, 0x38, 0x04, 0x03],
  Z: [0x31, 0x29, 0x25, 0x23, 0x21],
  ".": [0x00, 0x20, 0x00, 0x00, 0x00],
  ",": [0x00, 0x40, 0x20, 0x00, 0x00],
  "-": [0x04, 0x04, 0x04, 0x04, 0x00],
  ":": [0x00, 0x0a, 0x00, 0x00, 0x00],
  "'": [0x00, 0x01, 0x02, 0x00, 0x00]
};

function mix(a, b, t) {
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0
  ];
}

function setPx(buf, x, y, rgb) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = rgb[0];
  buf[i + 1] = rgb[1];
  buf[i + 2] = rgb[2];
}

function fillRect(buf, x0, y0, x1, y1, rgb) {
  const xa = Math.max(0, x0 | 0);
  const ya = Math.max(0, y0 | 0);
  const xb = Math.min(W - 1, x1 | 0);
  const yb = Math.min(H - 1, y1 | 0);
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) setPx(buf, x, y, rgb);
  }
}

function drawLine(buf, x0, y0, x1, y1, rgb, width) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
  const r = Math.max(1, width / 2);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    fillRect(buf, x - r, y - r, x + r, y + r, rgb);
  }
}

function textWidth(text, scale) {
  let w = 0;
  for (const ch of text) {
    const g = FONT[ch] || FONT[" "];
    w += (g.length + 1) * scale;
  }
  return w;
}

function drawText(buf, text, x, y, scale, rgb) {
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch] || FONT[" "];
    for (let col = 0; col < g.length; col++) {
      const bits = g[col];
      for (let row = 0; row < 7; row++) {
        if (bits & (1 << row)) {
          fillRect(
            buf,
            cx + col * scale,
            y + row * scale,
            cx + col * scale + scale - 1,
            y + row * scale + scale - 1,
            rgb
          );
        }
      }
    }
    cx += (g.length + 1) * scale;
  }
}

function drawCentered(buf, text, y, scale, rgb) {
  const w = textWidth(text, scale);
  drawText(buf, text, ((W - w) / 2) | 0, y, scale, rgb);
}

function paint() {
  const pix = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / W;
      const dy = (y - H * 0.38) / H;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.6);
      setPx(pix, x, y, mix([48, 38, 22], BG, d));
    }
  }
  fillRect(pix, 36, 36, W - 37, 38, GOLD);
  fillRect(pix, 36, H - 39, W - 37, H - 37, GOLD);
  fillRect(pix, 36, 36, 38, H - 37, GOLD);
  fillRect(pix, W - 39, 36, W - 37, H - 37, GOLD);
  drawText(pix, "STINT", 80, 72, 4, GOLD);
  drawCentered(pix, "A STORY ANYONE CAN CONTINUE.", 250, 5, CREAM);
  drawCentered(pix, "ONE PENNY A CHARACTER.", 330, 3, MUTED);
  drawLine(pix, 90, 500, 1110, 400, GOLD, 3);
  drawCentered(pix, "TWENTY EVM CHAINS  -  BITCOIN  -  SOLANA", 540, 2, MUTED);
  return pix;
}

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
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function toPng(pix) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    pix.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

let CACHE = null;
function image() {
  if (!CACHE) CACHE = toPng(paint());
  return CACHE;
}

module.exports = async function handler(req, res) {
  const png = image();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", String(png.length));
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).end(png);
};
