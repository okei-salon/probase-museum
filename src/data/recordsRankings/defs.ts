import {
  requiredIpOuts,
  requiredPlateAppearances,
} from "@/lib/stats/qualification";
import { formatIpFromDecimalInnings } from "@/lib/manualEntry/normalizeInput";
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
  | "wins_13" // 勝率（シーズン記録）：13勝以上 ※通算は ip_100 を使用
  | "ip_100" // 勝率・QS率：100投球回×シーズン数（アウト数で判定）
  | "risp_50" // 得点圏打席50以上
  | "cs_30" // 被盗企30以上
  | "relief_30"; // 救援：救援IP・救援登板推定が 30×シーズン数以上

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
  /** 1シーズンあたりの救援投球回（イニング） */
  reliefIpPerSeason: number;
  /** 1シーズンあたりの救援投球回（アウト数）＝30回×3 */
  reliefIpOutsPerSeason: number;
  /**
   * 1シーズンあたりの救援登板数。
   * 専用フィールドが無いため、通算では g−gs 推定に使う。
   */
  reliefGPerSeason: number;
  /** 勝率・QS率用：1シーズンあたり100投球回（アウト数） */
  ip100OutsPerSeason: number;
};

/** RECORDS 通算ランキングの表示上限（同順位は枠内に全員含める） */
export const RECORDS_CAREER_RANK_LIMIT = 30;

/** 勝率・QS率：1シーズンあたり100投球回＝300アウト */
export const CAREER_IP_100_OUTS_PER_SEASON = 300;

function buildCareerQualifiers(gamesPerSeason: number): CareerQualifiers {
  const scale = gamesPerSeason / CAREER_PENNANT_GAMES;
  const reliefIp = Math.max(1, Math.floor(30 * scale));
  return {
    paPerSeason: requiredPlateAppearances(gamesPerSeason),
    ipPerSeason: gamesPerSeason,
    ipOutsPerSeason: requiredIpOuts(gamesPerSeason),
    // 得点圏・盗塁阻止・救援は143試合基準を試合数比で縮小（交流戦で到達不能にしない）
    rispAbPerSeason: Math.max(1, Math.floor(50 * scale)),
    csAttemptedPerSeason: Math.max(1, Math.floor(30 * scale)),
    reliefIpPerSeason: reliefIp,
    reliefIpOutsPerSeason: reliefIp * 3,
    reliefGPerSeason: Math.max(1, Math.floor(30 * scale)),
    ip100OutsPerSeason: Math.max(
      3,
      Math.round(CAREER_IP_100_OUTS_PER_SEASON * scale),
    ),
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
  // シーズン記録の勝率は従来どおり13勝以上。通算は statsForRoleCareer で ip_100 に切替。
  { id: "winPct", label: "勝率", role: "pitcher", format: "pct", eligibility: "wins_13" },
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
  // シーズン記録のQS率は規定なし（先発1以上のみ）。通算は ip_100。
  { id: "qsRate", label: "QS率", role: "pitcher", format: "pct", eligibility: "none" },
  { id: "reliefEra", label: "救援防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "relief_30" },
  { id: "reliefSoRate", label: "救援奪三振率", role: "pitcher", format: "rate2", eligibility: "relief_30" },
];

export function statsForRole(role: RecordsRole): RecordsStatDef[] {
  return role === "batter" ? BATTER_SEASON_STATS : PITCHER_SEASON_STATS;
}

/** 通算記録用。勝率・QS率のみ投球回100×シーズン数の規定に切替える */
export function statsForRoleCareer(role: RecordsRole): RecordsStatDef[] {
  return statsForRole(role).map((def) => {
    if (def.id === "winPct" || def.id === "qsRate") {
      return { ...def, eligibility: "ip_100" as const };
    }
    return def;
  });
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
    case "ip":
      // value は outs/3 の小数イニング → 野球表記（.1=1/3, .2=2/3）
      return formatIpFromDecimalInnings(value);
    default:
      return String(Math.round(value));
  }
}

/** 通算勝率の表示：.743（26勝9敗） */
export function formatCareerWinPctValueText(
  winPct: number,
  w: number,
  l: number,
): string {
  return `${formatRecordsValue("pct", winPct)}（${w}勝${l}敗）`;
}

/** 通算QS率の表示：.813（26QS／32先発） */
export function formatCareerQsRateValueText(
  qsRate: number,
  qs: number,
  gs: number,
): string {
  return `${formatRecordsValue("pct", qsRate)}（${qs}QS／${gs}先発）`;
}
