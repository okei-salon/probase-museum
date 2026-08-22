import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  getStandingsHistoryFromDb,
  upsertStandingsHistoryToDb,
} from "@/lib/db/standingsHistoryDb";
import type { StandingsHistoryRecord } from "@/data/standingsHistory";
import { isStandingsCheckpoint } from "@/data/standingsHistory";
import { normalizeSeasonWorld } from "@/data/seasons";
import { preferNonEmptyArray } from "@/lib/museumCloud/safeMerge";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  }

  try {
    const record = await getStandingsHistoryFromDb(id);
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, record });
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

/**
 * 順位推移 upsert（YEAR × WORLD × checkpoint）。
 * クライアントは local+入力を merge した完全レコードを送る想定。
 */
export async function PUT(request: Request, { params }: Params) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
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

  const incoming = body as Partial<StandingsHistoryRecord>;
  const year = Number(incoming.year);
  if (!Number.isFinite(year)) {
    return NextResponse.json(
      { ok: false, error: "year_required" },
      { status: 400 },
    );
  }

  if (incoming.id && incoming.id !== id) {
    return NextResponse.json(
      { ok: false, error: "id_mismatch" },
      { status: 400 },
    );
  }

  const checkpointRaw =
    typeof incoming.checkpoint === "string"
      ? incoming.checkpoint
      : id.split(":").at(-1) ?? "";
  if (!isStandingsCheckpoint(checkpointRaw)) {
    return NextResponse.json(
      { ok: false, error: "checkpoint_required" },
      { status: 400 },
    );
  }

  const world = normalizeSeasonWorld(incoming.world);
  const now = new Date().toISOString();
  const existing = await getStandingsHistoryFromDb(id);

  // 空配列で既存の非空リーグを消さない（省略時も既存維持）
  const record: StandingsHistoryRecord = {
    id,
    year,
    world,
    checkpoint: checkpointRaw,
    central: preferNonEmptyArray(incoming.central, existing?.central),
    pacific: preferNonEmptyArray(incoming.pacific, existing?.pacific),
    source:
      incoming.source === "manual" ||
      incoming.source === "ocr" ||
      incoming.source === "import" ||
      incoming.source === "sync"
        ? incoming.source
        : (existing?.source ?? "manual"),
    createdAt: existing?.createdAt ?? incoming.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const saved = await upsertStandingsHistoryToDb(record);
    return NextResponse.json({ ok: true, record: saved });
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
