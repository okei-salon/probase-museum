/**
 * 球団通算カード＋12球団順位（teamSeasonStats 通算を再利用）
 */

import { npbTeams, type TeamId } from "@/data/teams";
import {
  formatTeamBattingField,
  formatTeamPitchingField,
  getTeamCareerBatting,
  getTeamCareerPitching,
  teamSeasonToBattingValues,
  teamSeasonToPitchingValues,
} from "@/data/teamSeasonStats";
import { listAllTeamsCareerWinRecords } from "./seasonResults";
import {
  formatWinPctDisplay,
  outsToIpDisplay,
} from "@/lib/manualEntry/normalizeInput";

export type TeamCareerCard = {
  id: string;
  label: string;
  valueText: string;
  rank: number | null;
  lowerIsBetter?: boolean;
};

type NumericCardDef = {
  id: string;
  label: string;
  getValue: (teamId: TeamId) => number | null;
  format: (teamId: TeamId, v: number) => string;
  lowerIsBetter?: boolean;
};

function battingNum(teamId: TeamId, key: string): number | null {
  const b = getTeamCareerBatting(teamId);
  if (!b) return null;
  const values = teamSeasonToBattingValues({
    id: "",
    year: 0,
    teamId,
    teamName: "",
    competition: "regular",
    batting: b,
    pitching: null,
    source: "manual",
    createdAt: "",
    updatedAt: "",
  });
  const v = values[key];
  if (v == null || v < 0) return null;
  return v;
}

function pitchingNum(teamId: TeamId, key: string): number | null {
  const p = getTeamCareerPitching(teamId);
  if (!p) return null;
  const values = teamSeasonToPitchingValues({
    id: "",
    year: 0,
    teamId,
    teamName: "",
    competition: "regular",
    batting: null,
    pitching: p,
    source: "manual",
    createdAt: "",
    updatedAt: "",
  });
  const v = values[key];
  if (v == null || v < 0) return null;
  return v;
}

function rankAmong(
  teamId: TeamId,
  getValue: (id: TeamId) => number | null,
  lowerIsBetter?: boolean,
): number | null {
  const pool = npbTeams
    .map((t) => ({ teamId: t.id, value: getValue(t.id) }))
    .filter((x): x is { teamId: TeamId; value: number } => x.value != null);

  if (!pool.some((p) => p.teamId === teamId)) return null;

  const sorted = [...pool].sort((a, b) =>
    lowerIsBetter ? a.value - b.value : b.value - a.value,
  );

  let rank = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i]!.value !== sorted[i - 1]!.value) {
      rank = i + 1;
    }
    if (sorted[i]!.teamId === teamId) return rank;
  }
  return null;
}

const CARD_DEFS: NumericCardDef[] = [
  {
    id: "winPct",
    label: "通算勝率",
    getValue: (id) =>
      listAllTeamsCareerWinRecords().find((r) => r.teamId === id)?.winPct ??
      null,
    format: (_id, v) => formatWinPctDisplay(v),
  },
  {
    id: "w",
    label: "通算勝利",
    getValue: (id) => {
      const r = listAllTeamsCareerWinRecords().find((x) => x.teamId === id);
      return r && (r.w > 0 || r.l > 0) ? r.w : null;
    },
    format: (_id, v) => `${v}勝`,
  },
  {
    id: "avg",
    label: "通算打率",
    getValue: (id) => battingNum(id, "avg"),
    format: (id) => {
      const b = getTeamCareerBatting(id)!;
      return formatTeamBattingField("avg", b.counting, b.derived);
    },
  },
  {
    id: "hr",
    label: "通算本塁打",
    getValue: (id) => battingNum(id, "hr"),
    format: (_id, v) => `${Math.round(v)}本`,
  },
  {
    id: "ops",
    label: "通算OPS",
    getValue: (id) => battingNum(id, "ops"),
    format: (id) => {
      const b = getTeamCareerBatting(id)!;
      return formatTeamBattingField("ops", b.counting, b.derived);
    },
  },
  {
    id: "r",
    label: "通算得点",
    getValue: (id) => battingNum(id, "r"),
    format: (_id, v) => `${Math.round(v)}`,
  },
  {
    id: "era",
    label: "通算防御率",
    getValue: (id) => pitchingNum(id, "era"),
    format: (id) => {
      const p = getTeamCareerPitching(id)!;
      return formatTeamPitchingField(
        "era",
        p.counting,
        p.derived,
        p.screenRates,
      );
    },
    lowerIsBetter: true,
  },
  {
    id: "so",
    label: "通算奪三振",
    getValue: (id) => pitchingNum(id, "so"),
    format: (_id, v) => `${Math.round(v)}`,
  },
  {
    id: "ip",
    label: "通算投球回",
    getValue: (id) => pitchingNum(id, "ip"),
    format: (id) => {
      const p = getTeamCareerPitching(id)!;
      return outsToIpDisplay(p.counting.ipOuts);
    },
  },
];

export function buildTeamCareerCards(teamId: TeamId): TeamCareerCard[] {
  const cards: TeamCareerCard[] = [];
  for (const def of CARD_DEFS) {
    const value = def.getValue(teamId);
    if (value == null) continue;
    cards.push({
      id: def.id,
      label: def.label,
      valueText: def.format(teamId, value),
      rank: rankAmong(teamId, def.getValue, def.lowerIsBetter),
      lowerIsBetter: def.lowerIsBetter,
    });
  }
  return cards;
}
