/**
 * 連続年ボーナスSOP・連勝リーグ1位のスモーク
 * npx tsx src/data/sop/consecutiveAndWinStreak.smoke.ts
 */

import assert from "node:assert/strict";
import { computeSeasonSop } from "@/lib/sop/computeSeasonSop";
import { CONSECUTIVE_YEAR_BONUS, PITCHER_FEATS } from "@/lib/sop/rules";
import type { SopPlayerYearInput } from "@/lib/sop/input";
import {
  filterStreaksToLeagueLeaders,
  leagueLeaderDisplaySopPoints,
} from "@/data/seasonAchievements/streakDisplay";
import type { SeasonAchievement } from "@/data/seasonAchievements/types";
import { withRepeatLabels } from "@/data/seasonAchievements/achievementRepeat";

function batterInput(
  partial: Partial<SopPlayerYearInput> & {
    playerId: string;
    year: number;
    hr: number;
    sb: number;
    priorCombo?: string[];
  },
): SopPlayerYearInput {
  return {
    playerId: partial.playerId,
    playerName: partial.playerName ?? partial.playerId,
    year: partial.year,
    world: "BLUE",
    role: "batter",
    teamId: "fighters",
    teamShort: "日本ハム",
    league: "pacific",
    awards: [],
    titles: [],
    feats: {},
    batter: {
      avg: 0.28,
      pa: 560,
      h: 140,
      hr: partial.hr,
      rbi: 70,
      r: 80,
      doubles: 20,
      triples: 2,
      sb: partial.sb,
      sac: null,
      bb: 40,
      obp: 0.35,
      ops: 0.8,
      rispAvg: null,
      csRate: null,
      csAttempted: null,
      paQualified: true,
    },
    pitcher: null,
    priorYear: partial.priorCombo
      ? { basicIds: [], comboIds: partial.priorCombo }
      : null,
    applyTwoWay: false,
  };
}

function pitcherInput(
  partial: Partial<SopPlayerYearInput> & {
    playerId: string;
    year: number;
    winStreak: number;
    winStreakLeagueLeader?: boolean;
  },
): SopPlayerYearInput {
  return {
    playerId: partial.playerId,
    playerName: partial.playerName ?? partial.playerId,
    year: partial.year,
    world: "BLUE",
    role: "pitcher",
    teamId: "marines",
    teamShort: "ロッテ",
    league: "pacific",
    awards: [],
    titles: [],
    feats: {
      winStreak: partial.winStreak,
      winStreakLeagueLeader: partial.winStreakLeagueLeader ?? false,
    },
    batter: null,
    pitcher: {
      era: 2.5,
      w: 8,
      l: 3,
      winPct: 0.727,
      so: 100,
      soRate: 9,
      sho: 0,
      cg: 0,
      ip: 120,
      qsRate: null,
      g: 50,
      gs: 0,
      hp: 20,
      hld: 20,
      sv: 0,
      reliefEra: 2.5,
      reliefSoRate: 9,
      reliefIp: 50,
      ipQualified: false,
      pitcherClass: "reliever",
      startRate: 0,
    },
    priorYear: null,
    applyTwoWay: false,
  };
}

// --- 連続年ボーナス（複合 20-20） ---
const first = computeSeasonSop(
  batterInput({
    playerId: "castro",
    playerName: "カストロ",
    year: 2026,
    hr: 23,
    sb: 26,
  }),
);
assert.ok(first.achievementIds?.comboIds.includes("hrSbCombo"));
assert.equal(
  first.items.some((i) => i.category === "consecutive_year"),
  false,
);

const second = computeSeasonSop(
  batterInput({
    playerId: "castro",
    playerName: "カストロ",
    year: 2027,
    hr: 23,
    sb: 26,
    priorCombo: ["hrSbCombo"],
  }),
);
const consec = second.items.filter((i) => i.category === "consecutive_year");
assert.equal(consec.length, 1);
assert.equal(consec[0]!.points, CONSECUTIVE_YEAR_BONUS.combo);
assert.match(consec[0]!.label, /本塁打×盗塁複合・2年連続 \+5点/);
assert.ok(!/hrSbCombo/.test(consec[0]!.label));
assert.ok(second.items.some((i) => i.id.startsWith("combo:hrSbCombo")));

// カード表示: 基礎点 + 連続年
const cardItems = withRepeatLabels(
  [
    {
      id: "a2027",
      season: 2027,
      world: "BLUE",
      playerId: "castro",
      playerName: "カストロ",
      teamShort: "日本ハム",
      role: "batter",
      category: "season",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
      value: 23,
      secondaryValue: 26,
      valueLabel: "23本塁打・26盗塁",
      sopPoints: 5,
      source: "auto",
      createdAt: "",
      updatedAt: "",
    },
  ],
  [
    {
      id: "a2026",
      season: 2026,
      world: "BLUE",
      playerId: "castro",
      playerName: "カストロ",
      teamShort: "日本ハム",
      role: "batter",
      category: "season",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
      value: 20,
      secondaryValue: 20,
      sopPoints: 5,
      source: "auto",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "a2027",
      season: 2027,
      world: "BLUE",
      playerId: "castro",
      playerName: "カストロ",
      teamShort: "日本ハム",
      role: "batter",
      category: "season",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
      value: 23,
      secondaryValue: 26,
      sopPoints: 5,
      source: "auto",
      createdAt: "",
      updatedAt: "",
    },
  ],
);
assert.equal(cardItems[0]!.repeatLabel, "2年連続・2回目");
assert.equal(cardItems[0]!.sopPoints, 5 + CONSECUTIVE_YEAR_BONUS.combo);

// --- 連勝リーグ1位（9連勝・段階点なしでも +5） ---
const taira = computeSeasonSop(
  pitcherInput({
    playerId: "taira",
    playerName: "平良海馬",
    year: 2027,
    winStreak: 9,
    winStreakLeagueLeader: true,
  }),
);
assert.equal(
  taira.items.some((i) => i.id === "feat:winStreak"),
  false,
  "9連勝は段階点対象外",
);
const leader = taira.items.find((i) => i.id === "feat:winStreakLeagueLeader");
assert.ok(leader);
assert.equal(leader!.points, PITCHER_FEATS.winStreakLeagueLeader.points);
assert.equal(leader!.label, "連勝 リーグ1位");

const now = new Date().toISOString();
const winCards: SeasonAchievement[] = [
  {
    id: "w1",
    season: 2027,
    world: "BLUE",
    playerId: "taira",
    playerName: "平良海馬",
    teamShort: "ロッテ",
    role: "pitcher",
    category: "streak",
    recordType: "win_streak",
    recordName: "連勝",
    value: 9,
    unit: "連勝",
    valueLabel: "9連勝",
    sopPoints: 0,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "w2",
    season: 2027,
    world: "BLUE",
    playerId: "other",
    playerName: "他投手",
    teamShort: "ソフトバンク",
    role: "pitcher",
    category: "streak",
    recordType: "win_streak",
    recordName: "連勝",
    value: 7,
    unit: "連勝",
    valueLabel: "7連勝",
    sopPoints: 0,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  },
];
const leadersOnly = filterStreaksToLeagueLeaders(winCards);
assert.equal(leadersOnly.length, 1);
assert.equal(leadersOnly[0]!.playerName, "平良海馬");
assert.equal(leadersOnly[0]!.value, 9);
assert.equal(
  leadersOnly[0]!.sopPoints,
  leagueLeaderDisplaySopPoints("win_streak", 9),
);
assert.equal(leadersOnly[0]!.sopPoints, 5);

// 10連勝以上は段階点 + リーグ1位を別加算
const taira10 = computeSeasonSop(
  pitcherInput({
    playerId: "taira",
    year: 2027,
    winStreak: 10,
    winStreakLeagueLeader: true,
  }),
);
assert.ok(taira10.items.some((i) => i.id === "feat:winStreak" && i.points === 5));
assert.ok(
  taira10.items.some(
    (i) => i.id === "feat:winStreakLeagueLeader" && i.points === 5,
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      castroConsec: consec[0],
      cardSop: cardItems[0]!.sopPoints,
      taira9: taira.items
        .filter((i) => i.id.includes("winStreak"))
        .map((i) => `${i.label}:+${i.points}`),
      taira10: taira10.items
        .filter((i) => i.id.includes("winStreak"))
        .map((i) => `${i.label}:+${i.points}`),
    },
    null,
    2,
  ),
);
