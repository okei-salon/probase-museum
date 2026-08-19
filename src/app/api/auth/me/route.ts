import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/** 現在のログイン状態（クライアント表示・将来の権限拡張用） */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, authenticated: false },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    role: session.role,
    exp: session.exp,
  });
}
