/**
 * SOPランキング画面の表示人数制限（データ自体は削らない）。
 */

import type { SopRankEntry, SopRole } from "./types";

/** 野手／投手それぞれ最大表示人数 */
export const SOP_RANKING_DISPLAY_LIMIT = 50;

/**
 * 役割ごとに SOP合計順の上位 N 人だけ残す（表示用）。
 * - role 指定時: その役割のみ最大 limit 人
 * - all / 未指定: 野手 limit + 投手 limit（独立）
 * 同点の並びは入力 rankings の既存順を維持する。
 */
export function limitSopRankingsForDisplay(
  rankings: SopRankEntry[],
  role: SopRole | "all" = "all",
  limit: number = SOP_RANKING_DISPLAY_LIMIT,
): SopRankEntry[] {
  if (role === "batter" || role === "pitcher") {
    return rankings.filter((e) => e.result.role === role).slice(0, limit);
  }

  const batters = rankings
    .filter((e) => e.result.role === "batter")
    .slice(0, limit);
  const pitchers = rankings
    .filter((e) => e.result.role === "pitcher")
    .slice(0, limit);
  const keep = new Set(
    [...batters, ...pitchers].map(
      (e) =>
        `${e.result.world ?? ""}:${e.result.playerId}:${e.result.role}`,
    ),
  );
  // 元の並び（総合SOP順）を維持したまま、各役割の上位だけ残す
  return rankings.filter((e) =>
    keep.has(
      `${e.result.world ?? ""}:${e.result.playerId}:${e.result.role}`,
    ),
  );
}
