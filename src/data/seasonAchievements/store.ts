/**
 * 記録・偉業の手動／登録ストア。
 * 自動判定分は別途 detect で合成し、二重保存しない。
 * localStorage + museum_documents(collection=season_achievements) 同期。
 *
 * 修正・削除は必ず id 単位。Neon 失敗時は local を落とさない。
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
  deleteMuseumCollectionRecord,
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

function newUniqueSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 既存行の id を維持。欠落時のみ互換キーを付与（既存 id は再生成しない）。
 */
export function ensureAchievementRecordId(
  a: SeasonAchievement & { year?: number },
): string {
  if (typeof a.id === "string" && a.id.trim()) return a.id.trim();
  const season =
    typeof a.season === "number" && Number.isFinite(a.season)
      ? a.season
      : typeof a.year === "number" && Number.isFinite(a.year)
        ? a.year
        : 0;
  const base = seasonAchievementId({
    season,
    world: a.world,
    playerId: a.playerId || "unknown",
    recordType: a.recordType || "unknown",
  });
  const stamp = a.createdAt || a.updatedAt || newUniqueSuffix();
  return `${base}:auto:${stamp}`;
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
  const id = ensureAchievementRecordId({ ...a, season });
  return {
    ...a,
    id,
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

/**
 * id 欠落行へ付与した結果を local に書き戻す（内容の削除・再生成はしない）。
 */
function persistEnsuredIds(list: SeasonAchievementSyncRecord[]): void {
  if (!canUseStorage()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const before = raw ? (JSON.parse(raw) as SeasonAchievement[]) : [];
    if (!Array.isArray(before)) {
      writeRawAchievements(list);
      return;
    }
    const missing = before.some(
      (b) => !b || typeof b.id !== "string" || !b.id.trim(),
    );
    if (missing) writeRawAchievements(list);
  } catch {
    writeRawAchievements(list);
  }
}

export function listStoredAchievements(): SeasonAchievement[] {
  const list = readRawAchievements();
  persistEnsuredIds(list);
  return excludeDemoRecords(list.filter((a) => a.source !== "demo"));
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

export function getStoredAchievementById(
  id: string,
): SeasonAchievement | null {
  if (!id) return null;
  return listStoredAchievements().find((a) => a.id === id) ?? null;
}

/**
 * ローカル即時 upsert + クラウド fire-and-forget（従来互換）。
 * 管理UIの確定操作は upsertStoredAchievementAsync を使う。
 */
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

/**
 * Neon PUT 成功後に local を更新。失敗時は local を変えずエラーを返す。
 */
function isCloudUnavailable(error?: string): boolean {
  return (
    error === "database_not_configured" ||
    error === "http_503" ||
    error === "503"
  );
}

function writeLocalAchievement(next: SeasonAchievementSyncRecord): void {
  const list = readRawAchievements();
  const idx = list.findIndex((a) => a.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeRawAchievements(list);
}

export async function upsertStoredAchievementAsync(
  record: SeasonAchievement,
): Promise<
  | { ok: true; record: SeasonAchievement; cloudSynced: boolean }
  | { ok: false; error: string }
> {
  const world = normalizeSeasonWorld(record.world);
  const next = normalizeAchievement({
    ...record,
    world,
    updatedAt: new Date().toISOString(),
  });
  const cloud = await putMuseumCollectionRecord(COLLECTION, next);
  if (!cloud.ok) {
    if (isCloudUnavailable(cloud.error)) {
      writeLocalAchievement(next);
      return { ok: true, record: next, cloudSynced: false };
    }
    return {
      ok: false,
      error: cloud.error ?? "クラウドへの保存に失敗しました",
    };
  }
  writeLocalAchievement(next);
  return { ok: true, record: next, cloudSynced: true };
}

/**
 * 従来の同期削除（local のみ）。クラウド同期が必要な場合は
 * removeStoredAchievementAsync を使う。
 */
export function removeStoredAchievement(id: string): void {
  if (!id) return;
  const list = readRawAchievements().filter((a) => a.id !== id);
  writeRawAchievements(list);
}

/**
 * Neon DELETE 成功後にのみ local から除去。
 * 失敗時は画面・local を変えず、再読み込みで復活する不整合を防ぐ。
 */
export async function removeStoredAchievementAsync(
  id: string,
): Promise<
  { ok: true; cloudSynced: boolean } | { ok: false; error: string }
> {
  if (!id) return { ok: false, error: "id_required" };

  const cloud = await deleteMuseumCollectionRecord(COLLECTION, id);
  if (!cloud.ok) {
    if (isCloudUnavailable(cloud.error)) {
      const list = readRawAchievements().filter((a) => a.id !== id);
      writeRawAchievements(list);
      return { ok: true, cloudSynced: false };
    }
    return {
      ok: false,
      error: cloud.error ?? "クラウドからの削除に失敗しました",
    };
  }

  const list = readRawAchievements().filter((a) => a.id !== id);
  writeRawAchievements(list);
  return { ok: true, cloudSynced: true };
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
