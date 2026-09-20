/**
 * 選手・年度別成績テーブル用：
 * - 年度行の金銀銅（同年同WORLD・同リーグ内の順位）
 * - 通算行の歴代順位（RECORDS 通算と同一 pool）
 *
 * 集計・規定は recordsRankings を再利用する。保存データは変更しない。
 */

import type { LeagueSide } from "@/data/playerStats";
import {
  listSeasonLinesForSeason,
  type PlayerSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  normalizeSeasonWorld,
} from "@/data/seasons";
import { getTeam, type TeamId } from "@/data/teams";
import {
  buildTeamGamesContext,
  evaluateG30Ip30Qualified,
} from "@/lib/stats";
import {
  getPlayerCareerStatCards,
  type PlayerCareerStatCard,
} from "./careerRankings";
import {
  BATTER_SEASON_STATS,
  PITCHER_SEASON_STATS,
  statsForRoleCareer,
  type RecordsRole,
  type RecordsStatDef,
} from "./defs";
import {
  eligibleSeasonLine,
  seasonBatterValue,
  seasonPitcherValue,
} from "./seasonRankings";

export type SeasonMedalTier = 1 | 2 | 3;

export type SeasonMedalInfo = {
  rank: SeasonMedalTier;
  /** tooltip 用 */
  title: string;
};

export type CareerRankInfo = {
  rank: number;
  label: string;
};

function leagueFromTeamId(teamId: TeamId): LeagueSide {
  return getTeam(teamId)?.league === "パ" ? "pacific" : "central";
}

function leagueLabel(league: LeagueSide): string {
  return league === "pacific" ? "パ・リーグ" : "セ・リーグ";
}

/** テーブル列キー → RECORDS 指標 id（対応なしは null） */
const BATTER_COL_TO_DEF: Record<string, string> = {
  avg: "avg",
  h: "h",
  hr: "hr",
  rbi: "rbi",
  r: "r",
  sb: "sb",
  doubles: "doubles",
  triples: "triples",
  bb: "bb",
  obp: "obp",
  slg: "slg",
  ops: "ops",
  rispAvg: "risp",
  sac: "sac",
  csRate: "csRate",
};

const PITCHER_COL_TO_DEF: Record<string, string> = {
  era: "era",
  w: "w",
  winPct: "winPct",
  ip: "ip",
  so: "so",
  soRate: "soRate",
  whip: "whip",
  sv: "sv",
  hp: "hp",
  g: "g",
  cg: "cg",
  sho: "sho",
  qs: "qs",
  qsRate: "qsRate",
  /** 通算のみ。シーズン RECORDS に無いため年度メダルは付けない */
  hqsRate: "hqsRate",
  reliefEra: "reliefEra",
  reliefSoRate: "reliefSoRate",
};

export function recordsDefIdForColumn(
  role: RecordsRole,
  columnKey: string,
): string | null {
  const map = role === "batter" ? BATTER_COL_TO_DEF : PITCHER_COL_TO_DEF;
  return map[columnKey] ?? null;
}

function seasonDefsForRole(role: RecordsRole): RecordsStatDef[] {
  return role === "batter" ? BATTER_SEASON_STATS : PITCHER_SEASON_STATS;
}

function competitionRank(
  sortedValues: { playerId: string; value: number }[],
  playerId: string,
): number | null {
  let i = 0;
  while (i < sortedValues.length) {
    const score = sortedValues[i]!.value;
    let j = i;
    while (j < sortedValues.length && sortedValues[j]!.value === score) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      if (sortedValues[k]!.playerId === playerId) return rank;
    }
    i = j;
  }
  return null;
}

/**
 * 年度個人ランキング（PlayerStatsExplorer）に合わせた救援系の値・規定。
 * テーブル表示もシーズン防御率／奪三振率のミラーのため、RECORDS の救援専用カウントは使わない。
 */
function personalReliefValue(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
  defId: "reliefEra" | "reliefSoRate",
): number | null {
  if (defId === "reliefEra") return line.derived.era;
  return line.derived.soRate;
}

function personalReliefEligible(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
): boolean {
  return evaluateG30Ip30Qualified({
    g: line.counting.g,
    ipOuts: line.counting.ipOuts,
  });
}

function lineValueForDef(
  line: PlayerSeasonLine,
  def: RecordsStatDef,
): number | null {
  if (line.role === "batter") {
    return seasonBatterValue(line, def);
  }
  if (def.id === "reliefEra" || def.id === "reliefSoRate") {
    return personalReliefValue(line, def.id);
  }
  return seasonPitcherValue(line, def);
}

function lineEligibleForDef(
  line: PlayerSeasonLine,
  def: RecordsStatDef,
  teamGamesCtx: ReturnType<typeof buildTeamGamesContext>,
  scope: SeasonLineScope,
): boolean {
  if (line.role === "pitcher" && (def.id === "reliefEra" || def.id === "reliefSoRate")) {
    return personalReliefEligible(line);
  }
  const el = eligibleSeasonLine(line, def, teamGamesCtx, scope);
  if (el.unknown || !el.ok) return false;
  if (def.id === "qsRate" && line.role === "pitcher") {
    if ((line.counting.gs ?? 0) <= 0) return false;
  }
  return true;
}

/**
 * 同一 year + world + scope + league 内で、RECORDS シーズン規定に基づく順位を求める。
 * 1〜3位のみ返す（メダル用）。同値は同順位。
 */
export function getSeasonMedalMapForLine(
  line: PlayerSeasonLine,
): Map<string, SeasonMedalInfo> {
  const out = new Map<string, SeasonMedalInfo>();
  const role = line.role as RecordsRole;
  const scope = line.scope;
  const world = normalizeSeasonWorld(line.world);
  const league = leagueFromTeamId(line.teamId);
  const identity = identityFromWorldYear(line.year, world);

  const peers = listSeasonLinesForSeason(identity).filter(
    (l) =>
      l.role === role &&
      l.scope === scope &&
      leagueFromTeamId(l.teamId) === league,
  );

  const teamGamesCtx = buildTeamGamesContext({
    scope: scope === "interleague" ? "interleague" : "pennant",
    year: line.year,
    world: world ?? null,
  });

  const seasonLabel = formatSeasonLineLabel({
    year: line.year,
    world: line.world,
  });
  const leagueText = leagueLabel(league);

  const defs = seasonDefsForRole(role);
  const colByDef = new Map<string, string>();
  const map = role === "batter" ? BATTER_COL_TO_DEF : PITCHER_COL_TO_DEF;
  for (const [col, defId] of Object.entries(map)) {
    // シーズン RECORDS に無い指標（hqsRate）は年度メダル対象外
    if (!defs.some((d) => d.id === defId)) continue;
    colByDef.set(defId, col);
  }

  for (const def of defs) {
    const col = colByDef.get(def.id);
    if (!col) continue;

    const pool: { playerId: string; value: number }[] = [];
    for (const peer of peers) {
      if (!lineEligibleForDef(peer, def, teamGamesCtx, scope)) continue;
      const value = lineValueForDef(peer, def);
      if (value == null || !Number.isFinite(value)) continue;
      pool.push({ playerId: peer.playerId, value });
    }

    const sorted = [...pool].sort((a, b) => {
      if (def.lowerIsBetter) return a.value - b.value;
      return b.value - a.value;
    });

    const rank = competitionRank(sorted, line.playerId);
    if (rank == null || rank > 3) continue;

    out.set(col, {
      rank: rank as SeasonMedalTier,
      title: `${seasonLabel}・${leagueText} ${def.label}${rank}位`,
    });
  }

  return out;
}

/**
 * RECORDS 通算記録と同一の集計・規定で、列キー→歴代順位。
 * 規定外・非対応列は含めない（31位以下も返す）。
 */
export function getCareerRankMapForPlayer(
  playerId: string,
  role: RecordsRole,
  scope: SeasonLineScope = "pennant",
): Map<string, CareerRankInfo> {
  const cards = getPlayerCareerStatCards(playerId, role, scope);
  const byDefId = new Map<string, PlayerCareerStatCard>();
  for (const card of cards) {
    byDefId.set(card.def.id, card);
  }

  const out = new Map<string, CareerRankInfo>();
  const map = role === "batter" ? BATTER_COL_TO_DEF : PITCHER_COL_TO_DEF;
  const careerDefs = new Set(statsForRoleCareer(role).map((d) => d.id));

  for (const [col, defId] of Object.entries(map)) {
    if (!careerDefs.has(defId)) continue;
    const card = byDefId.get(defId);
    if (!card || !card.ranked || card.rank == null) continue;
    out.set(col, {
      rank: card.rank,
      label: `通算${card.rank}位`,
    });
  }

  return out;
}

export function medalTextClass(rank: SeasonMedalTier): string {
  switch (rank) {
    case 1:
      return "text-[color:var(--museum-rank-gold,#d4af37)]";
    case 2:
      return "text-[color:var(--museum-rank-silver,#7dd3fc)]";
    case 3:
      return "text-[color:var(--museum-rank-bronze,#c9854a)]";
  }
}
