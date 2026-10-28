/**
 * 通算規定は選手個人のシーズン数ではなく、全体の経過シーズン数で乗算する。
 * npx tsx src/data/recordsRankings/careerElapsedQualify.smoke.ts
 */

import assert from "node:assert/strict";
import {
  resetSeasonLinesCacheForTests,
  upsertSeasonLinesLocalBatch,
  type PitcherSeasonLine,
} from "@/data/playerSeasonLines";
import {
  buildCareerRecordsBoard,
  elapsedCareerSeasonCount,
} from "./careerRankings";
import { PITCHER_CAREER_STATS } from "./defs";
import { listSeasonLines } from "@/data/playerSeasonLines";

const map = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
  },
};
(globalThis as { fetch?: typeof fetch }).fetch = (async () =>
  new Response(JSON.stringify({ ok: false }), { status: 503 })) as typeof fetch;

resetSeasonLinesCacheForTests();
const now = new Date().toISOString();

function pitcher(partial: {
  playerId: string;
  name: string;
  year: number;
  world: "BLUE" | "RED";
  ipOuts: number;
  er: number;
}): PitcherSeasonLine {
  const ip = partial.ipOuts / 3;
  return {
    id: `${partial.playerId}:${partial.world}:${partial.year}:pitcher:pennant`,
    playerId: partial.playerId,
    playerName: partial.name,
    year: partial.year,
    world: partial.world,
    teamId: "lions",
    teamName: "西武",
    scope: "pennant",
    source: "manual",
    role: "pitcher",
    createdAt: now,
    updatedAt: now,
    counting: {
      g: 25,
      gs: 25,
      w: 10,
      l: 5,
      sv: 0,
      hld: 0,
      ipOuts: partial.ipOuts,
      er: partial.er,
      so: 100,
      h: 80,
      bb: 30,
    },
    derived: {
      era: (partial.er * 9) / ip,
      winPct: 10 / 15,
      soRate: (100 * 9) / ip,
      whip: (80 + 30) / ip,
      bbRate: null,
      kbb: null,
      qsRate: 0.5,
      hqsRate: 0.3,
      ipDisplay: String(Math.floor(ip)),
    },
  };
}

// 経過シーズン = BLUE×3 + RED×1 = 4
const veterans = [2026, 2027, 2028].flatMap((year) =>
  pitcher({
    playerId: "veteran_p",
    name: "ベテラン投手",
    year,
    world: "BLUE",
    ipOuts: 143 * 3, // 各年143回 → 通算429回
    er: 40,
  }),
);
veterans.push(
  pitcher({
    playerId: "veteran_p",
    name: "ベテラン投手",
    year: 2026,
    world: "RED",
    ipOuts: 143 * 3,
    er: 40,
  }),
);

// 1シーズンのみ・防御率は優秀だが投球回は単年規定相当（143回）
const rookie = pitcher({
  playerId: "rookie_imai",
  name: "今井達也",
  year: 2028,
  world: "BLUE",
  ipOuts: 143 * 3, // 143回のみ
  er: 10, // ERA 低い
});

upsertSeasonLinesLocalBatch([...veterans, rookie]);

const scopeLines = listSeasonLines().filter((l) => l.scope === "pennant");
assert.equal(elapsedCareerSeasonCount(scopeLines), 4);

const eraDef = PITCHER_CAREER_STATS.find((d) => d.id === "era")!;
const board = buildCareerRecordsBoard(eraDef, "pennant");
const ids = board.entries.map((e) => e.playerId);

assert.ok(
  ids.includes("veteran_p"),
  "4シーズン分の規定（143×4）を満たす投手は対象",
);
assert.ok(
  !ids.includes("rookie_imai"),
  "1シーズン・143回のみの投手は通算防御率ランキング対象外",
);

console.log("careerElapsedQualify.smoke.ts: ok", {
  elapsed: 4,
  thresholdIp: 143 * 4,
  ranked: board.entries.map((e) => e.playerName),
});
