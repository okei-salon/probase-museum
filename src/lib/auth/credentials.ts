import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** タイミング攻撃耐性のある文字列比較（長さ差もハッシュ経由で吸収） */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Environment Variable `PBM_ACCESS_CODE` と照合。
 * 失敗理由は呼び出し側へ漏らさない（共通エラー用）。
 */
export function matchAccessCode(code: string): boolean {
  const expected = process.env.PBM_ACCESS_CODE ?? "";
  if (!expected || !code) return false;
  return safeEqual(code.trim(), expected);
}

export function isAccessCodeConfigured(): boolean {
  const code = process.env.PBM_ACCESS_CODE ?? "";
  return code.length > 0;
}
