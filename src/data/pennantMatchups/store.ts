/**
 * リーグ内対戦表ストア（セ/パ 6球団同士）。
 * YEAR × WORLD × LEAGUE で分離。カード単位の非破壊 upsert。
 * localStorage + museum_documents(collection=pennant_matchups) 同期。
 */

import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  mergeMatchupCards,
  normalizeMatchupDrafts,
} from "./normalize";
import type {
  PennantLeague,
  PennantMatchupCard,
  PennantMatchupDraft,
  PennantMatchupsRecord,
  PennantMatchupsSource,
} from "./types";

export const PENNANT_MATCHUPS_STORAGE_KEY =
  "probase-museum.pennant-matchups.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function pennantMatchupsRecordId(
  year: number | string,
  world: SeasonWorld | null | undefined,
  league: PennantLeague,
): string {
  const w = normalizeSeasonWorld(world);
  const y = Number(year);
  if (w) return `${w}:${y}:${league}`;
  return `${y}:${league}`;
}

function normalizeRecord(r: PennantMatchupsRecord): PennantMatchupsRecord {
  const world = normalizeSeasonWorld(r.world);
  const league: PennantLeague =
    r.league === "pacific" ? "pacific" : "central";
  return {
    ...r,
    world,
    league,
    cards: Array.isArray(r.cards) ? r.cards : [],
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

function readRawPennantMatchups(): PennantMatchupsRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PENNANT_MATCHUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PennantMatchupsRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
  } catch {
    return [];
  }
}

function writeRawPennantMatchups(list: PennantMatchupsRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    PENNANT_MATCHUPS_STORAGE_KEY,
    JSON.stringify(list),
  );
}

export function listStoredPennantMatchups(): PennantMatchupsRecord[] {
  return excludeDemoRecords(readRawPennantMatchups());
}

export function getPennantMatchups(
  identity: Pick<SeasonIdentity, "year" | "world">,
  league: PennantLeague,
): PennantMatchupsRecord | null {
  const id = pennantMatchupsRecordId(identity.year, identity.world, league);
  return listStoredPennantMatchups().find((r) => r.id === id) ?? null;
}

function writeRecord(record: PennantMatchupsRecord): void {
  const list = readRawPennantMatchups();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeRawPennantMatchups(list);
}

/**
 * local / cloud のカードを updatedAt 方針で merge。
 * 新しい側のカードが同一キーで勝つ。片方にしか無いカードは常に残す。
 */
export function mergeMatchupRecordsByUpdatedAt(
  local: PennantMatchupsRecord | null,
  cloud: PennantMatchupsRecord | null,
): PennantMatchupCard[] {
  if (!local && !cloud) return [];
  if (!local) return cloud!.cards;
  if (!cloud) return local.cards;
  if (isStrictlyNewer(local.updatedAt, cloud.updatedAt)) {
    return mergeMatchupCards(cloud.cards, local.cards);
  }
  return mergeMatchupCards(local.cards, cloud.cards);
}

/** local + cloud + 今回入力（入力が最優先） */
export function mergeLocalCloudIncomingCards(
  local: PennantMatchupsRecord | null,
  cloud: PennantMatchupsRecord | null,
  incoming: PennantMatchupCard[],
): PennantMatchupCard[] {
  const base = mergeMatchupRecordsByUpdatedAt(local, cloud);
  return mergeMatchupCards(base, incoming);
}

async function fetchCloudMatchupsList(): Promise<
  PennantMatchupsRecord[] | null
> {
  try {
    const res = await fetch("/api/museum/pennant-matchups", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      records?: PennantMatchupsRecord[];
    };
    if (!data.ok || !Array.isArray(data.records)) return null;
    return data.records.map(normalizeRecord);
  } catch {
    return null;
  }
}

async function fetchCloudMatchupsById(
  id: string,
): Promise<PennantMatchupsRecord | null> {
  try {
    const res = await fetch(
      `/api/museum/pennant-matchups/${encodeURIComponent(id)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      record?: PennantMatchupsRecord;
    };
    if (!data.ok || !data.record) return null;
    return normalizeRecord(data.record);
  } catch {
    return null;
  }
}

async function pushMatchupsToCloud(
  record: PennantMatchupsRecord,
): Promise<{ ok: boolean; error?: string; record?: PennantMatchupsRecord }> {
  try {
    const res = await fetch(
      `/api/museum/pennant-matchups/${encodeURIComponent(record.id)}`,
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
    const data = (await res.json()) as {
      ok?: boolean;
      record?: PennantMatchupsRecord;
    };
    return {
      ok: true,
      record: data.record ? normalizeRecord(data.record) : record,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

/**
 * クラウド一覧を取得し、local とカード単位 merge。
 * 同一 id: 新しい updatedAt 側のカードが衝突時に勝つ。片方のみのカードは保持。
 * ローカルが新しい場合は裏で PUT 再送。
 * 取得失敗時は local をそのまま返す（消さない）。
 */
export async function hydratePennantMatchupsFromCloud(): Promise<
  PennantMatchupsRecord[]
> {
  if (!canUseStorage()) return [];
  const cloudList = await fetchCloudMatchupsList();
  if (!cloudList) return listStoredPennantMatchups();

  const localList = readRawPennantMatchups();
  const map = new Map<string, PennantMatchupsRecord>();
  const pendingPush: PennantMatchupsRecord[] = [];

  for (const local of localList) {
    map.set(local.id, local);
  }

  for (const cloud of cloudList) {
    const local = map.get(cloud.id) ?? null;
    if (!local) {
      map.set(cloud.id, cloud);
      continue;
    }
    const cards = mergeMatchupRecordsByUpdatedAt(local, cloud);
    const localNewer = isStrictlyNewer(local.updatedAt, cloud.updatedAt);
    const merged: PennantMatchupsRecord = {
      ...cloud,
      ...local,
      id: cloud.id,
      year: cloud.year || local.year,
      world: normalizeSeasonWorld(cloud.world ?? local.world),
      league: cloud.league,
      cards,
      createdAt: local.createdAt || cloud.createdAt,
      updatedAt: localNewer ? local.updatedAt : cloud.updatedAt,
      source: localNewer ? local.source : cloud.source,
    };
    map.set(cloud.id, merged);
    if (localNewer) pendingPush.push(merged);
  }

  const mergedList = [...map.values()];
  writeRawPennantMatchups(mergedList);

  if (pendingPush.length > 0) {
    void Promise.all(pendingPush.map((r) => pushMatchupsToCloud(r)));
  }

  return excludeDemoRecords(mergedList);
}

export async function getPennantMatchupsAsync(
  identity: Pick<SeasonIdentity, "year" | "world">,
  league: PennantLeague,
): Promise<PennantMatchupsRecord | null> {
  await hydratePennantMatchupsFromCloud();
  return getPennantMatchups(identity, league);
}

/**
 * local のみ upsert（入力カードだけ merge）。クラウド同期はしない。
 * 登録 UI / 端末共有は upsertPennantMatchupCardsAsync を使うこと。
 */
export function upsertPennantMatchupCards(input: {
  year: number;
  world?: SeasonWorld | null;
  league: PennantLeague;
  cards: PennantMatchupDraft[] | PennantMatchupCard[];
  source: PennantMatchupsSource;
}): PennantMatchupsRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = pennantMatchupsRecordId(input.year, world, input.league);
  const list = readRawPennantMatchups();
  const existing = list.find((r) => r.id === id) ?? null;

  const incoming = normalizeMatchupDrafts(
    input.cards.map((c) => ({
      teamA: c.teamA,
      teamB: c.teamB,
      teamAId: c.teamAId,
      teamBId: c.teamBId,
      wins: c.wins,
      losses: c.losses,
      draws: c.draws,
    })),
  );

  const record: PennantMatchupsRecord = {
    id,
    year: input.year,
    world,
    league: input.league,
    cards: mergeMatchupCards(existing?.cards ?? [], incoming),
    source: input.source,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  writeRecord(record);
  return record;
}

/**
 * 登録の本線: cloud 取得 → local+cloud+入力をカード merge → local 保存 → 完全レコード PUT。
 * cloud 取得/PUT 失敗でも local は残す。
 */
export async function upsertPennantMatchupCardsAsync(input: {
  year: number;
  world?: SeasonWorld | null;
  league: PennantLeague;
  cards: PennantMatchupDraft[] | PennantMatchupCard[];
  source: PennantMatchupsSource;
}): Promise<{
  record: PennantMatchupsRecord;
  cloud: { ok: boolean; error?: string };
}> {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = pennantMatchupsRecordId(input.year, world, input.league);
  const local = readRawPennantMatchups().find((r) => r.id === id) ?? null;

  const incoming = normalizeMatchupDrafts(
    input.cards.map((c) => ({
      teamA: c.teamA,
      teamB: c.teamB,
      teamAId: c.teamAId,
      teamBId: c.teamBId,
      wins: c.wins,
      losses: c.losses,
      draws: c.draws,
    })),
  );

  // 保存前に当該 id の cloud を取得（失敗時は null → local+入力のみ）
  const cloud = await fetchCloudMatchupsById(id);
  const cards = mergeLocalCloudIncomingCards(local, cloud, incoming);

  const record: PennantMatchupsRecord = {
    id,
    year: input.year,
    world,
    league: input.league,
    cards,
    source: input.source,
    createdAt: local?.createdAt ?? cloud?.createdAt ?? now,
    updatedAt: now,
  };

  writeRecord(record);
  const pushed = await pushMatchupsToCloud(record);
  return { record, cloud: { ok: pushed.ok, error: pushed.error } };
}
