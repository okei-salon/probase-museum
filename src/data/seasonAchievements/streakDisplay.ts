/**
 * 連続系・1試合最多奪三振の「記録・偉業表示」用ヘルパー。
 * SOP加点ロジックとは独立（表示はリーグ最高のみ、SOPは別経路）。
 */

import { npbTeams } from "@/data/teams";
import { sopPointsForRecordType } from "@/lib/import/achievementSopPoints";
import { BATTER_FEATS } from "@/lib/sop/rules";
import type { SeasonAchievement } from "./types";

/** 記録・偉業画面でリーグ最高のみ残す項目（連続5種＋1試合奪三振） */
export const FEATS_DISPLAY_STREAK_TYPES = new Set([
  "hit_streak",
  "on_base_streak",
  "hr_streak",
  "pa_hr_streak",
  "ab_hit_streak",
]);

/** リーグ1位ボーナス対象（表示絞り込み＋SOP +5） */
export const FEATS_LEAGUE_LEADER_TYPES = new Set([
  ...FEATS_DISPLAY_STREAK_TYPES,
  "game_so",
]);

const LEADER_BONUS = BATTER_FEATS.streakLeagueLeaderBonus.points;

/**
 * 球団短縮名／正式名からセ・パを判定。
 * 未知の表記は誤ってセに寄せないよう、可能な限り名前照合する。
 */
export function leagueSideFromTeamShort(
  teamShort: string,
): "central" | "pacific" {
  const s = (teamShort ?? "").trim();
  if (!s) return "central";

  const byShort = npbTeams.find((x) => x.short === s);
  if (byShort) return byShort.league === "パ" ? "pacific" : "central";

  const byName = npbTeams.find((x) => x.name === s);
  if (byName) return byName.league === "パ" ? "pacific" : "central";

  const byIncludes = npbTeams.find(
    (x) => s.includes(x.short) || x.name.includes(s) || s.includes(x.name),
  );
  if (byIncludes) return byIncludes.league === "パ" ? "pacific" : "central";

  return "central";
}

function isLeagueLeaderFeat(item: SeasonAchievement): boolean {
  if (!FEATS_LEAGUE_LEADER_TYPES.has(item.recordType)) return false;
  return item.category === "streak" || item.category === "single_game";
}

/** リーグ1位カードに載せる SOP 表示点（基準点＋リーグ1位ボーナス） */
export function leagueLeaderDisplaySopPoints(
  recordType: string,
  value: number | null | undefined,
): number {
  if (recordType === "pa_hr_streak" || recordType === "ab_hit_streak") {
    return LEADER_BONUS;
  }
  return sopPointsForRecordType(recordType, value) + LEADER_BONUS;
}

/**
 * YEAR×WORLD×リーグ×項目ごとの最高値（同率含む）だけ残す。
 * 対象外カテゴリはそのまま。
 */
export function filterStreaksToLeagueLeaders(
  items: SeasonAchievement[],
): SeasonAchievement[] {
  const kept: SeasonAchievement[] = [];
  const candidates: SeasonAchievement[] = [];

  for (const item of items) {
    if (isLeagueLeaderFeat(item)) {
      candidates.push(item);
    } else {
      kept.push(item);
    }
  }

  const groups = new Map<string, SeasonAchievement[]>();
  for (const s of candidates) {
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
    if (!Number.isFinite(max) || max < 1) continue;
    for (const s of list) {
      if (s.value !== max) continue;
      kept.push({
        ...s,
        sopPoints: leagueLeaderDisplaySopPoints(s.recordType, s.value),
      });
    }
  }

  return kept;
}

/** セ／パそれぞれの最高値（同率含む）の playerId 集合 */
export function pickLeagueLeaderPlayerIds(
  rows: Array<{
    playerId: string;
    league: "central" | "pacific";
    value: number;
  }>,
): Set<string> {
  const out = new Set<string>();
  for (const league of ["central", "pacific"] as const) {
    const list = rows.filter((r) => r.league === league);
    if (list.length === 0) continue;
    const max = Math.max(...list.map((r) => r.value));
    for (const r of list) {
      if (r.value === max) out.add(r.playerId);
    }
  }
  return out;
}
