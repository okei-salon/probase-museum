import { getTeam, npbTeams, type TeamId } from "@/data/teams";
import type { TeamStatRow } from "@/data/seasonViews";
import type { SeasonIdentity } from "@/data/seasons";
import {
  listTeamSeasonStatsByYear,
  listTeamSeasonStatsForSeason,
} from "./store";
import type { TeamCompetition, TeamSeasonStatsRecord } from "./types";
import {
  normalizeTeamBattingCounting,
  normalizeTeamPitchingCounting,
  totalEr,
} from "./compute";
import { outsToIpDisplay } from "@/lib/manualEntry/normalizeInput";

function leagueSide(teamId: TeamId): "central" | "pacific" {
  return getTeam(teamId)?.league === "パ" ? "pacific" : "central";
}

/** 未登録の表ソート用センチネル（表示は ---）。符号付き率差と衝突しない値 */
const MISSING = -999;

function nOrMissing(v: number | null | undefined): number {
  return v == null ? MISSING : v;
}

/** 正式レコード → 表用 values（ソート可能な数値） */
export function teamSeasonToBattingValues(
  record: TeamSeasonStatsRecord,
): Record<string, number> {
  const b = record.batting;
  if (!b) return {};
  const c = normalizeTeamBattingCounting(b.counting);
  const d = b.derived;
  const screen = b.screenRates;
  return {
    avg: d.avg ?? screen?.avg ?? MISSING,
    g: c.g,
    pa: c.pa,
    ab: c.ab,
    h: c.h,
    singles: c.singles,
    doubles: c.doubles,
    triples: c.triples,
    hr: c.hr,
    hrRate: d.hrRate ?? screen?.hrRate ?? MISSING,
    tb: c.tb,
    slg: d.slg ?? screen?.slg ?? MISSING,
    rbi: c.rbi,
    rispAvg: d.rispAvg ?? screen?.rispAvg ?? MISSING,
    rispAvgDiff: screen?.rispAvgDiff ?? MISSING,
    rispAb: nOrMissing(c.rispAb),
    rispH: nOrMissing(c.rispH),
    basesLoadedAvg: d.basesLoadedAvg ?? screen?.basesLoadedAvg ?? MISSING,
    basesLoadedAvgDiff: screen?.basesLoadedAvgDiff ?? MISSING,
    basesLoadedAb: nOrMissing(c.basesLoadedAb),
    basesLoadedH: nOrMissing(c.basesLoadedH),
    vsRhbAvg: d.vsRhbAvg ?? screen?.vsRhbAvg ?? MISSING,
    vsRhbAvgDiff: screen?.vsRhbAvgDiff ?? MISSING,
    vsRhbAb: nOrMissing(c.vsRhbAb),
    vsRhbH: nOrMissing(c.vsRhbH),
    vsLhbAvg: d.vsLhbAvg ?? screen?.vsLhbAvg ?? MISSING,
    vsLhbAvgDiff: screen?.vsLhbAvgDiff ?? MISSING,
    vsLhbAb: nOrMissing(c.vsLhbAb),
    vsLhbH: nOrMissing(c.vsLhbH),
    r: c.r,
    so: c.so,
    soRate: d.soRate ?? screen?.soRate ?? MISSING,
    bb: c.bb,
    hbp: c.hbp,
    sac: c.sac,
    sf: c.sf,
    gdp: c.gdp,
    gdpRate: d.gdpRate ?? screen?.gdpRate ?? MISSING,
    sba: c.sba,
    sb: c.sb,
    sbRate: d.sbRate ?? screen?.sbRate ?? MISSING,
    obp: d.obp ?? screen?.obp ?? MISSING,
    multiHit: c.multiHit,
    bip: nOrMissing(c.bip),
    ops: d.ops ?? screen?.ops ?? MISSING,
  };
}

export function teamSeasonToPitchingValues(
  record: TeamSeasonStatsRecord,
): Record<string, number> {
  const p = record.pitching;
  if (!p) return {};
  const c = normalizeTeamPitchingCounting(p.counting);
  const d = p.derived;
  const screen = p.screenRates;
  return {
    era: d.era ?? screen?.era ?? MISSING,
    starterEra: d.starterEra ?? screen?.starterEra ?? MISSING,
    reliefEra: d.reliefEra ?? screen?.reliefEra ?? MISSING,
    ip: c.ipOuts,
    winPct: d.winPct ?? screen?.winPct ?? MISSING,
    w: c.w,
    l: c.l,
    sv: c.sv,
    hp: c.hp,
    hld: c.hld,
    g: c.g,
    sho: c.sho,
    cg: c.cg,
    so: c.so,
    soRate: d.soRate ?? screen?.soRate ?? MISSING,
    bb: c.bb,
    bbRate: d.bbRate ?? screen?.bbRate ?? MISSING,
    hbp: nOrMissing(c.hbp),
    hbpRate: d.hbpRate ?? screen?.hbpRate ?? MISSING,
    bf: nOrMissing(c.bf),
    abAgainst: nOrMissing(c.abAgainst),
    hitsAllowed: nOrMissing(c.hitsAllowed),
    avgAgainst: d.avgAgainst ?? screen?.avgAgainst ?? MISSING,
    rispAvg: screen?.rispAvg ?? MISSING,
    rispAvgDiff: screen?.rispAvgDiff ?? MISSING,
    rispH: nOrMissing(c.rispH),
    vsRhbAvg: screen?.vsRhbAvg ?? MISSING,
    vsRhbAvgDiff: screen?.vsRhbAvgDiff ?? MISSING,
    vsRhbH: nOrMissing(c.vsRhbH),
    vsLhbAvg: screen?.vsLhbAvg ?? MISSING,
    vsLhbAvgDiff: screen?.vsLhbAvgDiff ?? MISSING,
    vsLhbH: nOrMissing(c.vsLhbH),
    hrAllowed: nOrMissing(c.hrAllowed),
    hrRateAllowed: d.hrRateAllowed ?? screen?.hrRateAllowed ?? MISSING,
    sbaAgainst: nOrMissing(c.sbaAgainst),
    sbAllowed: nOrMissing(c.sbAllowed),
    sbRateAgainst: d.sbRateAgainst ?? screen?.sbRateAgainst ?? MISSING,
    wp: nOrMissing(c.wp),
    r: nOrMissing(c.r),
    er: totalEr(c),
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
