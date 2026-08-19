/**
 * 月別順位推移（月末スナップショット）
 * Storage: localStorage `probase-museum.standings-history.v1`
 * 最終順位本体は `team-standings.v1`（Step6）。final 表示は必要に応じてそちらを参照。
 */

export type {
  StandingsCheckpoint,
  StandingsHistoryRecord,
} from "./types";

export {
  STANDINGS_CHECKPOINTS,
  STANDINGS_CHECKPOINT_LABELS,
  isStandingsCheckpoint,
} from "./types";

export {
  STANDINGS_HISTORY_STORAGE_KEY,
  getStandingsHistoryCheckpoint,
  listStandingsHistory,
  listStandingsHistoryForSeason,
  standingsHistoryKey,
  upsertStandingsHistory,
} from "./store";

export {
  buildStandingsTrendBoard,
  getCheckpointStandingsForEdit,
  type StandingsTrendBoardData,
  type StandingsTrendSeries,
} from "./buildTrend";
