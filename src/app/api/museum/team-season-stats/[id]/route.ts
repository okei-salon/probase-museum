import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  getTeamSeasonStatsFromDb,
  upsertTeamSeasonStatsToDb,
} from "@/lib/db/teamSeasonStatsDb";
import type { TeamSeasonStatsRecord } from "@/data/teamSeasonStats";
import { normalizeSeasonWorld } from "@/data/seasons";
import type { TeamId } from "@/data/teams";

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
    const record = await getTeamSeasonStatsFromDb(id);
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
 * チーム打撃／投手成績 upsert（YEAR × WORLD × teamId × competition）。
 * batting / pitching は送られた側を保存。省略時は既存を維持。
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

  const incoming = body as Partial<TeamSeasonStatsRecord>;
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

  if (!incoming.teamId || typeof incoming.teamId !== "string") {
    return NextResponse.json(
      { ok: false, error: "teamId_required" },
      { status: 400 },
    );
  }

  const world = normalizeSeasonWorld(incoming.world);
  const now = new Date().toISOString();
  const existing = await getTeamSeasonStatsFromDb(id);
  const competition =
    incoming.competition === "interleague" ||
    incoming.competition === "regular"
      ? incoming.competition
      : (existing?.competition ?? "regular");

  const record: TeamSeasonStatsRecord = {
    id,
    year,
    world,
    teamId: incoming.teamId as TeamId,
    teamName:
      typeof incoming.teamName === "string" && incoming.teamName
        ? incoming.teamName
        : (existing?.teamName ?? incoming.teamId),
    competition,
    batting:
      incoming.batting !== undefined
        ? (incoming.batting ?? null)
        : (existing?.batting ?? null),
    pitching:
      incoming.pitching !== undefined
        ? (incoming.pitching ?? null)
        : (existing?.pitching ?? null),
    source:
      incoming.source === "manual" ||
      incoming.source === "ocr" ||
      incoming.source === "import"
        ? incoming.source
        : (existing?.source ?? "manual"),
    createdAt: existing?.createdAt ?? incoming.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const saved = await upsertTeamSeasonStatsToDb(record);
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
