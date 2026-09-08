/**
 * 連続系記録の「記録・偉業表示」用ヘルパー。
 * SOP加点ロジックとは独立（表示はリーグ最高のみ、SOPは別経路）。
 */

import { npbTeams } from "@/data/teams";
import type { SeasonAchievement } from "./types";

/** 記録・偉業画面でリーグ最高のみ残す連続系 */
export const FEATS_DISPLAY_STREAK_TYPES = new Set([
  "hit_streak",
  "on_base_streak",
  "hr_streak",
  "pa_hr_streak",
  "ab_hit_streak",
]);

export function leagueSideFromTeamShort(
  teamShort: string,
): "central" | "pacific" {
  const t = npbTeams.find((x) => x.short === teamShort);
  return t?.league === "パ" ? "pacific" : "central";
}

/**
 * 連続系5種について、年度×WORLD×リーグ×項目ごとの最高値（同率含む）だけ残す。
 * その他カテゴリはそのまま。
 */
export function filterStreaksToLeagueLeaders(
  items: SeasonAchievement[],
): SeasonAchievement[] {
  const kept: SeasonAchievement[] = [];
  const streaks: SeasonAchievement[] = [];

  for (const item of items) {
    if (
      item.category === "streak" &&
      FEATS_DISPLAY_STREAK_TYPES.has(item.recordType)
    ) {
      streaks.push(item);
    } else {
      kept.push(item);
    }
  }

  const groups = new Map<string, SeasonAchievement[]>();
  for (const s of streaks) {
    const league = leagueSideFromTeamShort(s.teamShort);
    const key = `${s.world ?? ""}:${s.season}:${league}:${s.recordType}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    let max = -Infinity;
    for (const s of list) {
      const v = s.value;
      if (v != null && Number.isFinite(v) && v > max) max = v;
    }
    if (!Number.isFinite(max) || max < 0) continue;
    for (const s of list) {
      if (s.value === max) kept.push(s);
    }
  }

  return kept;
}
