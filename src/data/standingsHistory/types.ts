import type { SeasonWorld } from "@/data/seasons";
import type { StandingEntry } from "@/data/teamStandings";

/**
 * 保存・読取で認識する checkpoint。
 * "09" はレガシー互換のため型として残すが、順位推移表示・登録UIでは使わない。
 */
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

/** 順位推移グラフ／登録UIの時点（04〜08 + final。09 は出さない） */
export const STANDINGS_TREND_CHECKPOINTS = [
  "04",
  "05",
  "06",
  "07",
  "08",
  "final",
] as const;

export type StandingsTrendCheckpoint =
  (typeof STANDINGS_TREND_CHECKPOINTS)[number];

export const STANDINGS_CHECKPOINT_LABELS: Record<StandingsCheckpoint, string> =
  {
    "04": "4月終了",
    "05": "5月終了",
    "06": "6月終了",
    "07": "7月終了",
    "08": "8月終了",
    "09": "9月終了",
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
