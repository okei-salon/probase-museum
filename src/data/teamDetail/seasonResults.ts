/**
 * 球団の年度成績（順位・勝敗）を teamSeasonStats / 最終順位から導出。
 * Step14: SeasonIdentity 単位（BLUE_2026 / RED_2026 を別行）。
 */

import { getTeam, npbTeams, type TeamId } from "@/data/teams";
import {
  listTeamSeasonStats,
  listTeamSeasonStatsByTeam,
  listTeamSeasonStatsForSeason,
  type TeamSeasonStatsRecord,
} from "@/data/teamSeasonStats";
import { getStandingsForSeason } from "@/data/teamStandings";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import { formatWinPctDisplay } from "@/lib/manualEntry/normalizeInput";

export type TeamYearResult = {
  year: number;
  /** 正式 WORLD。レガシー／DEMO は null */
  world?: SeasonWorld | null;
  seasonKey: string;
  /** 表示用: "2026 BLUE" / "2023" */
  seasonLabel: string;
  rank: number | null;
  w: number | null;
  l: number | null;
  /** 引分：最終順位表の正式値（無い場合 null） */
  t: number | null;
  winPct: number | null;
  winPctText: string | null;
  /** 打撃の得点 */
  runsScored: number | null;
  /** 投手成績の失点（counting.r） */
  runsAllowed: number | null;
};

export type TeamYearlyBoard = {
  rows: TeamYearResult[];
  career: TeamYearResult | null;
};

function winPctOf(w: number, l: number): number | null {
  const d = w + l;
  return d > 0 ? Math.round((w / d) * 1000) / 1000 : null;
}

function identityOfRecord(r: TeamSeasonStatsRecord): SeasonIdentity {
  return identityFromWorldYear(r.year, r.world);
}

function normalizeTeamLabel(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

/**
 * 同一 YEAR×WORLD の最終順位から引分を取得。
 * 他年度・他WORLD・DEMO からの補完はしない。
 */
function tiesFromStandings(
  identity: SeasonIdentity,
  teamId: TeamId,
): number | null {
  const team = getTeam(teamId);
  if (!team) return null;
  const standings = getStandingsForSeason(identity);
  if (!standings) return null;

  const rows =
    team.league === "セ" ? standings.central : standings.pacific;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const byId = rows.find((r) => r.teamId === teamId);
  if (byId && Number.isFinite(byId.d)) return byId.d;

  const short = normalizeTeamLabel(team.short);
  const name = normalizeTeamLabel(team.name);
  const byName = rows.find((r) => {
    const label = normalizeTeamLabel(r.team ?? "");
    if (!label) return false;
    return (
      label === short ||
      label === name ||
      label.includes(short) ||
      short.includes(label)
    );
  });
  if (byName && Number.isFinite(byName.d)) return byName.d;
  return null;
}

/** Museum に通常シーズン成績があるカレンダー年一覧（互換） */
export function listRegisteredTeamSeasonYears(): number[] {
  return [
    ...new Set(
      listTeamSeasonStats()
        .filter((r) => r.competition === "regular")
        .map((r) => r.year),
    ),
  ].sort((a, b) => a - b);
}

/** 通常シーズン成績がある SeasonIdentity 一覧（BLUE/RED を別シーズンとして数える） */
export function listRegisteredTeamSeasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const r of listTeamSeasonStats().filter(
    (x) => x.competition === "regular",
  )) {
    const identity = identityOfRecord(r);
    map.set(identity.seasonKey, identity);
  }
  return [...map.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

/**
 * 同リーグ内の勝率順位（同一 SeasonIdentity の登録チームのみ）。
 * BLUE / RED を混在させない。
 */
export function computeLeagueRankForSeason(
  identity: SeasonIdentity,
  teamId: TeamId,
): number | null {
  const team = getTeam(teamId);
  if (!team) return null;
  const league = team.league;

  const pool = listTeamSeasonStatsForSeason(identity, "regular")
    .filter((r) => getTeam(r.teamId)?.league === league && r.pitching)
    .map((r) => {
      const w = r.pitching!.counting.w;
      const l = r.pitching!.counting.l;
      return {
        teamId: r.teamId,
        winPct: winPctOf(w, l),
        w,
        l,
      };
    })
    .filter((r) => r.winPct != null);

  if (pool.length === 0) return null;
  if (!pool.some((p) => p.teamId === teamId)) return null;

  const sorted = [...pool].sort((a, b) => {
    if (b.winPct! !== a.winPct!) return b.winPct! - a.winPct!;
    if (b.w !== a.w) return b.w - a.w;
    return a.teamId.localeCompare(b.teamId);
  });

  let rank = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i]!.winPct !== sorted[i - 1]!.winPct) {
      rank = i + 1;
    }
    if (sorted[i]!.teamId === teamId) return rank;
  }
  return null;
}

/**
 * @deprecated year のみ。正式画面は computeLeagueRankForSeason を使う。
 * world 無しレガシーのみ対象（BLUE/RED を混ぜない）。
 */
export function computeLeagueRankForYear(
  year: number,
  teamId: TeamId,
): number | null {
  return computeLeagueRankForSeason(
    identityFromWorldYear(year, null),
    teamId,
  );
}

function yearResultForRecord(
  rec: TeamSeasonStatsRecord,
  teamId: TeamId,
): TeamYearResult | null {
  if (rec.teamId !== teamId) return null;
  if (!rec.pitching && !rec.batting) return null;

  const identity = identityOfRecord(rec);
  const w = rec.pitching?.counting.w ?? null;
  const l = rec.pitching?.counting.l ?? null;
  const winPct =
    w != null && l != null
      ? winPctOf(w, l)
      : (rec.pitching?.derived.winPct ?? null);
  const runsAllowedRaw = rec.pitching?.counting.r;
  const runsAllowed =
    runsAllowedRaw != null && Number.isFinite(runsAllowedRaw)
      ? runsAllowedRaw
      : null;

  return {
    year: identity.year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    seasonLabel: formatSeasonLineLabel(identity),
    rank: computeLeagueRankForSeason(identity, teamId),
    w,
    l,
    t: tiesFromStandings(identity, teamId),
    winPct,
    winPctText: winPct != null ? formatWinPctDisplay(winPct) : null,
    runsScored: rec.batting?.counting.r ?? null,
    runsAllowed,
  };
}

export function buildTeamYearlyBoard(teamId: TeamId): TeamYearlyBoard {
  const records = listTeamSeasonStatsByTeam(teamId, "regular").sort(
    (a, b) =>
      a.year - b.year ||
      String(normalizeSeasonWorld(a.world) ?? "").localeCompare(
        String(normalizeSeasonWorld(b.world) ?? ""),
      ),
  );

  const rows = records
    .map((r) => yearResultForRecord(r, teamId))
    .filter((r): r is TeamYearResult => r != null);

  if (rows.length === 0) {
    return { rows: [], career: null };
  }

  let wSum = 0;
  let lSum = 0;
  let tSum = 0;
  let rSum = 0;
  let raSum = 0;
  let hasW = false;
  let hasT = false;
  let hasR = false;
  let hasRa = false;
  for (const row of rows) {
    if (row.w != null && row.l != null) {
      wSum += row.w;
      lSum += row.l;
      hasW = true;
    }
    if (row.t != null) {
      tSum += row.t;
      hasT = true;
    }
    if (row.runsScored != null) {
      rSum += row.runsScored;
      hasR = true;
    }
    if (row.runsAllowed != null) {
      raSum += row.runsAllowed;
      hasRa = true;
    }
  }
  const winPct = hasW ? winPctOf(wSum, lSum) : null;

  return {
    rows,
    career: {
      year: 0,
      world: null,
      seasonKey: "career",
      seasonLabel: "通算",
      rank: null,
      w: hasW ? wSum : null,
      l: hasW ? lSum : null,
      t: hasT ? tSum : null,
      winPct,
      winPctText: winPct != null ? formatWinPctDisplay(winPct) : null,
      runsScored: hasR ? rSum : null,
      runsAllowed: hasRa ? raSum : null,
    },
  };
}

/** 全12球団の通算勝率など比較用（全 WORLD 合算） */
export function listAllTeamsCareerWinRecords(): {
  teamId: TeamId;
  w: number;
  l: number;
  winPct: number | null;
}[] {
  return npbTeams.map((t) => {
    const board = buildTeamYearlyBoard(t.id);
    const c = board.career;
    return {
      teamId: t.id,
      w: c?.w ?? 0,
      l: c?.l ?? 0,
      winPct: c?.winPct ?? null,
    };
  });
}
