/**
 * ポストシーズン結果ストア（CS + 日本シリーズ）。
 * Step12: 正式 WORLD のみ world を付与。レガシー／DEMO の既存静的データは触らない。
 */

import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  identityFromWorldYear,
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import type { PostseasonSeason } from "./types";
import { placeholderSeason } from "./catalog";

const STORAGE_KEY = "probase-museum.postseason.v1";

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

function normalizeRecord(r: PostseasonSeason): PostseasonSeason {
  const world = normalizeSeasonWorld(r.world);
  const year = String(r.year);
  return {
    ...r,
    year,
    world,
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

export function listStoredPostseason(): PostseasonSeason[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PostseasonSeason[];
    return excludeDemoRecords(
      Array.isArray(parsed) ? parsed.map(normalizeRecord) : [],
    );
  } catch {
    return [];
  }
}

function writeAll(list: PostseasonSeason[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
  const list = listStoredPostseason();
  const existing = list.find((r) => r.id === id) ?? null;

  const base = placeholderSeason(year, world);
  const record: PostseasonSeason = normalizeRecord({
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
  writeAll(list);
  return record;
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
