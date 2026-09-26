/**
 * SOP内訳パネルで全カテゴリを漏れなく表示するための順序と検算。
 */

import type { SopCategoryId, SopSeasonResult } from "./types";

/** SeasonSopBoard / SopCategoryBlocks と同一の表示順 */
export const CATEGORY_ORDER_FOR_DISPLAY: SopCategoryId[] = [
  "annual_awards",
  "titles",
  "interleague_titles",
  "season_basic",
  "combo",
  "feats_streaks",
  "historic",
  "consecutive_year",
  "npb_record",
  "two_way",
];

/**
 * 表示対象カテゴリに載る内訳の合計と、順序外で隠れる項目を返す。
 */
export function itemsAccountedInDisplay(result: SopSeasonResult): {
  sum: number;
  hidden: SopSeasonResult["items"];
} {
  const order = new Set(CATEGORY_ORDER_FOR_DISPLAY);
  let sum = 0;
  const hidden: SopSeasonResult["items"] = [];
  for (const it of result.items) {
    if (order.has(it.category)) sum += it.points;
    else hidden.push(it);
  }
  return { sum, hidden };
}
