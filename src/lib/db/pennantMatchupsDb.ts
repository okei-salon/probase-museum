/**
 * pennant_matchups ↔ museum_documents の変換・永続化（サーバ専用）。
 * 汎用 museum_documents API を再利用（新テーブルなし）。
 */

import type { PennantMatchupsRecord } from "@/data/pennantMatchups";
import { normalizeSeasonWorld } from "@/data/seasons";
import {
  PENNANT_MATCHUPS_COLLECTION,
  getMuseumDocument,
  listMuseumDocuments,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";

export { PENNANT_MATCHUPS_COLLECTION };

function normalizeMatchupsPayload(
  payload: unknown,
  fallbackId: string,
): PennantMatchupsRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Partial<PennantMatchupsRecord>;
  const year = Number(r.year);
  if (!Number.isFinite(year)) return null;
  const league = r.league === "pacific" ? "pacific" : "central";
  const world = normalizeSeasonWorld(r.world);
  const source =
    r.source === "manual" ||
    r.source === "ocr" ||
    r.source === "import" ||
    r.source === "partner"
      ? r.source
      : "manual";
  return {
    id: typeof r.id === "string" && r.id ? r.id : fallbackId,
    year,
    world,
    league,
    cards: Array.isArray(r.cards) ? r.cards : [],
    source,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt:
      typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function listPennantMatchupsFromDb(): Promise<
  PennantMatchupsRecord[]
> {
  const rows = await listMuseumDocuments(PENNANT_MATCHUPS_COLLECTION);
  const out: PennantMatchupsRecord[] = [];
  for (const row of rows) {
    const rec = normalizeMatchupsPayload(row.payload, row.id);
    if (rec) out.push(rec);
  }
  return out;
}

export async function getPennantMatchupsFromDb(
  id: string,
): Promise<PennantMatchupsRecord | null> {
  const row = await getMuseumDocument(PENNANT_MATCHUPS_COLLECTION, id);
  if (!row) return null;
  return normalizeMatchupsPayload(row.payload, row.id);
}

export async function upsertPennantMatchupsToDb(
  record: PennantMatchupsRecord,
): Promise<PennantMatchupsRecord> {
  const world = normalizeSeasonWorld(record.world);
  const payload: PennantMatchupsRecord = {
    ...record,
    world,
    league: record.league === "pacific" ? "pacific" : "central",
    cards: Array.isArray(record.cards) ? record.cards : [],
    updatedAt: new Date().toISOString(),
  };
  await upsertMuseumDocument({
    id: payload.id,
    collection: PENNANT_MATCHUPS_COLLECTION,
    year: payload.year,
    world,
    payload,
  });
  return payload;
}
