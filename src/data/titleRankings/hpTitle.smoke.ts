/**
 * タイトル「ホールドポイント（HP）」は保存済み hp のみで順位・表示する。
 * npx tsx src/data/titleRankings/hpTitle.smoke.ts
 */

import assert from "node:assert/strict";
import { identityFromWorldYear } from "@/data/seasons";
import {
  resetSeasonLinesCacheForTests,
  upsertSeasonLinesLocalBatch,
  type PitcherSeasonLine,
} from "@/data/playerSeasonLines";
import { buildTitleRankings } from "./buildRankings";
import { PITCHER_TITLES } from "./defs";

function assertCond(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

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

resetSeasonLinesCacheForTests();

const hpDef = PITCHER_TITLES.find((t) => t.id === "hp");
assertCond(hpDef, "hp title def missing");
assert.equal(hpDef.label, "ホールドポイント（HP）");
assert.equal(hpDef.valueKey, "hp");

const now = new Date().toISOString();

function pitcher(input: {
  id: string;
  name: string;
  teamId: PitcherSeasonLine["teamId"];
  teamName: string;
  world: "BLUE" | "RED";
  hp: number | null;
  hld: number;
  w: number;
}): PitcherSeasonLine {
  return {
    id: `${input.id}:${input.world}:2026:pitcher:pennant`,
    playerId: input.id,
    playerName: input.name,
    year: 2026,
    world: input.world,
    teamId: input.teamId,
    teamName: input.teamName,
    scope: "pennant",
    source: "manual",
    role: "pitcher",
    createdAt: now,
    updatedAt: now,
    counting: {
      g: 50,
      w: input.w,
      l: 2,
      sv: 0,
      hld: input.hld,
      hp: input.hp,
      ipOuts: 150,
      er: 10,
      so: 40,
    },
    derived: {
      era: 1.8,
      winPct: 0.5,
      whip: 1.0,
      soRate: 8.0,
      bbRate: 2.0,
      kbb: 4.0,
      qsRate: null,
      hqsRate: null,
      ipDisplay: "50.0",
    },
  };
}

upsertSeasonLinesLocalBatch([
  // BLUE セ: hld が高いが hp が低い選手 vs hp が高い選手
  pitcher({
    id: "p_high_hld",
    name: "高HLD低HP",
    teamId: "tigers",
    teamName: "阪神",
    world: "BLUE",
    hp: 12,
    hld: 45,
    w: 5,
  }),
  pitcher({
    id: "p_high_hp",
    name: "高HP投手",
    teamId: "giants",
    teamName: "巨人",
    world: "BLUE",
    hp: 41,
    hld: 20,
    w: 3,
  }),
  pitcher({
    id: "p_no_hp",
    name: "HP未登録",
    teamId: "carp",
    teamName: "広島",
    world: "BLUE",
    hp: null,
    hld: 60,
    w: 8,
  }),
  // BLUE パ
  pitcher({
    id: "p_pac_hp",
    name: "パHP王",
    teamId: "hawks",
    teamName: "ソフトバンク",
    world: "BLUE",
    hp: 33,
    hld: 10,
    w: 1,
  }),
  // RED セ（別WORLD）
  pitcher({
    id: "p_red_hp",
    name: "RED高HP",
    teamId: "baystars",
    teamName: "DeNA",
    world: "RED",
    hp: 28,
    hld: 5,
    w: 2,
  }),
  pitcher({
    id: "p_red_hld",
    name: "RED高HLD",
    teamId: "swallows",
    teamName: "ヤクルト",
    world: "RED",
    hp: 9,
    hld: 55,
    w: 4,
  }),
]);

const blue = buildTitleRankings(2026, "pitcher", {
  persistHistory: true,
  identity: identityFromWorldYear(2026, "BLUE"),
});
const red = buildTitleRankings(2026, "pitcher", {
  persistHistory: true,
  identity: identityFromWorldYear(2026, "RED"),
});

const blueHp = blue.sections.find((s) => s.def.id === "hp");
const redHp = red.sections.find((s) => s.def.id === "hp");
assertCond(blueHp, "BLUE hp section");
assertCond(redHp, "RED hp section");
assert.equal(blueHp.def.label, "ホールドポイント（HP）");
assert.equal(blue.usingSample, false);

const blueCentral = blueHp.board.central;
assert.equal(blueCentral[0]?.playerName, "高HP投手");
assert.equal(blueCentral[0]?.valueText, "41");
assert.equal(blueCentral[0]?.value, 41);
assert.equal(blueCentral[1]?.playerName, "高HLD低HP");
assert.equal(blueCentral[1]?.valueText, "12");
assert.ok(
  !blueCentral.some((e) => e.playerName === "HP未登録"),
  "hp 未登録は対象外",
);

assert.equal(blueHp.board.pacific[0]?.playerName, "パHP王");
assert.equal(blueHp.board.pacific[0]?.valueText, "33");

assert.equal(redHp.board.central[0]?.playerName, "RED高HP");
assert.equal(redHp.board.central[0]?.valueText, "28");
assert.equal(redHp.board.central[1]?.playerName, "RED高HLD");
assert.equal(redHp.board.central[1]?.valueText, "9");

// 履歴に再計算後の valueText が載る
const histRaw = map.get("probase-museum.title-win-history.v1");
assertCond(histRaw, "title history written");
const hist = JSON.parse(histRaw) as {
  titleId: string;
  world?: string;
  league: string;
  playerName?: string;
  valueText?: string;
  rank?: number;
}[];
const blueCWinner = hist.find(
  (r) =>
    r.titleId === "hp" &&
    r.world === "BLUE" &&
    r.league === "central" &&
    (r.rank ?? 1) === 1,
);
assert.equal(blueCWinner?.playerName, "高HP投手");
assert.equal(blueCWinner?.valueText, "41");

console.log("hpTitle.smoke OK", {
  blueCentral: blueCentral.map((e) => `${e.rank}:${e.playerName}=${e.valueText}`),
  bluePacific: blueHp.board.pacific.map(
    (e) => `${e.rank}:${e.playerName}=${e.valueText}`,
  ),
  redCentral: redHp.board.central.map(
    (e) => `${e.rank}:${e.playerName}=${e.valueText}`,
  ),
});
