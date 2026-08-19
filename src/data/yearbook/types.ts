/**
 * YEARBOOK シーズン総評
 * SeasonIdentity（WORLD × YEAR）単位で1本の長文を保存。
 * 既存の year のみレコードはレガシー互換として維持する。
 */

import type { SeasonWorld } from "@/data/seasons";

export type YearbookReviewSource = "manual" | "ai" | "imported";

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
  /** 総評本文（長文1本） */
  body: string;
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
