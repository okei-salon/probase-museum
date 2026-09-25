/**
 * localStorage JSON 書き込みと容量超過の判別。
 * IndexedDB は未使用。クラウド（Neon）の失敗とは別経路。
 */

export class LocalStorageQuotaError extends Error {
  readonly storage: "localStorage" = "localStorage";
  readonly key: string;
  readonly causeError?: unknown;

  constructor(key: string, cause?: unknown) {
    super(
      `localStorage容量超過（キー: ${key}）。クラウド（Neon）や IndexedDB ではなく、ブラウザ端末キャッシュの上限です。既存データは削除していません。`,
    );
    this.name = "LocalStorageQuotaError";
    this.key = key;
    this.causeError = cause;
  }
}

export function isQuotaExceededError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; code?: number; message?: string };
  if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return true;
  }
  // Safari / WebKit
  if (err.code === 22 || err.code === 1014) return true;
  const msg = String(err.message ?? "");
  return /quota/i.test(msg) || /exceeded the quota/i.test(msg);
}

export function setLocalStorageJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch (e) {
    throw e instanceof Error
      ? e
      : new Error(`JSON stringify failed for ${key}`);
  }
  try {
    window.localStorage.setItem(key, raw);
  } catch (e) {
    if (isQuotaExceededError(e)) {
      throw new LocalStorageQuotaError(key, e);
    }
    throw e;
  }
}

export function formatStorageFailureMessage(e: unknown): string {
  if (e instanceof LocalStorageQuotaError) {
    return e.message;
  }
  if (isQuotaExceededError(e)) {
    return "localStorage容量超過（キー不明）。クラウド同期ではなく端末キャッシュです。既存データは削除していません。";
  }
  return e instanceof Error ? e.message : "不明なエラー";
}
