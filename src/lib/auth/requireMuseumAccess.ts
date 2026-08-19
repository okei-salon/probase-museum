import { redirect } from "next/navigation";
import { getSession } from "./cookies";
import type { SessionPayload } from "./constants";

/**
 * Museum 本体の Server Component 用ガード。
 * Proxy が何らかの理由で通っても、未認証なら /login へ送る（本番の二重防御）。
 */
export async function requireMuseumAccess(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
