import type { SeasonWorld } from "@/data/seasons";
import type { StandingEntry } from "@/data/teamStandings";

/** 月末チェックポイント（4〜9月終了時 + 最終） */
export const STANDINGS_CHECKPOINTS = [
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "final",
] as const;

export type StandingsCheckpoint = (typeof STANDINGS_CHECKPOINTS)[number];

export const STANDINGS_CHECKPOINT_LABELS: Record<StandingsCheckpoint, string> =
  {
    "04": "4月終了時",
    "05": "5月終了時",
    "06": "6月終了時",
    "07": "7月終了時",
    "08": "8月終了時",
    "09": "9月終了時",
    final: "最終",
  };

export function isStandingsCheckpoint(
  value: string,
): value is StandingsCheckpoint {
  return (STANDINGS_CHECKPOINTS as readonly string[]).includes(value);
}

/**
 * 1シーズン × 1時点の順位スナップショット。
 * セ・パの行型は最終順位（StandingEntry）を再利用する。
 */
export type StandingsHistoryRecord = {
  /**
   * 正式: `${world}:${year}:${checkpoint}`（例: BLUE:2026:04）
   * レガシー／DEMO: `${year}:${checkpoint}`（例: 2000:final）
   */
  id: string;
  year: number;
  world?: SeasonWorld | null;
  checkpoint: StandingsCheckpoint;
  central: StandingEntry[];
  pacific: StandingEntry[];
  source: "manual" | "ocr" | "import" | "sync";
  createdAt: string;
  updatedAt: string;
};
