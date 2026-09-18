/**
 * 本塁打＆盗塁の複合達成ラベル（表示用）。
 * 両方20以上のとき、それぞれを10単位で切り下げて「30-20達成」形式で返す。
 * SOP加点条件・ポイントは変更しない（表示名のみ）。
 */

/** @deprecated 等倍ティア用。表示は hrSbAchievementLabel を使う */
export type HrSbTier = 20 | 30 | 40 | 50;

/** @deprecated 表示は独立切り下げ（hrSbAchievementLabel）へ移行 */
export function hrSbTierFromCounts(
  hr: number,
  sb: number,
): HrSbTier | null {
  const n = Math.min(hr, sb);
  if (n >= 50) return 50;
  if (n >= 40) return 40;
  if (n >= 30) return 30;
  if (n >= 20) return 20;
  return null;
}

/**
 * 本塁打・盗塁がともに20以上のときのみラベルを返す。
 * displayHR = floor(hr/10)*10, displaySB = floor(sb/10)*10
 */
export function hrSbAchievementLabel(hr: number, sb: number): string | null {
  if (
    !Number.isFinite(hr) ||
    !Number.isFinite(sb) ||
    hr < 20 ||
    sb < 20
  ) {
    return null;
  }
  const displayHR = Math.floor(hr / 10) * 10;
  const displaySB = Math.floor(sb / 10) * 10;
  return `${displayHR}-${displaySB}達成`;
}
