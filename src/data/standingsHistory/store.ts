/**
 * 月別順位推移ストア。
 * localStorage + museum_documents(collection=standings_history) 同期。
 * YEAR × WORLD × checkpoint で分離。
 */

import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import type { StandingEntry } from "@/data/teamStandings";
import type {
  StandingsCheckpoint,
  StandingsHistoryRecord,
} from "./types";
import { isStandingsCheckpoint } from "./types";

const STORAGE_KEY = "probase-museum.standings-history.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function standingsHistoryKey(
  year: number,
  checkpoint: StandingsCheckpoint,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  if (w) return `${w}:${year}:${checkpoint}`;
  return `${year}:${checkpoint}`;
}

function normalizeRecord(
  r: StandingsHistoryRecord,
): StandingsHistoryRecord | null {
  if (!isStandingsCheckpoint(r.checkpoint)) return null;
  const world = normalizeSeasonWorld(r.world);
  return {
    ...r,
    world,
    central: Array.isArray(r.central) ? r.central : [],
    pacific: Array.isArray(r.pacific) ? r.pacific : [],
  };
}

/** a が b より厳密に新しい（同刻は false → クラウド優先） */
function isStrictlyNewer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta)) return false;
  if (!Number.isFinite(tb)) return true;
  return ta > tb;
}

function readRawStandingsHistory(): StandingsHistoryRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StandingsHistoryRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecord)
      .filter((r): r is StandingsHistoryRecord => r != null);
  } catch {
    return [];
  }
}

function writeRawStandingsHistory(list: StandingsHistoryRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function writeRecord(record: StandingsHistoryRecord): void {
  const list = readRawStandingsHistory();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeRawStandingsHistory(list);
}

export function listStandingsHistory(): StandingsHistoryRecord[] {
  return excludeDemoRecords(readRawStandingsHistory());
}

export function getStandingsHistoryCheckpoint(
  year: number,
  checkpoint: StandingsCheckpoint,
  world?: SeasonWorld | null,
): StandingsHistoryRecord | null {
  const key = standingsHistoryKey(year, checkpoint, world);
  const list = listStandingsHistory();
  return (
    list.find((r) => r.id === key) ??
    list.find(
      (r) =>
        r.year === year &&
        r.checkpoint === checkpoint &&
        normalizeSeasonWorld(r.world) === normalizeSeasonWorld(world),
    ) ??
    null
  );
}

/** シーズン identity に一致する全時点（時系列順） */
export function listStandingsHistoryForSeason(
  identity: SeasonIdentity,
): StandingsHistoryRecord[] {
  const order = new Map(
    (
      [
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "final",
      ] as StandingsCheckpoint[]
    ).map((c, i) => [c, i]),
  );
  return listStandingsHistory()
    .filter((r) => matchSeason(r, identity))
    .sort(
      (a, b) =>
        (order.get(a.checkpoint) ?? 99) - (order.get(b.checkpoint) ?? 99),
    );
}

async function pushHistoryToCloud(
  record: StandingsHistoryRecord,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `/api/museum/standings-history/${encodeURIComponent(record.id)}`,
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
 * - クラウドに無いローカル行 → アップロード
 * - 同一 id: 新しい updatedAt を優先（同刻はクラウド）
 * 取得失敗時は local を消さない。
 */
export async function hydrateStandingsHistoryFromCloud(): Promise<
  StandingsHistoryRecord[]
> {
  if (!canUseStorage()) return [];
  try {
    const res = await fetch("/api/museum/standings-history", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return listStandingsHistory();
    const data = (await res.json()) as {
      ok?: boolean;
      records?: StandingsHistoryRecord[];
    };
    if (!data.ok || !Array.isArray(data.records)) {
      return listStandingsHistory();
    }

    const localList = readRawStandingsHistory();
    const cloudList = data.records
      .map(normalizeRecord)
      .filter((r): r is StandingsHistoryRecord => r != null);
    const map = new Map<string, StandingsHistoryRecord>();
    const pendingPush: StandingsHistoryRecord[] = [];
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
      if (isStrictlyNewer(local.updatedAt, cloud.updatedAt)) {
        pendingPush.push(local);
      } else {
        // 片リーグしか無い場合は非空側を残す
        map.set(cloud.id, {
          ...cloud,
          central:
            cloud.central.length > 0 ? cloud.central : local.central,
          pacific:
            cloud.pacific.length > 0 ? cloud.pacific : local.pacific,
          createdAt: local.createdAt || cloud.createdAt,
        });
      }
    }
    for (const local of localList) {
      if (!cloudIds.has(local.id)) pendingPush.push(local);
    }

    const merged = [...map.values()];
    writeRawStandingsHistory(merged);

    if (pendingPush.length > 0) {
      void Promise.all(pendingPush.map((r) => pushHistoryToCloud(r)));
    }

    return excludeDemoRecords(merged);
  } catch {
    return listStandingsHistory();
  }
}

/**
 * local のみ upsert。クラウド同期は upsertStandingsHistoryAsync を使うこと。
 */
export function upsertStandingsHistory(
  input: {
    year: number;
    world?: SeasonWorld | null;
    checkpoint: StandingsCheckpoint;
    /** 省略時は既存リーグを維持 */
    central?: StandingEntry[];
    pacific?: StandingEntry[];
    source?: StandingsHistoryRecord["source"];
    createdAt?: string;
  },
): StandingsHistoryRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = standingsHistoryKey(input.year, input.checkpoint, world);
  const list = readRawStandingsHistory();
  const existing = list.find((r) => r.id === id) ?? null;
  const record: StandingsHistoryRecord = {
    id,
    year: input.year,
    world,
    checkpoint: input.checkpoint,
    central:
      input.central !== undefined
        ? input.central
        : (existing?.central ?? []),
    pacific:
      input.pacific !== undefined
        ? input.pacific
        : (existing?.pacific ?? []),
    source: input.source ?? existing?.source ?? "manual",
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
  writeRecord(record);
  return record;
}

/**
 * 登録本線: local 保存 → クラウド PUT。
 * PUT 失敗でも local は残す。
 */
export async function upsertStandingsHistoryAsync(
  input: {
    year: number;
    world?: SeasonWorld | null;
    checkpoint: StandingsCheckpoint;
    central?: StandingEntry[];
    pacific?: StandingEntry[];
    source?: StandingsHistoryRecord["source"];
    createdAt?: string;
  },
): Promise<{
  record: StandingsHistoryRecord;
  cloud: { ok: boolean; error?: string };
}> {
  const record = upsertStandingsHistory(input);
  const cloud = await pushHistoryToCloud(record);
  return { record, cloud };
}

export const STANDINGS_HISTORY_STORAGE_KEY = STORAGE_KEY;
