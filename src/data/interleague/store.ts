/**
 * 交流戦結果ストア（順位・対戦表・優勝）。
 * Step13: 正式 WORLD のみ world を付与。既存静的ダミーは触らない。
 */

import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  identityFromWorldYear,
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import type { InterleagueSeasonRecord } from "./types";

const STORAGE_KEY = "probase-museum.interleague.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

/**
 * 交流戦の upsert / 取得用 ID。
 * world がある正式データのみ ID に WORLD を含める。
 */
export function interleagueRecordId(
  year: number | string,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  const y = Number(year);
  if (w) return `${w}:${y}`;
  return String(y);
}

function normalizeRecord(r: InterleagueSeasonRecord): InterleagueSeasonRecord {
  const world = normalizeSeasonWorld(r.world);
  return {
    ...r,
    world,
    standings: Array.isArray(r.standings) ? r.standings : [],
    matrix: r.matrix ?? { rowTeams: [], colTeams: [], cells: [] },
  };
}

export function listStoredInterleague(): InterleagueSeasonRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterleagueSeasonRecord[];
    return excludeDemoRecords(
      Array.isArray(parsed) ? parsed.map(normalizeRecord) : [],
    );
  } catch {
    return [];
  }
}

function writeAll(list: InterleagueSeasonRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getStoredInterleagueForSeason(
  identity: SeasonIdentity,
): InterleagueSeasonRecord | null {
  return (
    listStoredInterleague().find((r) => matchSeason(r, identity)) ?? null
  );
}

export function upsertInterleagueSeason(
  input: Omit<
    InterleagueSeasonRecord,
    "id" | "createdAt" | "updatedAt" | "world"
  > & {
    world?: SeasonWorld | null;
    id?: string;
    createdAt?: string;
  },
): InterleagueSeasonRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = input.id || interleagueRecordId(input.year, world);
  const list = listStoredInterleague();
  const existing = list.find((r) => r.id === id) ?? null;

  const record: InterleagueSeasonRecord = normalizeRecord({
    id,
    year: input.year,
    world,
    standings: input.standings,
    matrix: input.matrix,
    champion: input.champion ?? null,
    championTeamId: input.championTeamId ?? null,
    source: input.source,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  });

  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeAll(list);
  return record;
}

export function listStoredInterleagueIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const r of listStoredInterleague()) {
    const identity = identityFromWorldYear(r.year, r.world);
    map.set(identity.seasonKey, identity);
  }
  return [...map.values()];
}

export const INTERLEAGUE_STORAGE_KEY = STORAGE_KEY;
