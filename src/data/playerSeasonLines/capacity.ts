/**
 * season-lines localStorage 容量の見積もり（圧縮後 / 今後の増加）。
 * 実測バイトは典型的な野手1行（derived 省略）に基づく。
 */

import { SEASON_LINES_LOCAL_BUDGET_BYTES } from "./store";

/** derived あり / なしの典型サイズ（UTF-16 ではなく JSON 文字列 length ≈ UTF-8 近傍） */
export const SEASON_LINE_BYTES_WITH_DERIVED = 899;
export const SEASON_LINE_BYTES_COMPRESSED = 722;

export type SeasonLinesCapacityEstimate = {
  bytesPerLineWithDerived: number;
  bytesPerLineCompressed: number;
  compressionSavedPct: number;
  /** season-lines 単体に割り当てる現実的予算（オリジン全体~5MBの一部） */
  budgetBytes: number;
  maxRowsCompressedAtBudget: number;
  maxRowsWithDerivedAtBudget: number;
  /** 想定成長: WORLD×年×選手×role×scope */
  projectedRows: {
    worlds: number;
    years: number;
    playersPerWorldYear: number;
    roles: number;
    scopes: number;
    total: number;
  };
  /** 圧縮のみで全件ミラーし続けた場合、何年で予算超過か（概算） */
  yearsUntilBudgetIfFullMirror: number | null;
  recommendation: string;
};

export function estimateSeasonLinesLocalCapacity(input?: {
  budgetBytes?: number;
  worlds?: number;
  years?: number;
  playersPerWorldYear?: number;
  roles?: number;
  scopes?: number;
}): SeasonLinesCapacityEstimate {
  const budgetBytes = input?.budgetBytes ?? SEASON_LINES_LOCAL_BUDGET_BYTES;
  const worlds = input?.worlds ?? 2;
  const years = input?.years ?? 10;
  const playersPerWorldYear = input?.playersPerWorldYear ?? 350;
  const roles = input?.roles ?? 2; // batter + pitcher
  const scopes = input?.scopes ?? 2; // pennant + interleague

  const total =
    worlds * years * playersPerWorldYear * roles * scopes;
  const maxRowsCompressedAtBudget = Math.floor(
    budgetBytes / SEASON_LINE_BYTES_COMPRESSED,
  );
  const maxRowsWithDerivedAtBudget = Math.floor(
    budgetBytes / SEASON_LINE_BYTES_WITH_DERIVED,
  );
  const rowsPerYear =
    worlds * playersPerWorldYear * roles * scopes;
  const yearsUntil =
    rowsPerYear > 0
      ? Math.floor(maxRowsCompressedAtBudget / rowsPerYear)
      : null;

  return {
    bytesPerLineWithDerived: SEASON_LINE_BYTES_WITH_DERIVED,
    bytesPerLineCompressed: SEASON_LINE_BYTES_COMPRESSED,
    compressionSavedPct: Math.round(
      (1 -
        SEASON_LINE_BYTES_COMPRESSED / SEASON_LINE_BYTES_WITH_DERIVED) *
        100,
    ),
    budgetBytes,
    maxRowsCompressedAtBudget,
    maxRowsWithDerivedAtBudget,
    projectedRows: {
      worlds,
      years,
      playersPerWorldYear,
      roles,
      scopes,
      total,
    },
    yearsUntilBudgetIfFullMirror: yearsUntil,
    recommendation:
      total > maxRowsCompressedAtBudget
        ? "圧縮だけでは不足。Neon 正本＋localStorage は未同期 outbox のみにすべき。"
        : "当面は圧縮ミラーでも余裕があるが、年数増加前に outbox 化を推奨。",
  };
}
