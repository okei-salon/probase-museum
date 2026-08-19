import type { TeamId } from "@/data/teams";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  buildTeamSeasonBatting,
  buildTeamSeasonPitching,
} from "./compute";
import type {
  TeamCompetition,
  TeamSeasonBatting,
  TeamSeasonPitching,
  TeamSeasonStatsRecord,
  TeamSeasonStatsSource,
} from "./types";
import { teamSeasonStatsKey } from "./types";

const STORAGE_KEY = "probase-museum.team-season-stats.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

type ParsedStatsId = {
  world: SeasonWorld | null;
  year: number;
  teamId: string;
  competition: TeamCompetition;
  /** 旧 `${year}:${teamId}`（competition なし） */
  legacyTwoPart: boolean;
};

function parseRecordId(id: string): ParsedStatsId | null {
  const parts = id.split(":");
  if (
    parts.length === 4 &&
    (parts[0] === "BLUE" || parts[0] === "RED")
  ) {
    const year = Number(parts[1]);
    const teamId = parts[2]!;
    const competition =
      parts[3] === "interleague" ? "interleague" : "regular";
    if (!Number.isFinite(year) || !teamId) return null;
    return {
      world: parts[0],
      year,
      teamId,
      competition,
      legacyTwoPart: false,
    };
  }
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const teamId = parts[1]!;
    const competition =
      parts[2] === "interleague" ? "interleague" : "regular";
    if (!Number.isFinite(year) || !teamId) return null;
    return {
      world: null,
      year,
      teamId,
      competition,
      legacyTwoPart: false,
    };
  }
  // 旧形式 `${year}:${teamId}` → regular
  if (parts.length === 2) {
    const year = Number(parts[0]);
    const teamId = parts[1]!;
    if (!Number.isFinite(year) || !teamId) return null;
    return {
      world: null,
      year,
      teamId,
      competition: "regular",
      legacyTwoPart: true,
    };
  }
  return null;
}

/**
 * 旧キーや欠けたフィールドを現行型へ寄せる。
 * - 2パート ID のみ competition 付きへ昇格（world は付けない）
 * - 既存 world 無し ID・正式 WORLD ID は再生成しない
 */
function normalizeRecord(r: TeamSeasonStatsRecord): TeamSeasonStatsRecord {
  const parsed = parseRecordId(r.id);
  const world =
    normalizeSeasonWorld(r.world) ?? parsed?.world ?? null;
  const competition: TeamCompetition =
    r.competition ?? parsed?.competition ?? "regular";
  const teamId = (r.teamId ?? parsed?.teamId) as TeamId;
  const year = r.year ?? parsed?.year ?? 0;

  let id = r.id;
  if (parsed?.legacyTwoPart) {
    id = teamSeasonStatsKey(year, teamId, competition, null);
  }

  const batting = r.batting
    ? buildTeamSeasonBatting(r.batting.counting, r.batting.screenRates)
    : null;
  const pitching = r.pitching
    ? buildTeamSeasonPitching(
        {
          ...r.pitching.counting,
          starterIpOuts: r.pitching.counting.starterIpOuts ?? null,
          reliefIpOuts: r.pitching.counting.reliefIpOuts ?? null,
          starterEr: r.pitching.counting.starterEr ?? 0,
          reliefEr: r.pitching.counting.reliefEr ?? 0,
          hld: r.pitching.counting.hld ?? 0,
          hp: r.pitching.counting.hp ?? 0,
        },
        r.pitching.screenRates,
      )
    : null;

  return {
    ...r,
    id,
    year,
    world,
    teamId,
    competition,
    batting,
    pitching,
  };
}

export function listTeamSeasonStats(): TeamSeasonStatsRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamSeasonStatsRecord[];
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeRecord);
    // 旧2パート ID の昇格結果のみ書き戻し（削除・WORLD付与はしない）
    const changed = normalized.some((n, i) => n.id !== parsed[i]?.id);
    if (changed) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // ignore
      }
    }
    return excludeDemoRecords(normalized);
  } catch {
    return [];
  }
}

/**
 * シーズン画面用: identity（world + year）に一致する行のみ。
 */
export function listTeamSeasonStatsForSeason(
  identity: SeasonIdentity,
  competition: TeamCompetition = "regular",
): TeamSeasonStatsRecord[] {
  return listTeamSeasonStats().filter(
    (r) => matchSeason(r, identity) && r.competition === competition,
  );
}

export function getTeamSeasonStats(
  year: number,
  teamId: TeamId,
  competition: TeamCompetition = "regular",
  world?: SeasonWorld | null,
): TeamSeasonStatsRecord | null {
  const key = teamSeasonStatsKey(year, teamId, competition, world);
  return listTeamSeasonStats().find((r) => r.id === key) ?? null;
}

/**
 * カレンダー年＋競技での一覧（WORLD 横断）。
 * シーズン画面では listTeamSeasonStatsForSeason を使う。
 */
export function listTeamSeasonStatsByYear(
  year: number,
  competition: TeamCompetition = "regular",
): TeamSeasonStatsRecord[] {
  return listTeamSeasonStats().filter(
    (r) => r.year === year && r.competition === competition,
  );
}

/**
 * 球団別一覧（通算用）。BLUE / RED を別行のまま両方返す。
 */
export function listTeamSeasonStatsByTeam(
  teamId: TeamId,
  competition?: TeamCompetition,
): TeamSeasonStatsRecord[] {
  return listTeamSeasonStats()
    .filter(
      (r) =>
        r.teamId === teamId &&
        (competition == null || r.competition === competition),
    )
    .sort(
      (a, b) =>
        a.year - b.year ||
        String(a.world ?? "").localeCompare(String(b.world ?? "")) ||
        a.competition.localeCompare(b.competition),
    );
}

export function upsertTeamSeasonStats(
  input: {
    year: number;
    world?: SeasonWorld | null;
    teamId: TeamId;
    teamName: string;
    competition?: TeamCompetition;
    batting?: TeamSeasonBatting | null;
    pitching?: TeamSeasonPitching | null;
    source?: TeamSeasonStatsSource;
  },
): TeamSeasonStatsRecord {
  const now = new Date().toISOString();
  const competition = input.competition ?? "regular";
  const world = normalizeSeasonWorld(input.world);
  const id = teamSeasonStatsKey(input.year, input.teamId, competition, world);
  const list = listTeamSeasonStats();
  const existing = list.find((r) => r.id === id) ?? null;

  const batting =
    input.batting === undefined
      ? existing?.batting ?? null
      : input.batting
        ? buildTeamSeasonBatting(
            input.batting.counting,
            input.batting.screenRates,
          )
        : null;

  const pitching =
    input.pitching === undefined
      ? existing?.pitching ?? null
      : input.pitching
        ? buildTeamSeasonPitching(
            input.pitching.counting,
            input.pitching.screenRates,
          )
        : null;

  const record: TeamSeasonStatsRecord = {
    id,
    year: input.year,
    world,
    teamId: input.teamId,
    teamName: input.teamName,
    competition,
    batting,
    pitching,
    source: input.source ?? existing?.source ?? "manual",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return record;
}

export const TEAM_SEASON_STATS_STORAGE_KEY = STORAGE_KEY;
