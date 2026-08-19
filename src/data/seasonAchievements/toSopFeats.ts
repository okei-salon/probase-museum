/**
 * 記録・偉業 → SOP Ver.3 入力への変換。
 * 特殊・連続・1試合記録の単一ソースとして使う。
 */

import type { SopFeatsInput } from "@/lib/sop";
import type { SeasonAchievement } from "./types";

/**
 * 選手・年度・役割に紐づく達成から SopFeatsInput を構築。
 * 同じ recordType が複数ある場合は最大値／true を採用。
 */
export function achievementsToSopFeats(
  items: SeasonAchievement[],
): SopFeatsInput {
  const feats: SopFeatsInput = {};

  for (const a of items) {
    // デモは表示用。SOP計算に混ぜない（正式データと分離）
    if (a.source === "demo") continue;
    // シーズン偉業は成績からSOP側で再計算するためfeats入力には載せない
    if (a.category === "season") continue;
    if (a.category === "npb_record") continue;

    switch (a.recordType) {
      case "perfect_game":
        feats.perfectGame = true;
        break;
      case "no_hitter":
        feats.noHitter = true;
        break;
      case "cycle":
        feats.cycle = true;
        break;
      case "hit_streak":
        feats.hitStreak = Math.max(feats.hitStreak ?? 0, a.value ?? 0);
        break;
      case "on_base_streak":
        feats.onBaseStreak = Math.max(feats.onBaseStreak ?? 0, a.value ?? 0);
        break;
      case "hr_streak":
        feats.hrStreak = Math.max(feats.hrStreak ?? 0, a.value ?? 0);
        break;
      case "scoreless_ip":
        feats.scorelessIp = Math.max(feats.scorelessIp ?? 0, a.value ?? 0);
        break;
      case "win_streak":
        feats.winStreak = Math.max(feats.winStreak ?? 0, a.value ?? 0);
        break;
      case "game_so":
        feats.gameSo = Math.max(feats.gameSo ?? 0, a.value ?? 0);
        break;
      default:
        break;
    }
  }

  return feats;
}

/** 旧 SopFeatRecord 形式との互換マージ */
export function mergeSopFeats(
  primary: SopFeatsInput,
  fallback: SopFeatsInput,
): SopFeatsInput {
  const maxOr = (
    a: number | null | undefined,
    b: number | null | undefined,
  ): number | null => {
    if (a == null && b == null) return null;
    return Math.max(a ?? 0, b ?? 0);
  };
  return {
    cycle: Boolean(primary.cycle || fallback.cycle) || undefined,
    perfectGame:
      Boolean(primary.perfectGame || fallback.perfectGame) || undefined,
    noHitter: Boolean(primary.noHitter || fallback.noHitter) || undefined,
    hitStreak: maxOr(primary.hitStreak, fallback.hitStreak),
    onBaseStreak: maxOr(primary.onBaseStreak, fallback.onBaseStreak),
    hrStreak: maxOr(primary.hrStreak, fallback.hrStreak),
    scorelessIp: maxOr(primary.scorelessIp, fallback.scorelessIp),
    gameSo: maxOr(primary.gameSo, fallback.gameSo),
    winStreak: maxOr(primary.winStreak, fallback.winStreak),
  };
}
