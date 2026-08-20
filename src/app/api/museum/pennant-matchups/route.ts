import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import { listPennantMatchupsFromDb } from "@/lib/db/pennantMatchupsDb";

export const runtime = "nodejs";

/** 共有DB上の pennant_matchups 一覧 */
export async function GET() {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  try {
    const records = await listPennantMatchupsFromDb();
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
