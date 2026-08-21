/**
 * ポストシーズン結果ストア（CS + 日本シリーズ）。
 * Step12: 正式 WORLD のみ world を付与。レガシー／DEMO の既存静的データは触らない。
 * localStorage + museum_documents(collection=postseason) 同期。
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
import type { PostseasonSeason } from "./types";
import { placeholderSeason } from "./catalog";

const STORAGE_KEY = "probase-museum.postseason.v1";
const COLLECTION = "postseason";

/** クラウド同期用: id 必須・year はローカルでは string */
type PostseasonSyncRecord = PostseasonSeason & {
  id: string;
  updatedAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

/**
 * ポストシーズンの upsert / 取得用 ID。
 * world がある正式データのみ ID に WORLD を含める。
 */
export function postseasonRecordId(
  year: number | string,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  const y = Number(year);
  if (w) return `${w}:${y}`;
  return String(y);
}

function normalizeRecord(r: PostseasonSeason): PostseasonSyncRecord {
  const world = normalizeSeasonWorld(r.world);
  const year = String(r.year);
  const id = r.id || postseasonRecordId(year, world);
  const updatedAt = r.updatedAt || new Date(0).toISOString();
  return {
    ...r,
    id,
    year,
    world,
    updatedAt,
    japanSeries: {
      ...r.japanSeries,
      year,
      world,
      mvp: {
        ...r.japanSeries.mvp,
        year,
        world,
      },
    },
  };
}

function toCloudPayload(record: PostseasonSyncRecord) {
  return {
    ...record,
    /** DB インデックス用の数値 year（payload 内も Number） */
    year: Number(record.year),
  };
}

function readRawPostseason(): PostseasonSyncRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PostseasonSeason[];
    return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
  } catch {
    return [];
  }
}

function writeRawPostseason(list: PostseasonSyncRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listStoredPostseason(): PostseasonSeason[] {
  return excludeDemoRecords(readRawPostseason());
}

/** シーズン画面用: identity（world + year）で厳密取得 */
export function getStoredPostseasonForSeason(
  identity: SeasonIdentity,
): PostseasonSeason | null {
  return (
    listStoredPostseason().find((r) =>
      matchSeason(
        { year: Number(r.year), world: r.world },
        identity,
      ),
    ) ?? null
  );
}

export function upsertPostseasonSeason(
  input: Omit<PostseasonSeason, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: string;
  },
): PostseasonSeason {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const year = String(input.year);
  const id = input.id || postseasonRecordId(year, world);
  const list = readRawPostseason();
  const existing = list.find((r) => r.id === id) ?? null;

  const base = placeholderSeason(year, world);
  const record = normalizeRecord({
    ...base,
    ...input,
    id,
    year,
    world,
    central: input.central,
    pacific: input.pacific,
    japanSeries: {
      ...base.japanSeries,
      ...input.japanSeries,
      year,
      world,
      mvp: {
        ...base.japanSeries.mvp,
        ...input.japanSeries.mvp,
        year,
        world,
      },
    },
    source: input.source ?? "manual",
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  });

  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeRawPostseason(list);
  void putMuseumCollectionRecord(COLLECTION, toCloudPayload(record));
  return record;
}

export async function hydratePostseasonFromCloud(): Promise<PostseasonSeason[]> {
  if (!canUseStorage()) return [];
  return hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawPostseason,
    writeRaw: writeRawPostseason,
    normalize: (r) => normalizeRecord(r as PostseasonSeason),
    filterPublic: excludeDemoRecords,
    serializeForCloud: (r) => toCloudPayload(r),
  });
}

/** 保存済みポストシーズンから SeasonIdentity 一覧 */
export function listStoredPostseasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const r of listStoredPostseason()) {
    const identity = identityFromWorldYear(Number(r.year), r.world);
    map.set(identity.seasonKey, identity);
  }
  return [...map.values()];
}

export const POSTSEASON_STORAGE_KEY = STORAGE_KEY;
