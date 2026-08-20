/**
 * team_standings ↔ museum_documents の変換・永続化（サーバ専用）。
 */

import type { YearStandingsRecord } from "@/data/teamStandings";
import { normalizeSeasonWorld } from "@/data/seasons";
import {
  TEAM_STANDINGS_COLLECTION,
  getMuseumDocument,
  insertMuseumDocumentIfAbsent,
  listMuseumDocuments,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";

function normalizeStandingsPayload(
  payload: unknown,
  fallbackId: string,
): YearStandingsRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Partial<YearStandingsRecord>;
  const year = Number(r.year);
  if (!Number.isFinite(year)) return null;
  const world = normalizeSeasonWorld(r.world);
  return {
    id: typeof r.id === "string" && r.id ? r.id : fallbackId,
    year,
    world,
    central: Array.isArray(r.central) ? r.central : [],
    pacific: Array.isArray(r.pacific) ? r.pacific : [],
    source:
      r.source === "manual" || r.source === "ocr" || r.source === "import"
        ? r.source
        : "manual",
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt:
      typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function listTeamStandingsFromDb(): Promise<YearStandingsRecord[]> {
  const rows = await listMuseumDocuments(TEAM_STANDINGS_COLLECTION);
  const out: YearStandingsRecord[] = [];
  for (const row of rows) {
    const rec = normalizeStandingsPayload(row.payload, row.id);
    if (rec) out.push(rec);
  }
  return out;
}

export async function getTeamStandingsFromDb(
  id: string,
): Promise<YearStandingsRecord | null> {
  const row = await getMuseumDocument(TEAM_STANDINGS_COLLECTION, id);
  if (!row) return null;
  return normalizeStandingsPayload(row.payload, row.id);
}

export async function upsertTeamStandingsToDb(
  record: YearStandingsRecord,
): Promise<YearStandingsRecord> {
  const world = normalizeSeasonWorld(record.world);
  const payload: YearStandingsRecord = {
    ...record,
    world,
    central: Array.isArray(record.central) ? record.central : [],
    pacific: Array.isArray(record.pacific) ? record.pacific : [],
    updatedAt: new Date().toISOString(),
  };
  await upsertMuseumDocument({
    id: payload.id,
    collection: TEAM_STANDINGS_COLLECTION,
    year: payload.year,
    world,
    payload,
  });
  return payload;
}

/** 既存クラウド行は触らず、無い id だけ挿入 */
export async function migrateTeamStandingsToDb(
  records: YearStandingsRecord[],
): Promise<{
  inserted: string[];
  skipped: string[];
  errors: Array<{ id: string; error: string }>;
}> {
  const inserted: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const raw of records) {
    const rec = normalizeStandingsPayload(raw, raw.id);
    if (!rec) {
      errors.push({ id: String(raw?.id ?? "?"), error: "invalid_payload" });
      continue;
    }
    try {
      const result = await insertMuseumDocumentIfAbsent({
        id: rec.id,
        collection: TEAM_STANDINGS_COLLECTION,
        year: rec.year,
        world: normalizeSeasonWorld(rec.world),
        payload: rec,
      });
      if (result.inserted) inserted.push(rec.id);
      else skipped.push(rec.id);
    } catch (e) {
      errors.push({
        id: rec.id,
        error: e instanceof Error ? e.message : "insert_failed",
      });
    }
  }

  return { inserted, skipped, errors };
}
