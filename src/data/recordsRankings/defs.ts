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
  | "relief_30"; // 救援型＋登板30×N・投球回30×N（値は通算ERA/K9）

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
  /**
   * 1シーズンあたりの救援ランキング規定登板数（総登板）。
   * 救援型判定後に 30×シーズン数 で使う。
   */
  reliefGPerSeason: number;
  /** 1シーズンあたりの救援ランキング規定投球回（イニング） */
  reliefIpPerSeason: number;
  /** 1シーズンあたりの救援ランキング規定投球回（アウト数）＝30回×3 */
  reliefIpOutsPerSeason: number;
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

/** シーズン記録用（通算の並び・項目とは別） */
export const PITCHER_SEASON_STATS: RecordsStatDef[] = [
  { id: "era", label: "防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "ip_qualified" },
  { id: "w", label: "勝利", role: "pitcher", format: "int", eligibility: "none" },
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
  { id: "qsRate", label: "QS率", role: "pitcher", format: "pct", eligibility: "none" },
  { id: "reliefEra", label: "救援防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "relief_30" },
  { id: "reliefSoRate", label: "救援奪三振率", role: "pitcher", format: "rate2", eligibility: "relief_30" },
];

/**
 * 通算記録・投手の表示順。
 * QS通算数は出さない（保存・集計は維持）。HQS率を追加。
 */
export const PITCHER_CAREER_STATS: RecordsStatDef[] = [
  { id: "era", label: "防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "ip_qualified" },
  { id: "w", label: "勝利", role: "pitcher", format: "int", eligibility: "none" },
  { id: "winPct", label: "勝率", role: "pitcher", format: "pct", eligibility: "ip_100" },
  { id: "ip", label: "投球回", role: "pitcher", format: "ip", eligibility: "none" },
  { id: "so", label: "奪三振", role: "pitcher", format: "int", eligibility: "none" },
  { id: "soRate", label: "奪三振率", role: "pitcher", format: "rate2", eligibility: "ip_qualified" },
  { id: "whip", label: "WHIP", role: "pitcher", format: "rate2", lowerIsBetter: true, eligibility: "ip_qualified" },
  { id: "cg", label: "完投", role: "pitcher", format: "int", eligibility: "none" },
  { id: "sho", label: "完封", role: "pitcher", format: "int", eligibility: "none" },
  { id: "qsRate", label: "QS率", role: "pitcher", format: "pct", eligibility: "ip_100" },
  { id: "hqsRate", label: "HQS率", role: "pitcher", format: "pct", eligibility: "ip_100" },
  { id: "g", label: "登板", role: "pitcher", format: "int", eligibility: "none" },
  { id: "hp", label: "HP", role: "pitcher", format: "int", eligibility: "none" },
  { id: "sv", label: "セーブ", role: "pitcher", format: "int", eligibility: "none" },
  { id: "reliefEra", label: "救援防御率", role: "pitcher", format: "era", lowerIsBetter: true, eligibility: "relief_30" },
  { id: "reliefSoRate", label: "救援奪三振率", role: "pitcher", format: "rate2", eligibility: "relief_30" },
];

/** 通算投手タブのグループ見出し（先発・共通 / 救援） */
export const PITCHER_CAREER_STAT_GROUPS: {
  id: "starter" | "relief";
  label: string;
  statIds: readonly string[];
}[] = [
  {
    id: "starter",
    label: "先発・共通",
    statIds: [
      "era",
      "w",
      "winPct",
      "ip",
      "so",
      "soRate",
      "whip",
      "cg",
      "sho",
      "qsRate",
      "hqsRate",
    ],
  },
  {
    id: "relief",
    label: "救援",
    statIds: ["g", "hp", "sv", "reliefEra", "reliefSoRate"],
  },
];

export function statsForRole(role: RecordsRole): RecordsStatDef[] {
  return role === "batter" ? BATTER_SEASON_STATS : PITCHER_SEASON_STATS;
}

/** 通算記録用の項目リスト（投手は並び・HQS率・規定を通算仕様に） */
export function statsForRoleCareer(role: RecordsRole): RecordsStatDef[] {
  if (role === "batter") return BATTER_SEASON_STATS;
  return PITCHER_CAREER_STATS;
}

/**
 * 通算ランキングの指標説明。eligibility / 計算と一致させる。
 * （例文の「奪三振率＝100投球回」は実装が規定投球回のため、規定投球回で記載）
 */
export function careerStatDescription(def: RecordsStatDef): string {
  switch (def.id) {
    case "avg":
      return "通算安打÷通算打数。対象：規定打席（443打席×シーズン数）以上。";
    case "h":
      return "通算安打数。多い順に表示。";
    case "hr":
      return "通算本塁打数。多い順に表示。";
    case "rbi":
      return "通算打点数。多い順に表示。";
    case "r":
      return "通算得点数。多い順に表示。";
    case "sb":
      return "通算盗塁数。多い順に表示。";
    case "doubles":
      return "通算二塁打数。多い順に表示。";
    case "triples":
      return "通算三塁打数。多い順に表示。";
    case "bb":
      return "通算四球数。多い順に表示。";
    case "obp":
      return "出塁の割合。対象：規定打席（443打席×シーズン数）以上。";
    case "slg":
      return "長打の割合。対象：規定打席（443打席×シーズン数）以上。";
    case "ops":
      return "出塁率＋長打率。対象：規定打席（443打席×シーズン数）以上。";
    case "risp":
      return "得点圏での打率。対象：得点圏打数50×シーズン数以上。";
    case "sac":
      return "通算犠打数。多い順に表示。";
    case "csRate":
      return "盗塁を刺した割合。対象：被盗塁企図30×シーズン数以上。";
    case "era":
      return "9投球回あたりの自責点。数値が低いほど上位。対象：規定投球回（143回×シーズン数）以上。";
    case "w":
      return "通算勝利数。多い順に表示。";
    case "winPct":
      return "通算勝利数÷通算勝敗数。対象：100投球回×シーズン数以上。";
    case "ip":
      return "通算の投球回数。投球回が多い順に表示。";
    case "so":
      return "通算奪三振数。多い順に表示。";
    case "soRate":
      return "9投球回あたりの奪三振数。対象：規定投球回（143回×シーズン数）以上。";
    case "whip":
      return "1投球回あたりに許した安打と四球の合計。数値が低いほど上位。対象：規定投球回（143回×シーズン数）以上。";
    case "cg":
      return "通算完投数。多い順に表示。";
    case "sho":
      return "通算完封数。多い順に表示。";
    case "qsRate":
      return "先発登板に占めるQSの割合。対象：100投球回×シーズン数以上、かつ先発1以上。";
    case "hqsRate":
      return "先発登板に占めるHQSの割合。対象：100投球回×シーズン数以上、かつ先発1以上。";
    case "g":
      return "通算登板数（先発・救援を含む）。多い順に表示。";
    case "hp":
      return "通算ホールドポイント。多い順に表示。";
    case "sv":
      return "通算セーブ数。多い順に表示。";
    case "reliefEra":
      return "救援型投手を対象とした通算防御率（先発時の成績を分離した値ではない）。対象：30登板・30投球回×シーズン数以上。";
    case "reliefSoRate":
      return "救援型投手を対象とした9投球回あたりの奪三振数（先発時の成績を分離した値ではない）。対象：30登板・30投球回×シーズン数以上。";
    default:
      return "";
  }
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

/** 通算QS率の表示：.813（48先発／39QS）※順位は未丸めの qs÷gs */
export function formatCareerQsRateValueText(
  qsRate: number,
  qs: number,
  gs: number,
): string {
  return `${formatRecordsValue("pct", qsRate)}（${gs}先発／${qs}QS）`;
}

/** 通算HQS率の表示：.625（48先発／30HQS）※順位は未丸めの hqs÷gs */
export function formatCareerHqsRateValueText(
  hqsRate: number,
  hqs: number,
  gs: number,
): string {
  return `${formatRecordsValue("pct", hqsRate)}（${gs}先発／${hqs}HQS）`;
}
