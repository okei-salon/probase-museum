import type { SessionPayload } from "./constants";

/**
 * Edge / Node 両対応のセッション署名検証。
 * Proxy（旧 Middleware）でも確実に動くよう Web Crypto のみ使用する。
 * （node:crypto は Vercel Edge で落ちて保護が無効化されることがある）
 *
 * このファイルは node:crypto や next/headers を import しないこと。
 */

function getAuthSecret(): string | null {
  const secret = process.env.PBM_AUTH_SECRET;
  if (!secret || secret.trim().length < 16) return null;
  return secret;
}

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlEncodeString(text: string): string {
  return b64urlEncodeBytes(new TextEncoder().encode(text));
}

function b64urlDecodeToString(s: string): string | null {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    if (typeof atob === "function") {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(
  encodedPayload: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );
  return b64urlEncodeBytes(new Uint8Array(sig));
}

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 署名付きセッショントークンを発行 */
export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSec: number,
): Promise<string | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const encoded = b64urlEncodeString(JSON.stringify(full));
  const sig = await signPayload(encoded, secret);
  return `${encoded}.${sig}`;
}

/**
 * セッショントークンを検証。改ざん・期限切れ・秘密未設定は null。
 * Proxy / Route Handler から利用可能（async）。
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = getAuthSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  try {
    const expected = await signPayload(encoded, secret);
    if (!safeEqualStr(sig, expected)) return null;
  } catch {
    return null;
  }

  const json = b64urlDecodeToString(encoded);
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as SessionPayload).role !== "member" ||
    typeof (parsed as SessionPayload).exp !== "number"
  ) {
    return null;
  }

  const session = parsed as SessionPayload;
  if (session.exp * 1000 <= Date.now()) return null;

  return session;
}

export function isAuthConfigured(): boolean {
  const code = process.env.PBM_ACCESS_CODE ?? "";
  return getAuthSecret() != null && code.length > 0;
}
