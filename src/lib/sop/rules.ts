/**
 * SOP Ver.3 — ルール定義（点数はここに集約。計算ロジックへ直書きしない）
 */

import type { SopCategoryId } from "./types";

/** 年間表彰 */
export const ANNUAL_AWARD_POINTS = {
  mvp: 25,
  sawamura: 25,
  rookie: 10,
  japanSeriesMvp: 10,
  bestNine: 7,
  goldenGlove: 7,
  monthlyMvp: 5, // 1回あたり
  interleagueMvp: 5,
} as const;

export type AnnualAwardKind = keyof typeof ANNUAL_AWARD_POINTS;

/** 個人タイトル順位 → 点 */
export const TITLE_RANK_POINTS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 10,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
};

/**
 * 交流戦SOP 10部門の順位 → 点（通常タイトルとは別表）
 * 1位5〜5位1、6位以下0
 */
export const INTERLEAGUE_SOP_RANK_POINTS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
};

export type InterleagueSopTitleId =
  | "avg"
  | "h"
  | "hr"
  | "rbi"
  | "sb"
  | "era"
  | "w"
  | "hp"
  | "sv"
  | "so";

export type InterleagueSopTitleDef = {
  id: InterleagueSopTitleId;
  label: string;
  role: "batter" | "pitcher";
  lowerIsBetter?: boolean;
  /** 率系は規定到達フラグを要求 */
  requireQualified?: boolean;
};

/** 交流戦SOP対象10部門（固定） */
export const INTERLEAGUE_SOP_TITLES: InterleagueSopTitleDef[] = [
  { id: "avg", label: "打率", role: "batter", requireQualified: true },
  { id: "h", label: "安打", role: "batter" },
  { id: "hr", label: "本塁打", role: "batter" },
  { id: "rbi", label: "打点", role: "batter" },
  { id: "sb", label: "盗塁", role: "batter" },
  { id: "era", label: "防御率", role: "pitcher", lowerIsBetter: true, requireQualified: true },
  { id: "w", label: "勝利", role: "pitcher" },
  { id: "hp", label: "HP", role: "pitcher" },
  { id: "sv", label: "セーブ", role: "pitcher" },
  { id: "so", label: "奪三振", role: "pitcher" },
];

/** 盗塁阻止率タイトル規定 */
export const CS_RATE_ATTEMPTS_MIN = 30;

/** 投手分類（先発率） */
export const PITCHER_CLASS_THRESHOLDS = {
  starterMin: 0.6, // 60%以上 = 先発型
  relieverMax: 0.2, // 20%以下 = 救援型
} as const;

/** タイトル順位点のラベル用 */
export function titleRankLabel(titleLabel: string, rank: number): string {
  return `${titleLabel}${rank}位`;
}

/** 野手基本達成 */
export const BATTER_BASIC = {
  avg300: { points: 2, label: "打率.300以上" },
  hr30: { points: 2, label: "30本塁打" },
  sb30: { points: 2, label: "30盗塁" },
  sac30: { points: 2, label: "30犠打" },
  risp300: { points: 2, label: "得点圏打率.300以上" },
  r100: { points: 2, label: "100得点" },
  rbi100: { points: 2, label: "100打点" },
  bb100: { points: 2, label: "100四球" },
  csRate400: { points: 2, label: "盗塁阻止率.400以上" },
  obp400: { points: 3, label: "出塁率.400以上" },
  ops1000: { points: 3, label: "OPS 1.000以上" },
  h200: { points: 5, label: "200安打" },
} as const;

/** 本塁打×盗塁 合計ティア（最高到達のみ） */
export const HR_SB_COMBO_TIERS = [
  { minSum: 100, points: 30 },
  { minSum: 90, points: 25 },
  { minSum: 80, points: 20 },
  { minSum: 70, points: 15 },
  { minSum: 60, points: 10 },
  { minSum: 40, points: 5 },
] as const;

export const HR_SB_MIN_EACH = 20;

/** その他野手複合 */
export const BATTER_COMBOS = {
  tripleThree: { points: 15, label: "トリプルスリー" },
  avg300Hr30Rbi100: { points: 15, label: "打率.300＋30本塁打＋100打点" },
  tripleThreeRbi100: { points: 25, label: "トリプルスリー＋100打点" },
} as const;

/** 投手基本達成 */
export const PITCHER_BASIC = {
  cg10: { points: 2, label: "10完投" },
  g50: { points: 2, label: "50試合登板" },
  sv30: { points: 2, label: "30セーブ" },
  hp30: { points: 2, label: "30HP" },
  soRate9: { points: 2, label: "奪三振率9.00以上" },
  qsRate80: { points: 2, label: "QS率80%以上" },
  sho5: { points: 3, label: "5完封" },
  starterEra1: { points: 5, label: "先発型・防御率1点台" },
  w15: { points: 5, label: "15勝" },
  so200: { points: 5, label: "200奪三振" },
  ip200: { points: 5, label: "200投球回" },
  winPct800: { points: 5, label: "勝率.800以上" },
} as const;

/** 投手複合 */
export const PITCHER_COMBOS = {
  era2W13So150: {
    points: 10,
    label: "防御率2点台＋13勝＋150奪三振",
  },
  relieverEra1SvOrHp30: {
    points: 10,
    label: "救援型・防御率1点台＋30Sまたは30HP",
  },
  w15So200Ip200: {
    points: 20,
    label: "15勝＋200奪三振＋200投球回",
  },
  starterEra1W15So200Ip200: {
    points: 25,
    label: "先発型・防御率1点台＋15勝＋200奪三振＋200投球回",
  },
} as const;

/** 野手特殊・連続（最高到達のみ） */
export const BATTER_FEATS = {
  cycle: { points: 10, label: "サイクルヒット" },
  hitStreak: [
    { min: 40, points: 15 },
    { min: 30, points: 10 },
    { min: 20, points: 5 },
  ],
  onBaseStreak: [
    { min: 40, points: 15 },
    { min: 30, points: 10 },
    { min: 20, points: 5 },
  ],
  hrStreak: [
    { min: 5, points: 10 },
    { min: 4, points: 5 },
    { min: 3, points: 2 },
  ],
} as const;

/** 投手特殊・連続 */
export const PITCHER_FEATS = {
  perfectGame: { points: 20, label: "完全試合" },
  noHitter: { points: 10, label: "ノーヒットノーラン" },
  scorelessIp: [
    { min: 50, points: 15 },
    { min: 40, points: 10 },
    { min: 30, points: 5 },
  ],
  gameSo: [
    { min: 20, points: 15 },
    { min: 18, points: 10 },
    { min: 15, points: 5 },
  ],
  winStreak: [
    { min: 20, points: 15 },
    { min: 15, points: 10 },
    { min: 10, points: 5 },
  ],
  undefeated10: { points: 10, label: "シーズン無敗（10勝以上0敗）" },
} as const;

/** 大記録（下位と同項目は重複しない） */
export const BATTER_HISTORIC = {
  avg400: { points: 30, label: "打率.400以上", covers: ["avg300"] as const },
  risp400: { points: 20, label: "得点圏打率.400以上", covers: ["risp300"] as const },
  ops1100: { points: 20, label: "OPS 1.100以上", covers: ["ops1000"] as const },
  csRate800: { points: 20, label: "盗塁阻止率.800以上", covers: ["csRate400"] as const },
} as const;

export const PITCHER_HISTORIC = {
  starterEra0: {
    points: 20,
    label: "先発型・防御率0点台",
    covers: ["starterEra1"] as const,
  },
  winPct1000: { points: 20, label: "勝率1.000", covers: ["winPct800"] as const },
  sho10: { points: 20, label: "10完封", covers: ["sho5"] as const },
  cg20: { points: 20, label: "20完投", covers: ["cg10"] as const },
  g80: { points: 20, label: "80試合登板", covers: ["g50"] as const },
  w20: { points: 20, label: "20勝", covers: ["w15"] as const },
  hp50: { points: 20, label: "50HP", covers: ["hp30"] as const },
} as const;

/** 連続年ボーナス */
export const CONSECUTIVE_YEAR_BONUS = {
  basic: 2,
  combo: 5,
} as const;

/**
 * 二刀流SOP（野手側・投手側それぞれ最大30点、合計最大60点）
 * 各項目は最高到達点のみ（1+3+5の累積はしない）
 */
export const TWO_WAY_BATTER_TIERS = {
  pa: [
    { min: 443, points: 5, label: "打席443以上（規定打席到達）" },
    { min: 300, points: 3, label: "打席300以上" },
    { min: 200, points: 1, label: "打席200以上" },
  ],
  avg: [
    { min: 0.3, points: 5, label: "打率.300以上" },
    { min: 0.28, points: 3, label: "打率.280以上" },
    { min: 0.25, points: 1, label: "打率.250以上" },
  ],
  h: [
    { min: 150, points: 5, label: "安打150以上" },
    { min: 100, points: 3, label: "安打100以上" },
    { min: 50, points: 1, label: "安打50以上" },
  ],
  rbi: [
    { min: 100, points: 5, label: "打点100以上" },
    { min: 70, points: 3, label: "打点70以上" },
    { min: 50, points: 1, label: "打点50以上" },
  ],
  hr: [
    { min: 30, points: 5, label: "本塁打30以上" },
    { min: 20, points: 3, label: "本塁打20以上" },
    { min: 10, points: 1, label: "本塁打10以上" },
  ],
  sb: [
    { min: 30, points: 5, label: "盗塁30以上" },
    { min: 20, points: 3, label: "盗塁20以上" },
    { min: 10, points: 1, label: "盗塁10以上" },
  ],
} as const;

/** 二刀流の防御率は先発/救援/混合を区別しない */
export const TWO_WAY_PITCHER_TIERS = {
  g: [
    { min: 50, points: 5, label: "登板50以上" },
    { min: 40, points: 3, label: "登板40以上" },
    { min: 20, points: 1, label: "登板20以上" },
  ],
  ip: [
    { min: 143, points: 5, label: "投球回143以上" },
    { min: 80, points: 3, label: "投球回80以上" },
    { min: 30, points: 1, label: "投球回30以上" },
  ],
  era: [
    { max: 1.5, points: 5, label: "防御率1.50以下" },
    { max: 2.5, points: 3, label: "防御率2.50以下" },
    { max: 3.5, points: 1, label: "防御率3.50以下" },
  ],
  w: [
    { min: 13, points: 5, label: "13勝以上" },
    { min: 10, points: 3, label: "10勝以上" },
    { min: 8, points: 1, label: "8勝以上" },
  ],
  so: [
    { min: 150, points: 5, label: "150奪三振以上" },
    { min: 100, points: 3, label: "100奪三振以上" },
    { min: 50, points: 1, label: "50奪三振以上" },
  ],
  svHp: [
    { min: 40, points: 5, label: "S＋HP 40以上" },
    { min: 30, points: 3, label: "S＋HP 30以上" },
    { min: 20, points: 1, label: "S＋HP 20以上" },
  ],
} as const;

/** 複合がカバーする基本達成ID */
export const BATTER_COMBO_COVERS: Record<string, string[]> = {
  tripleThree: ["avg300", "hr30", "sb30"],
  avg300Hr30Rbi100: ["avg300", "hr30", "rbi100"],
  tripleThreeRbi100: ["avg300", "hr30", "sb30", "rbi100"],
  hrSbCombo: [], // 本塁打×盗塁は基本30本/30盗のカバーはしない（仕様：最低20）
};

export const PITCHER_COMBO_COVERS: Record<string, string[]> = {
  era2W13So150: [],
  relieverEra1SvOrHp30: ["sv30", "hp30"], // 30S or 30HP の該当分は後で処理
  w15So200Ip200: ["w15", "so200", "ip200"],
  starterEra1W15So200Ip200: ["starterEra1", "w15", "so200", "ip200"],
};

export function categoryOf(
  kind: "basic" | "combo" | "historic" | "feat",
): SopCategoryId {
  if (kind === "basic") return "season_basic";
  if (kind === "combo") return "combo";
  if (kind === "historic") return "historic";
  return "feats_streaks";
}
