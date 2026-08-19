/**
 * SOP Ver.3 — 型定義
 * 合計だけでなく内訳を必ず保持する。
 */

import type { SeasonWorld } from "@/data/seasons";

export type SopRole = "batter" | "pitcher";

export type SopCategoryId =
  | "annual_awards"
  | "titles"
  | "interleague_titles"
  | "season_basic"
  | "combo"
  | "feats_streaks"
  | "historic"
  | "consecutive_year"
  | "npb_record"
  | "two_way";

export const SOP_CATEGORY_LABELS: Record<SopCategoryId, string> = {
  annual_awards: "年間表彰",
  titles: "個人タイトル",
  interleague_titles: "交流戦SOP",
  season_basic: "シーズン達成",
  combo: "複合達成",
  feats_streaks: "特殊・連続記録",
  historic: "大記録",
  consecutive_year: "連続年ボーナス",
  npb_record: "NPB史実記録ボーナス",
  two_way: "二刀流SOP",
};

export type SopLineItem = {
  id: string;
  category: SopCategoryId;
  label: string;
  points: number;
  /** 判定根拠のメモ（例: 本塁打35＋盗塁32＝67） */
  detail?: string;
  /** データ不足で判定できなかった場合 */
  unresolved?: boolean;
};

export type PitcherWorkloadClass = "starter" | "reliever" | "hybrid" | "unknown";

export type SopSeasonResult = {
  playerId: string;
  playerName: string;
  year: number;
  /** 正式 WORLD。レガシー／DEMO は null / 未設定 */
  world?: SeasonWorld | null;
  role: SopRole;
  teamId?: string;
  teamShort: string;
  league?: "central" | "pacific";
  total: number;
  items: SopLineItem[];
  /** 連続年判定用に公開 */
  achievementIds?: {
    basicIds: string[];
    comboIds: string[];
  };
  /** 先発率などメタ */
  meta?: {
    pitcherClass?: PitcherWorkloadClass;
    startRate?: number | null;
    /** 通常部分SOP（交流戦タイトル点を除く） */
    pennantTotal?: number;
    /** 交流戦SOP（10部門のみ） */
    interleagueTotal?: number;
    /** 最終SOP = pennant + interleague */
    finalTotal?: number;
  };
};

export type SopRankEntry = {
  rank: number | null; // 同点時は同順位（表示側で処理）
  result: SopSeasonResult;
};

export type SopCareerTotal = {
  playerId: string;
  playerName: string;
  total: number;
  byYear: {
    year: number;
    world?: SeasonWorld | null;
    role: SopRole;
    total: number;
  }[];
};
