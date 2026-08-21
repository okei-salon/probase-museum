import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  getMuseumDocument,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";
import { isMuseumSyncCollection } from "@/lib/museumCloud/collections";
import { normalizeSeasonWorld } from "@/data/seasons";

export const runtime = "nodejs";

type Params = { params: Promise<{ collection: string; id: string }> };

function asRecord(payload: unknown, id: string, updatedAt: string) {
  const base =
    payload && typeof payload === "object"
      ? { ...(payload as Record<string, unknown>) }
      : {};
  return {
    ...base,
    id: typeof base.id === "string" && base.id ? base.id : id,
    updatedAt:
      typeof base.updatedAt === "string" && base.updatedAt
        ? base.updatedAt
        : updatedAt,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { collection, id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  if (!isMuseumSyncCollection(collection)) {
    return NextResponse.json(
      { ok: false, error: "unknown_collection" },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  }

  try {
    const row = await getMuseumDocument(collection, id);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      record: asRecord(row.payload, row.id, row.updated_at),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "query_failed",
        detail: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}

/** 汎用 upsert。payload 全体を保存。year/world はインデックス用。 */
export async function PUT(request: Request, { params }: Params) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { collection, id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  if (!isMuseumSyncCollection(collection)) {
    return NextResponse.json(
      { ok: false, error: "unknown_collection" },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const incoming = body as Record<string, unknown>;
  if (incoming.id && incoming.id !== id) {
    return NextResponse.json(
      { ok: false, error: "id_mismatch" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const yearRaw = incoming.year;
  const year =
    yearRaw != null && Number.isFinite(Number(yearRaw))
      ? Number(yearRaw)
      : null;
  const world = normalizeSeasonWorld(
    typeof incoming.world === "string" ? incoming.world : null,
  );

  const payload = {
    ...incoming,
    id,
    world,
    updatedAt:
      typeof incoming.updatedAt === "string" && incoming.updatedAt
        ? incoming.updatedAt
        : now,
  };

  try {
    const row = await upsertMuseumDocument({
      id,
      collection,
      year,
      world,
      payload,
    });
    return NextResponse.json({
      ok: true,
      record: asRecord(row.payload, row.id, row.updated_at),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "upsert_failed",
        detail: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}
