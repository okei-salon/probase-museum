/**
 * museum_documents テーブルへのアクセス（サーバ専用）。
 * collection + id で1ドキュメントを管理する。
 */

import { getDb } from "@/lib/db/client";
import { normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";

export const TEAM_STANDINGS_COLLECTION = "team_standings" as const;

export type MuseumDocumentRow = {
  id: string;
  collection: string;
  year: number | null;
  world: string | null;
  payload: unknown;
  updated_at: string;
};

export async function getMuseumDocument(
  collection: string,
  id: string,
): Promise<MuseumDocumentRow | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, collection, year, world, payload, updated_at
    FROM museum_documents
    WHERE collection = ${collection} AND id = ${id}
    LIMIT 1
  `;
  const row = rows[0] as MuseumDocumentRow | undefined;
  return row ?? null;
}

export async function listMuseumDocuments(
  collection: string,
): Promise<MuseumDocumentRow[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, collection, year, world, payload, updated_at
    FROM museum_documents
    WHERE collection = ${collection}
    ORDER BY year DESC NULLS LAST, id ASC
  `;
  return rows as MuseumDocumentRow[];
}

export async function upsertMuseumDocument(input: {
  id: string;
  collection: string;
  year: number | null;
  world: SeasonWorld | null;
  payload: unknown;
}): Promise<MuseumDocumentRow> {
  const sql = getDb();
  const world = normalizeSeasonWorld(input.world);
  const updatedAt = new Date().toISOString();

  const rows = await sql`
    INSERT INTO museum_documents (id, collection, year, world, payload, updated_at)
    VALUES (
      ${input.id},
      ${input.collection},
      ${input.year},
      ${world},
      ${JSON.stringify(input.payload)},
      ${updatedAt}
    )
    ON CONFLICT (collection, id) DO UPDATE SET
      year = EXCLUDED.year,
      world = EXCLUDED.world,
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
    RETURNING id, collection, year, world, payload, updated_at
  `;
  return rows[0] as MuseumDocumentRow;
}

/**
 * 既存行がある場合は挿入しない（移行用・上書き禁止）。
 * @returns inserted=true なら新規挿入、false なら既存のためスキップ
 */
export async function insertMuseumDocumentIfAbsent(input: {
  id: string;
  collection: string;
  year: number | null;
  world: SeasonWorld | null;
  payload: unknown;
}): Promise<{ inserted: boolean; row: MuseumDocumentRow | null }> {
  const sql = getDb();
  const world = normalizeSeasonWorld(input.world);
  const updatedAt = new Date().toISOString();

  const rows = await sql`
    INSERT INTO museum_documents (id, collection, year, world, payload, updated_at)
    VALUES (
      ${input.id},
      ${input.collection},
      ${input.year},
      ${world},
      ${JSON.stringify(input.payload)},
      ${updatedAt}
    )
    ON CONFLICT (collection, id) DO NOTHING
    RETURNING id, collection, year, world, payload, updated_at
  `;
  const row = rows[0] as MuseumDocumentRow | undefined;
  if (row) return { inserted: true, row };
  const existing = await getMuseumDocument(input.collection, input.id);
  return { inserted: false, row: existing };
}
