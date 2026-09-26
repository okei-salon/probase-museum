/**
 * カストロ／佐藤輝明の20-20連続判定ロジック検証（同一WORLD）
 * npx tsx src/data/seasonAchievements/hrSbRepeat.smoke.ts
 */

import assert from "node:assert/strict";
import {
  computeRepeatLabel,
  peerYearsForAchievement,
  withRepeatLabels,
} from "./achievementRepeat";
import type { SeasonAchievement } from "./types";

const now = new Date().toISOString();

function hrSb(
  year: number,
  world: "BLUE" | "RED",
  playerId: string,
  name: string,
  hr: number,
  sb: number,
): SeasonAchievement {
  return {
    id: `auto:${world}:${year}:${playerId}:batter:hr_sb_combo`,
    season: year,
    world,
    playerId,
    playerName: name,
    teamShort: name === "カストロ" ? "日本ハム" : "阪神",
    role: "batter",
    category: "season",
    recordType: "hr_sb_combo",
    recordName: "20-20達成",
    value: hr,
    secondaryValue: sb,
    tertiaryValue: hr + sb,
    valueLabel: `${hr}本塁打・${sb}盗塁`,
    sopPoints: 5,
    source: "auto",
    createdAt: now,
    updatedAt: now,
  };
}

const CASTRO = "nipponham_43945152_6";
const SATO = "hanshin_41045153_8";

const poolBlue = [
  hrSb(2026, "BLUE", CASTRO, "カストロ", 22, 21),
  hrSb(2027, "BLUE", CASTRO, "カストロ", 23, 26),
  hrSb(2026, "BLUE", SATO, "佐藤輝明", 25, 20),
  hrSb(2027, "BLUE", SATO, "佐藤輝明", 28, 22),
  // RED は別WORLD（連続に含めない）
  hrSb(2026, "RED", CASTRO, "カストロ", 30, 30),
];

const current2027 = poolBlue.filter((a) => a.season === 2027 && a.world === "BLUE");
const labeled = withRepeatLabels(current2027, poolBlue);

const castro = labeled.find((a) => a.playerId === CASTRO)!;
const sato = labeled.find((a) => a.playerId === SATO)!;
assert.equal(castro.repeatLabel, "2年連続・2回目");
assert.equal(sato.repeatLabel, "2年連続・2回目");

// RED の2026は BLUE 連続に入らない
const peersCastro = peerYearsForAchievement(castro, poolBlue);
assert.deepEqual(peersCastro.sort(), [2026, 2027]);

const only2027 = computeRepeatLabel(castro, [2027]);
assert.equal(only2027, "初達成");

console.log("hrSbRepeat.smoke OK", {
  castro: castro.repeatLabel,
  sato: sato.repeatLabel,
  note: "本番の達成年は保存済み成績・偉業の hydrate 後に buildYearFeats が同じロジックで付与",
});
