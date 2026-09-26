/**
 * シーズン偉業の連続年・通算回数ラベル（同一 WORLD・同一 playerId）。
 */

import { normalizeSeasonWorld } from "@/data/seasons";
import type { SeasonAchievement } from "./types";

/** 連続／通算を表示するシーズン偉業タイプ */
const REPEAT_RECORD_TYPES = new Set([
  "hr_sb_combo",
  "triple_three",
  "triple_three_rbi100",
  "avg300_hr30_rbi100",
  "avg400",
  "risp400",
  "ops1100",
  "cs_rate800",
  "w20",
  "sho10",
  "cg20",
  "g80",
  "hp50",
  "undefeated",
  "starter_era0",
  "win_pct_1000",
]);

export function shouldShowRepeatLabel(item: SeasonAchievement): boolean {
  return item.category === "season" && REPEAT_RECORD_TYPES.has(item.recordType);
}

/**
 * 同一 WORLD 内の達成年からラベルを生成。
 * - 前年も達成 → 「N年連続・M回目」
 * - 初回のみ → 「初達成」
 * - 過去ありだが非連続 → 「通算M回目」
 */
export function computeRepeatLabel(
  item: SeasonAchievement,
  peerYears: number[],
): string | null {
  if (!shouldShowRepeatLabel(item)) return null;
  const years = [...new Set(peerYears.filter((y) => Number.isFinite(y)))].sort(
    (a, b) => a - b,
  );
  if (!years.includes(item.season)) {
    years.push(item.season);
    years.sort((a, b) => a - b);
  }
  const total = years.length;
  if (total <= 0) return null;

  let consecutive = 1;
  for (let y = item.season - 1; years.includes(y); y -= 1) {
    consecutive += 1;
  }

  if (consecutive >= 2) {
    return `${consecutive}年連続・${total}回目`;
  }
  if (total === 1) return "初達成";
  return `通算${total}回目`;
}

/** 同一 WORLD・選手・記録タイプの達成年を集める */
export function peerYearsForAchievement(
  item: SeasonAchievement,
  pool: SeasonAchievement[],
): number[] {
  const world = normalizeSeasonWorld(item.world);
  return pool
    .filter(
      (a) =>
        a.playerId === item.playerId &&
        a.recordType === item.recordType &&
        normalizeSeasonWorld(a.world) === world,
    )
    .map((a) => a.season);
}

export function withRepeatLabels(
  currentItems: SeasonAchievement[],
  worldPool: SeasonAchievement[],
): SeasonAchievement[] {
  return currentItems.map((item) => {
    if (!shouldShowRepeatLabel(item)) return item;
    const peers = peerYearsForAchievement(item, worldPool);
    const repeatLabel = computeRepeatLabel(item, peers);
    if (!repeatLabel) return item;
    return { ...item, repeatLabel };
  });
}
