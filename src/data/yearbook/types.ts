/**
 * YEARBOOK シーズン総評
 * SeasonIdentity（WORLD × YEAR）単位で保存。
 * body = 全体総評（GENERAL）。既存 SEASON_REVIEW 互換。
 * セ／パ／12球団は同一レコードの別フィールド（未設定は未登録）。
 */

import type { SeasonWorld } from "@/data/seasons";

export type YearbookReviewSource = "manual" | "ai" | "imported";

/** YEARBOOK 総評の大項目 */
export type SeasonReviewKind =
  | "general"
  | "central"
  | "pacific"
  | "teams";

export const SEASON_REVIEW_KIND_LABELS: Record<SeasonReviewKind, string> = {
  general: "総評",
  central: "セ・リーグ総評",
  pacific: "パ・リーグ総評",
  teams: "12球団総評",
};

export type YearbookSeasonReview = {
  /** 年度（例: 2026） */
  year: number;
  /**
   * 正式 WORLD。既存レガシー／DEMO は null / 未設定。
   * BLUE_2026 と RED_2026 で別レビューを持つ。
   */
  world?: SeasonWorld | null;
  /** seasonKey（BLUE_2026 / 2023 / 2000）。無い場合は year のみレガシー */
  seasonKey?: string;
  /**
   * 全体総評本文（GENERAL）。
   * 既存 SEASON_REVIEW / SEASON_HIGHLIGHT 互換の正本フィールド。
   */
  body: string;
  /** セ・リーグ総評（未登録は undefined / 空） */
  centralBody?: string;
  /** パ・リーグ総評 */
  pacificBody?: string;
  /** 12球団総評（1本。球団見出しは本文内） */
  teamsBody?: string;
  /** 生成／入力の出所 */
  source: YearbookReviewSource;
  /** ユーザー確認済みか（AI生成フロー用） */
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 将来AIへ渡す事実スナップショット（推測・創作は含めない） */
export type YearbookSeasonContext = {
  year: number;
  world?: SeasonWorld | null;
  seasonKey: string;
  /** 表示ラベル（例: 2026 BLUE） */
  seasonLabel: string;
  /** 利用可能なデータ種別の一覧 */
  available: string[];
  /** 未登録・利用不可のメモ */
  missing: string[];
  /** 事実のみの短い箇条書き（本文生成の根拠） */
  factLines: string[];
};
