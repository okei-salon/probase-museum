/**
 * SOP通算／四天王ボードの表示状態。
 * season_lines は Neon hydrate 前後で空に見えることがあるため、
 * 「未 hydrate」と「hydrate 済みだがデータなし」を分ける。
 */

export type SopBoardDataStatus = "loading" | "empty" | "ready";

export function resolveSopBoardDataStatus(input: {
  /** クライアントマウント済みか */
  mounted: boolean;
  /** season_lines の Neon hydrate が完了したか */
  cloudHydrated: boolean;
  /** 表示対象の行が1件以上あるか */
  hasRows: boolean;
}): SopBoardDataStatus {
  if (!input.mounted) return "loading";
  if (input.hasRows) return "ready";
  if (!input.cloudHydrated) return "loading";
  return "empty";
}
