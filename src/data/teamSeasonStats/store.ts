/**
 * チーム年度成績マスター（正式保存）
 *
 * Storage: localStorage `probase-museum.team-season-stats.v1`
 * + museum_documents(collection=team_season_stats) クラウド同期
 *
 * Key: 正式 `${world}:${year}:${teamId}:${competition}` /
 *      レガシー `${year}:${teamId}:${competition}`  (regular | interleague)
 *
 * batting / pitching 全項目を payload ごと永続化。
 */

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
  normalizeTeamPitchingCounting,
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
        normalizeTeamPitchingCounting(r.pitching.counting),
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

function isStrictlyNewer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta)) return false;
  if (!Number.isFinite(tb)) return true;
  return ta > tb;
}

function readRawTeamSeasonStats(): TeamSeasonStatsRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamSeasonStatsRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord);
  } catch {
    return [];
  }
}

function writeRawTeamSeasonStats(list: TeamSeasonStatsRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function writeRecord(record: TeamSeasonStatsRecord): void {
  const list = readRawTeamSeasonStats();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeRawTeamSeasonStats(list);
}

/** batting / pitching を非破壊 merge（null は相手側を採用） */
function mergeStatsRecords(
  local: TeamSeasonStatsRecord,
  cloud: TeamSeasonStatsRecord,
): TeamSeasonStatsRecord {
  const localNewer = isStrictlyNewer(local.updatedAt, cloud.updatedAt);
  const primary = localNewer ? local : cloud;
  const secondary = localNewer ? cloud : local;
  return normalizeRecord({
    ...primary,
    id: cloud.id || local.id,
    year: primary.year || secondary.year,
    world: normalizeSeasonWorld(primary.world ?? secondary.world),
    batting: primary.batting ?? secondary.batting,
    pitching: primary.pitching ?? secondary.pitching,
    createdAt: local.createdAt || cloud.createdAt,
    updatedAt: localNewer ? local.updatedAt : cloud.updatedAt,
    source: localNewer ? local.source : cloud.source,
  });
}

export function listTeamSeasonStats(): TeamSeasonStatsRecord[] {
  if (!canUseStorage()) return [];
  const normalized = readRawTeamSeasonStats();
  // 旧2パート ID の昇格結果のみ書き戻し（削除・WORLD付与はしない）
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TeamSeasonStatsRecord[];
      if (Array.isArray(parsed)) {
        const changed = normalized.some((n, i) => n.id !== parsed[i]?.id);
        if (changed) writeRawTeamSeasonStats(normalized);
      }
    }
  } catch {
    // ignore
  }
  return excludeDemoRecords(normalized);
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

async function pushStatsToCloud(
  record: TeamSeasonStatsRecord,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `/api/museum/team-season-stats/${encodeURIComponent(record.id)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { ok: false, error: data?.error ?? `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

/**
 * クラウド一覧を取得し local と merge。
 * - クラウドに無いローカル行 → アップロード（他端末共有）
 * - 同一 id: updatedAt + batting/pitching 非破壊 merge
 */
export async function hydrateTeamSeasonStatsFromCloud(): Promise<
  TeamSeasonStatsRecord[]
> {
  if (!canUseStorage()) return [];
  try {
    const res = await fetch("/api/museum/team-season-stats", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return listTeamSeasonStats();
    const data = (await res.json()) as {
      ok?: boolean;
      records?: TeamSeasonStatsRecord[];
    };
    if (!data.ok || !Array.isArray(data.records)) {
      return listTeamSeasonStats();
    }

    const localList = readRawTeamSeasonStats();
    const cloudList = data.records.map(normalizeRecord);
    const map = new Map<string, TeamSeasonStatsRecord>();
    const pendingPush: TeamSeasonStatsRecord[] = [];
    const cloudIds = new Set(cloudList.map((r) => r.id));

    for (const local of localList) {
      map.set(local.id, local);
    }
    for (const cloud of cloudList) {
      const local = map.get(cloud.id);
      if (!local) {
        map.set(cloud.id, cloud);
        continue;
      }
      const merged = mergeStatsRecords(local, cloud);
      map.set(cloud.id, merged);
      if (isStrictlyNewer(local.updatedAt, cloud.updatedAt)) {
        pendingPush.push(merged);
      }
    }
    for (const local of localList) {
      if (!cloudIds.has(local.id)) pendingPush.push(local);
    }

    const mergedList = [...map.values()];
    writeRawTeamSeasonStats(mergedList);

    if (pendingPush.length > 0) {
      void Promise.all(pendingPush.map((r) => pushStatsToCloud(r)));
    }

    return excludeDemoRecords(mergedList);
  } catch {
    return listTeamSeasonStats();
  }
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
  const list = readRawTeamSeasonStats();
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

  writeRecord(record);
  return record;
}

/**
 * 登録本線: local 保存 → クラウド PUT（打撃・投手全項目を含む完全レコード）。
 */
export async function upsertTeamSeasonStatsAsync(
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
): Promise<{
  record: TeamSeasonStatsRecord;
  cloud: { ok: boolean; error?: string };
}> {
  const record = upsertTeamSeasonStats(input);
  const cloud = await pushStatsToCloud(record);
  return { record, cloud };
}

export const TEAM_SEASON_STATS_STORAGE_KEY = STORAGE_KEY;
