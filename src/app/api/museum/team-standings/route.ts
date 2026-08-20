import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  listTeamStandingsFromDb,
  migrateTeamStandingsToDb,
} from "@/lib/db/teamStandingsDb";
import type { YearStandingsRecord } from "@/data/teamStandings";

export const runtime = "nodejs";

/** 共有DB上の team_standings 一覧 */
export async function GET() {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  try {
    const records = await listTeamStandingsFromDb();
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

/**
 * localStorage からの移行用。
 * body.records を受け取り、クラウドに無い id だけ挿入（既存は上書きしない）。
 */
export async function POST(request: Request) {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records)) {
    return NextResponse.json(
      { ok: false, error: "records_required" },
      { status: 400 },
    );
  }

  try {
    const result = await migrateTeamStandingsToDb(
      records as YearStandingsRecord[],
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "migrate_failed",
        detail: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}
