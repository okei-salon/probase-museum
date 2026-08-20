/**
 * 交流戦（順位・対戦表・優勝・MVP）
 * Step13: SeasonIdentity 単位で WORLD 分離。
 * チーム／個人成績は既存 team-season-stats / season-lines（competition/scope）を再利用。
 */

import type { StandingRow } from "@/components/views/StandingsTable";
import {
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  listRegisteredAwardsForSeason,
  type RegisteredSeasonAward,
} from "@/data/sop/awardsRegistry";
import { npbTeams, type TeamId } from "@/data/teams";
import {
  interleagueMatrix as staticMatrix,
  interleagueStandings as staticStandings,
} from "@/data/seasonViews";
import {
  getStoredInterleagueForSeason,
  listStoredInterleagueIdentities,
} from "./store";
import type {
  InterleagueMatrix,
  InterleagueSeasonRecord,
  InterleagueStandingEntry,
} from "./types";

export type {
  InterleagueMatrix,
  InterleagueSeasonRecord,
  InterleagueStandingEntry,
} from "./types";

export {
  INTERLEAGUE_STORAGE_KEY,
  getStoredInterleagueForSeason,
  interleagueRecordId,
  listStoredInterleague,
  listStoredInterleagueIdentities,
  upsertInterleagueSeason,
} from "./store";

export type InterleagueMvpAward = {
  award: "interleague-mvp";
  year: string;
  world?: SeasonIdentity["world"];
  playerId: string | null;
  playerName: string;
  teamId: TeamId | null;
  teamName: string;
};

export type InterleagueView = {
  year: string;
  world: SeasonIdentity["world"];
  official: boolean;
  standings: InterleagueStandingEntry[];
  matrix: InterleagueMatrix;
  champion: string;
  championTeamId: TeamId | null;
  mvp: InterleagueMvpAward;
};

function resolveIdentity(
  yearOrIdentity: string | number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "object" && yearOrIdentity != null) {
    return yearOrIdentity;
  }
  return identityFromWorldYear(Number(yearOrIdentity), null);
}

function placeholderMvp(
  year: string,
  world: SeasonIdentity["world"],
): InterleagueMvpAward {
  return {
    award: "interleague-mvp",
    year,
    world,
    playerId: null,
    playerName: "登録待ち",
    teamId: null,
    teamName: "登録待ち",
  };
}

function awardToInterleagueMvp(
  a: RegisteredSeasonAward,
): InterleagueMvpAward {
  const team = a.teamShort
    ? npbTeams.find((t) => t.short === a.teamShort) ?? null
    : null;
  return {
    award: "interleague-mvp",
    year: String(a.year),
    world: normalizeSeasonWorld(a.world),
    playerId: a.playerId,
    playerName: a.playerName,
    teamId: (team?.id as TeamId | undefined) ?? null,
    teamName: team?.name ?? a.teamShort ?? "登録待ち",
  };
}

/**
 * 交流戦MVP。表彰レジストリ（Step9）を優先。重複ストアは作らない。
 */
export function getInterleagueMvp(
  yearOrIdentity: string | number | SeasonIdentity,
): InterleagueMvpAward {
  const identity = resolveIdentity(yearOrIdentity);
  try {
    const registered = listRegisteredAwardsForSeason(identity).find(
      (a) => a.kind === "interleagueMvp",
    );
    if (registered) return awardToInterleagueMvp(registered);
  } catch {
    /* SSR */
  }
  return placeholderMvp(String(identity.year), identity.world);
}

function resolveChampion(
  record: InterleagueSeasonRecord | null,
): { name: string; teamId: TeamId | null } {
  if (record?.champion && record.champion !== "登録待ち") {
    return {
      name: record.champion,
      teamId: record.championTeamId ?? null,
    };
  }
  const top = record?.standings?.[0];
  if (top?.team) {
    return {
      name: top.team,
      teamId: top.teamId ?? null,
    };
  }
  return { name: "登録待ち", teamId: null };
}

/**
 * 保存済み交流戦を SeasonIdentity で厳密取得。
 * 未保存時は null（静的ダミーは getInterleagueView 側）。
 */
export function getInterleague(
  yearOrIdentity: string | number | SeasonIdentity,
): InterleagueSeasonRecord | null {
  const identity = resolveIdentity(yearOrIdentity);
  return getStoredInterleagueForSeason(identity);
}

/**
 * 表示用。保存があれば正式。
 * 正式 WORLD の未登録時は空（静的ダミーへフォールバックしない）。
 * DEMO／レガシーのみレイアウト用静的ダミーを返す。
 */
export function getInterleagueView(
  yearOrIdentity: string | number | SeasonIdentity,
): InterleagueView {
  const identity = resolveIdentity(yearOrIdentity);
  const yearStr = String(identity.year);
  const stored = getStoredInterleagueForSeason(identity);
  const mvp = getInterleagueMvp(identity);

  if (stored && stored.standings.length > 0) {
    const champ = resolveChampion(stored);
    return {
      year: yearStr,
      world: identity.world,
      official: true,
      standings: stored.standings,
      matrix: stored.matrix,
      champion: champ.name,
      championTeamId: champ.teamId,
      mvp,
    };
  }

  if (identity.world != null) {
    return {
      year: yearStr,
      world: identity.world,
      official: false,
      standings: [],
      matrix: { rowTeams: [], colTeams: [], cells: [] },
      champion: "登録待ち",
      championTeamId: null,
      mvp,
    };
  }

  return {
    year: yearStr,
    world: identity.world,
    official: false,
    standings: staticStandings as InterleagueStandingEntry[],
    matrix: {
      rowTeams: [...staticMatrix.rowTeams],
      colTeams: [...staticMatrix.colTeams],
      cells: staticMatrix.cells.map((row) => [...row]),
    },
    champion: "登録待ち",
    championTeamId: null,
    mvp,
  };
}

/** 交流戦優勝球団名（正式保存時のみ実名、否则 登録待ち） */
export function getInterleagueChampion(
  yearOrIdentity: string | number | SeasonIdentity,
): string {
  const identity = resolveIdentity(yearOrIdentity);
  const stored = getStoredInterleagueForSeason(identity);
  if (!stored) return "登録待ち";
  return resolveChampion(stored).name;
}

export function listInterleagueSeasonIdentities(): SeasonIdentity[] {
  return listStoredInterleagueIdentities().sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

/** StandingRow 互換ヘルパ */
export function toStandingRows(
  entries: InterleagueStandingEntry[],
): StandingRow[] {
  return entries.map((e) => ({
    rank: e.rank,
    team: e.team,
    w: e.w,
    l: e.l,
    d: e.d,
    pct: e.pct,
    gb: e.gb,
  }));
}
