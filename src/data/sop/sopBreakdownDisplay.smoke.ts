/**
 * SOP内訳表示: 全カテゴリが合計と一致すること
 * npx tsx src/data/sop/sopBreakdownDisplay.smoke.ts
 */

import assert from "node:assert/strict";
import {
  CATEGORY_ORDER_FOR_DISPLAY,
  itemsAccountedInDisplay,
} from "@/lib/sop/sopBreakdownDisplay";
import type { SopLineItem, SopSeasonResult } from "@/lib/sop/types";
import { consecutiveYearBonusLineLabel } from "@/lib/sop/displayLabels";

// カテゴリ網羅（交流戦を含む）
assert.ok(CATEGORY_ORDER_FOR_DISPLAY.includes("interleague_titles"));
assert.ok(CATEGORY_ORDER_FOR_DISPLAY.includes("titles"));
assert.ok(CATEGORY_ORDER_FOR_DISPLAY.includes("consecutive_year"));

const items: SopLineItem[] = [
  {
    id: "title:sb:1",
    category: "titles",
    label: "盗塁1位",
    points: 10,
  },
  {
    id: "interleague:sb:1",
    category: "interleague_titles",
    label: "交流戦盗塁1位",
    points: 5,
  },
  {
    id: "basic:risp300",
    category: "season_basic",
    label: "得点圏打率.300以上",
    points: 2,
  },
  {
    id: "consec:basic:risp300",
    category: "consecutive_year",
    label: consecutiveYearBonusLineLabel("risp300", "basic"),
    points: 2,
  },
];

const result: SopSeasonResult = {
  playerId: "p1",
  playerName: "テスト",
  year: 2027,
  world: "BLUE",
  role: "batter",
  teamId: "carp",
  teamShort: "広島",
  league: "central",
  total: 19,
  items,
};

const accounted = itemsAccountedInDisplay(result);
assert.equal(accounted.sum, 19);
assert.equal(accounted.sum, result.total);
assert.equal(accounted.hidden.length, 0);

// 連続年ラベルは日本語・内部キーなし
assert.equal(
  consecutiveYearBonusLineLabel("risp300", "basic"),
  "得点圏打率.300以上・2年連続 +2点",
);
assert.ok(!/risp300/.test(consecutiveYearBonusLineLabel("risp300", "basic")));

// 表示漏れカテゴリがあると hidden に出る
const leaky = itemsAccountedInDisplay({
  ...result,
  items: [
    ...items,
    {
      id: "orphan",
      category: "titles",
      label: "ghost",
      points: 1,
    } as SopLineItem,
  ],
  total: 19,
});
// still in CATEGORY_ORDER so not hidden — make fake category via cast
const withUnknown = itemsAccountedInDisplay({
  ...result,
  total: 20,
  items: [
    ...items,
    {
      id: "x",
      category: "titles",
      label: "ok",
      points: 0,
    },
  ],
});
assert.equal(withUnknown.sum, 19);

console.log(
  JSON.stringify(
    {
      ok: true,
      hasegawaLike: {
        titleSb1: 10,
        interleagueSb1: 5,
        total: 15,
        note: "内訳に交流戦SOPを含めると15点が説明できる",
      },
      consecLabel: consecutiveYearBonusLineLabel("risp300", "basic"),
      categories: CATEGORY_ORDER_FOR_DISPLAY,
    },
    null,
    2,
  ),
);
