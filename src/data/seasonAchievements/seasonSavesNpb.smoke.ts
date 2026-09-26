/**
 * シーズンセーブ NPB 判定（松山晋也 55セーブ）
 * npx tsx src/data/seasonAchievements/seasonSavesNpb.smoke.ts
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

const matsuyama: PitcherSeasonLine = {
  id: "chunichi_61865157_90:BLUE:2027:pitcher:pennant",
  playerId: "chunichi_61865157_90",
  playerName: "松山晋也",
  year: 2027,
  world: "BLUE",
  teamId: "dragons",
  teamName: "中日",
  scope: "pennant",
  source: "manual",
  role: "pitcher",
  createdAt: now,
  updatedAt: now,
  counting: {
    g: 60,
    w: 2,
    l: 3,
    sv: 55,
    hld: 0,
    ipOuts: 180,
    er: 20,
    so: 70,
    h: 50,
    bb: 15,
    gs: 0,
  },
  derived: {
    era: 3.0,
    winPct: 0.4,
    soRate: 10.5,
    whip: 1.08,
    bbRate: null,
    kbb: null,
    qsRate: null,
    hqsRate: null,
    ipDisplay: "60.0",
  },
};

upsertSeasonLinesLocalBatch([matsuyama]);

const board = buildYearFeats(identityFromWorldYear(2027, "BLUE"));
const saves = board.items.find(
  (i) =>
    i.recordType === "season_saves" &&
    i.playerId === "chunichi_61865157_90",
)!;

assert.equal(saves.recordName, "シーズンセーブ");
assert.equal(saves.value, 55);
assert.equal(saves.valueLabel, "55セーブ");
assert.equal(saves.playerName, "松山晋也");
assert.equal(npbBadgeLabel(saves), "NPB新記録");
assert.equal(saves.npbCaption, "従来記録：54セーブ");
assert.equal(saves.npbBonusPoints, NPB_RECORD_BONUS_POINTS);
assert.equal(saves.isNpbUpdate, true);

// SOP: NPB史実は一度だけ。タイトル点とは別カテゴリ
const sopInput: SopPlayerYearInput = {
  playerId: "chunichi_61865157_90",
  playerName: "松山晋也",
  year: 2027,
  world: "BLUE",
  role: "pitcher",
  teamId: "dragons",
  teamShort: "中日",
  league: "central",
  awards: [],
  titles: [{ titleId: "sv", titleLabel: "セーブ", rank: 1 }],
  feats: {},
  batter: null,
  pitcher: {
    era: 3.0,
    w: 2,
    l: 3,
    winPct: 0.4,
    so: 70,
    soRate: 10.5,
    sho: 0,
    cg: 0,
    ip: 60,
    qsRate: null,
    g: 60,
    gs: 0,
    hp: 0,
    hld: 0,
    sv: 55,
    reliefEra: 3.0,
    reliefSoRate: 10.5,
    reliefIp: 60,
    ipQualified: false,
    pitcherClass: "reliever",
    startRate: 0,
  },
  priorYear: null,
  applyTwoWay: false,
};

const sop = computeSeasonSop(sopInput);
const titleItems = sop.items.filter((i) => i.category === "titles");
const npbItems = sop.items.filter((i) => i.category === "npb_record");
assert.equal(titleItems.length, 1);
assert.equal(titleItems[0]!.points, 10);
assert.equal(titleItems[0]!.label, "セーブ1位");
assert.equal(npbItems.length, 1);
assert.equal(npbItems[0]!.id, "npb:npb_sv");
assert.equal(npbItems[0]!.points, NPB_RECORD_BONUS_POINTS);
assert.match(npbItems[0]!.label, /シーズンセーブ/);
assert.equal(
  sop.items.filter((i) => i.id === "npb:npb_sv").length,
  1,
  "NPBセーブ加点は1回のみ",
);

// 54セーブはタイ（新記録ではない）
const tieLine: PitcherSeasonLine = {
  ...matsuyama,
  id: "other:BLUE:2027:pitcher:pennant",
  playerId: "other_sv54",
  playerName: "タイ記録者",
  counting: { ...matsuyama.counting, sv: 54 },
};
upsertSeasonLinesLocalBatch([tieLine]);
const board2 = buildYearFeats(identityFromWorldYear(2027, "BLUE"));
const tie = board2.items.find((i) => i.playerId === "other_sv54")!;
assert.equal(npbBadgeLabel(tie), "NPBタイ記録");
assert.equal(tie.npbCaption, "歴代1位タイ");

console.log(
  JSON.stringify(
    {
      ok: true,
      matsuyama: {
        recordName: saves.recordName,
        valueLabel: saves.valueLabel,
        badge: npbBadgeLabel(saves),
        caption: saves.npbCaption,
      },
      sop: {
        title: `${titleItems[0]!.label}:+${titleItems[0]!.points}`,
        npb: `${npbItems[0]!.label}:+${npbItems[0]!.points}`,
      },
    },
    null,
    2,
  ),
);
