/**
 * 対象期間のチーム試合数を解決する。
 * 順位表（勝+敗+分）→ チーム打撃の試合数 → シーズン内の最頻値。
 */

import {
  getStandingsForSeason,
  getYearStandings,
} from "@/data/teamStandings";
import {
  getStoredInterleagueForSeason,
  listStoredInterleague,
} from "@/data/interleague";
import {
  listTeamSeasonStatsByYear,
  listTeamSeasonStatsForSeason,
} from "@/data/teamSeasonStats";
import type { StatsScope } from "@/data/playerStats";
import {
  identityFromWorldYear,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import { npbTeams, type TeamId } from "@/data/teams";
import { normalizeSeasonWorld } from "@/data/seasons";

export function teamIdFromShortName(short: string): TeamId | null {
  const hit = npbTeams.find((t) => t.short === short || t.name === short);
  return hit?.id ?? null;
}

function gamesFromRecord(w: number, l: number, d: number): number {
  const g = (w ?? 0) + (l ?? 0) + (d ?? 0);
  return g > 0 ? g : 0;
}

function setGames(
  map: Map<TeamId, number>,
  teamId: TeamId | null | undefined,
  games: number,
) {
  if (!teamId || games <= 0) return;
  const prev = map.get(teamId);
  // より多い試合数を優先（途中経過より最終に近い値）
  if (prev == null || games > prev) map.set(teamId, games);
}

/**
 * シーズン内で最も多いチーム試合数（同数ならその値）。
 * 規定算出のフォールバック用。
 */
export function mostCommonTeamGames(map: Map<TeamId, number>): number | null {
  const values = [...map.values()].filter((g) => g > 0);
  if (values.length === 0) return null;
  const freq = new Map<number, number>();
  for (const g of values) freq.set(g, (freq.get(g) ?? 0) + 1);
  let bestG = values[0]!;
  let bestN = 0;
  for (const [g, n] of freq) {
    if (n > bestN || (n === bestN && g > bestG)) {
      bestG = g;
      bestN = n;
    }
  }
  return bestG;
}

export type TeamGamesContext = {
  /** 球団 ID → 試合数 */
  byTeamId: Map<TeamId, number>;
  /** データが無いときのシーズン代表試合数 */
  scheduleGames: number | null;
};

/**
 * pennant = 最終順位 + 通常シーズンチーム成績
 * interleague = 交流戦順位 + 交流戦チーム成績
 */
export function buildTeamGamesContext(input: {
  scope: StatsScope;
  identity?: SeasonIdentity | null;
  year?: number | null;
  world?: SeasonWorld | null;
}): TeamGamesContext {
  const byTeamId = new Map<TeamId, number>();
  const identity =
    input.identity ??
    (input.year != null
      ? identityFromWorldYear(input.year, input.world)
      : null);
  const year = identity?.year ?? input.year ?? null;
  const world = identity?.world ?? normalizeSeasonWorld(input.world);

  if (input.scope === "interleague") {
    const record = identity
      ? getStoredInterleagueForSeason(identity)
      : year != null
        ? listStoredInterleague().find(
            (r) =>
              r.year === year && normalizeSeasonWorld(r.world) === world,
          ) ?? null
        : null;
    if (record) {
      for (const e of record.standings) {
        const tid =
          e.teamId ?? teamIdFromShortName(e.team) ?? null;
        setGames(byTeamId, tid, gamesFromRecord(e.w, e.l, e.d));
      }
    }
    if (identity) {
      for (const r of listTeamSeasonStatsForSeason(identity, "interleague")) {
        const g = r.batting?.counting.g;
        if (g != null) setGames(byTeamId, r.teamId, g);
      }
    } else if (year != null) {
      for (const r of listTeamSeasonStatsByYear(year, "interleague")) {
        if (normalizeSeasonWorld(r.world) !== world) continue;
        const g = r.batting?.counting.g;
        if (g != null) setGames(byTeamId, r.teamId, g);
      }
    }
  } else {
    const standings = identity
      ? getStandingsForSeason(identity)
      : year != null
        ? getYearStandings(year, world)
        : null;
    if (standings) {
      for (const e of [...standings.central, ...standings.pacific]) {
        const tid =
          e.teamId ?? teamIdFromShortName(e.team) ?? null;
        setGames(byTeamId, tid, gamesFromRecord(e.w, e.l, e.d));
      }
    }
    if (identity) {
      for (const r of listTeamSeasonStatsForSeason(identity, "regular")) {
        const g = r.batting?.counting.g;
        if (g != null) setGames(byTeamId, r.teamId, g);
      }
    } else if (year != null) {
      for (const r of listTeamSeasonStatsByYear(year, "regular")) {
        if (normalizeSeasonWorld(r.world) !== world) continue;
        const g = r.batting?.counting.g;
        if (g != null) setGames(byTeamId, r.teamId, g);
      }
    }
  }

  return {
    byTeamId,
    scheduleGames: mostCommonTeamGames(byTeamId),
  };
}

/** 選手所属球団の試合数。無ければシーズン代表試合数。 */
export function resolveTeamGamesForPlayer(
  ctx: TeamGamesContext,
  teamId: TeamId | null | undefined,
): number | null {
  if (teamId) {
    const g = ctx.byTeamId.get(teamId);
    if (g != null && g > 0) return g;
  }
  return ctx.scheduleGames;
}
