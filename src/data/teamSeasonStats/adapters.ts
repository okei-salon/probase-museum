import { getTeam, npbTeams, type TeamId } from "@/data/teams";
import type { TeamStatRow } from "@/data/seasonViews";
import type { SeasonIdentity } from "@/data/seasons";
import {
  listTeamSeasonStatsByYear,
  listTeamSeasonStatsForSeason,
} from "./store";
import type { TeamCompetition, TeamSeasonStatsRecord } from "./types";
import { outsToIpDisplay } from "@/lib/manualEntry/normalizeInput";

function leagueSide(teamId: TeamId): "central" | "pacific" {
  return getTeam(teamId)?.league === "パ" ? "pacific" : "central";
}

/** 正式レコード → 表用 values（ソート可能な数値） */
export function teamSeasonToBattingValues(
  record: TeamSeasonStatsRecord,
): Record<string, number> {
  const b = record.batting;
  if (!b) return {};
  const c = b.counting;
  const d = b.derived;
  return {
    avg: d.avg ?? -1,
    g: c.g,
    pa: c.pa,
    ab: c.ab,
    h: c.h,
    singles: c.singles,
    doubles: c.doubles,
    triples: c.triples,
    hr: c.hr,
    hrRate: d.hrRate ?? -1,
    tb: c.tb,
    slg: d.slg ?? -1,
    rbi: c.rbi,
    r: c.r,
    so: c.so,
    soRate: d.soRate ?? -1,
    bb: c.bb,
    hbp: c.hbp,
    sac: c.sac,
    sf: c.sf,
    gdp: c.gdp,
    gdpRate: d.gdpRate ?? -1,
    sba: c.sba,
    sb: c.sb,
    sbRate: d.sbRate ?? -1,
    obp: d.obp ?? -1,
    multiHit: c.multiHit,
    ops: d.ops ?? -1,
  };
}

export function teamSeasonToPitchingValues(
  record: TeamSeasonStatsRecord,
): Record<string, number> {
  const p = record.pitching;
  if (!p) return {};
  const c = p.counting;
  const d = p.derived;
  const screen = p.screenRates;
  return {
    era: d.era ?? screen?.era ?? -1,
    starterEra: d.starterEra ?? screen?.starterEra ?? -1,
    reliefEra: d.reliefEra ?? screen?.reliefEra ?? -1,
    ip: c.ipOuts,
    winPct: d.winPct ?? -1,
    w: c.w,
    l: c.l,
    sv: c.sv,
    hp: c.hp,
    hld: c.hld,
    g: c.g,
    sho: c.sho,
    cg: c.cg,
    so: c.so,
    soRate: d.soRate ?? -1,
    bb: c.bb,
    bbRate: d.bbRate ?? -1,
    starterEr: c.starterEr,
    reliefEr: c.reliefEr,
  };
}

export function recordsToBattingRows(
  records: TeamSeasonStatsRecord[],
): TeamStatRow[] {
  return records
    .filter((r) => r.batting)
    .map((r) => ({
      team: getTeam(r.teamId)?.short ?? r.teamName,
      league: leagueSide(r.teamId),
      values: teamSeasonToBattingValues(r),
    }));
}

export function recordsToPitchingRows(
  records: TeamSeasonStatsRecord[],
): TeamStatRow[] {
  return records
    .filter((r) => r.pitching)
    .map((r) => ({
      team: getTeam(r.teamId)?.short ?? r.teamName,
      league: leagueSide(r.teamId),
      values: teamSeasonToPitchingValues(r),
    }));
}

/**
 * 年度＋競技区分の正式データのみ返す（サンプルは混ぜない）。
 * seasonKey / identity 指定時は world+year で厳密フィルタ。
 */
export function getOfficialTeamBattingRows(
  year: number,
  competition: TeamCompetition = "regular",
  identity?: SeasonIdentity | null,
): TeamStatRow[] {
  const records = identity
    ? listTeamSeasonStatsForSeason(identity, competition)
    : listTeamSeasonStatsByYear(year, competition);
  return recordsToBattingRows(records);
}

export function getOfficialTeamPitchingRows(
  year: number,
  competition: TeamCompetition = "regular",
  identity?: SeasonIdentity | null,
): TeamStatRow[] {
  const records = identity
    ? listTeamSeasonStatsForSeason(identity, competition)
    : listTeamSeasonStatsByYear(year, competition);
  return recordsToPitchingRows(records);
}

export function emptyTeamSlots(): Array<{ teamId: TeamId; teamName: string }> {
  return npbTeams.map((t) => ({ teamId: t.id, teamName: t.name }));
}

export function ipOutsLabel(ipOuts: number): string {
  return outsToIpDisplay(ipOuts);
}
