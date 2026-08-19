import type { NormRect } from "@/lib/import/layouts/types";
import {
  DEFAULT_BATTING_STAT_COLUMNS,
  HEADER_BAND_H,
} from "@/lib/import/layouts/seasonBattingRanking";
import type { SeasonBatchFieldKey } from "@/data/import/seasonBatchTypes";

export type RankingRowBand = {
  index: number;
  y0: number;
  y1: number;
  yCenter: number;
};

export type RankingStatColumn = {
  field: SeasonBatchFieldKey;
  label: string;
  rect: NormRect;
};

export type RankingTableFrame = {
  /** 氏名セル帯 */
  name: { x: number; w: number };
  /** 球団ロゴ帯 */
  team: { x: number; w: number };
  /** 成績列開始〜終了 */
  statsX0: number;
  statsX1: number;
  /** 打率列（黄ハイライト）が検出できたか */
  avgHighlightDetected: boolean;
  headerY0: number;
  headerY1: number;
  rowsY0: number;
  rowsY1: number;
};

export type RankingTableGeometry = {
  rows: RankingRowBand[];
  columns: RankingStatColumn[];
  frame: RankingTableFrame;
  nameRectForRow: (row: RankingRowBand) => NormRect;
  teamRectForRow: (row: RankingRowBand) => NormRect;
  headerY0: number;
  headerY1: number;
};

function luminance(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number {
  const i = (y * width + x) * 4;
  return 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
}

function isMustardYellow(r: number, g: number, b: number): boolean {
  return (
    r > 110 &&
    g > 80 &&
    b < 125 &&
    r + g > b * 2.2 &&
    Math.abs(r - g) < 95
  );
}

function evenRowsInSpan(
  top: number,
  bottom: number,
  maxRows: number,
): RankingRowBand[] {
  const span = Math.max(0.2, bottom - top);
  const h = span / maxRows;
  return Array.from({ length: maxRows }, (_, index) => {
    const y0 = top + index * h;
    const y1 = y0 + h * 0.88;
    return { index, y0, y1, yCenter: (y0 + y1) / 2 };
  });
}

/**
 * 選択中の成績列（山吹色ハイライト）を検出し、打率列の X 範囲を返す。
 */
export function detectAvgHighlightColumn(
  canvas: HTMLCanvasElement,
): { x0: number; x1: number; score: number } | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const score = new Float32Array(width);

  const yA = Math.floor(height * 0.26);
  const yB = Math.floor(height * 0.86);
  for (let x = Math.floor(width * 0.18); x < Math.floor(width * 0.92); x += 1) {
    let s = 0;
    for (let y = yA; y < yB; y += 2) {
      const i = (y * width + x) * 4;
      if (isMustardYellow(d[i]!, d[i + 1]!, d[i + 2]!)) s += 1;
    }
    score[x] = s;
  }

  // 平滑化
  const smooth = new Float32Array(width);
  for (let x = 2; x < width - 2; x += 1) {
    smooth[x] =
      (score[x - 2]! +
        score[x - 1]! +
        score[x]! +
        score[x + 1]! +
        score[x + 2]!) /
      5;
  }

  let best = 0;
  let bestX = 0;
  for (let x = 0; x < width; x += 1) {
    if (smooth[x]! > best) {
      best = smooth[x]!;
      bestX = x;
    }
  }
  if (best < height * 0.02) return null;

  let x0 = bestX;
  let x1 = bestX;
  while (x0 > width * 0.15 && smooth[x0]! > best * 0.38) x0 -= 1;
  while (x1 < width * 0.95 && smooth[x1]! > best * 0.38) x1 += 1;

  const w = (x1 - x0) / width;
  if (w < 0.035 || w > 0.16) return null;

  return { x0: x0 / width, x1: x1 / width, score: best };
}

/**
 * 氏名ネームプレートの X 範囲（黄列の左側の明るい帯）。
 * 全Y平均ではなく、明るい行での連続白帯を優先する。
 */
export function detectNamePlateX(
  canvas: HTMLCanvasElement,
  statsX0: number,
): { x0: number; x1: number } {
  const fallback = {
    x0: Math.max(0.08, statsX0 - 0.20),
    x1: Math.max(0.16, statsX0 - 0.045),
  };
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;

  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const limit = Math.floor(statsX0 * width) - Math.floor(width * 0.012);
  const xStart = Math.floor(width * 0.05);

  // 左帯の行平均輝度からネームプレート行を拾う
  const probeX0 = Math.floor(width * Math.max(0.1, statsX0 - 0.18));
  const probeX1 = Math.floor(width * Math.max(0.16, statsX0 - 0.08));
  const rowAvg = new Float32Array(height);
  for (let y = Math.floor(height * 0.22); y < Math.floor(height * 0.88); y += 1) {
    let sum = 0;
    let n = 0;
    for (let x = probeX0; x < probeX1; x += 2) {
      sum += luminance(d, width, x, y);
      n += 1;
    }
    rowAvg[y] = n ? sum / n : 0;
  }

  const peakYs: number[] = [];
  for (let y = Math.floor(height * 0.24); y < Math.floor(height * 0.86); y += 1) {
    let local = 0;
    let c = 0;
    for (let k = -6; k <= 6; k += 1) {
      local += rowAvg[y + k] ?? 0;
      c += 1;
    }
    local /= Math.max(1, c);
    if (rowAvg[y]! > local + 10 && rowAvg[y]! > 140) {
      if (!peakYs.length || y - peakYs[peakYs.length - 1]! > height * 0.028) {
        peakYs.push(y);
      }
    }
  }

  const sampleYs =
    peakYs.length >= 3
      ? peakYs.slice(0, Math.min(10, peakYs.length))
      : [
          Math.floor(height * 0.3),
          Math.floor(height * 0.4),
          Math.floor(height * 0.5),
          Math.floor(height * 0.6),
        ];

  const vote = new Float32Array(width);
  for (const y of sampleYs) {
    for (let x = xStart; x < limit; x += 1) {
      const i = (y * width + x) * 4;
      const r = d[i]!;
      const g = d[i + 1]!;
      const b = d[i + 2]!;
      const yv = 0.299 * r + 0.587 * g + 0.114 * b;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (yv > 155 && spread < 55) vote[x] += 1;
    }
  }

  // 投票が途切れても、一定票以上の X 集合のパーセンタイルで帯を決める
  const hitXs: number[] = [];
  const need = Math.max(2, Math.floor(sampleYs.length * 0.25));
  for (let x = xStart; x < limit; x += 1) {
    if ((vote[x] ?? 0) >= need) hitXs.push(x);
  }

  if (hitXs.length < width * 0.04) return fallback;

  const q = (p: number) => {
    const i = Math.min(
      hitXs.length - 1,
      Math.max(0, Math.floor((hitXs.length - 1) * p)),
    );
    return hitXs[i]!;
  };
  let x0 = q(0.05) / width;
  let x1 = q(0.92) / width;
  // ロゴ側のはみ出しを抑える
  x1 = Math.min(x1, statsX0 - 0.035);
  x0 = Math.max(x0, x1 - 0.2);
  if (x1 - x0 < 0.07) return fallback;
  return { x0, x1 };
}

/**
 * ネームプレート帯から Y を検出し、必ず 10 行の等分割に正規化する。
 */
export function detectNamePlateRows(
  canvas: HTMLCanvasElement,
  nameX: { x0: number; x1: number },
  maxRows = 10,
): RankingRowBand[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const fallback = evenRowsInSpan(0.255, 0.875, maxRows);
  if (!ctx) return fallback;

  const { width, height } = canvas;
  const x0 = Math.floor(nameX.x0 * width);
  const x1 = Math.floor(nameX.x1 * width);
  const y0 = Math.floor(height * 0.2);
  const y1 = Math.floor(height * 0.9);
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;

  const rowAvg = new Float32Array(y1 - y0);
  for (let y = y0; y < y1; y += 1) {
    let sum = 0;
    let n = 0;
    for (let x = x0; x < x1; x += 2) {
      sum += luminance(d, width, x, y);
      n += 1;
    }
    rowAvg[y - y0] = n ? sum / n : 0;
  }

  const bands: Array<{ a: number; b: number; c: number }> = [];
  let start = -1;
  for (let i = 0; i < rowAvg.length; i += 1) {
    let local = 0;
    let c = 0;
    for (let k = -7; k <= 7; k += 1) {
      const j = i + k;
      if (j < 0 || j >= rowAvg.length) continue;
      local += rowAvg[j]!;
      c += 1;
    }
    local /= Math.max(1, c);
    const on = rowAvg[i]! > local + 12 && rowAvg[i]! > 120;
    if (on && start < 0) start = i;
    if ((!on || i === rowAvg.length - 1) && start >= 0) {
      const end = on && i === rowAvg.length - 1 ? i : i - 1;
      if (end - start >= Math.floor(height * 0.01)) {
        bands.push({
          a: start + y0,
          b: end + y0,
          c: (start + end) / 2 + y0,
        });
      }
      start = -1;
    }
  }

  const filtered = bands.filter((b) => {
    const h = (b.b - b.a) / height;
    return h >= 0.015 && h <= 0.09;
  });

  if (filtered.length >= 5) {
    const top = filtered[0]!.a / height - 0.002;
    const bottom = filtered[filtered.length - 1]!.b / height + 0.002;
    // 重要: 検出帯の上下端を等分割（必ず maxRows）。個別帯の欠落で行を落とさない
    return evenRowsInSpan(top, bottom, maxRows);
  }

  return fallback;
}

/**
 * 表フレームを検出する。
 * 優先: 山吹色の打率列 → その左に氏名・球団、右に等幅成績列。
 */
export function detectRankingTableFrame(
  canvas: HTMLCanvasElement,
): RankingTableFrame {
  const highlight = detectAvgHighlightColumn(canvas);
  const statsX0 = highlight?.x0 ?? 0.33;
  const statsX1 = 0.955;
  const name = detectNamePlateX(canvas, statsX0);
  // 氏名と成績の間を球団ロゴ帯に
  const teamX0 = name.x1 + 0.004;
  const teamX1 = Math.max(teamX0 + 0.03, statsX0 - 0.008);
  const rows = detectNamePlateRows(canvas, name, 10);
  const rowsY0 = rows[0]?.y0 ?? 0.255;
  const rowsY1 = rows[rows.length - 1]?.y1 ?? 0.875;
  const headerY1 = Math.max(0.2, rowsY0 - 0.01);
  const headerY0 = Math.max(0.16, headerY1 - HEADER_BAND_H);

  return {
    name: { x: name.x0, w: Math.max(0.08, name.x1 - name.x0) },
    team: {
      x: teamX0,
      w: Math.max(0.03, teamX1 - teamX0),
    },
    statsX0,
    statsX1,
    avgHighlightDetected: Boolean(highlight),
    headerY0,
    headerY1,
    rowsY0,
    rowsY1,
  };
}

/**
 * 成績列を「固定フィールド順 × 検出した X 帯の等分割」で確定。
 * 数字を読んでから列を推測しない。
 */
export function buildStatColumns(
  fields: SeasonBatchFieldKey[] = DEFAULT_BATTING_STAT_COLUMNS,
  statsX0 = 0.33,
  statsX1 = 0.955,
): RankingStatColumn[] {
  const n = Math.max(1, fields.length);
  const band = Math.max(0.2, statsX1 - statsX0);
  const colW = band / n;
  const gap = colW * 0.08;
  return fields.map((field, i) => ({
    field,
    label: field,
    rect: {
      x: statsX0 + i * colW + gap * 0.5,
      y: 0,
      w: Math.max(0.02, colW - gap),
      h: 0.04,
    },
  }));
}

export function buildRankingTableGeometry(
  canvas: HTMLCanvasElement,
  fields?: SeasonBatchFieldKey[],
): RankingTableGeometry {
  const locked = fields ?? [...DEFAULT_BATTING_STAT_COLUMNS];
  const frame = detectRankingTableFrame(canvas);
  const rows = detectNamePlateRows(
    canvas,
    {
      x0: frame.name.x,
      x1: frame.name.x + frame.name.w,
    },
    10,
  );
  const columns = buildStatColumns(locked, frame.statsX0, frame.statsX1);

  return {
    rows,
    columns,
    frame,
    headerY0: frame.headerY0,
    headerY1: frame.headerY1,
    nameRectForRow: (row) => ({
      x: frame.name.x + 0.008,
      y: row.y0 + 0.01,
      w: Math.max(0.06, frame.name.w - 0.016),
      h: Math.max(0.016, row.y1 - row.y0 - 0.018),
    }),
    teamRectForRow: (row) => ({
      x: frame.team.x,
      y: row.y0 + 0.008,
      w: frame.team.w,
      h: Math.max(0.016, row.y1 - row.y0 - 0.014),
    }),
  };
}

/** セル切り出し — 列矩形の内側だけを使い隣列混入を避ける */
export function cellRect(
  col: RankingStatColumn,
  row: RankingRowBand,
): NormRect {
  return {
    x: col.rect.x + col.rect.w * 0.12,
    y: row.y0 + 0.012,
    w: col.rect.w * 0.76,
    h: Math.max(0.014, row.y1 - row.y0 - 0.022),
  };
}

export function headerCellRect(
  col: RankingStatColumn,
  headerY0: number,
  headerY1: number,
): NormRect {
  return {
    x: col.rect.x,
    y: headerY0,
    w: col.rect.w,
    h: Math.max(0.02, headerY1 - headerY0),
  };
}
