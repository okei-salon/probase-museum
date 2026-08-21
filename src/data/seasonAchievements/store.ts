/**
 * 記録・偉業の手動／登録ストア。
 * 自動判定分は別途 detect で合成し、二重保存しない。
 * localStorage + museum_documents(collection=season_achievements) 同期。
 */

import type { SeasonAchievement } from "./types";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  hydrateLocalArrayFromCloud,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";

const STORAGE_KEY = "probase-museum.season-achievements.v1";
const COLLECTION = "season_achievements";

/** クラウド用: year インデックスを season から付与 */
type SeasonAchievementSyncRecord = SeasonAchievement & {
  year: number;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeAchievement(
  a: SeasonAchievement & { year?: number },
): SeasonAchievementSyncRecord {
  const season =
    typeof a.season === "number" && Number.isFinite(a.season)
      ? a.season
      : typeof a.year === "number" && Number.isFinite(a.year)
        ? a.year
        : 0;
  return {
    ...a,
    world: normalizeSeasonWorld(a.world),
    season,
    year: season,
  };
}

function readRawAchievements(): SeasonAchievementSyncRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SeasonAchievement[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAchievement);
  } catch {
    return [];
  }
}

function writeRawAchievements(list: SeasonAchievementSyncRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listStoredAchievements(): SeasonAchievement[] {
  return excludeDemoRecords(
    readRawAchievements().filter((a) => a.source !== "demo"),
  );
}

export function listStoredAchievementsForSeason(
  season: number,
): SeasonAchievement[] {
  return listStoredAchievements().filter((a) => a.season === season);
}

/** WORLD + year で厳密フィルタ（season フィールドを year として照合） */
export function listStoredAchievementsForSeasonIdentity(
  identity: SeasonIdentity,
): SeasonAchievement[] {
  return listStoredAchievements().filter((a) =>
    matchSeason({ year: a.season, season: a.season, world: a.world }, identity),
  );
}

export function upsertStoredAchievement(
  record: SeasonAchievement,
): SeasonAchievement {
  const world = normalizeSeasonWorld(record.world);
  const list = readRawAchievements();
  const next = normalizeAchievement({
    ...record,
    world,
    updatedAt: new Date().toISOString(),
  });
  const idx = list.findIndex((a) => a.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeRawAchievements(list);
  void putMuseumCollectionRecord(COLLECTION, next);
  return next;
}

export function removeStoredAchievement(id: string): void {
  const list = readRawAchievements().filter((a) => a.id !== id);
  writeRawAchievements(list);
}

export async function hydrateSeasonAchievementsFromCloud(): Promise<
  SeasonAchievement[]
> {
  if (!canUseStorage()) return [];
  return hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawAchievements,
    writeRaw: writeRawAchievements,
    normalize: normalizeAchievement,
    filterPublic: (list) =>
      excludeDemoRecords(list.filter((a) => a.source !== "demo")),
  });
}

/** 正式 WORLD 付き手動登録向け ID（既存レガシー ID は再生成しない） */
export function seasonAchievementId(params: {
  season: number;
  world?: SeasonWorld | null;
  playerId: string;
  recordType: string;
}): string {
  const w = normalizeSeasonWorld(params.world);
  const base = `${params.season}:${params.playerId}:${params.recordType}`;
  if (w) return `${w}:${base}`;
  return base;
}
