/**
 * SOP 内訳の表示用ラベル（内部ID → 日本語）。
 */

import {
  BATTER_BASIC,
  BATTER_COMBOS,
  BATTER_HISTORIC,
  CONSECUTIVE_YEAR_BONUS,
  PITCHER_BASIC,
  PITCHER_COMBOS,
  PITCHER_HISTORIC,
} from "./rules";

const EXTRA_LABELS: Record<string, string> = {
  hrSbCombo: "本塁打×盗塁複合",
};

/** 基本／複合／大記録の達成IDを利用者向け日本語名へ */
export function sopAchievementLabelJa(id: string): string {
  if (EXTRA_LABELS[id]) return EXTRA_LABELS[id];
  if (id in BATTER_BASIC) {
    return BATTER_BASIC[id as keyof typeof BATTER_BASIC].label;
  }
  if (id in PITCHER_BASIC) {
    return PITCHER_BASIC[id as keyof typeof PITCHER_BASIC].label;
  }
  if (id in BATTER_COMBOS) {
    return BATTER_COMBOS[id as keyof typeof BATTER_COMBOS].label;
  }
  if (id in PITCHER_COMBOS) {
    return PITCHER_COMBOS[id as keyof typeof PITCHER_COMBOS].label;
  }
  if (id in BATTER_HISTORIC) {
    return BATTER_HISTORIC[id as keyof typeof BATTER_HISTORIC].label;
  }
  if (id in PITCHER_HISTORIC) {
    return PITCHER_HISTORIC[id as keyof typeof PITCHER_HISTORIC].label;
  }
  return id;
}

/** 連続年ボーナスの内訳ラベル（例: 得点圏打率.300以上・2年連続 +2点） */
export function consecutiveYearBonusLineLabel(
  achievementId: string,
  kind: "basic" | "combo",
): string {
  const points =
    kind === "combo"
      ? CONSECUTIVE_YEAR_BONUS.combo
      : CONSECUTIVE_YEAR_BONUS.basic;
  const name = sopAchievementLabelJa(achievementId);
  return `${name}・2年連続 +${points}点`;
}
