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
  hydrateLocalArrayFromCloud,
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

export { STORAGE_KEY as SEASON_LINES_STORAGE_KEY };

function canUseStorage() {
  return typeof window !== "undefined";
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
 * 同一データの二重肥大化を抑え、容量超過を緩和する。レコード自体は消さない。
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

function readRawSeasonLines(): PlayerSeasonLine[] {
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
        // 壊れた1件で全件を空にしない（誤消去防止）
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

/**
 * 既存行を削除せず、derived 省略形式へ書き直して容量を確保する。
 * 失敗してもデータは消さない（書き込み失敗時は旧値が残る）。
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
    const list = readRawSeasonLines();
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
  return excludeDemoRecords(readRawSeasonLines());
}

/**
 * シーズン画面用: identity（world + year）に一致する行のみ。
 * BLUE / RED / レガシー・DEMO を matchSeason で厳密に分離する。
 */
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

/**
 * 選手の全シーズン行（通算・年度別用）。
 * BLUE / RED は別行のまま両方返す（同一年でも合算しない／除外しない）。
 */
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
    // 既存キャッシュを derived 省略形へ縮めてから再試行（削除なし）
    const compacted = compactSeasonLinesLocalStorage();
    if (!compacted.ok) throw e;
    persistSeasonLinesList(list);
  }
}

function upsertSeasonLineLocal(record: PlayerSeasonLine): PlayerSeasonLine {
  const list = readRawSeasonLines();
  const { list: next, saved } = mergeRecordsIntoList(list, [record]);
  writeSeasonLinesWithCompactRetry(next);
  return saved[0]!;
}

/**
 * 一括 local upsert（localStorage への setItem は1回）。
 * 同一 id は置換のみ。既存他件は消さない。
 */
export function upsertSeasonLinesLocalBatch(
  records: PlayerSeasonLine[],
): PlayerSeasonLine[] {
  if (records.length === 0) return [];
  const list = readRawSeasonLines();
  const { list: next, saved } = mergeRecordsIntoList(list, records);
  writeSeasonLinesWithCompactRetry(next);
  return saved;
}

export function upsertSeasonLine(
  record: PlayerSeasonLine,
): PlayerSeasonLine {
  const normalized = upsertSeasonLineLocal(record);
  void putMuseumCollectionRecord(COLLECTION, normalized);
  return normalized;
}

/**
 * local upsert → クラウド PUT を await。失敗しても local は残す。
 * 同一 id のみ置換（他選手・他WORLDは消さない）。
 */
export async function upsertSeasonLineAsync(
  record: PlayerSeasonLine,
): Promise<{
  record: PlayerSeasonLine;
  cloud: { ok: boolean; error?: string };
}> {
  const saved = upsertSeasonLineLocal(record);
  const cloud = await putMuseumCollectionRecord(COLLECTION, saved);
  return {
    record: saved,
    cloud: { ok: cloud.ok, error: cloud.error },
  };
}

export type SeasonLinesBatchResult = {
  /** localStorage に保存できた件数（upsert 成功） */
  localSaved: PlayerSeasonLine[];
  cloudOk: number;
  cloudFails: Array<{ id: string; playerName: string; error?: string }>;
  storage: "localStorage";
  storageKey: string;
};

/**
 * 一括: localStorage は1回書き込み → 各行をクラウドへ PUT。
 * 再実行は同一 id の更新のみ（重複行を増やさない）。
 */
export async function upsertSeasonLinesBatchAsync(
  records: PlayerSeasonLine[],
): Promise<SeasonLinesBatchResult> {
  const localSaved = upsertSeasonLinesLocalBatch(records);
  return syncSeasonLinesToCloud(localSaved);
}

/** local 済み行のクラウド再送のみ（localStorage は触らない） */
export async function syncSeasonLinesToCloud(
  records: PlayerSeasonLine[],
): Promise<SeasonLinesBatchResult> {
  let cloudOk = 0;
  const cloudFails: SeasonLinesBatchResult["cloudFails"] = [];
  for (const rec of records) {
    const cloud = await putMuseumCollectionRecord(COLLECTION, rec);
    if (cloud.ok) cloudOk += 1;
    else {
      cloudFails.push({
        id: rec.id,
        playerName: rec.playerName,
        error: cloud.error,
      });
    }
  }
  return {
    localSaved: records,
    cloudOk,
    cloudFails,
    storage: "localStorage",
    storageKey: STORAGE_KEY,
  };
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

export async function hydrateSeasonLinesFromCloud(): Promise<PlayerSeasonLine[]> {
  if (!canUseStorage()) return [];
  await hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawSeasonLines,
    writeRaw: writeRawSeasonLines,
    normalize: normalizeLine,
    filterPublic: excludeDemoRecords,
    // 同一 id の local↔cloud のみ。別 WORLD / legacy / demo からの推測復元はしない
    mergeOne: mergeSeasonLinePreferOffense,
  });
  return listSeasonLines();
}

/**
 * 自動ピア復元は無効（他 WORLD / legacy / demo からの推測コピー禁止）。
 * 復元待ちの空打撃行は触らず、現状のまま返す。
 */
export function restoreEmptyBatterOffenseFromPeers(): PlayerSeasonLine[] {
  if (!canUseStorage()) return [];
  return listSeasonLines();
}

/**
 * pennant 行から WORLD × YEAR の SeasonIdentity 一覧を構築。
 * SOP・RECORDS・YEARBOOK など横断集計で再利用する。
 */
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
