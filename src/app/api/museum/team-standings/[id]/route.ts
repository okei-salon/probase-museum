import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  getTeamStandingsFromDb,
  upsertTeamStandingsToDb,
} from "@/lib/db/teamStandingsDb";
import type { YearStandingsRecord } from "@/data/teamStandings";
import { normalizeSeasonWorld } from "@/data/seasons";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** 1シーズン分の最終順位 */
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
    const record = await getTeamStandingsFromDb(id);
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

/** 最終順位の upsert（共有DB） */
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

  const incoming = body as Partial<YearStandingsRecord>;
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

  const world = normalizeSeasonWorld(incoming.world);
  const now = new Date().toISOString();
  const existing = await getTeamStandingsFromDb(id);
  // リーグは「リクエストに含まれたときだけ」更新。省略時は既存を維持（CL保存でPLを消さない）。
  const record: YearStandingsRecord = {
    id,
    year,
    world,
    central:
      incoming.central !== undefined && Array.isArray(incoming.central)
        ? incoming.central
        : (existing?.central ?? []),
    pacific:
      incoming.pacific !== undefined && Array.isArray(incoming.pacific)
        ? incoming.pacific
        : (existing?.pacific ?? []),
    source:
      incoming.source === "manual" ||
      incoming.source === "ocr" ||
      incoming.source === "import"
        ? incoming.source
        : "manual",
    createdAt: existing?.createdAt ?? incoming.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const saved = await upsertTeamStandingsToDb(record);
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
