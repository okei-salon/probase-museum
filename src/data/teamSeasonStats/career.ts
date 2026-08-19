import {
  aggregateTeamBattingCounting,
  aggregateTeamPitchingCounting,
  buildTeamSeasonBatting,
  buildTeamSeasonPitching,
} from "./compute";
import { listTeamSeasonStatsByTeam } from "./store";
import type { TeamId } from "@/data/teams";
import type {
  TeamCompetition,
  TeamSeasonBatting,
  TeamSeasonPitching,
} from "./types";

/** 球団の複数年通算打撃（既定は通常シーズンのみ合算） */
export function getTeamCareerBatting(
  teamId: TeamId,
  competition: TeamCompetition = "regular",
): TeamSeasonBatting | null {
  const rows = listTeamSeasonStatsByTeam(teamId, competition)
    .map((r) => r.batting?.counting)
    .filter((c): c is NonNullable<typeof c> => c != null);
  if (rows.length === 0) return null;
  return buildTeamSeasonBatting(aggregateTeamBattingCounting(rows));
}

/** 球団の複数年通算投手（既定は通常シーズンのみ合算） */
export function getTeamCareerPitching(
  teamId: TeamId,
  competition: TeamCompetition = "regular",
): TeamSeasonPitching | null {
  const rows = listTeamSeasonStatsByTeam(teamId, competition)
    .map((r) => r.pitching?.counting)
    .filter((c): c is NonNullable<typeof c> => c != null);
  if (rows.length === 0) return null;
  return buildTeamSeasonPitching(aggregateTeamPitchingCounting(rows));
}
