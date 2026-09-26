/**
 * カード表示用: 「達成」非表示・実成績ラベル・文字バランス用スモーク
 * npx tsx src/data/seasonAchievements/featsCardDisplay.smoke.ts
 */

import assert from "node:assert/strict";
import { identityFromWorldYear } from "@/data/seasons";
import {
  resetSeasonLinesCacheForTests,
  upsertSeasonLinesLocalBatch,
  type BatterSeasonLine,
} from "@/data/playerSeasonLines";
import { upsertStoredAchievement } from "./store";
import { buildYearFeats } from "./buildYearFeats";
import { formatAvgHrRbiLabel } from "./detectSeason";
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
  teamId: BatterSeasonLine["teamId"];
  teamName: string;
  avg: number;
  hr: number;
  rbi: number;
  sb?: number;
  doubles?: number;
  hrStreak?: number;
  pinchHr?: number;
}): BatterSeasonLine {
  const ab = 500;
  const h = Math.round(p.avg * ab);
  return {
    id: `${p.id}:BLUE:2027:batter:pennant`,
    playerId: p.id,
    playerName: p.name,
    year: 2027,
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
      ab,
      h,
      doubles: p.doubles ?? 20,
      triples: 2,
      hr: p.hr,
      rbi: p.rbi,
      bb: 40,
      sb: p.sb ?? 5,
      paQualified: true,
      hrStreak: p.hrStreak ?? null,
      pinchHr: p.pinchHr ?? null,
    },
    derived: {
      avg: p.avg,
      hrRate: p.hr / ab,
      slg: 0.5,
      obp: 0.37,
      ops: 0.87,
      tb: 250,
      singles: h - (p.doubles ?? 20) - 2 - p.hr,
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
    id: "hanshin_sample_sato",
    name: "佐藤輝明",
    teamId: "tigers",
    teamName: "阪神",
    avg: 0.312,
    hr: 35,
    rbi: 108,
    sb: 8,
  }),
  batter({
    id: "hiroshima_01705138_5",
    name: "小園海斗",
    teamId: "carp",
    teamName: "広島",
    avg: 0.28,
    hr: 10,
    rbi: 50,
    doubles: 54,
  }),
  batter({
    id: "rakuten_43345155_55",
    name: "YG安田",
    teamId: "fighters",
    teamName: "日本ハム",
    avg: 0.26,
    hr: 25,
    rbi: 70,
    hrStreak: 8,
  }),
  batter({
    id: "yakult_53755153_25",
    name: "サンタナ",
    teamId: "swallows",
    teamName: "ヤクルト",
    avg: 0.255,
    hr: 12,
    rbi: 40,
    pinchHr: 7,
  }),
]);

// 手動「達成」のみのカード → 成績から実数値へ
upsertStoredAchievement({
  id: "manual:BLUE:2027:hanshin_sample_sato:batter:avg300_hr30_rbi100",
  season: 2027,
  world: "BLUE",
  playerId: "hanshin_sample_sato",
  playerName: "佐藤輝明",
  teamShort: "阪神",
  role: "batter",
  category: "season",
  recordType: "avg300_hr30_rbi100",
  recordName: "打率.300＋30本塁打＋100打点",
  value: null,
  valueLabel: "達成",
  sopPoints: 15,
  source: "manual",
  createdAt: now,
  updatedAt: now,
});

const identity = identityFromWorldYear(2027, "BLUE");
const { items } = buildYearFeats(identity);

const avg300 = items.find(
  (i) =>
    i.playerId === "hanshin_sample_sato" &&
    i.recordType === "avg300_hr30_rbi100",
)!;
assert.equal(avg300.valueLabel, formatAvgHrRbiLabel(0.312, 35, 108));
assert.notEqual(avg300.valueLabel, "達成");

const npb = items.filter(
  (i) => i.category === "npb_record" || i.isNpbRecord === true,
);
const kozono = npb.find((i) => i.recordType === "season_doubles")!;
const yasuda = npb.find((i) => i.recordType === "hr_streak")!;
const santana = npb.find((i) => i.recordType === "pinch_hr")!;

assert.equal(kozono.playerName, "小園海斗");
assert.equal(npbBadgeLabel(kozono), "NPB新記録");
assert.equal(yasuda.playerName, "YG安田");
assert.equal(npbBadgeLabel(yasuda), "NPB新記録");
assert.equal(santana.playerName, "サンタナ");
assert.equal(santana.recordName, "シーズン代打本塁打");
assert.equal(santana.valueLabel, "7本");
assert.equal(npbBadgeLabel(santana), "NPBタイ記録");
assert.equal(santana.npbCaption, "歴代1位タイ");

console.log(
  JSON.stringify(
    {
      ok: true,
      avg300: avg300.valueLabel,
      npb: npb.map(
        (i) => `${i.playerName}:${i.recordName}:${i.valueLabel}:${npbBadgeLabel(i)}`,
      ),
      lines: "ok",
    },
    null,
    2,
  ),
);
