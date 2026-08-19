export { BATTER_TITLES, PITCHER_TITLES, titlesForRole } from "./defs";
export type {
  TitleDef,
  TitleEligibility,
  TitleRole,
  TitleValueFormat,
} from "./defs";
export { buildTitleRankings } from "./buildRankings";
export type {
  TitleLeagueBoard,
  TitleRankEntry,
  TitleRankingsResult,
  TitleSection,
} from "./buildRankings";
export { formatTitleValue } from "./format";
export {
  getTitleHistoryLabel,
  listTitleWinHistory,
  listTitleWinsForSeason,
  upsertTitleWinner,
  upsertTitleBoard,
} from "./history";
export type { TitleWinRecord } from "./history";
