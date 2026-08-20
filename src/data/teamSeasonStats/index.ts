/**
 * チーム年度成績マスター（正式保存）
 *
 * Storage: localStorage `probase-museum.team-season-stats.v1`
 * Key: 正式 `${world}:${year}:${teamId}:${competition}` /
 *      レガシー `${year}:${teamId}:${competition}`  (regular | interleague)
 *
 * batting / pitching 全項目 — 率は counting から再計算可能なものは再計算。
 * 通算は年度率の平均ではなく、カウント合算後に再計算。
 */

export type {
  TeamBattingCounting,
  TeamBattingDerived,
  TeamBattingFieldKey,
  TeamBattingScreenRates,
  TeamCompetition,
  TeamPitchingCounting,
  TeamPitchingDerived,
  TeamPitchingFieldKey,
  TeamPitchingScreenRates,
  TeamSeasonBatting,
  TeamSeasonPitching,
  TeamSeasonStatsRecord,
  TeamSeasonStatsSource,
} from "./types";

export {
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
  teamSeasonStatsKey,
} from "./types";

export {
  aggregateTeamBattingCounting,
  aggregateTeamPitchingCounting,
  buildTeamSeasonBatting,
  buildTeamSeasonPitching,
  computeTeamBattingDerived,
  computeTeamPitchingDerived,
  formatTeamBattingField,
  formatTeamPitchingField,
  mergeTeamSeasonBatting,
  normalizeTeamBattingCounting,
  normalizeTeamPitchingCounting,
  resolveSingles,
  resolveTb,
  totalEr,
} from "./compute";

export {
  formalTeamBattingColumns,
  formalTeamPitchingColumns,
  battingFieldLabel,
  pitchingFieldLabel,
} from "./columns";

export {
  TEAM_SEASON_STATS_STORAGE_KEY,
  getTeamSeasonStats,
  listTeamSeasonStats,
  listTeamSeasonStatsByTeam,
  listTeamSeasonStatsByYear,
  listTeamSeasonStatsForSeason,
  upsertTeamSeasonStats,
} from "./store";

export {
  getOfficialTeamBattingRows,
  getOfficialTeamPitchingRows,
  recordsToBattingRows,
  recordsToPitchingRows,
  teamSeasonToBattingValues,
  teamSeasonToPitchingValues,
  emptyTeamSlots,
  ipOutsLabel,
} from "./adapters";

export {
  getTeamCareerBatting,
  getTeamCareerPitching,
} from "./career";

export {
  buildLayoutSampleBattingRows,
  buildLayoutSamplePitchingRows,
} from "./sampleLayout";
