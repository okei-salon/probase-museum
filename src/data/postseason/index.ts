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
  listStoredPostseason,
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

function isPlaceholderTeamName(name: string | null | undefined): boolean {
  return !name || name === "登録待ち" || name.includes("登録待ち");
}

/** 表示名 / id から TeamId を解決（未登録・プレースホルダは null） */
function resolveTeamId(
  name: string | null | undefined,
  id: TeamId | null | undefined,
): TeamId | null {
  if (id && npbTeams.some((t) => t.id === id)) return id;
  if (isPlaceholderTeamName(name)) return null;
  const token = String(name ?? "").trim();
  if (!token) return null;
  const hit =
    npbTeams.find((t) => t.short === token) ??
    npbTeams.find((t) => t.name === token) ??
    npbTeams.find((t) => t.id === token);
  return (hit?.id as TeamId | undefined) ?? null;
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

function isRealSeries(m: PostseasonSeason["central"]["first"]): boolean {
  const aId = resolveTeamId(m.teamA, m.teamAId);
  const bId = resolveTeamId(m.teamB, m.teamBId);
  return aId != null || bId != null;
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
  if (!isRealSeries(m)) return;
  addSeriesToTeam(map, year, world, resolveTeamId(m.teamA, m.teamAId), {
    ...flags.a,
    wins: m.winsA,
    losses: m.winsB,
  });
  addSeriesToTeam(map, year, world, resolveTeamId(m.teamB, m.teamBId), {
    ...flags.b,
    wins: m.winsB,
    losses: m.winsA,
  });
}

/**
 * 日本一判定。
 * - championId と出場チーム id の一致
 * - または champion 表示名と出場チーム名の一致
 * - プレースホルダ / id 同士の null===null は優勝にしない
 */
function isJapanSeriesChampionForSide(
  js: PostseasonSeason["japanSeries"],
  side: "left" | "right",
): boolean {
  if (isPlaceholderTeamName(js.champion) && !js.championId) return false;

  const sideName = side === "left" ? js.teamLeft : js.teamRight;
  const sideId = resolveTeamId(
    sideName,
    side === "left" ? js.teamLeftId : js.teamRightId,
  );
  if (!sideId) return false;

  const championId = resolveTeamId(js.champion, js.championId);
  if (championId) return championId === sideId;

  if (isPlaceholderTeamName(js.champion)) return false;
  return (
    js.champion === sideName ||
    js.champion === npbTeams.find((t) => t.id === sideId)?.short ||
    js.champion === npbTeams.find((t) => t.id === sideId)?.name
  );
}

/**
 * 1 SeasonIdentity あたりのチーム別ポストシーズン実績。
 * CS進出は first/final の実出場のみ（同一 YEAR×WORLD で stage が複数でも1回）。
 * 日本シリーズ出場だけでは CS進出にしない。
 * 日本一は優勝チームのみ。
 */
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
  const leftId = resolveTeamId(js.teamLeft, js.teamLeftId);
  const rightId = resolveTeamId(js.teamRight, js.teamRightId);
  if (leftId || rightId) {
    addSeriesToTeam(map, year, world, leftId, {
      reachedJapanSeries: true,
      japanSeriesChampion: isJapanSeriesChampionForSide(js, "left"),
      wins: js.winsLeft,
      losses: js.winsRight,
    });
    addSeriesToTeam(map, year, world, rightId, {
      reachedJapanSeries: true,
      japanSeriesChampion: isJapanSeriesChampionForSide(js, "right"),
      wins: js.winsRight,
      losses: js.winsLeft,
    });
  }

  return [...map.values()];
}

/**
 * ポストシーズン集計対象の SeasonIdentity（画面・カタログ用）。
 * 保存済み + 静的カタログ（world 無し）を合算。BLUE/RED は別シーズンとして両方残す。
 * ※球団基本情報の通算（CS/日本一）では listStoredPostseasonIdentities を使うこと。
 *   静的サンプル（2023 阪神日本一など）を実成績に混ぜない。
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

/**
 * 球団通算用: 保存済みポストシーズンのみ（静的カタログ除外）。
 * source=static の行が local に残っていても集計しない。
 */
export function listAggregatablePostseasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const r of listStoredPostseason()) {
    if (r.source === "static") continue;
    const identity = identityFromWorldYear(Number(r.year), r.world);
    map.set(identity.seasonKey, identity);
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
      : listAggregatablePostseasonIdentities();

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
