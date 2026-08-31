import {
  requiredIpOuts,
  requiredPlateAppearances,
} from "@/lib/stats/qualification";
import type { SeasonLineScope } from "@/data/playerSeasonLines";

/**
 * RECORDS ランキング定義・規定定数
 */

export type RecordsRole = "batter" | "pitcher";

export type RecordsStatFormat = "int" | "avg" | "era" | "ip" | "rate2" | "pct";

export type RecordsEligibility =
  | "none"
  | "pa_qualified" // 規定打席（チーム試合数×3.1 または保存フラグ）
  | "ip_qualified" // 規定投球回（チーム試合数×1.0 または保存フラグ）
  | "risp_50" // 得点圏打席50以上
  | "cs_30" // 被盗企30以上
  | "relief_30"; // 救援型かつ救援30回以上

export type RecordsStatDef = {
  id: string;
  label: string;
  role: RecordsRole;
  format: RecordsStatFormat;
  lowerIsBetter?: boolean;
  eligibility: RecordsEligibility;
};

/** 通算規定の標準試合数（1シーズンあたり） */
export const CAREER_PENNANT_GAMES = 143;
/** 交流戦の標準試合数（1シーズンあたり） */
export const CAREER_INTERLEAGUE_GAMES = 18;

export type CareerQualifiers = {
  /** 1シーズンあたりの規定打席 */
  paPerSeason: number;
  /** 1シーズンあたりの規定投球回（イニング） */
  ipPerSeason: number;
  /** 1シーズンあたりの規定投球回（アウト数） */
  ipOutsPerSeason: number;
  rispAbPerSeason: number;
  csAttemptedPerSeason: number;
  reliefIpPerSeason: number;
};

function buildCareerQualifiers(gamesPerSeason: number): CareerQualifiers {
  const scale = gamesPerSeason / CAREER_PENNANT_GAMES;
  return {
    paPerSeason: requiredPlateAppearances(gamesPerSeason),
    ipPerSeason: gamesPerSeason,
    ipOutsPerSeason: requiredIpOuts(gamesPerSeason),
    // 得点圏・盗塁阻止・救援は143試合基準を試合数比で縮小（交流戦で到達不能にしない）
    rispAbPerSeason: Math.max(1, Math.floor(50 * scale)),
    csAttemptedPerSeason: Math.max(1, Math.floor(30 * scale)),
    reliefIpPerSeason: Math.max(1, Math.floor(30 * scale)),
  };
}

/** 通算規定の係数（1シーズンあたり・標準143試合換算）※通常シーズン用 */
export const CAREER_QUALIFIERS: CareerQualifiers = buildCareerQualifiers(
  CAREER_PENNANT_GAMES,
);

/** 交流戦通算規定（1シーズンあたり・標準18試合換算） */
export const CAREER_INTERLEAGUE_QUALIFIERS: CareerQualifiers =
  buildCareerQualifiers(CAREER_INTERLEAGUE_GAMES);

/** scope に応じた通算規定。pennant は143試合、interleague は18試合。 */
export function careerQualifiersForScope(
  scope: SeasonLineScope = "pennant",
): CareerQualifiers {
  return scope === "interleague"
    ? CAREER_INTERLEAGUE_QUALIFIERS
    : CAREER_QUALIFIERS;
}

export const SEASON_RISP_AB_MIN = 50;
export const SEASON_CS_ATTEMPTED_MIN = 30;
export const SEASON_RELIEF_IP_MIN = 30;

/** 交流戦・歴代の部門別最低ライン（18/143 比例） */
export const INTERLEAGUE_SEASON_RISP_AB_MIN = Math.max(
  1,
  Math.floor((SEASON_RISP_AB_MIN * CAREER_INTERLEAGUE_GAMES) / CAREER_PENNANT_GAMES),
);
export const INTERLEAGUE_SEASON_CS_ATTEMPTED_MIN = Math.max(
  1,
  Math.floor(
    (SEASON_CS_ATTEMPTED_MIN * CAREER_INTERLEAGUE_GAMES) / CAREER_PENNANT_GAMES,
  ),
);
export const INTERLEAGUE_SEASON_RELIEF_IP_MIN = Math.max(
  1,
  Math.floor(
    (SEASON_RELIEF_IP_MIN * CAREER_INTERLEAGUE_GAMES) / CAREER_PENNANT_GAMES,
  ),
);

export function seasonRispAbMin(scope: SeasonLineScope = "pennant"): number {
  return scope === "interleague"
    ? INTERLEAGUE_SEASON_RISP_AB_MIN
    : SEASON_RISP_AB_MIN;
}

export function seasonCsAttemptedMin(scope: SeasonLineScope = "pennant"): number {
  return scope === "interleague"
    ? INTERLEAGUE_SEASON_CS_ATTEMPTED_MIN
    : SEASON_CS_ATTEMPTED_MIN;
}

export function seasonReliefIpMin(scope: SeasonLineScope = "pennant"): number {
  return scope === "interleague"
    ? INTERLEAGUE_SEASON_RELIEF_IP_MIN
    : SEASON_RELIEF_IP_MIN;
}

export const BATTER_SEASON_STATS: RecordsStatDef[] = [
  { id: "avg", label: "打率", role: "batter", format: "avg", eligibility: "pa_qualified" },
  { id: "h", label: "安打", role: "batter", format: "int", eligibility: "none" },
  { id: "hr", label: "本塁打", role: "batter", format: "int", eligibility: "none" },
  { id: "rbi", label: "打点", role: "batter", format: "int", eligibility: "none" },
  { id: "r", label: "得点", role: "batter", format: "int", eligibility: "none" },
  { id: "sb", label: "盗塁", role: "batter", format: "int", eligibility: "none" },
  { id: "doubles", label: "二塁打", role: "batter", format: "int", eligibility: "none" },
  { id: "triples", label: "三塁打", role: "batter", format: "int", eligibility: "none" },
  { id: "bb", label: "四球", role: "batter", format: "int", eligibility: "none" },
  { id: "obp", label: "出塁率", role: "batter", format: "avg", eligibility: "pa_qualified" },
  { id: "slg", label: "長打率", role: "batter", format: "avg", eligibility: "pa_qualified" },
  { id: "ops", label: "OPS", role: "batter", format: "avg", eligibility: "pa_qualified" },
  { id: "risp", label: "得点圏打率", role: "batter", format: "avg", eligibility: "risp_50" },
  { id: "sac", label: "犠打", role: "batter", format: "int", eligibility: "none" },
  { id: "csRate", label: "盗塁阻止率", role: "batter", format: "avg", eligibility: "cs_30" },
];

export const PITCHER_SEASON_STATS: RecordsStatDef[] = [
  { id: "era", label: "防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "ip_qualified" },
  { id: "w", label: "勝利", role: "pitcher", format: "int", eligibility: "none" },
  { id: "winPct", label: "勝率", role: "pitcher", format: "pct", eligibility: "ip_qualified" },
  { id: "ip", label: "投球回", role: "pitcher", format: "ip", eligibility: "none" },
  { id: "so", label: "奪三振", role: "pitcher", format: "int", eligibility: "none" },
  { id: "soRate", label: "奪三振率", role: "pitcher", format: "rate2", eligibility: "ip_qualified" },
  { id: "whip", label: "WHIP", role: "pitcher", format: "rate2", lowerIsBetter: true, eligibility: "ip_qualified" },
  { id: "sv", label: "セーブ", role: "pitcher", format: "int", eligibility: "none" },
  { id: "hp", label: "HP", role: "pitcher", format: "int", eligibility: "none" },
  { id: "g", label: "登板", role: "pitcher", format: "int", eligibility: "none" },
  { id: "cg", label: "完投", role: "pitcher", format: "int", eligibility: "none" },
  { id: "sho", label: "完封", role: "pitcher", format: "int", eligibility: "none" },
  { id: "qs", label: "QS", role: "pitcher", format: "int", eligibility: "none" },
  { id: "qsRate", label: "QS率", role: "pitcher", format: "pct", eligibility: "none" },
  { id: "reliefEra", label: "救援防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "relief_30" },
  { id: "reliefSoRate", label: "救援奪三振率", role: "pitcher", format: "rate2", eligibility: "relief_30" },
];

export function statsForRole(role: RecordsRole): RecordsStatDef[] {
  return role === "batter" ? BATTER_SEASON_STATS : PITCHER_SEASON_STATS;
}

export function formatRecordsValue(
  format: RecordsStatFormat,
  value: number,
): string {
  if (!Number.isFinite(value)) return "---";
  switch (format) {
    case "avg":
    case "pct":
      return value.toFixed(3).replace(/^0\./, ".");
    case "era":
    case "rate2":
      return value.toFixed(2);
    case "ip": {
      const outs = Math.round(value * 3);
      const whole = Math.floor(outs / 3);
      const rem = outs % 3;
      return rem === 0 ? String(whole) : `${whole}.${rem}`;
    }
    default:
      return String(Math.round(value));
  }
}
