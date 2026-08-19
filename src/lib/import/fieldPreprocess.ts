import type { FieldOcrMode } from "@/lib/import/layouts/types";

export type PreprocessKind =
  | "soft_gray"
  | "hard_bin"
  | "invert_bin"
  | "high_contrast"
  | "color_boost"
  | "light_ink_bw"
  | "dark_ink_bw";

/** 切り出し済みキャンバスをOCR向けに複数バリアント化 */
export function makeOcrVariants(
  source: HTMLCanvasElement,
  mode: FieldOcrMode,
): Array<{ kind: PreprocessKind; canvas: HTMLCanvasElement }> {
  const kinds = kindsForMode(mode);
  return kinds.map((kind) => ({
    kind,
    canvas: applyPreprocess(source, kind),
  }));
}

function kindsForMode(mode: FieldOcrMode): PreprocessKind[] {
  if (mode === "year" || mode === "month") {
    // 青バナー上の白文字 → 黒文字白地が最優先
    return ["light_ink_bw", "high_contrast", "invert_bin", "soft_gray"];
  }
  if (mode === "digits" || mode === "digits_decimal") {
    return ["light_ink_bw", "invert_bin", "hard_bin", "high_contrast"];
  }
  if (mode === "japanese_name") {
    // 白地に暗文字。強二値は崩しやすいので soft / dark_ink 優先
    return ["dark_ink_bw", "soft_gray", "high_contrast", "color_boost"];
  }
  if (mode === "japanese_team") {
    return ["color_boost", "soft_gray"];
  }
  return ["soft_gray", "hard_bin"];
}

function applyPreprocess(
  source: HTMLCanvasElement,
  kind: PreprocessKind,
): HTMLCanvasElement {
  const scale =
    kind === "light_ink_bw" || kind === "dark_ink_bw"
      ? 3.0
      : kind === "hard_bin" || kind === "invert_bin" || kind === "high_contrast"
        ? 1.5
        : 1.25;
  const w = Math.max(32, Math.round(source.width * scale));
  const h = Math.max(24, Math.round(source.height * scale));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  if (kind === "light_ink_bw") {
    // 青背景の白文字: min(R,G,B) が高い画素をインクとみなす
    const scores = new Float32Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      const minc = Math.min(d[i], d[i + 1], d[i + 2]);
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      scores[p] = Math.max(minc, y * 0.85);
    }
    const sorted = Array.from(scores).sort((a, b) => b - a);
    const thr = Math.max(
      140,
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.12))] ?? 160,
    );
    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      const ink = scores[p] >= thr;
      const v = ink ? 0 : 255; // 黒文字・白地
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    // 横線ノイズ除去
    for (let y = 0; y < h; y += 1) {
      let black = 0;
      for (let x = 0; x < w; x += 1) {
        if (d[(y * w + x) * 4] < 128) black += 1;
      }
      if (black / w > 0.62) {
        for (let x = 0; x < w; x += 1) {
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = 255;
        }
      }
    }
  } else if (kind === "dark_ink_bw") {
    // 白地の暗文字（氏名）
    const gray = new Float32Array(w * h);
    let sum = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += gray[p];
    }
    const mean = sum / gray.length;
    const thr = Math.min(165, Math.max(110, mean * 0.92));
    for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
      const v = gray[p] < thr ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  } else if (kind === "color_boost") {
    const c = 1.4;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp((d[i] - 128) * c + 128);
      d[i + 1] = clamp((d[i + 1] - 128) * c + 128);
      d[i + 2] = clamp((d[i + 2] - 128) * c + 128);
    }
  } else {
    const contrast =
      kind === "high_contrast" ? 1.9 : kind === "soft_gray" ? 1.45 : 1.7;
    for (let i = 0; i < d.length; i += 4) {
      let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      y = (y - 128) * contrast + 128;
      if (kind === "hard_bin" || kind === "invert_bin") {
        let v = y < 140 ? 0 : 255;
        if (kind === "invert_bin") v = 255 - v;
        d[i] = d[i + 1] = d[i + 2] = v;
      } else {
        if (y < 60) y = 0;
        else if (y > 210) y = 255;
        d[i] = d[i + 1] = d[i + 2] = clamp(y);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * スペースの広い氏名を、文字箱を詰めてOCRしやすくする。
 */
export function packDarkGlyphs(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const prep = applyPreprocess(source, "dark_ink_bw");
  const ctx = prep.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = prep;
  const { data } = ctx.getImageData(0, 0, w, h);
  const col = new Float32Array(w);
  for (let x = 0; x < w; x += 1) {
    let c = 0;
    for (let y = Math.floor(h * 0.08); y < Math.floor(h * 0.92); y += 1) {
      if (data[(y * w + x) * 4] < 128) c += 1;
    }
    col[x] = c / (h * 0.84);
  }
  const runs: Array<{ x0: number; x1: number }> = [];
  let inRun = false;
  let start = 0;
  for (let x = 0; x < w; x += 1) {
    const on = col[x] >= 0.02;
    if (on && !inRun) {
      inRun = true;
      start = x;
    } else if (!on && inRun) {
      inRun = false;
      if (x - start >= 4) runs.push({ x0: start, x1: x - 1 });
    }
  }
  if (inRun && w - start >= 4) runs.push({ x0: start, x1: w - 1 });
  // 枠線の太い縦帯を除外（端の細い/広いノイズ）
  const glyphs = runs.filter((r) => {
    const ww = r.x1 - r.x0 + 1;
    return ww >= 8 && ww < w * 0.55;
  });
  if (glyphs.length < 1) return null;

  const gap = 6;
  const pad = 10;
  let totalW = pad * 2;
  const heights: number[] = [];
  const slices: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  for (const g of glyphs) {
    let y0 = 0;
    let y1 = h - 1;
    while (y0 < h) {
      let row = 0;
      for (let x = g.x0; x <= g.x1; x += 1) {
        if (data[(y0 * w + x) * 4] < 128) row += 1;
      }
      if (row > 0) break;
      y0 += 1;
    }
    while (y1 > y0) {
      let row = 0;
      for (let x = g.x0; x <= g.x1; x += 1) {
        if (data[(y1 * w + x) * 4] < 128) row += 1;
      }
      if (row > 0) break;
      y1 -= 1;
    }
    slices.push({ x0: g.x0, x1: g.x1, y0, y1 });
    heights.push(y1 - y0 + 1);
    totalW += g.x1 - g.x0 + 1 + gap;
  }
  const outH = Math.max(...heights) + pad * 2;
  const out = document.createElement("canvas");
  out.width = Math.max(32, totalW);
  out.height = Math.max(24, outH);
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);
  let dx = pad;
  for (const s of slices) {
    const sw = s.x1 - s.x0 + 1;
    const sh = s.y1 - s.y0 + 1;
    octx.drawImage(prep, s.x0, s.y0, sw, sh, dx, pad, sw, sh);
    dx += sw + gap;
  }
  return out;
}

/** 暗文字の各グリフを個別キャンバスに切り出す */
export function splitDarkGlyphs(source: HTMLCanvasElement): HTMLCanvasElement[] {
  const prep = applyPreprocess(source, "dark_ink_bw");
  const ctx = prep.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = prep;
  const { data } = ctx.getImageData(0, 0, w, h);
  const col = new Float32Array(w);
  for (let x = 0; x < w; x += 1) {
    let c = 0;
    for (let y = Math.floor(h * 0.08); y < Math.floor(h * 0.92); y += 1) {
      if (data[(y * w + x) * 4] < 128) c += 1;
    }
    col[x] = c / (h * 0.84);
  }
  const runs: Array<{ x0: number; x1: number }> = [];
  let inRun = false;
  let start = 0;
  for (let x = 0; x < w; x += 1) {
    const on = col[x] >= 0.02;
    if (on && !inRun) {
      inRun = true;
      start = x;
    } else if (!on && inRun) {
      inRun = false;
      if (x - start >= 4) runs.push({ x0: start, x1: x - 1 });
    }
  }
  if (inRun && w - start >= 4) runs.push({ x0: start, x1: w - 1 });
  const glyphs = runs.filter((r) => {
    const ww = r.x1 - r.x0 + 1;
    return ww >= 8 && ww < w * 0.55;
  });
  const out: HTMLCanvasElement[] = [];
  for (const g of glyphs) {
    let y0 = 0;
    let y1 = h - 1;
    while (y0 < h) {
      let row = 0;
      for (let x = g.x0; x <= g.x1; x += 1) {
        if (data[(y0 * w + x) * 4] < 128) row += 1;
      }
      if (row > 0) break;
      y0 += 1;
    }
    while (y1 > y0) {
      let row = 0;
      for (let x = g.x0; x <= g.x1; x += 1) {
        if (data[(y1 * w + x) * 4] < 128) row += 1;
      }
      if (row > 0) break;
      y1 -= 1;
    }
    const pad = 8;
    const sw = g.x1 - g.x0 + 1;
    const sh = y1 - y0 + 1;
    const canvas = document.createElement("canvas");
    canvas.width = sw + pad * 2;
    canvas.height = sh + pad * 2;
    const octx = canvas.getContext("2d")!;
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, canvas.width, canvas.height);
    octx.drawImage(prep, g.x0, y0, sw, sh, pad, pad, sw, sh);
    out.push(canvas);
  }
  return out;
}

/**
 * 氏名切り出しの外周枠を落としてから dark_ink / pack する。
 */
export function trimNameCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const x0 = Math.floor(w * 0.08);
  const x1 = Math.floor(w * 0.96);
  const y0 = Math.floor(h * 0.12);
  const y1 = Math.floor(h * 0.88);
  const out = document.createElement("canvas");
  out.width = Math.max(16, x1 - x0);
  out.height = Math.max(12, y1 - y0);
  const octx = out.getContext("2d")!;
  octx.drawImage(
    source,
    x0,
    y0,
    out.width,
    out.height,
    0,
    0,
    out.width,
    out.height,
  );
  return out;
}

/** 黒文字を1px太らせて OCR しやすくする */
export function thickenDarkInk(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = source;
  const src = ctx.getImageData(0, 0, w, h);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const dst = octx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let dark = false;
      for (let dy = -1; dy <= 1 && !dark; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (src.data[(yy * w + xx) * 4] < 140) {
            dark = true;
            break;
          }
        }
      }
      const i = (y * w + x) * 4;
      const v = dark ? 0 : 255;
      dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = v;
      dst.data[i + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}
