/* Gera build/icon.png (512x512, exigido pelo macOS) e build/icon.ico (vários tamanhos): o frasco de poção em pixel art.
   Sem dependências: monta o PNG na mão com zlib.
   uso: npm run icon */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GRID = 32, SCALE = 8, SIZE = GRID * SCALE;

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

const INK = hex('#14102b');
const cells = [];
for (let i = 0; i < GRID * GRID; i++) cells.push([0, 0, 0, 0]);
function put(x, y, color) { if (x >= 0 && y >= 0 && x < GRID && y < GRID) cells[y * GRID + x] = color; }
function rect(x, y, w, h, color) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, color); }

/* fundo: quadrado do painel com cantos chanfrados e bordas claras/escuras */
rect(1, 0, 30, 32, hex('#07051a'));
rect(0, 1, 32, 30, hex('#07051a'));
rect(2, 2, 28, 28, hex('#1d1740'));
rect(2, 2, 28, 1, hex('#34297a'));
rect(2, 2, 1, 28, hex('#34297a'));
rect(2, 29, 28, 1, hex('#120e2c'));
rect(29, 2, 1, 28, hex('#120e2c'));

/* frasco */
const FX = 16, FY = 19.5;
function part(x, y) {
  const dx = x + 0.5 - FX, dy = y + 0.5 - FY, d2 = dx * dx + dy * dy;
  if (d2 <= 56.25 || (x >= 14 && x <= 17 && y >= 7 && y <= 14)) return 2;
  if (d2 <= 76 || (x >= 13 && x <= 18 && y >= 7 && y <= 14)) return 1;
  return 0;
}
for (let y = 6; y < 29; y++) {
  for (let x = 5; x < 27; x++) {
    const p = part(x, y);
    if (p === 1) put(x, y, INK);
    else if (p === 2) {
      if (y >= 17) put(x, y, y === 17 ? hex('#c990ff') : (x + 0.5 - FX > 3 ? hex('#6a2f9c') : hex('#9a4ed4')));
      else put(x, y, hex('#3a3f7a'));
    }
  }
}
rect(12, 5, 8, 2, INK);
rect(13, 5, 6, 1, hex('#cfe8ff'));
rect(11, 16, 1, 3, hex('#ffffff'));
rect(12, 15, 1, 1, hex('#ffffff'));
put(15, 21, hex('#c990ff'));
put(18, 23, hex('#c990ff'));
put(13, 24, hex('#c990ff'));
/* faíscas */
put(23, 8, hex('#ffe27a')); put(22, 9, hex('#ffe27a')); put(24, 9, hex('#ffe27a')); put(23, 10, hex('#ffe27a'));
put(8, 11, hex('#ffe27a'));

/* ---------- PNG montado na mão (cada linha começa com o byte de filtro 0) ---------- */
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const data = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(data));
  return Buffer.concat([len, data, crc]);
}

/* amplia a grade 32x32 sem suavizar, para o pixel art ficar nítido em qualquer tamanho */
function pngOfSize(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const c = cells[Math.floor(y * GRID / size) * GRID + Math.floor(x * GRID / size)];
      raw.set(c, row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   /* bits por canal */
  ihdr[9] = 6;   /* RGBA */
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ICO com uma imagem PNG por tamanho: o Windows escolhe a mais próxima
   (barra de tarefas, atalhos, Alt+Tab...) em vez de reduzir a de 256 e borrar */
function icoOf(sizes) {
  const images = sizes.map(pngOfSize);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);              /* tipo: ícone */
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map(function (size, i) {
    const e = Buffer.alloc(16);
    e[0] = size === 256 ? 0 : size;        /* 0 significa 256 */
    e[1] = size === 256 ? 0 : size;
    e.writeUInt16LE(1, 4);                 /* planos */
    e.writeUInt16LE(32, 6);                /* bits por pixel */
    e.writeUInt32LE(images[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return e;
  });
  return Buffer.concat([header].concat(entries).concat(images));
}

const dir = path.join(__dirname, '..', 'build');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), pngOfSize(512));
fs.writeFileSync(path.join(dir, 'icon.ico'), icoOf([16, 24, 32, 48, 64, 128, 256]));
console.log('icones gerados em', dir);
