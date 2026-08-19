import type { SeasonBatchFieldKey } from "@/data/import/seasonBatchTypes";
import type { NormRect } from "@/lib/import/layouts/types";

/** プロスピ「個人打撃成績／シーズン」ランキング表の基準レイアウト（正規化1920×1080） */
export const SEASON_RANKING_CANVAS_W = 1920;
export const SEASON_RANKING_CANVAS_H = 1080;

/** 氏名バー探索領域（フォールバック／旧互換） */
export const NAME_PLATE_SEARCH: NormRect = {
  x: 0.12,
  y: 0.24,
  w: 0.14,
  h: 0.66,
};

/** 球団ロゴ列（フォールバック） */
export const TEAM_LOGO_X = { x: 0.24, w: 0.04 };

/** 成績カラム帯（フォールバック。実測時は黄ハイライト起点で上書き） */
export const STATS_BAND_X = { x: 0.272, w: 0.683 };

/** ヘッダー行の相対高さ（最初の氏名バー直前） */
export const HEADER_BAND_H = 0.045;

/** この画面でよく出る列（横スクロール1枚目の典型） */
export const DEFAULT_BATTING_STAT_COLUMNS: SeasonBatchFieldKey[] = [
  "avg",
  "g",
  "pa",
  "ab",
  "h",
  "singles",
  "doubles",
];

/** 長いキーを先に置く（三振率 > 三振 など） */
export const HEADER_LABEL_TO_FIELD: Array<{
  keys: string[];
  field: SeasonBatchFieldKey;
  kind: "avg" | "int" | "rate" | "era" | "ip";
}> = [
  { keys: ["打率"], field: "avg", kind: "avg" },
  { keys: ["試合"], field: "g", kind: "int" },
  { keys: ["打席"], field: "pa", kind: "int" },
  { keys: ["打数"], field: "ab", kind: "int" },
  { keys: ["安打"], field: "h", kind: "int" },
  { keys: ["単打"], field: "singles", kind: "int" },
  { keys: ["二塁打", "２塁打", "2塁打"], field: "doubles", kind: "int" },
  { keys: ["三塁打", "３塁打", "3塁打"], field: "triples", kind: "int" },
  { keys: ["本塁打", "本塁"], field: "hr", kind: "int" },
  { keys: ["本打率"], field: "hrRate", kind: "avg" },
  { keys: ["塁打"], field: "tb", kind: "int" },
  { keys: ["長打率"], field: "slg", kind: "avg" },
  { keys: ["打点"], field: "rbi", kind: "int" },
  { keys: ["得点圏打率", "圏打率"], field: "rispAvg", kind: "avg" },
  { keys: ["得点圏差", "圏差"], field: "rispDiff", kind: "rate" },
  { keys: ["得点圏打数", "圏打"], field: "rispAb", kind: "int" },
  { keys: ["得点圏安打", "圏安"], field: "rispH", kind: "int" },
  { keys: ["満塁率"], field: "basesLoadedAvg", kind: "avg" },
  { keys: ["満率差"], field: "basesLoadedDiff", kind: "rate" },
  { keys: ["満塁安打", "満安"], field: "basesLoadedH", kind: "int" },
  { keys: ["満塁数", "満塁打席"], field: "basesLoadedPa", kind: "int" },
  { keys: ["得点"], field: "r", kind: "int" },
  { keys: ["三振率"], field: "soRate", kind: "avg" },
  { keys: ["三振"], field: "so", kind: "int" },
  { keys: ["四球"], field: "bb", kind: "int" },
  { keys: ["死球"], field: "hbp", kind: "int" },
  { keys: ["犠打"], field: "sac", kind: "int" },
  { keys: ["犠飛"], field: "sf", kind: "int" },
  { keys: ["盗塁率"], field: "sbRate", kind: "avg" },
  { keys: ["盗塁"], field: "sb", kind: "int" },
  { keys: ["出塁率"], field: "obp", kind: "avg" },
  { keys: ["連続試合出塁", "連試出"], field: "onBaseStreak", kind: "int" },
  { keys: ["連続無安打", "連無安"], field: "hitlessStreak", kind: "int" },
  { keys: ["連続安打", "連安"], field: "hitStreak", kind: "int" },
  { keys: ["猛打賞"], field: "multiHit", kind: "int" },
  { keys: ["OPS", "ＯＰＳ"], field: "ops", kind: "rate" },
  { keys: ["防御率"], field: "era", kind: "era" },
  { keys: ["登板"], field: "g", kind: "int" },
  { keys: ["勝"], field: "w", kind: "int" },
  { keys: ["敗"], field: "l", kind: "int" },
  { keys: ["投球回"], field: "ip", kind: "ip" },
  { keys: ["自責"], field: "er", kind: "int" },
  { keys: ["奪三振"], field: "so", kind: "int" },
];

export function matchHeaderLabel(text: string): SeasonBatchFieldKey | null {
  const compact = text.replace(/\s+/g, "");
  let best: { field: SeasonBatchFieldKey; len: number } | null = null;
  for (const entry of HEADER_LABEL_TO_FIELD) {
    for (const k of entry.keys) {
      if (compact.includes(k) && (!best || k.length > best.len)) {
        best = { field: entry.field, len: k.length };
      }
    }
  }
  return best?.field ?? null;
}

export function fieldKind(
  field: SeasonBatchFieldKey,
): "avg" | "int" | "rate" | "era" | "ip" {
  const hit = HEADER_LABEL_TO_FIELD.find((h) => h.field === field);
  if (hit) return hit.kind;
  switch (field) {
    case "ip":
      return "ip";
    case "era":
      return "era";
    case "avg":
    case "obp":
    case "slg":
    case "ops":
    case "winPct":
    case "sbAllowedRate":
    case "csRate":
    case "rispAvg":
    case "basesLoadedAvg":
    case "hrRate":
    case "soRate":
    case "sbRate":
      return "avg";
    case "whip":
    case "bbRate":
    case "kbb":
    case "qsRate":
    case "hqsRate":
    case "rispDiff":
    case "basesLoadedDiff":
      return "rate";
    default:
      return "int";
  }
}
