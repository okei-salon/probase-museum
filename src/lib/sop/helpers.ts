import {
  PITCHER_CLASS_THRESHOLDS,
} from "./rules";
import type { PitcherWorkloadClass } from "./types";

/**
 * 先発率 = 先発 ÷ 登板
 * 60%以上 = 先発型 / 20%以下 = 救援型 / それ以外 = 混合型
 * データ不足は unknown（推測しない）
 */
export function classifyPitcherWorkload(
  games: number | null | undefined,
  gamesStarted: number | null | undefined,
): { class: PitcherWorkloadClass; startRate: number | null } {
  if (
    games == null ||
    gamesStarted == null ||
    !Number.isFinite(games) ||
    !Number.isFinite(gamesStarted) ||
    games <= 0 ||
    gamesStarted < 0
  ) {
    return { class: "unknown", startRate: null };
  }
  const startRate = gamesStarted / games;
  if (startRate >= PITCHER_CLASS_THRESHOLDS.starterMin) {
    return { class: "starter", startRate };
  }
  if (startRate <= PITCHER_CLASS_THRESHOLDS.relieverMax) {
    return { class: "reliever", startRate };
  }
  return { class: "hybrid", startRate };
}

/** 段階ティアから最高到達点を選ぶ */
export function bestTierPoints(
  value: number | null | undefined,
  tiers: readonly { min: number; points: number }[],
): { points: number; min: number } | null {
  if (value == null || !Number.isFinite(value)) return null;
  for (const t of tiers) {
    if (value >= t.min) return { points: t.points, min: t.min };
  }
  return null;
}

/** 上限ティア（低いほど良い指標）から最高到達点を選ぶ。tiers は厳しめ順 */
export function bestCeilingTierPoints(
  value: number | null | undefined,
  tiers: readonly { max: number; points: number }[],
): { points: number; max: number } | null {
  if (value == null || !Number.isFinite(value)) return null;
  for (const t of tiers) {
    if (value <= t.max) return { points: t.points, max: t.max };
  }
  return null;
}

export function bestSumTierPoints(
  sum: number,
  tiers: readonly { minSum: number; points: number }[],
): { points: number; minSum: number } | null {
  for (const t of tiers) {
    if (sum >= t.minSum) return { points: t.points, minSum: t.minSum };
  }
  return null;
}
