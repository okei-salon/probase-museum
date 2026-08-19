/**
 * 球団基本情報サマリー（既存データから導出）
 * Step14: SeasonIdentity 単位で集計（BLUE/RED を別シーズンとして数える）。
 */

import {
  getTeamPostseasonYearRecords,
  listPostseasonSeasonIdentities,
} from "@/data/postseason";
import { getSeasonSummary } from "@/data/seasonSummary";
import { getStandingsForSeason } from "@/data/teamStandings";
import { getTeam, type TeamId } from "@/data/teams";
import { formatWinPctDisplay } from "@/lib/manualEntry/normalizeInput";
import {
  buildTeamYearlyBoard,
  listRegisteredTeamSeasonIdentities,
} from "./seasonResults";
import { listPennantSeasonIdentities } from "@/data/playerSeasonLines";
import type { SeasonIdentity } from "@/data/seasons";

export type TeamProfileSummary = {
  teamId: TeamId;
  name: string;
  short: string;
  league: string;
  careerW: number | null;
  careerL: number | null;
  careerWinPct: number | null;
  careerWinPctText: string | null;
  leagueTitles: number | null;
  japanTitles: number | null;
  csAppearances: number | null;
  csAppearanceRate: number | null;
  csAppearanceRateText: string | null;
  seasonsTracked: number;
  bestRank: number | null;
  worstRank: number | null;
};

function isPlaceholderName(name: string) {
  return !name || name === "登録待ち" || name.includes("登録待ち");
}

function teamNameMatches(
  team: NonNullable<ReturnType<typeof getTeam>>,
  name: string,
) {
  return (
    name === team.short ||
    name === team.name ||
    name.includes(team.short)
  );
}

/** ポストシーズン集計用 identity（保存 + 静的 + ペナント登録シーズン） */
function listTeamPostseasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const identity of listPostseasonSeasonIdentities()) {
    map.set(identity.seasonKey, identity);
  }
  for (const identity of listPennantSeasonIdentities()) {
    if (!map.has(identity.seasonKey)) {
      map.set(identity.seasonKey, identity);
    }
  }
  for (const identity of listRegisteredTeamSeasonIdentities()) {
    if (!map.has(identity.seasonKey)) {
      map.set(identity.seasonKey, identity);
    }
  }
  return [...map.values()];
}

/** リーグ優勝回数（SeasonIdentity 単位。BLUE/RED を合算） */
export function countLeagueTitles(teamId: TeamId): number {
  const team = getTeam(teamId);
  if (!team) return 0;
  const leagueKey: "central" | "pacific" =
    team.league === "セ" ? "central" : "pacific";
  let n = 0;
  for (const identity of listRegisteredTeamSeasonIdentities()) {
    const summary = getSeasonSummary(String(identity.year), identity);
    const champ = summary.champions.find((c) => c.id === leagueKey);
    if (champ && !isPlaceholderName(champ.teamName)) {
      if (teamNameMatches(team, champ.teamName)) {
        n += 1;
        continue;
      }
    }
    // サマリー未登録時は最終順位1位をリーグ優勝とみなす（WORLD 厳密）
    const standings = getStandingsForSeason(identity);
    const top =
      leagueKey === "central"
        ? standings?.central?.[0]
        : standings?.pacific?.[0];
    if (top?.team && teamNameMatches(team, top.team)) {
      n += 1;
    }
  }
  return n;
}

/** 日本一回数（ポストシーズンの championId、SeasonIdentity 単位で合算） */
export function countJapanTitles(teamId: TeamId): number {
  let n = 0;
  for (const identity of listTeamPostseasonIdentities()) {
    const recs = getTeamPostseasonYearRecords(identity);
    if (recs.some((r) => r.teamId === teamId && r.japanSeriesChampion)) {
      n += 1;
    }
  }
  return n;
}

export function countCsAppearances(teamId: TeamId): number {
  let n = 0;
  for (const identity of listTeamPostseasonIdentities()) {
    const recs = getTeamPostseasonYearRecords(identity);
    if (recs.some((r) => r.teamId === teamId && r.reachedCs)) {
      n += 1;
    }
  }
  return n;
}

export function buildTeamProfileSummary(
  teamId: TeamId,
): TeamProfileSummary | null {
  const team = getTeam(teamId);
  if (!team) return null;

  const yearly = buildTeamYearlyBoard(teamId);
  /** この球団に成績がある SeasonIdentity 数（BLUE/RED は別） */
  const seasonsTracked = yearly.rows.length;
  const hasOwnSeasons = seasonsTracked > 0;

  const careerW = yearly.career?.w ?? null;
  const careerL = yearly.career?.l ?? null;
  const careerWinPct = yearly.career?.winPct ?? null;

  const ranks = yearly.rows
    .map((r) => r.rank)
    .filter((r): r is number => r != null);

  const csAppearances =
    seasonsTracked > 0 ? countCsAppearances(teamId) : null;
  const csRate =
    seasonsTracked > 0 && csAppearances != null
      ? csAppearances / seasonsTracked
      : null;

  return {
    teamId,
    name: team.name,
    short: team.short,
    league: team.league === "セ" ? "セ・リーグ" : "パ・リーグ",
    careerW: hasOwnSeasons ? careerW : null,
    careerL: hasOwnSeasons ? careerL : null,
    careerWinPct: hasOwnSeasons ? careerWinPct : null,
    careerWinPctText:
      hasOwnSeasons && careerWinPct != null
        ? formatWinPctDisplay(careerWinPct)
        : null,
    leagueTitles: seasonsTracked > 0 ? countLeagueTitles(teamId) : null,
    japanTitles: seasonsTracked > 0 ? countJapanTitles(teamId) : null,
    csAppearances,
    csAppearanceRate: csRate,
    csAppearanceRateText:
      csRate != null ? `${(csRate * 100).toFixed(1)}%` : null,
    seasonsTracked,
    bestRank: ranks.length ? Math.min(...ranks) : null,
    worstRank: ranks.length ? Math.max(...ranks) : null,
  };
}
