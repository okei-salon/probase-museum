import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import { listMuseumDocuments } from "@/lib/db/museumDocuments";
import { isMuseumSyncCollection } from "@/lib/museumCloud/collections";

export const runtime = "nodejs";

type Params = { params: Promise<{ collection: string }> };

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

/** コレクション一覧 */
export async function GET(_request: Request, { params }: Params) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { collection } = await params;
  if (!isMuseumSyncCollection(collection)) {
    return NextResponse.json(
      { ok: false, error: "unknown_collection" },
      { status: 400 },
    );
  }

  try {
    const rows = await listMuseumDocuments(collection);
    const records = rows.map((row) =>
      asRecord(row.payload, row.id, row.updated_at),
    );
    return NextResponse.json({ ok: true, records });
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
