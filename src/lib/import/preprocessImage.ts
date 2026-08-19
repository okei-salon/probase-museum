/**
 * 実写（iPhoneでTV撮影）向けの画像前処理。
 * 固定座標に依存せず、明るい矩形＝ゲーム画面候補を検出して切り出す。
 */

export type PreprocessVariant = {
  id: string;
  label: string;
  blob: Blob;
  width: number;
  height: number;
};

export type PreprocessResult = {
  variants: PreprocessVariant[];
  imageWidth: number;
  imageHeight: number;
  tvDetected: boolean;
  tvRect: { x: number; y: number; w: number; h: number } | null;
  deskewVariants: number;
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

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("画像の書き出しに失敗しました"));
      else resolve(b);
    }, type);
  });
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * 輝度の高い連続領域から、ゲーム画面らしい矩形を推定。
 * 部屋の暗い背景 + 明るいTV画面、という実写を想定。
 */
function detectBrightScreenRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rect | null {
  let sum = 0;
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum[p] = y;
    sum += y;
  }
  const mean = sum / lum.length;
  const threshold = Math.min(210, Math.max(90, mean + 28));

  // 行・列ごとの「明るい画素」密度
  const rowHits = new Float32Array(height);
  const colHits = new Float32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (lum[y * width + x] >= threshold) {
        rowHits[y] += 1;
        colHits[x] += 1;
      }
    }
  }

  const rowNeed = width * 0.18;
  const colNeed = height * 0.12;
  let top = 0;
  while (top < height && rowHits[top] < rowNeed) top += 1;
  let bottom = height - 1;
  while (bottom > top && rowHits[bottom] < rowNeed) bottom -= 1;
  let left = 0;
  while (left < width && colHits[left] < colNeed) left += 1;
  let right = width - 1;
  while (right > left && colHits[right] < colNeed) right -= 1;

  const w = right - left + 1;
  const h = bottom - top + 1;
  if (w < width * 0.25 || h < height * 0.2) return null;

  // 余白を少し内側へ（ベゼル／反射を避ける）
  const padX = Math.floor(w * 0.03);
  const padY = Math.floor(h * 0.03);
  return {
    x: Math.max(0, left + padX),
    y: Math.max(0, top + padY),
    w: Math.max(32, w - padX * 2),
    h: Math.max(32, h - padY * 2),
  };
}

function centerCropRect(width: number, height: number, ratio = 0.78): Rect {
  const w = Math.floor(width * ratio);
  const h = Math.floor(height * ratio);
  return {
    x: Math.floor((width - w) / 2),
    y: Math.floor((height - h) / 2),
    w,
    h,
  };
}

function drawEnhanced(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  opts: {
    maxSide: number;
    contrast: number;
    brightness: number;
    grayscale: boolean;
    invert?: boolean;
  },
): HTMLCanvasElement {
  // 長辺を maxSide 付近へ（実写の小さな文字向けに強めに拡大）
  const scale = opts.maxSide / Math.max(sw, sh);
  const clamped = Math.min(Math.max(scale, 0.5), 4.0);
  const outW = Math.max(1, Math.round(sw * clamped));
  const outH = Math.max(1, Math.round(sh * clamped));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);

  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  const c = opts.contrast;
  const b = opts.brightness;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + b;
    let g = d[i + 1] + b;
    let bl = d[i + 2] + b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    if (opts.grayscale) {
      const y = 0.299 * r + 0.587 * g + 0.114 * bl;
      let v = y;
      // 簡易二値寄り（薄い文字を落とさないよう中間は残す）
      if (v < 70) v = 0;
      else if (v > 200) v = 255;
      if (opts.invert) v = 255 - v;
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, bl));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * OCR用に複数バリアントを生成。
 * - 検出した画面領域
 * - 中央クロップ
 * - 原寸縮小＋強調
 */
export async function preprocessImportImage(
  source: File | Blob,
): Promise<PreprocessResult> {
  const img = await loadImage(source);
  const probe = document.createElement("canvas");
  const probeScale = Math.min(1, 720 / Math.max(img.width, img.height));
  probe.width = Math.max(1, Math.round(img.width * probeScale));
  probe.height = Math.max(1, Math.round(img.height * probeScale));
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(img, 0, 0, probe.width, probe.height);
  const pdata = pctx.getImageData(0, 0, probe.width, probe.height).data;

  const detected = detectBrightScreenRect(pdata, probe.width, probe.height);
  const scaleBack = 1 / probeScale;

  const variants: PreprocessVariant[] = [];
  let deskewVariants = 0;
  let tvRect: PreprocessResult["tvRect"] = null;

  async function push(
    id: string,
    label: string,
    rect: Rect,
    opts: {
      maxSide: number;
      contrast: number;
      brightness: number;
      grayscale: boolean;
      invert?: boolean;
    },
  ) {
    const canvas = drawEnhanced(
      img,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      opts,
    );
    const blob = await canvasToBlob(canvas);
    variants.push({
      id,
      label,
      blob,
      width: canvas.width,
      height: canvas.height,
    });
  }

  if (detected) {
    const rect: Rect = {
      x: Math.floor(detected.x * scaleBack),
      y: Math.floor(detected.y * scaleBack),
      w: Math.floor(detected.w * scaleBack),
      h: Math.floor(detected.h * scaleBack),
    };
    tvRect = { ...rect };
    await push("screen-contrast", "画面検出＋コントラスト", rect, {
      maxSide: 1600,
      contrast: 1.45,
      brightness: 12,
      grayscale: true,
    });
    await push("screen-soft", "画面検出＋ソフト", rect, {
      maxSide: 1600,
      contrast: 1.2,
      brightness: 8,
      grayscale: false,
    });
    // 表領域候補: 画面中央〜下寄り（月間MVPのカード領域）
    const table: Rect = {
      x: rect.x + Math.floor(rect.w * 0.08),
      y: rect.y + Math.floor(rect.h * 0.18),
      w: Math.floor(rect.w * 0.84),
      h: Math.floor(rect.h * 0.72),
    };
    await push("table-contrast", "表領域候補＋強調", table, {
      maxSide: 1600,
      contrast: 1.55,
      brightness: 14,
      grayscale: true,
    });
    for (const deg of [-3, 3] as const) {
      const rotated = await rotateCropBlob(img, rect, deg, {
        maxSide: 1500,
        contrast: 1.4,
        brightness: 10,
        grayscale: true,
      });
      variants.push({
        id: `screen-rot${deg > 0 ? "p" : "m"}${Math.abs(deg)}`,
        label: `画面検出＋${deg}°補正`,
        blob: rotated.blob,
        width: rotated.width,
        height: rotated.height,
      });
      deskewVariants += 1;
    }
  }

  const center = centerCropRect(img.width, img.height, 0.82);
  await push("center-contrast", "中央クロップ＋強調", center, {
    maxSide: 1600,
    contrast: 1.5,
    brightness: 10,
    grayscale: true,
  });

  await push("full-enhance", "全体強調", {
    x: 0,
    y: 0,
    w: img.width,
    h: img.height,
  }, {
    maxSide: 1400,
    contrast: 1.35,
    brightness: 6,
    grayscale: true,
  });

  return {
    variants,
    imageWidth: img.width,
    imageHeight: img.height,
    tvDetected: !!detected,
    tvRect,
    deskewVariants,
  };
}

async function rotateCropBlob(
  img: HTMLImageElement,
  rect: Rect,
  degrees: number,
  opts: {
    maxSide: number;
    contrast: number;
    brightness: number;
    grayscale: boolean;
  },
): Promise<{ blob: Blob; width: number; height: number }> {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rw = Math.ceil(rect.w * cos + rect.h * sin);
  const rh = Math.ceil(rect.w * sin + rect.h * cos);

  const tmp = document.createElement("canvas");
  tmp.width = rw;
  tmp.height = rh;
  const tctx = tmp.getContext("2d")!;
  tctx.translate(rw / 2, rh / 2);
  tctx.rotate(rad);
  tctx.drawImage(
    img,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    -rect.w / 2,
    -rect.h / 2,
    rect.w,
    rect.h,
  );

  const enhanced = drawEnhanced(tmp, 0, 0, rw, rh, {
    ...opts,
    invert: false,
  });
  const blob = await canvasToBlob(enhanced);
  return { blob, width: enhanced.width, height: enhanced.height };
}
