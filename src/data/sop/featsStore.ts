/**
 * 旧SOP用 feats ストア（互換）。
 * 新規登録は seasonAchievements を優先。こちらはフォールバック読み取り用。
 * 既存データがある場合は Neon にも同期する（端末間で消えないようにする）。
 */

import {
  hydrateLocalArrayFromCloud,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";

const STORAGE_KEY = "probase-museum.sop-feats.v1";
const COLLECTION = "sop_feats";

export type SopFeatRecord = {
  id: string;
  playerId: string;
  playerName: string;
  year: number;
  role: "batter" | "pitcher";
  cycle?: boolean;
  hitStreak?: number | null;
  onBaseStreak?: number | null;
  hrStreak?: number | null;
  perfectGame?: boolean;
  noHitter?: boolean;
  scorelessIp?: number | null;
  gameSo?: number | null;
  winStreak?: number | null;
  updatedAt?: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeFeat(r: SopFeatRecord): SopFeatRecord {
  return {
    ...r,
    updatedAt: r.updatedAt ?? new Date(0).toISOString(),
  };
}

function readRaw(): SopFeatRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SopFeatRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeFeat) : [];
  } catch {
    return [];
  }
}

function writeRaw(list: SopFeatRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listSopFeats(): SopFeatRecord[] {
  return readRaw();
}

export function getSopFeat(
  playerId: string,
  year: number,
  role: "batter" | "pitcher",
): SopFeatRecord | null {
  return (
    listSopFeats().find(
      (f) => f.playerId === playerId && f.year === year && f.role === role,
    ) ?? null
  );
}

export function upsertSopFeat(record: SopFeatRecord): SopFeatRecord {
  const next = normalizeFeat({
    ...record,
    updatedAt: new Date().toISOString(),
  });
  const list = readRaw();
  const idx = list.findIndex((f) => f.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeRaw(list);
  void putMuseumCollectionRecord(COLLECTION, next);
  return next;
}

export async function hydrateSopFeatsFromCloud(): Promise<SopFeatRecord[]> {
  return hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw,
    writeRaw,
    normalize: normalizeFeat,
  });
}
