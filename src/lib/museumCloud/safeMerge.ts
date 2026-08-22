/**
 * 共有DB同期用の非破壊 merge ヘルパー。
 * 空配列 / null / undefined で既存の非空データを消さない。
 */

/** 非空配列を優先。両方空なら incoming（定義されていれば）または existing。 */
export function preferNonEmptyArray<T>(
  incoming: T[] | undefined | null,
  existing: T[] | undefined | null,
): T[] {
  if (Array.isArray(incoming) && incoming.length > 0) return incoming;
  if (Array.isArray(existing) && existing.length > 0) return existing;
  if (Array.isArray(incoming)) return incoming;
  if (Array.isArray(existing)) return existing;
  return [];
}

/**
 * null/undefined で既存の非 null を消さない。
 * - incoming === undefined → existing を維持
 * - incoming === null かつ existing あり → existing を維持
 * - それ以外 → incoming
 */
export function preferNonNullish<T>(
  incoming: T | null | undefined,
  existing: T | null | undefined,
): T | null {
  if (incoming === undefined) return existing ?? null;
  if (incoming === null && existing != null) return existing;
  return incoming ?? null;
}

export type CloudSyncResult = {
  attempted: number;
  ok: number;
  failed: number;
};
