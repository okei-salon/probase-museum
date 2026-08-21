import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import { listTeamSeasonStatsFromDb } from "@/lib/db/teamSeasonStatsDb";

export const runtime = "nodejs";

/** 共有DB上の team_season_stats 一覧（打撃・投手） */
export async function GET() {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  try {
    const records = await listTeamSeasonStatsFromDb();
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
