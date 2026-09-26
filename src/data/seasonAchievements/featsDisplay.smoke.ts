/**
 * NPB注釈・連続達成ラベルのスモーク
 * npx tsx src/data/seasonAchievements/featsDisplay.smoke.ts
 */

import assert from "node:assert/strict";
import { computeRepeatLabel } from "./achievementRepeat";
import { annotateNpbAchievements, npbBadgeLabel } from "./annotateNpb";
import type { SeasonAchievement } from "./types";

const now = new Date().toISOString();

function base(
  partial: Partial<SeasonAchievement> &
    Pick<SeasonAchievement, "id" | "playerId" | "playerName" | "recordType">,
): SeasonAchievement {
  return {
    season: 2027,
    world: "BLUE",
    teamShort: "—",
    role: "batter",
    category: "season",
    recordName: partial.recordName ?? partial.recordType,
    sopPoints: 0,
    source: "auto",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function main() {
  const kozono = annotateNpbAchievements([
    base({
      id: "d1",
      playerId: "hiroshima_01705138_5",
      playerName: "小園",
      teamShort: "広島",
      category: "npb_record",
      recordType: "season_doubles",
      recordName: "シーズン二塁打",
      value: 54,
      unit: "二塁打",
      valueLabel: "54二塁打",
    }),
  ])[0]!;
  assert.equal(npbBadgeLabel(kozono), "NPB新記録");
  assert.equal(kozono.npbCaption, "従来記録：52二塁打");
  assert.equal(kozono.isNpbUpdate, true);

  const yasuda = annotateNpbAchievements([
    base({
      id: "h1",
      playerId: "rakuten_43345155_55",
      playerName: "YG安田",
      teamShort: "日本ハム",
      category: "streak",
      recordType: "hr_streak",
      recordName: "連続試合本塁打",
      value: 8,
      unit: "試合",
      valueLabel: "8試合",
      sopPoints: 10,
    }),
  ])[0]!;
  assert.equal(npbBadgeLabel(yasuda), "NPB新記録");
  assert.equal(yasuda.npbCaption, "従来記録：7試合");
  assert.equal(yasuda.isNpbRecord, true);

  const santana = annotateNpbAchievements([
    base({
      id: "p1",
      playerId: "yakult_53755153_25",
      playerName: "サンタナ",
      teamShort: "ヤクルト",
      category: "npb_record",
      recordType: "pinch_hr",
      recordName: "シーズン代打本塁打",
      value: 7,
      unit: "本",
      valueLabel: "7本",
    }),
  ])[0]!;
  assert.equal(npbBadgeLabel(santana), "NPBタイ記録");
  assert.equal(santana.npbCaption, "歴代1位タイ");
  assert.equal(santana.isNpbUpdate, false);

  // 連続: 2026+2027
  const label = computeRepeatLabel(
    base({
      id: "c2027",
      season: 2027,
      playerId: "nipponham_43945152_6",
      playerName: "カストロ",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
    }),
    [2026, 2027],
  );
  assert.equal(label, "2年連続・2回目");

  const first = computeRepeatLabel(
    base({
      id: "x",
      season: 2027,
      playerId: "p",
      playerName: "初",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
    }),
    [2027],
  );
  assert.equal(first, "初達成");

  const nonConsec = computeRepeatLabel(
    base({
      id: "y",
      season: 2027,
      playerId: "p",
      playerName: "非連続",
      recordType: "hr_sb_combo",
      recordName: "20-20達成",
    }),
    [2024, 2027],
  );
  assert.equal(nonConsec, "通算2回目");

  // WORLDをまたがない: 同じ年ではなく peer に RED は含めない（呼び出し側の責任）
  // ここでは BLUE 年のみ渡す前提を確認
  assert.equal(
    computeRepeatLabel(
      base({
        id: "z",
        season: 2027,
        world: "BLUE",
        playerId: "p",
        playerName: "w",
        recordType: "hr_sb_combo",
        recordName: "20-20達成",
      }),
      [2027],
    ),
    "初達成",
  );

  console.log("featsDisplay.smoke OK", {
    kozono: npbBadgeLabel(kozono),
    yasuda: npbBadgeLabel(yasuda),
    santana: npbBadgeLabel(santana),
    castro: label,
  });
}

main();
