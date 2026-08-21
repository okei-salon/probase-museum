import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import { listStandingsHistoryFromDb } from "@/lib/db/standingsHistoryDb";

export const runtime = "nodejs";

/** 共有DB上の standings_history 一覧 */
export async function GET() {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  try {
    const records = await listStandingsHistoryFromDb();
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
