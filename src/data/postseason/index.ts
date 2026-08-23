/**
 * ポストシーズン（CS + 日本シリーズ）
 * Step12: SeasonIdentity（BLUE_2026 / RED_2026）単位で分離。
 * - 静的カタログ（2023 等）は world 無しのまま維持
 * - 正式データは localStorage に WORLD 付きで保存
 * - 日本シリーズMVPは表彰レジストリを優先（重複実装しない）
 */

import { npbTeams, type TeamId } from "@/data/teams";
import {
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  listRegisteredAwardsForSeason,
  type RegisteredSeasonAward,
} from "@/data/sop/awardsRegistry";
import { postseasonByYear, placeholderSeason } from "./catalog";
import {
  getStoredPostseasonForSeason,
  listStoredPostseasonIdentities,
} from "./store";
import type {
  JapanSeriesMvpAward,
  PostseasonSeason,
  TeamPostseasonCareer,
  TeamPostseasonYearRecord,
} from "./types";

export type {
  JapanSeriesGameMark,
  JapanSeriesMvpAward,
  JapanSeriesResult,
  LeagueCsRecord,
  PostseasonSeason,
  SeriesGameScore,
  SeriesResult,
  TeamPostseasonCareer,
  TeamPostseasonYearRecord,
} from "./types";

export {
  emptySeries,
  placeholderMvp,
  placeholderSeason,
  postseasonByYear,
  series,
} from "./catalog";

export {
  POSTSEASON_STORAGE_KEY,
  getStoredPostseasonForSeason,
  hydratePostseasonFromCloud,
  listStoredPostseason,
  listStoredPostseasonIdentities,
  postseasonRecordId,
  upsertPostseasonSeason,
  upsertPostseasonSeasonAsync,
} from "./store";

function resolveIdentity(
  yearOrIdentity: string | number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "object" && yearOrIdentity != null) {
    return yearOrIdentity;
  }
  return identityFromWorldYear(Number(yearOrIdentity), null);
}

/**
 * ポストシーズン取得（SeasonIdentity 厳密）。
 * 1) localStorage の WORLD 分離レコード
 * 2) world 無し identity のみ静的カタログ（year キー）
 * 3) プレースホルダ
 *
 * 文字列／数値のみの呼び出しは world 無しレガシーとして扱う（BLUE/RED を混ぜない）。
 */
export function getPostseason(
  yearOrIdentity: string | number | SeasonIdentity,
): PostseasonSeason {
  const identity = resolveIdentity(yearOrIdentity);
  const yearStr = String(identity.year);

  const stored = getStoredPostseasonForSeason(identity);
  if (stored) return stored;

  // 静的カタログはレガシー／DEMO（world 無し）専用。正式 WORLD には流用しない
  if (identity.world == null) {
    const catalog = postseasonByYear[yearStr];
    if (catalog) {
      return {
        ...catalog,
        world: null,
        japanSeries: {
          ...catalog.japanSeries,
          world: null,
          mvp: { ...catalog.japanSeries.mvp, world: null },
        },
      };
    }
  }

  return placeholderSeason(yearStr, identity.world);
}

function awardToJapanSeriesMvp(
  a: RegisteredSeasonAward,
): JapanSeriesMvpAward {
  const team = a.teamShort
    ? npbTeams.find((t) => t.short === a.teamShort) ?? null
    : null;
  return {
    award: "japan-series-mvp",
    year: String(a.year),
    world: normalizeSeasonWorld(a.world),
    playerId: a.playerId,
    playerName: a.playerName,
    teamId: (team?.id as TeamId | undefined) ?? null,
    teamName: team?.name ?? a.teamShort ?? "登録待ち",
  };
}

/**
 * 日本シリーズMVP。
 * 1) 表彰レジストリ（WORLD 対応・Step9）
 * 2) ポストシーズンレコード内の mvp
 */
export function getJapanSeriesMvp(
  yearOrIdentity: string | number | SeasonIdentity,
): JapanSeriesMvpAward {
  const identity = resolveIdentity(yearOrIdentity);

  try {
    const registered = listRegisteredAwardsForSeason(identity).find(
      (a) => a.kind === "japanSeriesMvp",
    );
    if (registered) return awardToJapanSeriesMvp(registered);
  } catch {
    /* SSR / storage 未準備 */
  }

  const fromPs = getPostseason(identity).japanSeries.mvp;
  return {
    ...fromPs,
    world: normalizeSeasonWorld(fromPs.world ?? identity.world),
  };
}

/** 表示用: ポストシーズン結果にレジストリ MVP を上書きマージ */
export function getPostseasonView(
  yearOrIdentity: string | number | SeasonIdentity,
): PostseasonSeason {
  const identity = resolveIdentity(yearOrIdentity);
  const ps = getPostseason(identity);
  const mvp = getJapanSeriesMvp(identity);
  return {
    ...ps,
    world: normalizeSeasonWorld(ps.world ?? identity.world),
    japanSeries: {
      ...ps.japanSeries,
      world: normalizeSeasonWorld(ps.japanSeries.world ?? identity.world),
      mvp,
    },
  };
}

function addSeriesToTeam(
  map: Map<TeamId, TeamPostseasonYearRecord>,
  year: string,
  world: SeasonWorld | null,
  teamId: TeamId | null,
  patch: Partial<
    Omit<TeamPostseasonYearRecord, "year" | "teamId" | "world" | "wins" | "losses">
  > & { wins?: number; losses?: number },
) {
  if (!teamId) return;
  const cur =
    map.get(teamId) ??
    ({
      year,
      world,
      teamId,
      reachedCs: false,
      reachedCsFinal: false,
      reachedJapanSeries: false,
      japanSeriesChampion: false,
      wins: 0,
      losses: 0,
    } satisfies TeamPostseasonYearRecord);
  map.set(teamId, {
    ...cur,
    ...patch,
    world,
    reachedCs: cur.reachedCs || Boolean(patch.reachedCs),
    reachedCsFinal: cur.reachedCsFinal || Boolean(patch.reachedCsFinal),
    reachedJapanSeries:
      cur.reachedJapanSeries || Boolean(patch.reachedJapanSeries),
    japanSeriesChampion:
      cur.japanSeriesChampion || Boolean(patch.japanSeriesChampion),
    wins: cur.wins + (patch.wins ?? 0),
    losses: cur.losses + (patch.losses ?? 0),
  });
}

function ingestSeries(
  map: Map<TeamId, TeamPostseasonYearRecord>,
  year: string,
  world: SeasonWorld | null,
  m: PostseasonSeason["central"]["first"],
  flags: {
    a: Partial<
      Omit<TeamPostseasonYearRecord, "year" | "teamId" | "world" | "wins" | "losses">
    >;
    b: Partial<
      Omit<TeamPostseasonYearRecord, "year" | "teamId" | "world" | "wins" | "losses">
    >;
  },
) {
  addSeriesToTeam(map, year, world, m.teamAId, {
    ...flags.a,
    wins: m.winsA,
    losses: m.winsB,
  });
  addSeriesToTeam(map, year, world, m.teamBId, {
    ...flags.b,
    wins: m.winsB,
    losses: m.winsA,
  });
}

export function getTeamPostseasonYearRecords(
  yearOrIdentity: string | number | SeasonIdentity,
): TeamPostseasonYearRecord[] {
  const identity = resolveIdentity(yearOrIdentity);
  const year = String(identity.year);
  const world = identity.world;
  const ps = getPostseason(identity);
  const map = new Map<TeamId, TeamPostseasonYearRecord>();

  for (const path of [ps.central, ps.pacific]) {
    ingestSeries(map, year, world, path.first, {
      a: { reachedCs: true },
      b: { reachedCs: true },
    });
    ingestSeries(map, year, world, path.final, {
      a: { reachedCs: true, reachedCsFinal: true },
      b: { reachedCs: true, reachedCsFinal: true },
    });
  }

  const js = ps.japanSeries;
  addSeriesToTeam(map, year, world, js.teamLeftId, {
    reachedCs: true,
    reachedCsFinal: true,
    reachedJapanSeries: true,
    japanSeriesChampion: js.championId === js.teamLeftId,
    wins: js.winsLeft,
    losses: js.winsRight,
  });
  addSeriesToTeam(map, year, world, js.teamRightId, {
    reachedCs: true,
    reachedCsFinal: true,
    reachedJapanSeries: true,
    japanSeriesChampion: js.championId === js.teamRightId,
    wins: js.winsRight,
    losses: js.winsLeft,
  });

  return [...map.values()];
}

/**
 * ポストシーズン集計対象の SeasonIdentity。
 * 保存済み + 静的カタログ（world 無し）を合算。BLUE/RED は別シーズンとして両方残す。
 */
export function listPostseasonSeasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const identity of listStoredPostseasonIdentities()) {
    map.set(identity.seasonKey, identity);
  }
  for (const year of Object.keys(postseasonByYear)) {
    const identity = identityFromWorldYear(Number(year), null);
    if (!map.has(identity.seasonKey)) {
      map.set(identity.seasonKey, identity);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

export function getTeamPostseasonCareer(
  teamId: TeamId,
  yearsOrIdentities?: Array<string | number | SeasonIdentity>,
): TeamPostseasonCareer {
  const identities =
    yearsOrIdentities && yearsOrIdentities.length > 0
      ? yearsOrIdentities.map(resolveIdentity)
      : listPostseasonSeasonIdentities();

  const records = identities.flatMap((identity) =>
    getTeamPostseasonYearRecords(identity).filter((r) => r.teamId === teamId),
  );
  const seasonsTracked = identities.length;
  const csAppearances = records.filter((r) => r.reachedCs).length;
  const japanSeriesAppearances = records.filter(
    (r) => r.reachedJapanSeries,
  ).length;
  const japanSeriesTitles = records.filter((r) => r.japanSeriesChampion).length;
  const wins = records.reduce((s, r) => s + r.wins, 0);
  const losses = records.reduce((s, r) => s + r.losses, 0);
  const played = wins + losses;
  return {
    teamId,
    csAppearances,
    csAppearanceRate: seasonsTracked ? csAppearances / seasonsTracked : null,
    japanSeriesAppearances,
    japanSeriesAppearanceRate: seasonsTracked
      ? japanSeriesAppearances / seasonsTracked
      : null,
    japanSeriesTitles,
    wins,
    losses,
    winPct: played > 0 ? wins / played : null,
    seasonsTracked,
  };
}

export const postseasonLegacyItemIds = [
  "cs-central",
  "cs-pacific",
  "js-overview",
  "js-games",
  "js-review",
] as const;
