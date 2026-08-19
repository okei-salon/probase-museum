import { NextResponse } from "next/server";
import {
  isAuthConfigured,
  matchAccessCode,
  setSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

type LoginBody = {
  accessCode?: unknown;
  /** 旧フィールド互換（無視） */
  code?: unknown;
};

const GENERIC_ERROR = "アクセスコードが違います";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "認証設定が完了していません" },
      { status: 503 },
    );
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: GENERIC_ERROR },
      { status: 400 },
    );
  }

  const accessCode =
    typeof body.accessCode === "string"
      ? body.accessCode
      : typeof body.code === "string"
        ? body.code
        : "";

  if (!matchAccessCode(accessCode)) {
    return NextResponse.json(
      { ok: false, error: GENERIC_ERROR },
      { status: 401 },
    );
  }

  const ok = await setSessionCookie();
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "セッションを作成できませんでした" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
