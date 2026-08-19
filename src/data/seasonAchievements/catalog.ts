/**
 * 記録・偉業のカタログ定義。
 * 掲載対象の追加・削除はここを編集する。
 */

import type { AchievementCategory } from "./types";

export type AchievementCatalogEntry = {
  recordType: string;
  category: AchievementCategory;
  recordName: string;
  unit?: string;
  /** 手動登録が必要なもの（自動判定不可） */
  needsManual: boolean;
};

/** 掲載対象カタログ（仮）。追加・削除しやすいよう配列で管理 */
export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  // 特殊
  {
    recordType: "perfect_game",
    category: "special",
    recordName: "完全試合",
    needsManual: true,
  },
  {
    recordType: "no_hitter",
    category: "special",
    recordName: "ノーヒットノーラン",
    needsManual: true,
  },
  {
    recordType: "cycle",
    category: "special",
    recordName: "サイクルヒット",
    needsManual: true,
  },
  // 連続
  {
    recordType: "hit_streak",
    category: "streak",
    recordName: "連続試合安打",
    unit: "試合",
    needsManual: true,
  },
  {
    recordType: "on_base_streak",
    category: "streak",
    recordName: "連続試合出塁",
    unit: "試合",
    needsManual: true,
  },
  {
    recordType: "hr_streak",
    category: "streak",
    recordName: "連続試合本塁打",
    unit: "試合",
    needsManual: true,
  },
  {
    recordType: "scoreless_ip",
    category: "streak",
    recordName: "連続無失点イニング",
    unit: "イニング",
    needsManual: true,
  },
  {
    recordType: "win_streak",
    category: "streak",
    recordName: "連勝",
    unit: "連勝",
    needsManual: true,
  },
  // 1試合
  {
    recordType: "game_so",
    category: "single_game",
    recordName: "1試合奪三振",
    unit: "奪三振",
    needsManual: true,
  },
  // シーズン偉業（自動判定可）
  {
    recordType: "hr_sb_combo",
    category: "season",
    recordName: "HR × SB",
    needsManual: false,
  },
  {
    recordType: "triple_three",
    category: "season",
    recordName: "トリプルスリー",
    needsManual: false,
  },
  {
    recordType: "avg300_hr30_rbi100",
    category: "season",
    recordName: "打率.300＋30本＋100打点",
    needsManual: false,
  },
  {
    recordType: "triple_three_rbi100",
    category: "season",
    recordName: "トリプルスリー＋100打点",
    needsManual: false,
  },
  {
    recordType: "avg400",
    category: "season",
    recordName: "打率.400以上",
    needsManual: false,
  },
  {
    recordType: "risp400",
    category: "season",
    recordName: "得点圏打率.400以上",
    needsManual: false,
  },
  {
    recordType: "ops1100",
    category: "season",
    recordName: "OPS 1.100以上",
    needsManual: false,
  },
  {
    recordType: "cs_rate800",
    category: "season",
    recordName: "盗塁阻止率.800以上",
    needsManual: false,
  },
  {
    recordType: "starter_era0",
    category: "season",
    recordName: "先発型・防御率0点台",
    needsManual: false,
  },
  {
    recordType: "win_pct_1000",
    category: "season",
    recordName: "勝率1.000",
    needsManual: false,
  },
  {
    recordType: "sho10",
    category: "season",
    recordName: "10完封",
    needsManual: false,
  },
  {
    recordType: "cg20",
    category: "season",
    recordName: "20完投",
    needsManual: false,
  },
  {
    recordType: "g80",
    category: "season",
    recordName: "80試合登板",
    needsManual: false,
  },
  {
    recordType: "w20",
    category: "season",
    recordName: "20勝",
    needsManual: false,
  },
  {
    recordType: "hp50",
    category: "season",
    recordName: "50ホールドポイント",
    needsManual: false,
  },
  {
    recordType: "undefeated",
    category: "season",
    recordName: "シーズン無敗",
    needsManual: false,
  },
];

export function catalogByType(
  recordType: string,
): AchievementCatalogEntry | undefined {
  return ACHIEVEMENT_CATALOG.find((c) => c.recordType === recordType);
}
