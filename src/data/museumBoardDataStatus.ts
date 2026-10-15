/**
 * Museum 各ボード共通の読み込み／空／エラー状態。
 * Neon hydrate 完了前に「データなし」と誤表示しない。
 */

export type MuseumBoardDataStatus = "loading" | "empty" | "ready" | "error";

export const MUSEUM_BOARD_LOADING_MESSAGE = "ただいまデータを読み込み中です…";

export const MUSEUM_BOARD_ERROR_MESSAGE =
  "データの読み込みに失敗しました。ページを再読み込みしてください。";

export function resolveMuseumBoardDataStatus(input: {
  /** クライアントマウント済みか */
  mounted: boolean;
  /**
   * クラウド復元が完了したか。
   * Bootstrap phase=ready または season_lines hydrate 済みを想定。
   */
  cloudReady: boolean;
  /** 表示に足るデータがあるか */
  hasRows: boolean;
  /** MuseumCloudBootstrap などの読み込み失敗 */
  cloudLoadError?: boolean;
}): MuseumBoardDataStatus {
  if (!input.mounted) return "loading";
  if (input.cloudLoadError) return "error";
  if (input.hasRows) return "ready";
  if (!input.cloudReady) return "loading";
  return "empty";
}
