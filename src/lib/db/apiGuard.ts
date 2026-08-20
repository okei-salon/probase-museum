import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db/client";
import type { SessionPayload } from "@/lib/auth/constants";

export async function requireMuseumApiSession(): Promise<
  SessionPayload | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  return session;
}

export function requireDatabaseOr503(): NextResponse | null {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "database_not_configured" },
      { status: 503 },
    );
  }
  return null;
}
