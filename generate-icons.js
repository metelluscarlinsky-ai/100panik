// ============================================
// 100PANIK - Jenere ikòn + splash pou iPhone
// Egzekite: node generate-icons.js
// ============================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICON_DIR = path.join(__dirname, 'public', 'images', 'icons');
const SPLASH_DIR = path.join(__dirname, 'public', 'images', 'splash');
[ICON_DIR, SPLASH_DIR].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d, { recursive: true }));

// ---------- PNG MANYÈL (san depandans) ----------
function createPNG(size, bgColor, textColor, text) {
  const width = size, height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;

  // Koulè soti nan hex
  const bg = hexToRGB(bgColor);
  const fg = hexToRGB(textColor);

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      // Sèlman sant lan gen tèks (senp)
      const cx = width / 2, cy = height / 2;
      const inCenter = Math.abs(x - cx) < width * 0.35 && Math.abs(y - cy) < height * 0.18;
      const c = inCenter ? fg : bg;
      raw[offset++] = c[0];
      raw[offset++] = c[1];
      raw[offset++] = c[2];
      raw[offset++] = 255;
    }
  }

  return buildPNG(width, height, raw);
}

function hexToRGB(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function buildPNG(width, height, raw) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  ihdr[9] = 6;  ihdr[10] = 0;  ihdr[11] = 0;  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ---------- JENERE IKÒN ----------
const iconSizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
iconSizes.forEach(size => {
  const buf = createPNG(size, '#0a0a0a', '#00f0ff', '100');
  fs.writeFileSync(path.join(ICON_DIR, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png`);
});

// Maskable
fs.writeFileSync(
  path.join(ICON_DIR, 'icon-maskable-512.png'),
  createPNG(512, '#0a0a0a', '#00f0ff', '100')
);
console.log('✅ icon-maskable-512.png');

// ---------- SPLASH SCREENS (iPhone) ----------
const splashes = [
  { name: 'iphone-se.png',          w: 750,  h: 1334 },
  { name: 'iphone-8plus.png',       w: 1242, h: 2208 },
  { name: 'iphone-x.png',           w: 1125, h: 2436 },
  { name: 'iphone-11.png',          w: 828,  h: 1792 },
  { name: 'iphone-12.png',          w: 1170, h: 2532 },
  { name: 'iphone-12-pro-max.png',  w: 1284, h: 2778 },
  { name: 'iphone-14-pro.png',      w: 1179, h: 2556 },
  { name: 'iphone-14-pro-max.png',  w: 1290, h: 2796 }
];

splashes.forEach(s => {
  const buf = createPNG(Math.max(s.w, s.h), '#0a0a0a', '#00f0ff', '100');
  fs.writeFileSync(path.join(SPLASH_DIR, s.name), buf);
  console.log(`✅ splash/${s.name}`);
});

console.log('\n🖤 Tout ikòn + splash jenere!');
