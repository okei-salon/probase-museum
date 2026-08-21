/**
 * standings_history ↔ museum_documents の変換・永続化（サーバ専用）。
 * 汎用 museum_documents を再利用（新テーブルなし）。
 */

import type { StandingsHistoryRecord } from "@/data/standingsHistory";
import { isStandingsCheckpoint } from "@/data/standingsHistory";
import { normalizeSeasonWorld } from "@/data/seasons";
import {
  STANDINGS_HISTORY_COLLECTION,
  getMuseumDocument,
  listMuseumDocuments,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";

export { STANDINGS_HISTORY_COLLECTION };

function normalizeHistoryPayload(
  payload: unknown,
  fallbackId: string,
): StandingsHistoryRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Partial<StandingsHistoryRecord>;
  const year = Number(r.year);
  if (!Number.isFinite(year)) return null;
  if (!r.checkpoint || !isStandingsCheckpoint(String(r.checkpoint))) {
    return null;
  }
  const world = normalizeSeasonWorld(r.world);
  const source =
    r.source === "manual" ||
    r.source === "ocr" ||
    r.source === "import" ||
    r.source === "sync"
      ? r.source
      : "manual";
  return {
    id: typeof r.id === "string" && r.id ? r.id : fallbackId,
    year,
    world,
    checkpoint: r.checkpoint,
    central: Array.isArray(r.central) ? r.central : [],
    pacific: Array.isArray(r.pacific) ? r.pacific : [],
    source,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt:
      typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function listStandingsHistoryFromDb(): Promise<
  StandingsHistoryRecord[]
> {
  const rows = await listMuseumDocuments(STANDINGS_HISTORY_COLLECTION);
  const out: StandingsHistoryRecord[] = [];
  for (const row of rows) {
    const rec = normalizeHistoryPayload(row.payload, row.id);
    if (rec) out.push(rec);
  }
  return out;
}

export async function getStandingsHistoryFromDb(
  id: string,
): Promise<StandingsHistoryRecord | null> {
  const row = await getMuseumDocument(STANDINGS_HISTORY_COLLECTION, id);
  if (!row) return null;
  return normalizeHistoryPayload(row.payload, row.id);
}

export async function upsertStandingsHistoryToDb(
  record: StandingsHistoryRecord,
): Promise<StandingsHistoryRecord> {
  const world = normalizeSeasonWorld(record.world);
  const payload: StandingsHistoryRecord = {
    ...record,
    world,
    central: Array.isArray(record.central) ? record.central : [],
    pacific: Array.isArray(record.pacific) ? record.pacific : [],
    updatedAt: new Date().toISOString(),
  };
  await upsertMuseumDocument({
    id: payload.id,
    collection: STANDINGS_HISTORY_COLLECTION,
    year: payload.year,
    world,
    payload,
  });
  return payload;
}
