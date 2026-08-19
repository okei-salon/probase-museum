import type { NormRect } from "@/lib/import/layouts/types";
import {
  MONTHLY_MVP_CANVAS_H,
  MONTHLY_MVP_CANVAS_W,
} from "@/lib/import/layouts/monthlyMvp";

export type DetectedScreenRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NormalizedGameScreen = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  tvDetected: boolean;
  sourceRect: DetectedScreenRect;
  previewBlob: Blob;
};

function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("キャンバス書き出し失敗"));
      else resolve(b);
    }, "image/png");
  });
}

/**
 * 暗い部屋＋明るいTV想定で、輝度の高い矩形をゲーム画面候補として検出。
 * プロスピUIは暗めなので、硬閾値のあと軟閾値で左右を拡張し、右端切れを防ぐ。
 */
export function detectTvScreenRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): DetectedScreenRect | null {
  let sum = 0;
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    lum[p] = y;
    sum += y;
  }
  const mean = sum / lum.length;
  const hardThr = Math.min(200, Math.max(70, mean + 16));
  const softThr = Math.max(42, mean * 0.55);

  const rowHard = new Float32Array(height);
  const colHard = new Float32Array(width);
  const rowSoft = new Float32Array(height);
  const colSoft = new Float32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = lum[y * width + x]!;
      if (v >= hardThr) {
        rowHard[y] += 1;
        colHard[x] += 1;
      }
      if (v >= softThr) {
        rowSoft[y] += 1;
        colSoft[x] += 1;
      }
    }
  }

  const rowNeed = width * 0.1;
  const colNeed = height * 0.055;
  let top = 0;
  while (top < height && rowHard[top]! < rowNeed) top += 1;
  let bottom = height - 1;
  while (bottom > top && rowHard[bottom]! < rowNeed) bottom -= 1;
  let left = 0;
  while (left < width && colHard[left]! < colNeed) left += 1;
  let right = width - 1;
  while (right > left && colHard[right]! < colNeed) right -= 1;

  // 軟閾値で外へ拡張（暗い成績UI・右端列を残す）
  const softRow = width * 0.07;
  const softCol = height * 0.035;
  while (top > 0 && rowSoft[top - 1]! >= softRow) top -= 1;
  while (bottom < height - 1 && rowSoft[bottom + 1]! >= softRow) bottom += 1;
  while (left > 0 && colSoft[left - 1]! >= softCol) left -= 1;
  while (right < width - 1 && colSoft[right + 1]! >= softCol) right += 1;

  // 右の暗いベゼルを少し削る（連続して軟ヒットが極端に低い列）
  while (right - left > width * 0.45 && colSoft[right]! < softCol * 0.45) {
    right -= 1;
  }

  const w = right - left + 1;
  const h = bottom - top + 1;
  if (w < width * 0.22 || h < height * 0.18) return null;

  // 内側パッドは最小限（右端の二塁打列を切らない）
  const padX = Math.floor(w * 0.012);
  const padY = Math.floor(h * 0.02);
  return {
    x: Math.max(0, left + padX),
    y: Math.max(0, top + padY),
    w: Math.max(32, w - padX * 2),
    h: Math.max(32, h - padY * 2),
  };
}

function enhanceCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const contrast = 1.35;
  const brightness = 8;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + brightness;
    let g = d[i + 1] + brightness;
    let b = d[i + 2] + brightness;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * 実写写真 → TV領域検出 → 基準キャンバスへ正規化。
 * 簡易台形対応: 検出矩形を 16:9 基準へ引き伸ばし（遠近の粗い補正）。
 */
export async function normalizeGameScreen(
  source: File | Blob,
  opts?: { width?: number; height?: number },
): Promise<NormalizedGameScreen> {
  const width = opts?.width ?? MONTHLY_MVP_CANVAS_W;
  const height = opts?.height ?? MONTHLY_MVP_CANVAS_H;
  const img = await loadImage(source);

  const probe = document.createElement("canvas");
  const probeScale = Math.min(1, 900 / Math.max(img.width, img.height));
  probe.width = Math.max(1, Math.round(img.width * probeScale));
  probe.height = Math.max(1, Math.round(img.height * probeScale));
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(img, 0, 0, probe.width, probe.height);
  const pdata = pctx.getImageData(0, 0, probe.width, probe.height).data;
  const detected = detectTvScreenRect(pdata, probe.width, probe.height);
  const scaleBack = 1 / probeScale;

  let sourceRect: DetectedScreenRect;
  let tvDetected = false;
  if (detected) {
    tvDetected = true;
    sourceRect = {
      x: Math.floor(detected.x * scaleBack),
      y: Math.floor(detected.y * scaleBack),
      w: Math.floor(detected.w * scaleBack),
      h: Math.floor(detected.h * scaleBack),
    };
  } else {
    // フォールバック: 中央クロップ
    const rw = Math.floor(img.width * 0.86);
    const rh = Math.floor(img.height * 0.62);
    sourceRect = {
      x: Math.floor((img.width - rw) / 2),
      y: Math.floor(img.height * 0.1),
      w: rw,
      h: rh,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    sourceRect.x,
    sourceRect.y,
    sourceRect.w,
    sourceRect.h,
    0,
    0,
    width,
    height,
  );
  enhanceCanvas(canvas);

  const previewBlob = await canvasToBlob(canvas);
  return {
    canvas,
    width,
    height,
    tvDetected,
    sourceRect,
    previewBlob,
  };
}

/** 正規化キャンバスから相対矩形を切り出し（OCR用に拡大・強調） */
export function cropNormalizedField(
  canvas: HTMLCanvasElement,
  rect: NormRect,
  scale = 2,
  opts?: { grayscale?: boolean; contrast?: number },
): HTMLCanvasElement {
  const sx = Math.floor(rect.x * canvas.width);
  const sy = Math.floor(rect.y * canvas.height);
  const sw = Math.max(8, Math.floor(rect.w * canvas.width));
  const sh = Math.max(8, Math.floor(rect.h * canvas.height));
  const outW = Math.max(24, Math.round(sw * scale));
  const outH = Math.max(24, Math.round(sh * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, outW, outH);

  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  const c = opts?.contrast ?? 1.55;
  const gray = opts?.grayscale ?? true;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * c + 128;
    let g = (d[i + 1] - 128) * c + 128;
    let b = (d[i + 2] - 128) * c + 128;
    if (gray) {
      let y = 0.299 * r + 0.587 * g + 0.114 * b;
      if (y < 75) y = 0;
      else if (y > 200) y = 255;
      d[i] = d[i + 1] = d[i + 2] = y;
    } else {
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasToBlob(canvas);
}

/** 正規化キャンバスにテンプレート枠を描画（デバッグ用） */
export function drawLayoutOverlay(
  source: HTMLCanvasElement,
  fields: Array<{ id: string; label: string; rect: NormRect }>,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const colors = [
    "#ff5555",
    "#55ff55",
    "#55aaff",
    "#ffcc33",
    "#ff55ff",
    "#55ffff",
  ];
  fields.forEach((f, i) => {
    const color = colors[i % colors.length];
    const x = f.rect.x * source.width;
    const y = f.rect.y * source.height;
    const w = f.rect.w * source.width;
    const h = f.rect.h * source.height;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.font = "16px sans-serif";
    ctx.fillText(f.label, x + 2, Math.max(14, y - 4));
  });
  return out;
}
