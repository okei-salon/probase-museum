/**
 * 月別順位推移（月末スナップショット）
 * Storage: localStorage `probase-museum.standings-history.v1`
 * + museum_documents(collection=standings_history)
 * 最終順位本体は `team-standings.v1`（Step6）。final 表示は必要に応じてそちらを参照。
 */

export type {
  StandingsCheckpoint,
  StandingsHistoryRecord,
} from "./types";

export {
  STANDINGS_CHECKPOINTS,
  STANDINGS_TREND_CHECKPOINTS,
  STANDINGS_CHECKPOINT_LABELS,
  isStandingsCheckpoint,
} from "./types";

export type { StandingsTrendCheckpoint } from "./types";

export {
  STANDINGS_HISTORY_STORAGE_KEY,
  getStandingsHistoryCheckpoint,
  hydrateStandingsHistoryFromCloud,
  listStandingsHistory,
  listStandingsHistoryForSeason,
  standingsHistoryKey,
  syncStandingsHistoryWithCloud,
  upsertStandingsHistory,
  upsertStandingsHistoryAsync,
} from "./store";

export {
  buildStandingsTrendBoard,
  getCheckpointStandingsForEdit,
  type StandingsTrendBoardData,
  type StandingsTrendSeries,
} from "./buildTrend";
