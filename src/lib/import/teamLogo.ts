/**
 * 球団ロゴ認識。
 * - 暗色正方形（ロゴ枠）を CC で検出
 * - 枠内の黄/白インク vs 青を比較（color_histogram 単独にしない）
 * - 投手・野手で整合（reconcileTeamPair）
 */

export type TeamLogoMatch = {
  teamShort: string;
  score: number;
  method: "logo_features" | "unmatched";
  candidates: Array<{ label: string; score: number }>;
  features?: Record<string, number>;
};

type LogoFeatures = {
  yellow: number;
  orange: number;
  red: number;
  blue: number;
  green: number;
  black: number;
  white: number;
  /** 黄系インク（ロゴ本体） */
  yellowInk: number;
  yellowOverBlue: number;
  edgeDensity: number;
  /** 暗枠らしさ */
  boxDarkness: number;
};

function isYellowGold(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  // 阪神 HT の淡黄〜金（白っぽい黄も含む）
  if (y > 90 && r - b >= 18 && g - b >= 8 && r > 85 && g > 75 && b < 185) {
    return true;
  }
  if (r > 150 && g > 115 && b < 125 && r + g > b * 2.1) return true;
  return false;
}

function findLogoBox(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { x0: number; y0: number; x1: number; y1: number; darkness: number } {
  const dark = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    dark[p] = y < 72 ? 1 : 0;
  }

  const seen = new Uint8Array(w * h);
  type Comp = {
    n: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  const comps: Comp[] = [];
  const qx: number[] = [];
  const qy: number[] = [];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const start = y * w + x;
      if (!dark[start] || seen[start]) continue;
      qx.length = 0;
      qy.length = 0;
      qx.push(x);
      qy.push(y);
      seen[start] = 1;
      let n = 0;
      let x0 = x;
      let x1 = x;
      let y0 = y;
      let y1 = y;
      while (qx.length) {
        const cx = qx.pop()!;
        const cy = qy.pop()!;
        n += 1;
        x0 = Math.min(x0, cx);
        x1 = Math.max(x1, cx);
        y0 = Math.min(y0, cy);
        y1 = Math.max(y1, cy);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!dark[ni] || seen[ni]) continue;
          seen[ni] = 1;
          qx.push(nx);
          qy.push(ny);
        }
      }
      if (n < 35) continue;
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const aspect = bw / Math.max(1, bh);
      if (aspect < 0.65 || aspect > 1.45) continue;
      if (bw < w * 0.22 || bh < h * 0.22) continue;
      comps.push({ n, x0, y0, x1, y1 });
    }
  }
  comps.sort((a, b) => b.n - a.n);

  if (!comps.length) {
    return {
      x0: Math.floor(w * 0.18),
      y0: Math.floor(h * 0.12),
      x1: Math.floor(w * 0.88),
      y1: Math.floor(h * 0.92),
      darkness: 0.3,
    };
  }
  const c = comps[0];
  const padX = Math.max(1, Math.floor((c.x1 - c.x0) * 0.06));
  const padY = Math.max(1, Math.floor((c.y1 - c.y0) * 0.06));
  let darkSum = 0;
  let tot = 0;
  for (let y = c.y0; y <= c.y1; y += 1) {
    for (let x = c.x0; x <= c.x1; x += 1) {
      darkSum += dark[y * w + x];
      tot += 1;
    }
  }
  return {
    x0: c.x0 + padX,
    y0: c.y0 + padY,
    x1: c.x1 - padX,
    y1: c.y1 - padY,
    darkness: tot ? darkSum / tot : 0,
  };
}

function extractFeatures(canvas: HTMLCanvasElement): LogoFeatures {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const box = findLogoBox(d, w, h);
  const counts = {
    yellow: 0,
    orange: 0,
    red: 0,
    blue: 0,
    green: 0,
    black: 0,
    white: 0,
    yellowInk: 0,
  };
  let total = 0;
  let edges = 0;
  let edgeSamples = 0;

  for (let y = box.y0; y <= box.y1; y += 1) {
    for (let x = box.x0; x <= box.x1; x += 1) {
      const i = (y * w + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const val = max / 255;
      const yv = toGray(r, g, b);
      total += 1;

      if (isYellowGold(r, g, b)) {
        counts.yellow += 1;
        if (yv > 100) counts.yellowInk += 1;
      } else if (yv < 55) {
        counts.black += 1;
      } else if (sat < 0.18 && val > 0.68) {
        counts.white += 1;
      } else if (r > 175 && g > 70 && g < 155 && b < 95) {
        counts.orange += 1;
      } else if (r > 140 && g < 100 && b < 100) {
        counts.red += 1;
      } else if (b > r + 10 && b > g && val > 0.22) {
        counts.blue += 1;
      } else if (g > 110 && g >= r && g >= b) {
        counts.green += 1;
      } else if (val < 0.35) {
        counts.black += 1;
      } else {
        counts.white += 1;
      }

      if (x + 1 <= box.x1 && y + 1 <= box.y1) {
        const j = (y * w + (x + 1)) * 4;
        const k = ((y + 1) * w + x) * 4;
        const g0 = toGray(r, g, b);
        const g1 = toGray(d[j], d[j + 1], d[j + 2]);
        const g2 = toGray(d[k], d[k + 1], d[k + 2]);
        if (Math.abs(g0 - g1) > 28 || Math.abs(g0 - g2) > 28) edges += 1;
        edgeSamples += 1;
      }
    }
  }

  const r = (k: keyof typeof counts) => (total ? counts[k] / total : 0);
  const yellow = r("yellow");
  const blue = r("blue");
  return {
    yellow,
    orange: r("orange"),
    red: r("red"),
    blue,
    green: r("green"),
    black: r("black"),
    white: r("white"),
    yellowInk: r("yellowInk"),
    yellowOverBlue: yellow / (blue + yellow + 0.01),
    edgeDensity: edgeSamples ? edges / edgeSamples : 0,
    boxDarkness: box.darkness,
  };
}

function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

type TeamScorer = (f: LogoFeatures) => number;

const SCORERS: Array<{ short: string; score: TeamScorer }> = [
  {
    short: "阪神",
    score: (f) => {
      let s =
        f.yellow * 3.0 +
        f.yellowInk * 2.2 +
        f.black * 0.55 +
        f.white * 0.45 +
        f.yellowOverBlue * 1.1;
      s -= f.blue * 2.2;
      if (f.yellow > 0.05 && f.black > 0.25) s += 0.55;
      if (f.yellowInk > 0.06) s += 0.4;
      if (f.boxDarkness > 0.35) s += 0.15;
      return s;
    },
  },
  {
    short: "ソフトバンク",
    score: (f) => f.yellow * 1.4 + f.black * 0.8 - f.blue * 0.6,
  },
  {
    short: "オリックス",
    score: (f) => f.yellow * 1.1 + f.black * 0.7 - f.blue * 0.4,
  },
  {
    short: "巨人",
    score: (f) => f.orange * 2.1 + f.black * 0.7 - f.yellow * 0.3,
  },
  {
    short: "広島",
    score: (f) => f.red * 2.2 + f.white * 0.4 - f.yellow * 0.4,
  },
  {
    short: "楽天",
    score: (f) => f.red * 1.8 + f.white * 0.5 - f.yellow * 0.3,
  },
  {
    short: "DeNA",
    score: (f) => {
      let s = f.blue * 1.7 + f.white * 0.45 - f.yellow * 3.2 - f.yellowInk * 2.8;
      if (f.yellow > 0.04 || f.yellowInk > 0.04) s -= 1.0;
      return s;
    },
  },
  {
    short: "中日",
    score: (f) => f.blue * 1.25 + f.white * 0.4 - f.yellow * 2.0,
  },
  {
    short: "日本ハム",
    score: (f) => f.blue * 1.15 + f.white * 0.45 - f.yellow * 1.8,
  },
  {
    short: "西武",
    score: (f) => f.blue * 1.2 + f.white * 0.4 - f.yellow * 1.8,
  },
  {
    short: "ヤクルト",
    score: (f) => f.green * 2.2 + f.white * 0.4 - f.yellow * 0.5,
  },
  {
    short: "ロッテ",
    score: (f) => f.black * 1.1 + f.white * 0.75 - f.yellow * 0.6,
  },
];

export function recognizeTeamLogo(canvas: HTMLCanvasElement): TeamLogoMatch {
  const f = extractFeatures(canvas);
  const ranked = SCORERS.map((s) => ({
    label: s.short,
    score: s.score(f),
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 0.2) {
    return {
      teamShort: "",
      score: 0,
      method: "unmatched",
      candidates: ranked.slice(0, 3),
      features: f,
    };
  }
  return {
    teamShort: top.label,
    score: Math.min(1, Math.max(0, top.score / 2.8)),
    method: "logo_features",
    candidates: ranked.slice(0, 3),
    features: f,
  };
}

/**
 * 同一画面の投手・野手ロゴを整合。
 * 黄インクが双方にあれば阪神に揃えるなど。
 */
export function reconcileTeamPair(
  a: TeamLogoMatch,
  b: TeamLogoMatch,
): { pitcher: string; batter: string; note: string } {
  const pa = a.teamShort;
  const pb = b.teamShort;
  if (pa && pb && pa === pb) {
    return { pitcher: pa, batter: pb, note: "same" };
  }

  const fa = a.features;
  const fb = b.features;
  const aYellow = (fa?.yellowInk ?? 0) + (fa?.yellow ?? 0);
  const bYellow = (fb?.yellowInk ?? 0) + (fb?.yellow ?? 0);

  if (aYellow > 0.08 && bYellow > 0.08) {
    return { pitcher: "阪神", batter: "阪神", note: "both_yellow" };
  }

  // 片方が黄優勢なのに DeNA と出たら阪神へ
  const fix = (team: string, yellow: number) =>
    team === "DeNA" && yellow > 0.07 ? "阪神" : team;

  let pitcher = fix(pa, aYellow);
  let batter = fix(pb, bYellow);

  if (pitcher && !batter) {
    return { pitcher, batter: pitcher, note: "share_pitcher" };
  }
  if (batter && !pitcher) {
    return { pitcher: batter, batter, note: "share_batter" };
  }

  if (pitcher && batter && pitcher !== batter) {
    // 黄がある側を優先
    if (aYellow > 0.1 && bYellow < 0.05) {
      return { pitcher, batter: pitcher, note: "prefer_pitcher_yellow" };
    }
    if (bYellow > 0.1 && aYellow < 0.05) {
      return { pitcher: batter, batter, note: "prefer_batter_yellow" };
    }
    if (a.score >= b.score) {
      return { pitcher, batter: pitcher, note: "prefer_pitcher_score" };
    }
    return { pitcher: batter, batter, note: "prefer_batter_score" };
  }

  return { pitcher, batter, note: "as_is" };
}

/**
 * 選手マスター所属とロゴ結果の整合チェック（無条件上書きしない）。
 */
export function reconcileTeamWithMaster(
  logoTeam: string,
  masterTeam: string,
  logoScore: number,
): { team: string; note: string } {
  if (!masterTeam) return { team: logoTeam, note: "logo_only" };
  if (!logoTeam) return { team: masterTeam, note: "master_fill" };
  if (logoTeam === masterTeam) return { team: logoTeam, note: "agree" };
  // 不一致: ロゴ低信頼ならマスター、高信頼ならロゴ維持（確認UI向け）
  if (logoScore < 0.45) {
    return { team: masterTeam, note: "master_override_low_logo" };
  }
  return { team: logoTeam, note: "conflict_keep_logo" };
}
