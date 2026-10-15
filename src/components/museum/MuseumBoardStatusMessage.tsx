"use client";

import {
  MUSEUM_BOARD_ERROR_MESSAGE,
  MUSEUM_BOARD_LOADING_MESSAGE,
  type MuseumBoardDataStatus,
} from "@/data/museumBoardDataStatus";
import { getMuseumCloudLoadState } from "@/data/museumCloudLoadState";

type Props = {
  status: MuseumBoardDataStatus;
  /** empty 時のメッセージ。省略時は汎用文言 */
  emptyMessage?: string;
  className?: string;
};

/**
 * loading / error / empty のテキスト表示。ready のときは null。
 */
export function MuseumBoardStatusMessage({
  status,
  emptyMessage = "表示できるデータがまだありません。",
  className = "text-[13px] text-museum-ivory-soft",
}: Props) {
  if (status === "loading") {
    return <p className={className}>{MUSEUM_BOARD_LOADING_MESSAGE}</p>;
  }
  if (status === "error") {
    return (
      <p className={className}>
        {getMuseumCloudLoadState().errorMessage ?? MUSEUM_BOARD_ERROR_MESSAGE}
      </p>
    );
  }
  if (status === "empty") {
    return <p className={className}>{emptyMessage}</p>;
  }
  return null;
}
