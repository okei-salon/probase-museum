/**
 * 表彰通算回数・月間MVP HP/S スモーク
 * npx tsx src/lib/awardCareerCount.smoke.ts
 */

import {
  countAwardCareerTimes,
  countMonthlyMvpCareerTimes,
  formatAwardTimesLabel,
  seasonCareerLabelFromOccurrences,
} from "./awardCareerCount";
import {
  normalizeAwardPlayerKey,
  sameAwardPlayer,
} from "./awardPlayerNormalize";
import type { SavedMonthlyMvpRecord } from "@/data/import/types";
import { parseMonthlyMvpPartner } from "@/lib/import/partnerPaste";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// --- 名前正規化 ---
assert(
  normalizeAwardPlayerKey("ＹＧ安田") === normalizeAwardPlayerKey("YG安田"),
  "NFKC fullwidth YG",
);
assert(
  sameAwardPlayer(
    { playerId: null, playerName: "ＹＧ安田" },
    { playerId: "x", playerName: "YG安田" },
  ),
  "same player NFKC",
);
assert(
  sameAwardPlayer(
    { playerId: "p1", playerName: "" },
    { playerId: "p1", playerName: "" },
  ),
  "same player by id even if name empty",
);

// --- 月間MVP: ＹＧ安田 5月初 / 9月2回目 ---
const monthly: SavedMonthlyMvpRecord[] = [
  {
    id: "BLUE:2027-5-pacific",
    year: 2027,
    world: "BLUE",
    month: 5,
    league: "pacific",
    pitcher: {
      playerId: null,
      playerName: "dummy",
      teamName: "西武",
      era: 1,
      wins: 1,
      losses: 0,
    },
    batter: {
      playerId: null,
      playerName: "ＹＧ安田",
      teamName: "ヤクルト",
      avg: 0.4,
      hr: 5,
      rbi: 10,
      sb: 0,
    },
    sourceJobId: "t",
    updatedAt: "2027-01-01",
  },
  {
    id: "BLUE:2027-9-pacific",
    year: 2027,
    world: "BLUE",
    month: 9,
    league: "pacific",
    pitcher: {
      playerId: null,
      playerName: "dummy",
      teamName: "西武",
      era: 1,
      wins: 1,
      losses: 0,
    },
    batter: {
      playerId: null,
      playerName: "YG安田",
      teamName: "ヤクルト",
      avg: 0.35,
      hr: 3,
      rbi: 8,
      sb: 1,
    },
    sourceJobId: "t",
    updatedAt: "2027-01-01",
  },
  {
    id: "RED:2027-5-pacific",
    year: 2027,
    world: "RED",
    month: 5,
    league: "pacific",
    pitcher: {
      playerId: null,
      playerName: "dummy",
      teamName: "西武",
      era: 1,
      wins: 1,
      losses: 0,
    },
    batter: {
      playerId: null,
      playerName: "ＹＧ安田",
      teamName: "ヤクルト",
      avg: 0.4,
      hr: 5,
      rbi: 10,
      sb: 0,
    },
    sourceJobId: "t",
    updatedAt: "2027-01-01",
  },
];

const may = countMonthlyMvpCareerTimes(
  monthly,
  "batter",
  { playerId: null, playerName: "ＹＧ安田" },
  { year: 2027, world: "BLUE", league: "pacific", month: 5 },
);
const sep = countMonthlyMvpCareerTimes(
  monthly,
  "batter",
  { playerId: null, playerName: "YG安田" },
  { year: 2027, world: "BLUE", league: "pacific", month: 9 },
);
const redMay = countMonthlyMvpCareerTimes(
  monthly,
  "batter",
  { playerId: null, playerName: "ＹＧ安田" },
  { year: 2027, world: "RED", league: "pacific", month: 5 },
);

assert(may === 1, `May should be 1 got ${may}`);
assert(sep === 2, `Sep should be 2 got ${sep}`);
assert(redMay === 1, `RED May should be 1 got ${redMay}`);
assert(formatAwardTimesLabel(may) === "初受賞", "May label");
assert(formatAwardTimesLabel(sep) === "2回目", "Sep label");

// --- B9 / GG 分離・位置変更継続 ---
const b9Occ = [
  {
    year: 2026,
    world: "BLUE" as const,
    slotKey: "pacific|遊撃手",
    playerId: "p-yasuda",
    playerName: "ＹＧ安田",
  },
  {
    year: 2027,
    world: "BLUE" as const,
    slotKey: "central|三塁手",
    playerId: "p-yasuda",
    playerName: "YG安田",
  },
];
const b9y2 = countAwardCareerTimes({
  scope: { type: "bestNine" },
  occurrences: b9Occ,
  current: b9Occ[1]!,
  player: { playerId: "p-yasuda", playerName: "YG安田" },
});
assert(b9y2 === 2, `B9 year2 should be 2 got ${b9y2}`);

const ggLabel = seasonCareerLabelFromOccurrences({
  scope: { type: "goldenGlove" },
  occurrences: [
    {
      year: 2027,
      world: "BLUE",
      slotKey: "pacific|遊撃手",
      playerId: "p-yasuda",
      playerName: "YG安田",
    },
  ],
  currentYear: 2027,
  world: "BLUE",
  player: { playerId: "p-yasuda", playerName: "YG安田" },
});
assert(ggLabel === "初受賞", `GG should be 初受賞 got ${ggLabel}`);

// --- タイトル種別分離 ---
const avgLabel = seasonCareerLabelFromOccurrences({
  scope: { type: "title", titleId: "avg", league: "pacific" },
  occurrences: [
    {
      year: 2027,
      world: "BLUE",
      playerId: "p1",
      playerName: "打者A",
    },
  ],
  currentYear: 2027,
  world: "BLUE",
  player: { playerId: "p1", playerName: "打者A" },
});
const hrLabel = seasonCareerLabelFromOccurrences({
  scope: { type: "title", titleId: "hr", league: "pacific" },
  occurrences: [
    {
      year: 2027,
      world: "BLUE",
      playerId: "p1",
      playerName: "打者A",
    },
  ],
  currentYear: 2027,
  world: "BLUE",
  player: { playerId: "p1", playerName: "打者A" },
});
assert(avgLabel === "初受賞" && hrLabel === "初受賞", "titles separate");

// --- MVP vs 日本シリーズMVP ---
const mvpTimes = countAwardCareerTimes({
  scope: { type: "mvp" },
  occurrences: [
    {
      year: 2026,
      world: "BLUE",
      slotKey: "pacific|",
      playerId: "p2",
      playerName: "投手B",
    },
  ],
  current: {
    year: 2027,
    world: "BLUE",
    slotKey: "pacific|",
    playerId: "p2",
    playerName: "投手B",
  },
  player: { playerId: "p2", playerName: "投手B" },
});
const jsTimes = countAwardCareerTimes({
  scope: { type: "japanSeriesMvp" },
  occurrences: [
    {
      year: 2027,
      world: "BLUE",
      playerId: "p2",
      playerName: "投手B",
    },
  ],
  current: {
    year: 2027,
    world: "BLUE",
    playerId: "p2",
    playerName: "投手B",
  },
  player: { playerId: "p2", playerName: "投手B" },
});
assert(mvpTimes === 2, `season MVP 2nd got ${mvpTimes}`);
assert(jsTimes === 1, `JS MVP first got ${jsTimes}`);

// --- 相棒貼り付け PITCHER_HP / PITCHER_S ---
const paste = `YEAR=2027
WORLD=BLUE
TYPE=MONTHLY_MVP

LEAGUE=pacific
MONTH=4
PITCHER=馬原
PITCHER_TEAM=西武
PITCHER_ERA=0.53
PITCHER_WINS=1
PITCHER_LOSSES=0
PITCHER_HP=2
PITCHER_S=12
BATTER=柳田
BATTER_TEAM=ソフトバンク
BATTER_AVG=.407
BATTER_HR=6
BATTER_RBI=20
BATTER_SB=2`;

const parsed = parseMonthlyMvpPartner(paste, 2027);
assert(parsed.kind === "monthly_mvp", `kind monthly_mvp got ${parsed.kind}`);
assert(parsed.drafts.length >= 1, "has draft");
const d = parsed.drafts[0]!;
assert(d.pitcher.hp === 2, `hp=2 got ${d.pitcher.hp}`);
assert(d.pitcher.saves === 12, `saves=12 got ${d.pitcher.saves}`);
assert(d.pitcher.era === 0.53, "era");
assert(d.pitcher.wins === 1 && d.pitcher.losses === 0, "W-L");

console.log("awardCareerCount.smoke: ok");
