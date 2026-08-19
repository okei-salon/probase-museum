import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PBM_SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";

/**
 * Next.js 16 Proxy（旧 Middleware）。
 * 署名付き pbm_session を検証し、未ログインを /login へ送る。
 *
 * - Web Crypto のみ使用（Edge でも node:crypto に依存しない）
 * - matcher に `/` を明示（Vercel 本番でトップが外れる対策）
 * - 検証例外時は fail-closed で /login へ
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      try {
        const session = await verifySessionToken(
          request.cookies.get(PBM_SESSION_COOKIE)?.value,
        );
        if (session) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      } catch {
        // ログイン画面は通す
      }
    }
    return NextResponse.next();
  }

  try {
    const session = await verifySessionToken(
      request.cookies.get(PBM_SESSION_COOKIE)?.value,
    );

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pbm-auth", "member");

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|xml|woff2?|map)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
