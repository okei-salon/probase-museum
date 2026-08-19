import type { StandingRow } from "@/components/views/StandingsTable";
import type { TeamId } from "@/data/teams";
import type { SeasonWorld } from "@/data/seasons";

/** 交流戦順位1行（最終順位と同型） */
export type InterleagueStandingEntry = StandingRow & {
  teamId?: TeamId;
};

/** セ×パ 対戦マトリクス */
export type InterleagueMatrix = {
  rowTeams: string[];
  colTeams: string[];
  cells: string[][];
};

/**
 * 交流戦シーズン結果（順位 + 対戦表 + 優勝）。
 * Step13: 正式 WORLD のみ world を付与。レガシーは null。
 */
export type InterleagueSeasonRecord = {
  /**
   * 正式: `${world}:${year}`（例: BLUE:2026）
   * レガシー／DEMO: `${year}`（例: 2023）
   */
  id: string;
  year: number;
  world?: SeasonWorld | null;
  standings: InterleagueStandingEntry[];
  matrix: InterleagueMatrix;
  /** 交流戦優勝球団名（未設定時は順位1位から導出可） */
  champion?: string | null;
  championTeamId?: TeamId | null;
  source: "manual" | "ocr" | "import" | "static";
  createdAt: string;
  updatedAt: string;
};
