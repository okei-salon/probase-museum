/**
 * 交流戦結果ストア（順位・対戦表・優勝）。
 * Step13: 正式 WORLD のみ world を付与。既存静的ダミーは触らない。
 * localStorage + museum_documents(collection=interleague) 同期。
 */

import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  identityFromWorldYear,
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  hydrateLocalArrayFromCloud,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";
import type {
  InterleagueMatrix,
  InterleagueSeasonRecord,
  InterleagueStandingEntry,
} from "./types";

const STORAGE_KEY = "probase-museum.interleague.v1";
const COLLECTION = "interleague";

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

function readRawInterleague(): InterleagueSeasonRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterleagueSeasonRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
  } catch {
    return [];
  }
}

function writeRawInterleague(list: InterleagueSeasonRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listStoredInterleague(): InterleagueSeasonRecord[] {
  return excludeDemoRecords(readRawInterleague());
}

export function getStoredInterleagueForSeason(
  identity: SeasonIdentity,
): InterleagueSeasonRecord | null {
  return (
    listStoredInterleague().find((r) => matchSeason(r, identity)) ?? null
  );
}

/**
 * 交流戦シーズン upsert。
 * standings / matrix を省略した場合は既存値を維持する（未編集パートを初期値で潰さない）。
 */
export function upsertInterleagueSeason(
  input: Omit<
    InterleagueSeasonRecord,
    "id" | "createdAt" | "updatedAt" | "world" | "standings" | "matrix"
  > & {
    world?: SeasonWorld | null;
    id?: string;
    createdAt?: string;
    standings?: InterleagueStandingEntry[];
    matrix?: InterleagueMatrix;
  },
): InterleagueSeasonRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = input.id || interleagueRecordId(input.year, world);
  const list = readRawInterleague();
  const existing = list.find((r) => r.id === id) ?? null;

  const record: InterleagueSeasonRecord = normalizeRecord({
    id,
    year: input.year,
    world,
    standings:
      input.standings !== undefined
        ? input.standings
        : (existing?.standings ?? []),
    matrix:
      input.matrix !== undefined
        ? input.matrix
        : (existing?.matrix ?? {
            rowTeams: [],
            colTeams: [],
            cells: [],
          }),
    champion: input.champion ?? existing?.champion ?? null,
    championTeamId: input.championTeamId ?? existing?.championTeamId ?? null,
    source: input.source,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  });

  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeRawInterleague(list);
  void putMuseumCollectionRecord(COLLECTION, record);
  return record;
}

export async function hydrateInterleagueFromCloud(): Promise<
  InterleagueSeasonRecord[]
> {
  if (!canUseStorage()) return [];
  return hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawInterleague,
    writeRaw: writeRawInterleague,
    normalize: normalizeRecord,
    filterPublic: excludeDemoRecords,
  });
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
