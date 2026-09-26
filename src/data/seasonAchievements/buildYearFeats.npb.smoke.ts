/**
 * buildYearFeats 統合: NPB3件 + 20-20連続（同一WORLD）
 * npx tsx src/data/seasonAchievements/buildYearFeats.npb.smoke.ts
 */

import assert from "node:assert/strict";
import { identityFromWorldYear } from "@/data/seasons";
import {
  listSeasonLines,
  resetSeasonLinesCacheForTests,
  upsertSeasonLinesLocalBatch,
  type BatterSeasonLine,
} from "@/data/playerSeasonLines";
import { buildYearFeats } from "./buildYearFeats";
import { npbBadgeLabel } from "./annotateNpb";

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

function batter(p: {
  id: string;
  name: string;
  year: number;
  teamId: BatterSeasonLine["teamId"];
  teamName: string;
  hr: number;
  sb: number;
  doubles?: number;
  hrStreak?: number;
  pinchHr?: number;
}): BatterSeasonLine {
  return {
    id: `${p.id}:BLUE:${p.year}:batter:pennant`,
    playerId: p.id,
    playerName: p.name,
    year: p.year,
    world: "BLUE",
    teamId: p.teamId,
    teamName: p.teamName,
    scope: "pennant",
    source: "manual",
    role: "batter",
    createdAt: now,
    updatedAt: now,
    counting: {
      g: 140,
      pa: 560,
      ab: 500,
      h: 150,
      doubles: p.doubles ?? 20,
      triples: 2,
      hr: p.hr,
      rbi: 70,
      bb: 40,
      sb: p.sb,
      paQualified: true,
      hrStreak: p.hrStreak ?? null,
      pinchHr: p.pinchHr ?? null,
    },
    derived: {
      avg: 0.3,
      hrRate: 0.05,
      slg: 0.5,
      obp: 0.37,
      ops: 0.87,
      tb: 250,
      singles: 100,
      soRate: null,
      sbRate: null,
      rispAvg: null,
      basesLoadedAvg: null,
      csRate: null,
    },
  };
}

upsertSeasonLinesLocalBatch([
  batter({
    id: "hiroshima_01705138_5",
    name: "小園海斗",
    year: 2027,
    teamId: "carp",
    teamName: "広島",
    hr: 10,
    sb: 5,
    doubles: 54,
  }),
  batter({
    id: "rakuten_43345155_55",
    name: "YG安田",
    year: 2027,
    teamId: "fighters",
    teamName: "日本ハム",
    hr: 25,
    sb: 5,
    hrStreak: 8,
  }),
  batter({
    id: "yakult_53755153_25",
    name: "サンタナ",
    year: 2027,
    teamId: "swallows",
    teamName: "ヤクルト",
    hr: 12,
    sb: 3,
    pinchHr: 7,
  }),
  batter({
    id: "nipponham_43945152_6",
    name: "カストロ",
    year: 2026,
    teamId: "fighters",
    teamName: "日本ハム",
    hr: 22,
    sb: 21,
  }),
  batter({
    id: "nipponham_43945152_6",
    name: "カストロ",
    year: 2027,
    teamId: "fighters",
    teamName: "日本ハム",
    hr: 23,
    sb: 26,
  }),
  batter({
    id: "hanshin_41045153_8",
    name: "佐藤輝明",
    year: 2026,
    teamId: "tigers",
    teamName: "阪神",
    hr: 25,
    sb: 20,
  }),
  batter({
    id: "hanshin_41045153_8",
    name: "佐藤輝明",
    year: 2027,
    teamId: "tigers",
    teamName: "阪神",
    hr: 28,
    sb: 22,
  }),
]);

assert.equal(listSeasonLines().length, 7);

const board = buildYearFeats(identityFromWorldYear(2027, "BLUE"));
const npb = board.items.filter(
  (i) => i.category === "npb_record" || i.isNpbRecord,
);

const kozono = npb.find((i) => i.recordType === "season_doubles")!;
const yasuda = npb.find((i) => i.recordType === "hr_streak")!;
const santana = npb.find((i) => i.recordType === "pinch_hr")!;

assert.equal(npbBadgeLabel(kozono), "NPB新記録");
assert.equal(kozono.value, 54);
assert.equal(kozono.npbCaption, "従来記録：52二塁打");

assert.equal(npbBadgeLabel(yasuda), "NPB新記録");
assert.equal(yasuda.value, 8);
assert.equal(yasuda.npbCaption, "従来記録：7試合");

assert.equal(npbBadgeLabel(santana), "NPBタイ記録");
assert.equal(santana.value, 7);
assert.equal(santana.npbCaption, "歴代1位タイ");

const castro = board.items.find(
  (i) =>
    i.recordType === "hr_sb_combo" &&
    i.playerId === "nipponham_43945152_6",
)!;
const sato = board.items.find(
  (i) =>
    i.recordType === "hr_sb_combo" &&
    i.playerId === "hanshin_41045153_8",
)!;

assert.equal(castro.repeatLabel, "2年連続・2回目");
assert.equal(sato.repeatLabel, "2年連続・2回目");

console.log("buildYearFeats.npb.smoke OK", {
  npb: npb.map((i) => `${i.playerName}:${npbBadgeLabel(i)}:${i.valueLabel}`),
  castro: castro.repeatLabel,
  sato: sato.repeatLabel,
});
