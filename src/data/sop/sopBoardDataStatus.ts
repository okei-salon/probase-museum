/**
 * SOP ボード向けエイリアス（Museum 共通状態の再エクスポート）。
 */

import {
  MUSEUM_BOARD_ERROR_MESSAGE,
  MUSEUM_BOARD_LOADING_MESSAGE,
  resolveMuseumBoardDataStatus,
  type MuseumBoardDataStatus,
} from "@/data/museumBoardDataStatus";

export type SopBoardDataStatus = MuseumBoardDataStatus;

export const SOP_BOARD_LOADING_MESSAGE = MUSEUM_BOARD_LOADING_MESSAGE;
export const SOP_BOARD_ERROR_MESSAGE = MUSEUM_BOARD_ERROR_MESSAGE;

/** SOP 既存呼び出し互換（cloudHydrated → cloudReady） */
export function resolveSopBoardDataStatus(input: {
  mounted: boolean;
  cloudHydrated: boolean;
  hasRows: boolean;
  cloudLoadError?: boolean;
}): SopBoardDataStatus {
  return resolveMuseumBoardDataStatus({
    mounted: input.mounted,
    cloudReady: input.cloudHydrated,
    hasRows: input.hasRows,
    cloudLoadError: input.cloudLoadError,
  });
}
