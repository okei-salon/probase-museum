/**
 * UI確認用デモデータ。
 * SHOW_SEASON_FEATS_DEMO を false にすると非表示になる。
 */

import type { SeasonAchievement } from "./types";

/** デモ表示スイッチ — 開発時のみ有効。本番ビルドでは常に非表示 */
export const SHOW_SEASON_FEATS_DEMO = true;

const isDev = process.env.NODE_ENV === "development";

const DEMO_AT = "2026-01-01T00:00:00.000Z";

export function getDemoAchievements(season: number): SeasonAchievement[] {
  if (!isDev || !SHOW_SEASON_FEATS_DEMO) return [];

  return [
    {
      id: `demo:${season}:perfect_game`,
      season,
      playerId: "demo-pitcher-murakami",
      playerName: "村上頌樹",
      teamShort: "阪神",
      role: "pitcher",
      category: "special",
      recordType: "perfect_game",
      recordName: "完全試合",
      valueLabel: "達成",
      sopPoints: 20,
      source: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
    {
      id: `demo:${season}:no_hitter`,
      season,
      playerId: "demo-pitcher-nohit",
      playerName: "サンプル投手",
      teamShort: "オリックス",
      role: "pitcher",
      category: "special",
      recordType: "no_hitter",
      recordName: "ノーヒットノーラン",
      valueLabel: "達成",
      sopPoints: 10,
      source: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
    {
      id: `demo:${season}:hit_streak`,
      season,
      playerId: "demo-batter-sato",
      playerName: "佐藤輝明",
      teamShort: "阪神",
      role: "batter",
      category: "streak",
      recordType: "hit_streak",
      recordName: "連続試合安打",
      value: 34,
      unit: "試合",
      valueLabel: "34試合",
      sopPoints: 10,
      npbBonusPoints: 10,
      isNpbRecord: true,
      isNpbUpdate: true,
      npbPreviousValue: 33,
      source: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
    {
      id: `demo:${season}:hr_sb`,
      season,
      playerId: "demo-batter-sato",
      playerName: "佐藤輝明",
      teamShort: "阪神",
      role: "batter",
      category: "season",
      recordType: "hr_sb_combo",
      recordName: "HR × SB",
      value: 30,
      secondaryValue: 42,
      tertiaryValue: 72,
      valueLabel: "30本塁打・42盗塁　合計72",
      sopPoints: 15,
      source: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
    {
      id: `demo:${season}:npb_hr`,
      season,
      playerId: "demo-batter-hr",
      playerName: "山田太郎",
      teamShort: "巨人",
      role: "batter",
      category: "npb_record",
      recordType: "npb_hr",
      recordName: "シーズン本塁打",
      value: 61,
      unit: "本",
      valueLabel: "シーズン61本塁打",
      sopPoints: 0,
      npbBonusPoints: 10,
      isNpbRecord: true,
      isNpbUpdate: true,
      npbPreviousValue: 60,
      source: "demo",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
  ];
}
