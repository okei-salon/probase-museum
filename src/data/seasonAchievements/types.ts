/**
 * シーズン「記録・偉業」共通型。
 * 試合日・対戦相手など取得不能な情報は持たない。
 */

import type { SeasonWorld } from "@/data/seasons";

export type AchievementCategory =
  | "special"
  | "streak"
  | "single_game"
  | "season"
  | "npb_record";

export type AchievementSource = "manual" | "auto" | "demo";

export type AchievementRole = "batter" | "pitcher";

/**
 * 記録タイプID（あとから追加しやすいよう文字列）。
 * catalog.ts の定義と対応させる。
 */
export type AchievementRecordType = string;

export type SeasonAchievement = {
  id: string;
  season: number;
  /** 正式 WORLD。既存・DEMO は null / 未設定 */
  world?: SeasonWorld | null;
  playerId: string;
  playerName: string;
  teamShort: string;
  role: AchievementRole;
  category: AchievementCategory;
  recordType: AchievementRecordType;
  recordName: string;
  /** 主記録値（連続試合数・奪三振数など） */
  value?: number | null;
  unit?: string | null;
  /** 補助値（例: 盗塁数） */
  secondaryValue?: number | null;
  /** 第3値（例: HR+SB合計） */
  tertiaryValue?: number | null;
  /** 表示用の記録値文言（優先） */
  valueLabel?: string | null;
  /** SOP通常点（Ver.3ルール参照。二重計算しない） */
  sopPoints: number;
  /** NPB史実ボーナス点（別枠） */
  npbBonusPoints?: number;
  isNpbRecord?: boolean;
  isNpbUpdate?: boolean;
  npbPreviousValue?: number | null;
  source: AchievementSource;
  createdAt: string;
  updatedAt: string;
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> =
  {
    special: "特殊記録",
    streak: "連続記録",
    single_game: "1試合記録",
    season: "シーズン偉業",
    npb_record: "NPB史実記録",
  };
