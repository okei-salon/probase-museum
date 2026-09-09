import type { SeasonWorld } from "@/data/seasons";

/**
 * YEARBOOK 分析用フルデータエクスポート（読み取り専用ペイロード）。
 * 既存 Museum データのスナップショットであり、保存・再計算のソースにはしない。
 */

export type YearbookFullExportSummary = {
  teams: number;
  batters: number;
  pitchers: number;
  catchers: number;
  awards: number;
  records: number;
  sopPlayers: number;
  titlesBatterSections: number;
  titlesPitcherSections: number;
  monthlyMvp: number;
  twoWayPlayers: number;
  playerProfiles: number;
  hasStandings: boolean;
  hasMonthlyStandings: boolean;
  hasInterleague: boolean;
  hasPostseason: boolean;
  hasSeasonReview: boolean;
  seasonReviewSections: {
    general: boolean;
    central: boolean;
    pacific: boolean;
    teams: boolean;
  };
  missingNotes: string[];
};

export type YearbookFullExportPayload = {
  format: "probase-museum-yearbook-full";
  version: 1;
  exportedAt: string;
  year: number;
  world: SeasonWorld | null;
  seasonKey: string;
  seasonLabel: string;
  summary: YearbookFullExportSummary;
  standings: unknown;
  monthlyStandings: unknown[];
  teamBatting: unknown[];
  teamPitching: unknown[];
  batters: unknown[];
  pitchers: unknown[];
  catchers: unknown[];
  titles: {
    batter: unknown;
    pitcher: unknown;
  };
  awards: unknown;
  monthlyMvp: unknown[];
  sop: {
    rankings: unknown[];
    results: unknown[];
    byPlayer: unknown[];
    notes: string[];
  };
  records: unknown[];
  interleague: unknown;
  postseason: unknown;
  twoWayPlayers: unknown[];
  playerProfiles: unknown[];
  seasonReview: string | null;
  seasonReviews: {
    general: string | null;
    central: string | null;
    pacific: string | null;
    teams: string | null;
  };
};

export type YearbookFullExportBundle = {
  payload: YearbookFullExportPayload;
  filenameBase: string;
  jsonText: string;
  txtText: string;
};
