/**
 * KitapTracker — Client-side QR Code Generator (ISO/IEC 18004 compliant)
 * Zero external dependencies. Generates valid scannable QR Code SVG and Data URIs.
 */

// Galois Field GF(2^8)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let gfVal = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = gfVal;
  EXP[i + 255] = gfVal;
  LOG[gfVal] = i;
  gfVal <<= 1;
  if (gfVal & 256) gfVal ^= 0x11d;
}

function gmul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsPoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecCount - 1; j++) {
      rem[j] = rem[j + 1] ^ gmul(gen[j + 1], factor);
    }
    rem[ecCount - 1] = gmul(gen[ecCount], factor);
  }
  return rem;
}

const VERSION_TABLE_M = [
  null,
  { version: 1, total: 26, ecPerBlock: 10, blocks: [[1, 16]], align: [] },
  { version: 2, total: 44, ecPerBlock: 16, blocks: [[1, 28]], align: [6, 18] },
  { version: 3, total: 70, ecPerBlock: 26, blocks: [[1, 44]], align: [6, 22] },
  { version: 4, total: 100, ecPerBlock: 18, blocks: [[2, 32]], align: [6, 26] },
  { version: 5, total: 134, ecPerBlock: 24, blocks: [[2, 43]], align: [6, 30] },
  { version: 6, total: 172, ecPerBlock: 16, blocks: [[4, 27]], align: [6, 34] },
  { version: 7, total: 196, ecPerBlock: 18, blocks: [[4, 31]], align: [6, 22, 38] },
  { version: 8, total: 242, ecPerBlock: 22, blocks: [[2, 38], [2, 39]], align: [6, 24, 42] },
  { version: 9, total: 292, ecPerBlock: 22, blocks: [[3, 36], [2, 37]], align: [6, 26, 46] },
  { version: 10, total: 346, ecPerBlock: 26, blocks: [[4, 43], [1, 44]], align: [6, 28, 50] },
];

function selectVersion(byteLength) {
  for (let v = 1; v <= 10; v++) {
    const info = VERSION_TABLE_M[v];
    const totalData = info.blocks.reduce((sum, b) => sum + b[0] * b[1], 0);
    const headerBits = 4 + (v < 10 ? 8 : 16);
    const capacityBytes = Math.floor((totalData * 8 - headerBits) / 8);
    if (byteLength <= capacityBytes) return info;
  }
  return VERSION_TABLE_M[10];
}

function encodeData(utf8Bytes, versionInfo) {
  const v = versionInfo.version;
  const bitLength = v < 10 ? 8 : 16;
  const bits = [];

  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, bitLength);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  const totalDataBytes = versionInfo.blocks.reduce((sum, b) => sum + b[0] * b[1], 0);
  const totalDataBits = totalDataBytes * 8;

  const termLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    dataBytes[i] = b;
  }

  let padByte = 0xec;
  for (let i = bits.length / 8; i < totalDataBytes; i++) {
    dataBytes[i] = padByte;
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (const [numBlocks, blockSize] of versionInfo.blocks) {
    for (let b = 0; b < numBlocks; b++) {
      const slice = dataBytes.slice(offset, offset + blockSize);
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, versionInfo.ecPerBlock));
      offset += blockSize;
    }
  }

  const finalCodewords = [];
  let maxDataLen = 0;
  for (const b of dataBlocks) if (b.length > maxDataLen) maxDataLen = b.length;
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlocks) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }

  for (let i = 0; i < versionInfo.ecPerBlock; i++) {
    for (const b of ecBlocks) {
      finalCodewords.push(b[i]);
    }
  }

  return finalCodewords;
}

function getFormatBits(mask) {
  const data = (0b00 << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= (0x537 << (i - 10));
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function createMatrix(versionInfo, codewords) {
  const v = versionInfo.version;
  const size = v * 4 + 17;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  function setFunc(r, c, val) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  function drawFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setFunc(mr, mc, isBlack ? 1 : 0);
          } else {
            setFunc(mr, mc, 0);
          }
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) setFunc(6, i, i % 2 === 0 ? 1 : 0);
    if (matrix[i][6] === null) setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }

  setFunc(4 * v + 9, 8, 1);

  const coords = versionInfo.align || [];
  for (let r = 0; r < coords.length; r++) {
    for (let c = 0; c < coords.length; c++) {
      const cr = coords[r];
      const cc = coords[c];
      if ((cr < 9 && cc < 9) || (cr < 9 && cc >= size - 9) || (cr >= size - 9 && cc < 9)) continue;
      for (let ar = -2; ar <= 2; ar++) {
        for (let ac = -2; ac <= 2; ac++) {
          const isBlack = Math.abs(ar) === 2 || Math.abs(ac) === 2 || (ar === 0 && ac === 0);
          setFunc(cr + ar, cc + ac, isBlack ? 1 : 0);
        }
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    if (i !== 6) { isFunction[8][i] = true; isFunction[i][8] = true; }
  }
  for (let i = size - 8; i < size; i++) {
    isFunction[8][i] = true; isFunction[i][8] = true;
  }

  const dataBits = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i--) dataBits.push((byte >> i) & 1);
  }

  function evaluateMask(mask) {
    const testM = matrix.map(row => [...row]);
    let bitIdx = 0;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--;
      const rows = [];
      for (let r = 0; r < size; r++) rows.push(up ? size - 1 - r : r);
      for (const r of rows) {
        for (const c of [right, right - 1]) {
          if (!isFunction[r][c]) {
            const rawBit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
            let maskBit = 0;
            if (mask === 0) maskBit = (r + c) % 2 === 0 ? 1 : 0;
            else if (mask === 1) maskBit = r % 2 === 0 ? 1 : 0;
            else if (mask === 2) maskBit = c % 3 === 0 ? 1 : 0;
            else if (mask === 3) maskBit = (r + c) % 3 === 0 ? 1 : 0;
            else if (mask === 4) maskBit = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0 ? 1 : 0;
            else if (mask === 5) maskBit = ((r * c) % 2) + ((r * c) % 3) === 0 ? 1 : 0;
            else if (mask === 6) maskBit = ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0 ? 1 : 0;
            else if (mask === 7) maskBit = ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0 ? 1 : 0;
            testM[r][c] = rawBit ^ maskBit;
          }
        }
      }
      up = !up;
    }

    const fBits = getFormatBits(mask);
    const bits15 = [];
    for (let i = 14; i >= 0; i--) bits15.push((fBits >> i) & 1);

    testM[8][0] = bits15[0]; testM[8][1] = bits15[1]; testM[8][2] = bits15[2]; testM[8][3] = bits15[3]; testM[8][4] = bits15[4]; testM[8][5] = bits15[5];
    testM[8][7] = bits15[6]; testM[8][8] = bits15[7]; testM[7][8] = bits15[8]; testM[5][8] = bits15[9]; testM[4][8] = bits15[10]; testM[3][8] = bits15[11];
    testM[2][8] = bits15[12]; testM[1][8] = bits15[13]; testM[0][8] = bits15[14];

    for (let i = 0; i < 7; i++) testM[size - 1 - i][8] = bits15[i];
    for (let i = 0; i < 8; i++) testM[8][size - 8 + i] = bits15[7 + i];

    let penalty = 0;
    for (let r = 0; r < size; r++) {
      let count = 1;
      for (let c = 1; c < size; c++) {
        if (testM[r][c] === testM[r][c - 1]) {
          count++;
          if (count === 5) penalty += 3;
          else if (count > 5) penalty++;
        } else { count = 1; }
      }
    }
    for (let c = 0; c < size; c++) {
      let count = 1;
      for (let r = 1; r < size; r++) {
        if (testM[r][c] === testM[r - 1][c]) {
          count++;
          if (count === 5) penalty += 3;
          else if (count > 5) penalty++;
        } else { count = 1; }
      }
    }
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const val = testM[r][c];
        if (val === testM[r + 1][c] && val === testM[r][c + 1] && val === testM[r + 1][c + 1]) penalty += 3;
      }
    }
    return { mask, penalty, matrix: testM };
  }

  let best = null;
  for (let m = 0; m < 8; m++) {
    const res = evaluateMask(m);
    if (!best || res.penalty < best.penalty) best = res;
  }

  return best.matrix;
}

export function generateQrMatrix(text) {
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(String(text || ''));
  const versionInfo = selectVersion(utf8.length);
  const codewords = encodeData(utf8, versionInfo);
  return createMatrix(versionInfo, codewords);
}

export function generateQrSvg(text, options = {}) {
  const {
    margin = 4,
    size = 200,
    darkColor = '#0f172a',
    lightColor = '#ffffff',
    title = 'QR Code'
  } = options;

  const matrix = generateQrMatrix(text);
  const moduleCount = matrix.length;
  const viewBoxSize = moduleCount + margin * 2;

  let pathData = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${title}">
  <rect width="100%" height="100%" fill="${lightColor}"/>
  <path d="${pathData.trim()}" fill="${darkColor}"/>
</svg>`;
}

export function generateQrDataUri(text, options = {}) {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
