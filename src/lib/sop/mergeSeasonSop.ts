/**
 * 野手SOP行と投手SOP行を総合点に合算するときの共有カテゴリ処理。
 *
 * 正式配点・各ロール行の中身は変えない。
 * 総合／通算all／年鑑 totalSop だけ、同一シーズンの共有加点を1回にする。
 */

import type { SopCategoryId, SopLineItem, SopSeasonResult } from "./types";

/** 同一選手・同一シーズンで野手行／投手行の両方に載りうるカテゴリ */
export const SHARED_CROSS_ROLE_SOP_CATEGORIES = [
  "annual_awards",
  "two_way",
] as const satisfies readonly SopCategoryId[];

export type SharedCrossRoleSopCategory =
  (typeof SHARED_CROSS_ROLE_SOP_CATEGORIES)[number];

const SHARED_SET = new Set<string>(SHARED_CROSS_ROLE_SOP_CATEGORIES);

export function isSharedCrossRoleSopCategory(
  category: SopCategoryId,
): category is SharedCrossRoleSopCategory {
  return SHARED_SET.has(category);
}

export function pointsInCategories(
  items: readonly SopLineItem[] | null | undefined,
  categories: ReadonlySet<string> | readonly SopCategoryId[],
): number {
  if (!items?.length) return 0;
  const set =
    categories instanceof Set ? categories : new Set<string>(categories);
  let sum = 0;
  for (const it of items) {
    if (set.has(it.category)) sum += it.points;
  }
  return sum;
}

export function sharedCrossRolePoints(
  result: SopSeasonResult | null | undefined,
): number {
  return pointsInCategories(result?.items, SHARED_SET);
}

export function roleUniquePoints(
  result: SopSeasonResult | null | undefined,
): number {
  if (!result) return 0;
  return result.total - sharedCrossRolePoints(result);
}

/**
 * 共有点の代表値。両行に載る前提で野手行を優先（通常は同一）。
 * 万一不一致なら大きい方（加点欠落を避ける）。
 */
export function pickSharedCrossRolePointsOnce(
  batter: SopSeasonResult | null | undefined,
  pitcher: SopSeasonResult | null | undefined,
): number {
  const b = sharedCrossRolePoints(batter);
  const p = sharedCrossRolePoints(pitcher);
  if (b > 0 && p > 0) return Math.max(b, p);
  return b > 0 ? b : p;
}

export type MergedSeasonSopBreakdown = {
  /** 総合SOP = 野手固有 + 投手固有 + 共有1回 */
  total: number;
  batterUnique: number;
  pitcherUnique: number;
  shared: number;
  /** ロール行の生合計（個別ランキング用・変更なし） */
  batterTotal: number;
  pitcherTotal: number;
};

/**
 * 野手固有 + 投手固有 + 共通加点1回。
 * 片ロールのみの選手は、そのロールの total と一致する。
 */
export function mergeRoleSeasonSopTotal(
  batter: SopSeasonResult | null | undefined,
  pitcher: SopSeasonResult | null | undefined,
): MergedSeasonSopBreakdown {
  const batterTotal = batter?.total ?? 0;
  const pitcherTotal = pitcher?.total ?? 0;
  const batterUnique = roleUniquePoints(batter);
  const pitcherUnique = roleUniquePoints(pitcher);
  const shared = pickSharedCrossRolePointsOnce(batter, pitcher);
  return {
    total: batterUnique + pitcherUnique + shared,
    batterUnique,
    pitcherUnique,
    shared,
    batterTotal,
    pitcherTotal,
  };
}

/** 通算合算用：同一 WORLD×YEAR の共有デデュープキー */
export function sharedCrossRoleSeasonKey(
  playerId: string,
  world: string | null | undefined,
  year: number,
): string {
  return `${playerId}:${world ?? ""}:${year}`;
}
