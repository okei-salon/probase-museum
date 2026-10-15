/**
 * 通算SOP表示制限: 0pt除外・最大100・順位維持
 * node --import tsx src/data/sop/sopCareerDisplayLimit.smoke.ts
 */
import assert from "node:assert/strict";
import {
  SOP_CAREER_RANKING_DISPLAY_LIMIT,
  buildSopCareerRankingsFromResults,
  limitSopCareerRankingsForDisplay,
  type SopCareerRankRow,
} from "./careerBoard";
import type { SopSeasonResult } from "@/lib/sop";

function mk(
  playerId: string,
  name: string,
  total: number,
  rank: number,
): SopCareerRankRow {
  return {
    rank,
    playerId,
    playerName: name,
    teamShort: "球",
    total,
    role: "batter",
    seasons: [],
  };
}

assert.equal(SOP_CAREER_RANKING_DISPLAY_LIMIT, 100);

const ranked = [
  mk("a", "A", 100, 1),
  mk("b", "B", 50, 2),
  mk("c", "C", 50, 2), // 同点
  mk("d", "D", 10, 4),
  mk("z", "Z", 0, 5),
];

const limited = limitSopCareerRankingsForDisplay(ranked, 3);
assert.equal(limited.length, 3);
assert.deepEqual(
  limited.map((r) => r.playerId),
  ["a", "b", "c"],
);
assert.equal(limited[1]!.rank, 2);
assert.equal(limited[2]!.rank, 2, "同点順位を維持");
assert.ok(!limited.some((r) => r.total <= 0), "0ptは表示しない");

// 101人以上 → 100件
const many: SopCareerRankRow[] = [];
for (let i = 0; i < 120; i += 1) {
  many.push(mk(`p${i}`, `選手${i}`, 200 - i, i + 1));
}
many.push(mk("zero", "零", 0, 121));
const top100 = limitSopCareerRankingsForDisplay(many);
assert.equal(top100.length, 100);
assert.equal(top100[0]!.playerId, "p0");
assert.equal(top100[99]!.playerId, "p99");
assert.ok(!top100.some((r) => r.total <= 0));

// FromResults: 0pt選手も集計には載るが display で落ちる
const seasons: SopSeasonResult[] = [
  {
    playerId: "hi",
    playerName: "高得点",
    year: 2026,
    world: "BLUE",
    role: "batter",
    teamShort: "日",
    total: 40,
    items: [
      {
        id: "title:hr:1",
        category: "titles",
        label: "本塁打1位",
        points: 10,
      },
      {
        id: "basic",
        category: "season_basic",
        label: "基本",
        points: 30,
      },
    ],
  },
  {
    playerId: "zero",
    playerName: "零点",
    year: 2026,
    world: "BLUE",
    role: "batter",
    teamShort: "日",
    total: 0,
    items: [],
  },
];
const full = buildSopCareerRankingsFromResults(seasons, "batter");
assert.ok(full.some((r) => r.playerId === "zero"));
const shown = limitSopCareerRankingsForDisplay(full);
assert.ok(!shown.some((r) => r.playerId === "zero"));
assert.equal(shown[0]!.total, 40);

// 総合・野手・投手いずれも表示は max100 / 0pt除外、集計配列はそれ以上ありうる
for (const role of ["all", "batter", "pitcher"] as const) {
  const roleSeasons =
    role === "pitcher"
      ? seasons.map((s) => ({ ...s, role: "pitcher" as const }))
      : seasons;
  const fullRole = buildSopCareerRankingsFromResults(
    roleSeasons,
    role === "all" ? "all" : role,
  );
  const displayRole = limitSopCareerRankingsForDisplay(fullRole);
  assert.ok(fullRole.length >= displayRole.length, `${role} full>=display`);
  assert.ok(displayRole.every((r) => r.total > 0), `${role} no zeros`);
  assert.ok(displayRole.length <= 100, `${role} <=100`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      displayLimit: SOP_CAREER_RANKING_DISPLAY_LIMIT,
      sampleLimited: limited.map((r) => `${r.rank}:${r.playerId}:${r.total}`),
      top100Len: top100.length,
      rolesChecked: ["all", "batter", "pitcher"],
    },
    null,
    2,
  ),
);
