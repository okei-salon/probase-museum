/**
 * 白文字フィールド向けの数値切り出し・簡易認識。
 * TV写真ではテンプレ単独は弱いので、主に「数字領域の単離」と補助投票に使う。
 */

export type DigitVisionResult = {
  text: string;
  confidence: number;
  digits: number[];
};

function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** 3x5 テンプレート（1=インク） */
const TEMPLATES: Record<string, number[][]> = {
  "0": [
    [1, 1, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "1": [
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ],
  "2": [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
  ],
  "3": [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  "4": [
    [1, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
  "5": [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  "6": [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "7": [
    [1, 1, 1],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ],
  "8": [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "9": [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
};

function matchDigit(grid: number[][]): { digit: string; score: number } {
  let best = { digit: "?", score: -1 };
  for (const [d, tmpl] of Object.entries(TEMPLATES)) {
    let ok = 0;
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (grid[r][c] === tmpl[r][c]) ok += 1;
      }
    }
    const score = ok / 15;
    if (score > best.score) best = { digit: d, score };
  }
  // 5/8 の簡易切り分け: row1 で左インク・右空きなら 5 寄り
  if (best.digit === "8" && grid[1][0] === 1 && grid[1][2] === 0) {
    best = { digit: "5", score: best.score };
  }
  return best;
}

type Box = { x0: number; x1: number; y0: number; y1: number; aspect: number };

/**
 * 青系背景上の白文字を抽出し二値化。
 * min(R,G,B) ベース（薄青バナー上の白にも効く）。
 */
function extractWhiteInkBinary(
  canvas: HTMLCanvasElement,
  scale = 3,
): { bin: Uint8Array; w: number; h: number } | null {
  const sw = Math.max(16, Math.round(canvas.width * scale));
  const sh = Math.max(12, Math.round(canvas.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const ctx = tmp.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const score = new Float32Array(sw * sh);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = toGray(data[i], data[i + 1], data[i + 2]);
    const minc = Math.min(data[i], data[i + 1], data[i + 2]);
    // 白文字: minチャンネルも高い。青バナーは min が低い
    score[p] = Math.max(minc, y * 0.8);
  }
  const sorted = Array.from(score).sort((a, b) => b - a);
  if (sorted[0] < 100) return null;
  const thr = Math.max(
    135,
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.12))] ?? 150,
  );
  const bin = new Uint8Array(sw * sh);
  for (let i = 0; i < score.length; i += 1) {
    bin[i] = score[i] >= thr ? 1 : 0;
  }
  // 横線除去
  for (let y = 0; y < sh; y += 1) {
    let row = 0;
    for (let x = 0; x < sw; x += 1) row += bin[y * sw + x];
    if (row / sw > 0.55) {
      for (let x = 0; x < sw; x += 1) bin[y * sw + x] = 0;
    }
  }
  const ink = bin.reduce((a, b) => a + b, 0);
  if (ink < 12) return null;
  return { bin, w: sw, h: sh };
}

function findRuns(
  bin: Uint8Array,
  w: number,
  h: number,
): Box[] {
  const col = new Float32Array(w);
  const y0b = Math.floor(h * 0.05);
  const y1b = Math.floor(h * 0.95);
  const span = Math.max(1, y1b - y0b);
  for (let x = 0; x < w; x += 1) {
    let c = 0;
    for (let y = y0b; y < y1b; y += 1) c += bin[y * w + x];
    col[x] = c / span;
  }
  const raw: Array<{ x0: number; x1: number }> = [];
  let inRun = false;
  let start = 0;
  for (let x = 0; x < w; x += 1) {
    const on = col[x] >= 0.025;
    if (on && !inRun) {
      inRun = true;
      start = x;
    } else if (!on && inRun) {
      inRun = false;
      raw.push({ x0: start, x1: x - 1 });
    }
  }
  if (inRun) raw.push({ x0: start, x1: w - 1 });

  const boxes: Box[] = [];
  for (const r of raw) {
    let y0 = 0;
    let y1 = h - 1;
    while (y0 < h) {
      let row = 0;
      for (let x = r.x0; x <= r.x1; x += 1) row += bin[y0 * w + x];
      if (row > 0) break;
      y0 += 1;
    }
    while (y1 > y0) {
      let row = 0;
      for (let x = r.x0; x <= r.x1; x += 1) row += bin[y1 * w + x];
      if (row > 0) break;
      y1 -= 1;
    }
    const ww = r.x1 - r.x0 + 1;
    const hh = y1 - y0 + 1;
    if (ww < 3 || hh < h * 0.12) continue;
    const aspect = ww / Math.max(1, hh);
    // 広い塊は谷で分割（複数桁 or 数字+単位）
    if (aspect > 0.75 && ww > 16) {
      const local = col.subarray(r.x0, r.x1 + 1);
      const valleys: number[] = [];
      for (let i = 2; i < local.length - 2; i += 1) {
        if (
          local[i] < 0.05 &&
          local[i] <= local[i - 1] &&
          local[i] <= local[i + 1] &&
          Math.max(...local.subarray(Math.max(0, i - 5), i)) > 0.08 &&
          Math.max(...local.subarray(i + 1, Math.min(local.length, i + 6))) > 0.08
        ) {
          valleys.push(i);
        }
      }
      if (valleys.length) {
        const pts = [0, ...valleys, local.length - 1];
        for (let i = 0; i < pts.length - 1; i += 1) {
          const s = r.x0 + pts[i];
          const e = r.x0 + pts[i + 1];
          if (e - s < 4) continue;
          const a = (e - s + 1) / Math.max(1, hh);
          if (a < 1.2) {
            boxes.push({ x0: s, x1: e, y0, y1, aspect: a });
          }
        }
        continue;
      }
    }
    boxes.push({ x0: r.x0, x1: r.x1, y0, y1, aspect });
  }
  return boxes;
}

/** 先頭の数字っぽい箱だけ（単位漢字の直前まで） */
function leadingDigitBoxes(boxes: Box[], maxDigits: number): Box[] {
  const out: Box[] = [];
  for (const b of boxes) {
    if (b.aspect >= 0.95) {
      // 数字+単位が連結した広い塊 → 左端を数字幅として切り出す
      if (out.length) break;
      const hh = b.y1 - b.y0 + 1;
      const digitW = Math.max(6, Math.round(hh * 0.62));
      // 複数桁の可能性: 塊幅が digitW*1.6 以上なら2桁分
      const span = b.x1 - b.x0 + 1;
      const nDigits = Math.min(
        maxDigits,
        Math.max(1, Math.round(span / Math.max(digitW, 1))),
      );
      // 単位漢字は右寄りなので、左 nDigits 分だけ
      const take = Math.min(span, digitW * nDigits + Math.round(digitW * 0.15));
      out.push({
        x0: b.x0,
        x1: b.x0 + take - 1,
        y0: b.y0,
        y1: b.y1,
        aspect: take / Math.max(1, hh),
      });
      break;
    }
    out.push(b);
    if (out.length >= maxDigits) break;
  }
  return out;
}

function sampleGrid(
  bin: Uint8Array,
  w: number,
  box: Box,
): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < 5; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < 3; c += 1) {
      const gy0 = box.y0 + Math.floor(((box.y1 - box.y0 + 1) * r) / 5);
      const gy1 = box.y0 + Math.floor(((box.y1 - box.y0 + 1) * (r + 1)) / 5);
      const gx0 = box.x0 + Math.floor(((box.x1 - box.x0 + 1) * c) / 3);
      const gx1 = box.x0 + Math.floor(((box.x1 - box.x0 + 1) * (c + 1)) / 3);
      let ink = 0;
      let n = 0;
      for (let y = gy0; y < Math.max(gy0 + 1, gy1); y += 1) {
        for (let x = gx0; x < Math.max(gx0 + 1, gx1); x += 1) {
          ink += bin[y * w + x];
          n += 1;
        }
      }
      row.push(n > 0 && ink / n > 0.3 ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * 単位付き統計（5勝 / 41点 / 4盗）や年度から、数字領域だけを黒文字/白地キャンバスで返す。
 * Tesseract 安定化が主目的。
 */
export function isolateDigitRegionCanvas(
  source: HTMLCanvasElement,
  opts?: { maxDigits?: number; pad?: number },
): HTMLCanvasElement | null {
  const maxDigits = opts?.maxDigits ?? 4;
  const extracted = extractWhiteInkBinary(source, 3);
  if (!extracted) return null;
  const { bin, w, h } = extracted;
  const boxes = leadingDigitBoxes(findRuns(bin, w, h), maxDigits);
  if (!boxes.length) return null;
  const x0 = Math.max(0, boxes[0].x0 - 2);
  const x1 = Math.min(w - 1, boxes[boxes.length - 1].x1 + 2);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y0)) - 2);
  const y1 = Math.min(h - 1, Math.max(...boxes.map((b) => b.y1)) + 2);
  const dw = x1 - x0 + 1;
  const dh = y1 - y0 + 1;
  if (dw < 4 || dh < 6) return null;

  const pad = opts?.pad ?? 8;
  const out = document.createElement("canvas");
  out.width = dw + pad * 2;
  out.height = dh + pad * 2;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  // 白地に黒文字（Tesseract向け）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      if (bin[(y0 + y) * w + (x0 + x)]) {
        const i = ((y + pad) * out.width + (x + pad)) * 4;
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * 白文字想定の簡易デジット読み取り（補助投票用）。
 */
export function readDigitsFromCanvas(
  canvas: HTMLCanvasElement,
  opts?: { preferLightInk?: boolean; maxDigits?: number },
): DigitVisionResult {
  const maxDigits = opts?.maxDigits ?? 4;
  const extracted = extractWhiteInkBinary(canvas, 3);
  if (!extracted) return { text: "", confidence: 0, digits: [] };
  const { bin, w, h } = extracted;
  const boxes = leadingDigitBoxes(findRuns(bin, w, h), maxDigits);
  if (!boxes.length) return { text: "", confidence: 0, digits: [] };

  const digits: number[] = [];
  let scoreSum = 0;
  for (const b of boxes) {
    const grid = sampleGrid(bin, w, b);
    const m = matchDigit(grid);
    if (m.digit === "?" || m.score < 0.52) continue;
    digits.push(Number(m.digit));
    scoreSum += m.score;
  }
  if (!digits.length) return { text: "", confidence: 0, digits: [] };
  return {
    text: digits.join(""),
    confidence: Math.min(0.92, scoreSum / digits.length),
    digits,
  };
}

export function readDecimalFromCanvas(
  canvas: HTMLCanvasElement,
): DigitVisionResult {
  return readDigitsFromCanvas(canvas, { preferLightInk: true, maxDigits: 4 });
}
