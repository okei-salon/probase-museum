/**
 * 個人成績ストア。
 *
 * 正本: Neon (museum_documents / season_lines)
 * localStorage: 未同期 outbox（hydrate 成功後）。hydrate 前は従来どおり全件キャッシュ可。
 * 実行時メモリ: Neon+outbox のマージ結果（画面の同期読み取り用）
 *
 * 既存の未同期行は hydrate 時にアップロードしてからローカルを縮小する。削除・初期化はしない。
 */

import {
  computeBatterDerived,
  computePitcherDerived,
  normalizeBatterCounting,
  normalizePitcherCounting,
} from "@/lib/manualEntry/computeSeasonStats";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  identityFromWorldYear,
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  fetchMuseumCollectionRecords,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";
import {
  LocalStorageQuotaError,
  setLocalStorageJson,
} from "@/lib/museumStorage/localJson";
import type {
  BatterSeasonLine,
  PitcherSeasonLine,
  PlayerSeasonLine,
  SeasonLineRole,
  SeasonLineScope,
} from "./types";
import { seasonLineKey } from "./types";
import { mergeSeasonLinePreferOffense } from "./restoreEmptyBatterOffense";

const STORAGE_KEY = "probase-museum.season-lines.v1";
const COLLECTION = "season_lines";

/** オリジン全体 ~5MB のうち season-lines に使える現実的予算（他キーと共有） */
export const SEASON_LINES_LOCAL_BUDGET_BYTES = 2_000_000;

export { STORAGE_KEY as SEASON_LINES_STORAGE_KEY };

/** Neon hydrate 後の実行時キャッシュ（全件）。localStorage には載せていない。 */
let runtimeCache: PlayerSeasonLine[] | null = null;
/** true のとき localStorage は未同期 outbox のみを保持する */
let cloudHydrated = false;

function canUseStorage() {
  return typeof window !== "undefined";
}

function isStrictlyNewer(
  a: string | undefined,
  b: string | undefined,
): boolean {
  const ta = Date.parse(a ?? "");
  const tb = Date.parse(b ?? "");
  if (!Number.isFinite(ta)) return false;
  if (!Number.isFinite(tb)) return true;
  return ta > tb;
}

function normalizeLine(line: PlayerSeasonLine): PlayerSeasonLine {
  const world = normalizeSeasonWorld(line.world);
  const yearNum = Number(line.year);
  const base = {
    ...line,
    world,
    year: Number.isFinite(yearNum) ? yearNum : line.year,
  };

  if (base.role === "batter") {
    const counting = normalizeBatterCounting(base.counting);
    return {
      ...base,
      counting,
      derived: computeBatterDerived(counting),
    };
  }
  const counting = normalizePitcherCounting(base.counting);
  return {
    ...base,
    counting,
    derived: computePitcherDerived(counting),
  };
}

/**
 * localStorage には counting を残し derived は省略（読み込み時に再計算）。
 */
function toPersistableSeasonLine(
  line: PlayerSeasonLine,
): Record<string, unknown> {
  const { derived: _derived, ...rest } = line;
  return rest;
}

function persistSeasonLinesList(list: PlayerSeasonLine[]): void {
  if (!canUseStorage()) return;
  setLocalStorageJson(
    STORAGE_KEY,
    list.map((line) => toPersistableSeasonLine(line)),
  );
}

/** WORLD 表示順: BLUE → RED → レガシー（null） */
function worldSortRank(world: SeasonWorld | null | undefined): number {
  const w = normalizeSeasonWorld(world);
  if (w === "BLUE") return 0;
  if (w === "RED") return 1;
  return 2;
}

function compareSeasonLines(a: PlayerSeasonLine, b: PlayerSeasonLine): number {
  return (
    b.year - a.year ||
    worldSortRank(a.world) - worldSortRank(b.world) ||
    a.role.localeCompare(b.role) ||
    a.scope.localeCompare(b.scope)
  );
}

function readDiskSeasonLines(): PlayerSeasonLine[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayerSeasonLine[];
    if (!Array.isArray(parsed)) return [];
    const out: PlayerSeasonLine[] = [];
    for (const item of parsed) {
      try {
        out.push(normalizeLine(item));
      } catch {
        if (item && typeof item === "object" && "id" in item) {
          out.push(item as PlayerSeasonLine);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeRawSeasonLines(list: PlayerSeasonLine[]): void {
  persistSeasonLinesList(list);
}

function readEffectiveLines(): PlayerSeasonLine[] {
  if (runtimeCache) return runtimeCache;
  return readDiskSeasonLines();
}

/**
 * 既存行を削除せず、derived 省略形式へ書き直して容量を確保する。
 */
export function compactSeasonLinesLocalStorage(): {
  ok: boolean;
  bytesBefore: number;
  bytesAfter: number;
  error?: string;
} {
  if (!canUseStorage()) {
    return { ok: false, bytesBefore: 0, bytesAfter: 0, error: "no_window" };
  }
  const before = window.localStorage.getItem(STORAGE_KEY)?.length ?? 0;
  try {
    const list = readDiskSeasonLines();
    persistSeasonLinesList(list);
    const after = window.localStorage.getItem(STORAGE_KEY)?.length ?? 0;
    return { ok: true, bytesBefore: before, bytesAfter: after };
  } catch (e) {
    return {
      ok: false,
      bytesBefore: before,
      bytesAfter: before,
      error: e instanceof Error ? e.message : "compact_failed",
    };
  }
}

export function listSeasonLines(): PlayerSeasonLine[] {
  return excludeDemoRecords(readEffectiveLines());
}

export function listSeasonLinesForSeason(
  identity: SeasonIdentity,
): PlayerSeasonLine[] {
  return listSeasonLines()
    .filter((r) => matchSeason(r, identity))
    .sort(compareSeasonLines);
}

export function getSeasonLine(
  playerId: string,
  year: number,
  role: SeasonLineRole,
  scope: SeasonLineScope = "pennant",
  world?: SeasonWorld | null,
): PlayerSeasonLine | null {
  const key = seasonLineKey(playerId, year, role, scope, world);
  return listSeasonLines().find((r) => r.id === key) ?? null;
}

export function listSeasonLinesByPlayer(
  playerId: string,
): PlayerSeasonLine[] {
  return listSeasonLines()
    .filter((r) => r.playerId === playerId)
    .sort(compareSeasonLines);
}

function mergeRecordsIntoList(
  list: PlayerSeasonLine[],
  records: PlayerSeasonLine[],
): { list: PlayerSeasonLine[]; saved: PlayerSeasonLine[] } {
  const next = [...list];
  const saved: PlayerSeasonLine[] = [];
  const now = new Date().toISOString();
  for (const record of records) {
    const normalized = normalizeLine({
      ...record,
      updatedAt: record.updatedAt || now,
    });
    const idx = next.findIndex((r) => r.id === normalized.id);
    if (idx >= 0) next[idx] = normalized;
    else next.push(normalized);
    saved.push(normalized);
  }
  return { list: next, saved };
}

function writeSeasonLinesWithCompactRetry(list: PlayerSeasonLine[]): void {
  try {
    persistSeasonLinesList(list);
  } catch (e) {
    if (!(e instanceof LocalStorageQuotaError)) throw e;
    const compacted = compactSeasonLinesLocalStorage();
    if (!compacted.ok) throw e;
    persistSeasonLinesList(list);
  }
}

function upsertSeasonLineLocal(record: PlayerSeasonLine): PlayerSeasonLine {
  const current = readEffectiveLines();
  const { list: next, saved } = mergeRecordsIntoList(current, [record]);
  runtimeCache = next;

  if (cloudHydrated) {
    const outbox = mergeRecordsIntoList(readDiskSeasonLines(), saved).list;
    writeSeasonLinesWithCompactRetry(outbox);
  } else {
    writeSeasonLinesWithCompactRetry(next);
  }
  return saved[0]!;
}

/**
 * 一括 local upsert。
 * hydrate 後: メモリ全件更新 + localStorage は outbox のみ更新（setItem 1回）。
 * hydrate 前: 従来どおりディスク全件更新。
 */
export function upsertSeasonLinesLocalBatch(
  records: PlayerSeasonLine[],
): PlayerSeasonLine[] {
  if (records.length === 0) return [];
  const current = readEffectiveLines();
  const { list: next, saved } = mergeRecordsIntoList(current, records);
  runtimeCache = next;

  if (cloudHydrated) {
    const outbox = mergeRecordsIntoList(readDiskSeasonLines(), saved).list;
    writeSeasonLinesWithCompactRetry(outbox);
  } else {
    writeSeasonLinesWithCompactRetry(next);
  }
  return saved;
}

function removeSyncedFromOutbox(syncedIds: Set<string>): void {
  if (!cloudHydrated || syncedIds.size === 0) return;
  const outbox = readDiskSeasonLines().filter((r) => !syncedIds.has(r.id));
  try {
    writeSeasonLinesWithCompactRetry(outbox);
  } catch {
    // outbox 整理失敗でもメモリ上の成績は残す
  }
}

export function upsertSeasonLine(
  record: PlayerSeasonLine,
): PlayerSeasonLine {
  const normalized = upsertSeasonLineLocal(record);
  void putMuseumCollectionRecord(COLLECTION, normalized).then((cloud) => {
    if (cloud.ok) removeSyncedFromOutbox(new Set([normalized.id]));
  });
  return normalized;
}

export async function upsertSeasonLineAsync(
  record: PlayerSeasonLine,
): Promise<{
  record: PlayerSeasonLine;
  cloud: { ok: boolean; error?: string };
}> {
  const saved = upsertSeasonLineLocal(record);
  const cloud = await putMuseumCollectionRecord(COLLECTION, saved);
  if (cloud.ok) removeSyncedFromOutbox(new Set([saved.id]));
  return {
    record: saved,
    cloud: { ok: cloud.ok, error: cloud.error },
  };
}

export type SeasonLinesBatchResult = {
  localSaved: PlayerSeasonLine[];
  cloudOk: number;
  cloudFails: Array<{ id: string; playerName: string; error?: string }>;
  storage: "localStorage";
  storageKey: string;
  mode: "full-mirror" | "outbox";
};

export async function syncSeasonLinesToCloud(
  records: PlayerSeasonLine[],
): Promise<SeasonLinesBatchResult> {
  let cloudOk = 0;
  const cloudFails: SeasonLinesBatchResult["cloudFails"] = [];
  const syncedIds = new Set<string>();
  for (const rec of records) {
    const cloud = await putMuseumCollectionRecord(COLLECTION, rec);
    if (cloud.ok) {
      cloudOk += 1;
      syncedIds.add(rec.id);
    } else {
      cloudFails.push({
        id: rec.id,
        playerName: rec.playerName,
        error: cloud.error,
      });
    }
  }
  removeSyncedFromOutbox(syncedIds);
  return {
    localSaved: records,
    cloudOk,
    cloudFails,
    storage: "localStorage",
    storageKey: STORAGE_KEY,
    mode: cloudHydrated ? "outbox" : "full-mirror",
  };
}

export async function upsertSeasonLinesBatchAsync(
  records: PlayerSeasonLine[],
): Promise<SeasonLinesBatchResult> {
  const localSaved = upsertSeasonLinesLocalBatch(records);
  return syncSeasonLinesToCloud(localSaved);
}

export function upsertBatterSeasonLine(
  record: BatterSeasonLine,
): BatterSeasonLine {
  return upsertSeasonLine(record) as BatterSeasonLine;
}

export function upsertPitcherSeasonLine(
  record: PitcherSeasonLine,
): PitcherSeasonLine {
  return upsertSeasonLine(record) as PitcherSeasonLine;
}

export async function upsertBatterSeasonLineAsync(
  record: BatterSeasonLine,
): Promise<{
  record: BatterSeasonLine;
  cloud: { ok: boolean; error?: string };
}> {
  const result = await upsertSeasonLineAsync(record);
  return {
    record: result.record as BatterSeasonLine,
    cloud: result.cloud,
  };
}

export async function upsertPitcherSeasonLineAsync(
  record: PitcherSeasonLine,
): Promise<{
  record: PitcherSeasonLine;
  cloud: { ok: boolean; error?: string };
}> {
  const result = await upsertSeasonLineAsync(record);
  return {
    record: result.record as PitcherSeasonLine,
    cloud: result.cloud,
  };
}

/**
 * Neon から一覧取得 → 未同期 local をアップロード → メモリに全件展開 →
 * localStorage は未同期 outbox のみ残す（同期済みの重複キャッシュを落とす）。
 * 未同期・アップロード失敗行は絶対に捨てない。
 */
export async function hydrateSeasonLinesFromCloud(): Promise<PlayerSeasonLine[]> {
  if (!canUseStorage()) return [];

  const localBeforeList = readDiskSeasonLines();

  const cloudListRaw =
    await fetchMuseumCollectionRecords<PlayerSeasonLine>(COLLECTION);
  if (!cloudListRaw) {
    runtimeCache = localBeforeList;
    cloudHydrated = false;
    return listSeasonLines();
  }

  const cloudList = cloudListRaw.map(normalizeLine);
  const cloudById = new Map(cloudList.map((c) => [c.id, c]));

  const pending: PlayerSeasonLine[] = [];
  for (const local of localBeforeList) {
    const cloud = cloudById.get(local.id);
    if (!cloud) {
      pending.push(local);
      continue;
    }
    if (isStrictlyNewer(local.updatedAt, cloud.updatedAt)) {
      pending.push(
        mergeSeasonLinePreferOffense(local, cloud) as PlayerSeasonLine,
      );
    }
  }

  const stillPending: PlayerSeasonLine[] = [];
  let pendingUploaded = 0;
  for (const p of pending) {
    const cloud = await putMuseumCollectionRecord(COLLECTION, p);
    if (cloud.ok) pendingUploaded += 1;
    else stillPending.push(p);
  }

  const map = new Map<string, PlayerSeasonLine>();
  for (const c of cloudList) map.set(c.id, c);
  for (const p of stillPending) {
    const cloud = map.get(p.id);
    map.set(
      p.id,
      cloud
        ? (mergeSeasonLinePreferOffense(p, cloud) as PlayerSeasonLine)
        : p,
    );
  }
  // アップロード成功した pending もメモリにはローカル内容を反映
  for (const p of pending) {
    if (stillPending.some((x) => x.id === p.id)) continue;
    map.set(p.id, p);
  }

  runtimeCache = [...map.values()];
  cloudHydrated = true;

  try {
    writeSeasonLinesWithCompactRetry(stillPending);
  } catch {
    // outbox 書き込み失敗時もメモリは保持。次回 hydrate で再試行。
  }

  return listSeasonLines();
}

/** テスト／診断用 */
export function getSeasonLinesCacheState(): {
  cloudHydrated: boolean;
  runtimeRows: number | null;
  diskRows: number;
  diskBytes: number;
} {
  const disk = canUseStorage()
    ? (window.localStorage.getItem(STORAGE_KEY) ?? "")
    : "";
  return {
    cloudHydrated,
    runtimeRows: runtimeCache ? runtimeCache.length : null,
    diskRows: readDiskSeasonLines().length,
    diskBytes: disk.length,
  };
}

/** テスト用リセット（本番 UI からは呼ばない） */
export function resetSeasonLinesCacheForTests(): void {
  runtimeCache = null;
  cloudHydrated = false;
}

export function restoreEmptyBatterOffenseFromPeers(): PlayerSeasonLine[] {
  if (!canUseStorage()) return [];
  return listSeasonLines();
}

export function listPennantSeasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const l of listSeasonLines().filter((x) => x.scope === "pennant")) {
    const identity = identityFromWorldYear(l.year, l.world);
    map.set(identity.seasonKey, identity);
  }
  return [...map.values()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}
