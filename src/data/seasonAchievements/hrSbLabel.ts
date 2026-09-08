/**
 * 本塁打＆盗塁の複合達成ラベル。
 * 両方の到達数の低い方で最高ティアを1つだけ返す。
 */

export type HrSbTier = 20 | 30 | 40 | 50;

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

export function hrSbAchievementLabel(hr: number, sb: number): string | null {
  const tier = hrSbTierFromCounts(hr, sb);
  return tier != null ? `${tier}-${tier}達成` : null;
}
