import type {
  ImportHistoryEntry,
  SavedMonthlyMvpRecord,
} from "@/data/import/types";
import { monthlyMvpRecordKey } from "@/data/import/types";
import type { LeagueSide } from "@/data/awards";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";

const RECORDS_KEY = "probase-museum.import.monthly-mvp.v1";
const HISTORY_KEY = "probase-museum.import.history.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeRecord(r: SavedMonthlyMvpRecord): SavedMonthlyMvpRecord {
  return {
    ...r,
    world: normalizeSeasonWorld(r.world),
  };
}

export function listSavedMonthlyMvpRecords(): SavedMonthlyMvpRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMonthlyMvpRecord[];
    return excludeDemoRecords(
      Array.isArray(parsed) ? parsed.map(normalizeRecord) : [],
    );
  } catch {
    return [];
  }
}

/** シーズン画面用: world + year で厳密フィルタ */
export function listSavedMonthlyMvpForSeason(
  identity: SeasonIdentity,
): SavedMonthlyMvpRecord[] {
  return listSavedMonthlyMvpRecords().filter((r) => matchSeason(r, identity));
}

export function getSavedMonthlyMvpRecord(
  year: number,
  month: number,
  league: LeagueSide,
  world?: SeasonWorld | null,
): SavedMonthlyMvpRecord | null {
  const key = monthlyMvpRecordKey(year, month, league, world);
  const list = listSavedMonthlyMvpRecords();
  return (
    list.find((r) => r.id === key) ??
    list.find(
      (r) =>
        r.year === year &&
        r.month === month &&
        r.league === league &&
        normalizeSeasonWorld(r.world) === normalizeSeasonWorld(world),
    ) ??
    null
  );
}

export function upsertSavedMonthlyMvpRecord(
  record: SavedMonthlyMvpRecord,
): SavedMonthlyMvpRecord {
  const world = normalizeSeasonWorld(record.world);
  const id = monthlyMvpRecordKey(
    record.year,
    record.month,
    record.league,
    world,
  );
  const next: SavedMonthlyMvpRecord = { ...record, id, world };
  const list = listSavedMonthlyMvpRecords();
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(list));
  return next;
}

export function listImportHistory(): ImportHistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImportHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendImportHistory(entry: ImportHistoryEntry): void {
  if (!canUseStorage()) return;
  const list = [entry, ...listImportHistory()].slice(0, 200);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}
