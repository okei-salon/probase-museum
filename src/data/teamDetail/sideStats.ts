/**
 * 1球団の打撃／投手：年度一覧＋通算（既存 teamSeasonStats を参照）
 * Step14: BLUE / RED を別シーズン行として表示。
 */

import type { TeamId } from "@/data/teams";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  type SeasonWorld,
} from "@/data/seasons";
import {
  battingFieldLabel,
  formatTeamBattingField,
  formatTeamPitchingField,
  getTeamCareerBatting,
  getTeamCareerPitching,
  listTeamSeasonStatsByTeam,
  pitchingFieldLabel,
  teamSeasonToBattingValues,
  teamSeasonToPitchingValues,
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
  type TeamSeasonBatting,
  type TeamSeasonPitching,
  type TeamSeasonStatsRecord,
} from "@/data/teamSeasonStats";

/** 球団詳細：正式打撃全項目 + 盗塁死（sba-sb 導出） */
export const TEAM_DETAIL_BATTING_KEYS = [
  ...TEAM_BATTING_FIELD_KEYS.flatMap((key) =>
    key === "sb" ? (["sb", "cs"] as const) : ([key] as const),
  ),
] as const;

/** 被本塁打・被打率など正式保存フィールドを含む投手表示キー */
export const TEAM_DETAIL_PITCHING_KEYS = [
  ...TEAM_PITCHING_FIELD_KEYS,
] as const;

export type TeamStatFieldRow = {
  key: string;
  label: string;
  valueText: string;
};

function battingLabel(key: string) {
  if (key === "cs") return "盗塁死";
  return battingFieldLabel(key);
}

function hasBattingKey(batting: TeamSeasonBatting, key: string): boolean {
  if (key === "cs") {
    return batting.counting.sba > 0 || batting.counting.sb > 0;
  }
  const values = teamSeasonToBattingValues({
    id: "",
    year: 0,
    teamId: "tigers",
    teamName: "",
    competition: "regular",
    batting,
    pitching: null,
    source: "manual",
    createdAt: "",
    updatedAt: "",
  });
  const v = values[key];
  if (v == null || v === -1 || v === -999) return false;
  return true;
}

function hasPitchingKey(pitching: TeamSeasonPitching, key: string): boolean {
  const values = teamSeasonToPitchingValues({
    id: "",
    year: 0,
    teamId: "tigers",
    teamName: "",
    competition: "regular",
    batting: null,
    pitching,
    source: "manual",
    createdAt: "",
    updatedAt: "",
  });
  const v = values[key];
  if (v == null || v === -1 || v === -999) return false;
  // 先発／救援防御率は IP 不明時は出さない
  if (
    (key === "starterEra" || key === "reliefEra") &&
    pitching.derived[key as "starterEra" | "reliefEra"] == null &&
    pitching.screenRates?.[key as "starterEra" | "reliefEra"] == null
  ) {
    return false;
  }
  return true;
}

function battingFieldsFromBatting(
  batting: TeamSeasonBatting,
): TeamStatFieldRow[] {
  const out: TeamStatFieldRow[] = [];
  for (const key of TEAM_DETAIL_BATTING_KEYS) {
    if (key === "cs") {
      if (!hasBattingKey(batting, key)) continue;
      const cs = Math.max(0, batting.counting.sba - batting.counting.sb);
      out.push({ key, label: battingLabel(key), valueText: String(cs) });
      continue;
    }
    if (!hasBattingKey(batting, key)) continue;
    out.push({
      key,
      label: battingLabel(key),
      valueText: formatTeamBattingField(
        key,
        batting.counting,
        batting.derived,
        batting.screenRates,
      ),
    });
  }
  return out;
}

function pitchingFieldsFromPitching(
  pitching: TeamSeasonPitching,
): TeamStatFieldRow[] {
  const out: TeamStatFieldRow[] = [];
  for (const key of TEAM_DETAIL_PITCHING_KEYS) {
    if (!hasPitchingKey(pitching, key)) continue;
    out.push({
      key,
      label: pitchingFieldLabel(key),
      valueText: formatTeamPitchingField(
        key,
        pitching.counting,
        pitching.derived,
        pitching.screenRates,
      ),
    });
  }
  return out;
}

export type TeamSideYearOption = {
  year: number;
  world?: SeasonWorld | null;
  seasonKey: string;
  seasonLabel: string;
  fields: TeamStatFieldRow[];
};

export type TeamSideBoard = {
  years: TeamSideYearOption[];
  career: TeamStatFieldRow[] | null;
};

function optionFromRecord(
  r: TeamSeasonStatsRecord,
  fields: TeamStatFieldRow[],
): TeamSideYearOption {
  const identity = identityFromWorldYear(r.year, r.world);
  return {
    year: identity.year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    seasonLabel: formatSeasonLineLabel(identity),
    fields,
  };
}

export function buildTeamBattingBoard(teamId: TeamId): TeamSideBoard {
  const records = listTeamSeasonStatsByTeam(teamId, "regular")
    .filter((r): r is TeamSeasonStatsRecord & { batting: TeamSeasonBatting } =>
      Boolean(r.batting),
    )
    .sort(
      (a, b) =>
        a.year - b.year ||
        String(a.world ?? "").localeCompare(String(b.world ?? "")),
    );

  const years = records.map((r) =>
    optionFromRecord(r, battingFieldsFromBatting(r.batting)),
  );

  const careerBat = getTeamCareerBatting(teamId);
  return {
    years,
    career: careerBat ? battingFieldsFromBatting(careerBat) : null,
  };
}

export function buildTeamPitchingBoard(teamId: TeamId): TeamSideBoard {
  const records = listTeamSeasonStatsByTeam(teamId, "regular")
    .filter(
      (r): r is TeamSeasonStatsRecord & { pitching: TeamSeasonPitching } =>
        Boolean(r.pitching),
    )
    .sort(
      (a, b) =>
        a.year - b.year ||
        String(a.world ?? "").localeCompare(String(b.world ?? "")),
    );

  const years = records.map((r) =>
    optionFromRecord(r, pitchingFieldsFromPitching(r.pitching)),
  );

  const careerPit = getTeamCareerPitching(teamId);
  return {
    years,
    career: careerPit ? pitchingFieldsFromPitching(careerPit) : null,
  };
}
