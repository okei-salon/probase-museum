/**
 * 92試合登板: 大記録カード SOP+30（20+NPB10）／NPBタブ掲載
 * npx tsx src/data/seasonAchievements/seasonAppearancesNpb.smoke.ts
 */

import assert from "node:assert/strict";
import { identityFromWorldYear } from "@/data/seasons";
import {
  resetSeasonLinesCacheForTests,
  upsertSeasonLinesLocalBatch,
  type PitcherSeasonLine,
} from "@/data/playerSeasonLines";
import { buildYearFeats } from "./buildYearFeats";
import { npbBadgeLabel } from "./annotateNpb";
import { computeSeasonSop } from "@/lib/sop/computeSeasonSop";
import { NPB_RECORD_BONUS_POINTS } from "@/lib/sop/npbRecords";
import { PITCHER_HISTORIC } from "@/lib/sop/rules";
import type { SopPlayerYearInput } from "@/lib/sop/input";

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

const katsuno: PitcherSeasonLine = {
  id: "chunichi_21525138_41:BLUE:2028:pitcher:pennant",
  playerId: "chunichi_21525138_41",
  playerName: "勝野昌慶",
  year: 2028,
  world: "BLUE",
  teamId: "dragons",
  teamName: "中日",
  scope: "pennant",
  source: "manual",
  role: "pitcher",
  createdAt: now,
  updatedAt: now,
  counting: {
    g: 92,
    w: 3,
    l: 2,
    sv: 0,
    hld: 44,
    hp: 47,
    ipOuts: 210,
    er: 25,
    so: 80,
    h: 60,
    bb: 20,
    gs: 0,
  },
  derived: {
    era: 2.15,
    winPct: 0.6,
    soRate: 10.3,
    whip: 1.14,
    bbRate: null,
    kbb: null,
    qsRate: null,
    hqsRate: null,
    ipDisplay: "70.0",
  },
};

upsertSeasonLinesLocalBatch([katsuno]);

const board = buildYearFeats(identityFromWorldYear(2028, "BLUE"));
const g80 = board.items.find(
  (i) =>
    i.recordType === "g80" && i.playerId === "chunichi_21525138_41",
)!;

assert.equal(g80.recordName, "80試合登板");
assert.equal(g80.value, 92);
assert.equal(g80.valueLabel, "92試合登板");
assert.equal(g80.sopPoints, PITCHER_HISTORIC.g80.points);
assert.equal(g80.npbBonusPoints, NPB_RECORD_BONUS_POINTS);
assert.equal(g80.isNpbRecord, true);
assert.equal(npbBadgeLabel(g80), "NPB新記録");
assert.equal(
  (g80.sopPoints ?? 0) + (g80.npbBonusPoints ?? 0),
  30,
  "カード表示 SOP +30",
);

const npbTab = board.items.filter(
  (i) => i.category === "npb_record" || i.isNpbRecord === true,
);
assert.ok(
  npbTab.some((i) => i.id === g80.id),
  "NPB記録タブに92試合登板カードが載る",
);

const sopInput: SopPlayerYearInput = {
  playerId: "chunichi_21525138_41",
  playerName: "勝野昌慶",
  year: 2028,
  world: "BLUE",
  role: "pitcher",
  teamShort: "中日",
  league: "central",
  awards: [],
  titles: [],
  feats: {},
  priorYear: null,
  batter: null,
  pitcher: {
    g: 92,
    gs: 0,
    pitcherClass: "reliever",
    startRate: 0,
    era: 2.15,
    reliefEra: 2.15,
    ip: 70,
    reliefIp: 70,
    ipQualified: true,
    w: 3,
    l: 2,
    sv: 0,
    hp: 47,
    hld: 44,
    so: 80,
    soRate: 10.3,
    reliefSoRate: 10.3,
    qsRate: null,
    sho: 0,
    cg: 0,
    winPct: 0.6,
  },
};

const sop = computeSeasonSop(sopInput);
const historic = sop.items.find((i) => i.id === "historic:g80");
const npb = sop.items.find((i) => i.id === "npb:npb_g");
assert.ok(historic);
assert.ok(npb);
assert.equal(historic!.points + npb!.points, 30);

console.log("seasonAppearancesNpb.smoke.ts: ok");
