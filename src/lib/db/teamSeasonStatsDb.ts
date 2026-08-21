/**
 * team_season_stats ↔ museum_documents の変換・永続化（サーバ専用）。
 * batting / pitching 全項目を payload JSON として保持（新テーブルなし）。
 */

import type { TeamSeasonStatsRecord } from "@/data/teamSeasonStats";
import { normalizeSeasonWorld } from "@/data/seasons";
import {
  TEAM_SEASON_STATS_COLLECTION,
  getMuseumDocument,
  listMuseumDocuments,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";

export { TEAM_SEASON_STATS_COLLECTION };

function normalizeStatsPayload(
  payload: unknown,
  fallbackId: string,
): TeamSeasonStatsRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Partial<TeamSeasonStatsRecord>;
  const year = Number(r.year);
  if (!Number.isFinite(year)) return null;
  if (!r.teamId || typeof r.teamId !== "string") return null;
  const world = normalizeSeasonWorld(r.world);
  const competition =
    r.competition === "interleague" ? "interleague" : "regular";
  const source =
    r.source === "manual" || r.source === "ocr" || r.source === "import"
      ? r.source
      : "manual";
  return {
    id: typeof r.id === "string" && r.id ? r.id : fallbackId,
    year,
    world,
    teamId: r.teamId,
    teamName: typeof r.teamName === "string" ? r.teamName : r.teamId,
    competition,
    batting: r.batting ?? null,
    pitching: r.pitching ?? null,
    source,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt:
      typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function listTeamSeasonStatsFromDb(): Promise<
  TeamSeasonStatsRecord[]
> {
  const rows = await listMuseumDocuments(TEAM_SEASON_STATS_COLLECTION);
  const out: TeamSeasonStatsRecord[] = [];
  for (const row of rows) {
    const rec = normalizeStatsPayload(row.payload, row.id);
    if (rec) out.push(rec);
  }
  return out;
}

export async function getTeamSeasonStatsFromDb(
  id: string,
): Promise<TeamSeasonStatsRecord | null> {
  const row = await getMuseumDocument(TEAM_SEASON_STATS_COLLECTION, id);
  if (!row) return null;
  return normalizeStatsPayload(row.payload, row.id);
}

export async function upsertTeamSeasonStatsToDb(
  record: TeamSeasonStatsRecord,
): Promise<TeamSeasonStatsRecord> {
  const world = normalizeSeasonWorld(record.world);
  const payload: TeamSeasonStatsRecord = {
    ...record,
    world,
    competition:
      record.competition === "interleague" ? "interleague" : "regular",
    batting: record.batting ?? null,
    pitching: record.pitching ?? null,
    updatedAt: new Date().toISOString(),
  };
  await upsertMuseumDocument({
    id: payload.id,
    collection: TEAM_SEASON_STATS_COLLECTION,
    year: payload.year,
    world,
    payload,
  });
  return payload;
}
