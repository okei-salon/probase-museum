import { cookies } from "next/headers";
import {
  PBM_SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  type SessionPayload,
} from "./constants";
import { createSessionToken, verifySessionToken } from "./session";

export type { SessionPayload };

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Route Handler からセッション Cookie を設定 */
export async function setSessionCookie(): Promise<boolean> {
  const token = await createSessionToken({ role: "member" }, SESSION_MAX_AGE_SEC);
  if (!token) return false;
  const jar = await cookies();
  jar.set(PBM_SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SEC));
  return true;
}

/** セッション Cookie を削除 */
export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(PBM_SESSION_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
  });
}

/** 現在のリクエスト Cookie からセッションを取得 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(PBM_SESSION_COOKIE)?.value);
}
