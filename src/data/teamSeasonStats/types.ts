import type { SeasonWorld } from "@/data/seasons";
import { normalizeSeasonWorld } from "@/data/seasons";
import type { TeamId } from "@/data/teams";

/**
 * チーム打撃：保存するカウント系（率は derived / screenRates）
 * 既存コア項目は number。画面拡張項目は null 許容（旧データ互換）。
 */
export type TeamBattingCounting = {
  /** 試合 */
  g: number;
  /** 打席 */
  pa: number;
  /** 打数 */
  ab: number;
  /** 安打 */
  h: number;
  /** 単打（未入力時は h - 2b - 3b - hr から算出可） */
  singles: number;
  /** 二塁打 */
  doubles: number;
  /** 三塁打 */
  triples: number;
  /** 本塁打 */
  hr: number;
  /** 塁打（未入力時は単打+2*2b+3*3b+4*hr から算出可） */
  tb: number;
  /** 打点 */
  rbi: number;
  /** 得点 */
  r: number;
  /** 三振 */
  so: number;
  /** 四球 */
  bb: number;
  /** 死球 */
  hbp: number;
  /** 犠打 */
  sac: number;
  /** 犠飛 */
  sf: number;
  /** 併殺打 */
  gdp: number;
  /** 盗塁企図 */
  sba: number;
  /** 盗塁 */
  sb: number;
  /** 猛打賞（回数） */
  multiHit: number;
  /** 得点圏打数 */
  rispAb: number | null;
  /** 得点圏安打 */
  rispH: number | null;
  /** 満塁数（満塁打数） */
  basesLoadedAb: number | null;
  /** 満塁安打 */
  basesLoadedH: number | null;
  /** 対右数 */
  vsRhbAb: number | null;
  /** 対右安打 */
  vsRhbH: number | null;
  /** 対左数 */
  vsLhbAb: number | null;
  /** 対左安打 */
  vsLhbH: number | null;
  /** 均野数 */
  bip: number | null;
};

/** 打者率・指標（再計算可能なもの） */
export type TeamBattingDerived = {
  avg: number | null;
  /** 本打率 = HR / AB */
  hrRate: number | null;
  slg: number | null;
  /** 三振率 = SO / PA（打席基準） */
  soRate: number | null;
  /** 併打率 = GDP / AB */
  gdpRate: number | null;
  /** 盗塁率 = SB / SBA */
  sbRate: number | null;
  obp: number | null;
  ops: number | null;
  /** 得点圏打率 */
  rispAvg: number | null;
  /** 満塁率 */
  basesLoadedAvg: number | null;
  /** 対右率 */
  vsRhbAvg: number | null;
  /** 対左率 */
  vsLhbAvg: number | null;
};

/**
 * チーム投手：カウント系
 * 投球回は outs（1回=3）で保持。156.1 → 156*3+1。
 * 新規項目は null 許容（旧データに無い場合は未登録として扱う）。
 */
export type TeamPitchingCounting = {
  /** 投球回（アウト数） */
  ipOuts: number;
  /** 勝 */
  w: number;
  /** 敗 */
  l: number;
  /** セーブ */
  sv: number;
  /** HP */
  hp: number;
  /** H（ホールド） */
  hld: number;
  /** 登板 */
  g: number;
  /** 完封 */
  sho: number;
  /** 完投 */
  cg: number;
  /** 奪三振 */
  so: number;
  /** 与四球 */
  bb: number;
  /** 先発自責点 */
  starterEr: number;
  /** 救援自責点 */
  reliefEr: number;
  /**
   * 先発投球回（アウト）。未取得時は null。
   * 先発防御率の正確な再計算に使用。
   */
  starterIpOuts: number | null;
  /**
   * 救援投球回（アウト）。未取得時は null。
   * 救援防御率の正確な再計算に使用。
   */
  reliefIpOuts: number | null;
  /** 与死球 */
  hbp: number | null;
  /** 打者（対戦打者） */
  bf: number | null;
  /** 打数（対） */
  abAgainst: number | null;
  /** 被安打 */
  hitsAllowed: number | null;
  /** 圏安打 */
  rispH: number | null;
  /** 右被安 */
  vsRhbH: number | null;
  /** 左被安 */
  vsLhbH: number | null;
  /** 被本打 */
  hrAllowed: number | null;
  /** 被盗企 */
  sbaAgainst: number | null;
  /** 許盗数 */
  sbAllowed: number | null;
  /** 暴投 */
  wp: number | null;
  /** 失点 */
  r: number | null;
  /** 自責点（合計）。未設定時は先発+救援自責から導出 */
  er: number | null;
};

export type TeamPitchingDerived = {
  /** 防御率（自責点）×9÷投球回 */
  era: number | null;
  /** 先発防御率（starterIpOuts がある場合のみ再計算） */
  starterEra: number | null;
  /** 救援防御率（reliefIpOuts がある場合のみ再計算） */
  reliefEra: number | null;
  winPct: number | null;
  soRate: number | null;
  /** 四球率 = BB×9÷IP */
  bbRate: number | null;
  /** 死球率 = HBP×9÷IP */
  hbpRate: number | null;
  /** 被打率 */
  avgAgainst: number | null;
  /** 被本率 = HR×9÷IP */
  hrRateAllowed: number | null;
  /** 許盗率 = 許盗数÷被盗企 */
  sbRateAgainst: number | null;
};

/**
 * 画面から取り込んだ率のスナップショット。
 * 再計算不能な間の表示用。通算では使わない。
 */
export type TeamPitchingScreenRates = {
  era?: number | null;
  starterEra?: number | null;
  reliefEra?: number | null;
  winPct?: number | null;
  soRate?: number | null;
  bbRate?: number | null;
  hbpRate?: number | null;
  avgAgainst?: number | null;
  rispAvg?: number | null;
  rispAvgDiff?: number | null;
  vsRhbAvg?: number | null;
  vsRhbAvgDiff?: number | null;
  vsLhbAvg?: number | null;
  vsLhbAvgDiff?: number | null;
  hrRateAllowed?: number | null;
  sbRateAgainst?: number | null;
};

export type TeamBattingScreenRates = {
  avg?: number | null;
  hrRate?: number | null;
  slg?: number | null;
  soRate?: number | null;
  gdpRate?: number | null;
  sbRate?: number | null;
  obp?: number | null;
  ops?: number | null;
  rispAvg?: number | null;
  rispAvgDiff?: number | null;
  basesLoadedAvg?: number | null;
  basesLoadedAvgDiff?: number | null;
  vsRhbAvg?: number | null;
  vsRhbAvgDiff?: number | null;
  vsLhbAvg?: number | null;
  vsLhbAvgDiff?: number | null;
};

export type TeamSeasonBatting = {
  counting: TeamBattingCounting;
  derived: TeamBattingDerived;
  screenRates?: TeamBattingScreenRates;
};

export type TeamSeasonPitching = {
  counting: TeamPitchingCounting;
  derived: TeamPitchingDerived;
  screenRates?: TeamPitchingScreenRates;
};

export type TeamSeasonStatsSource = "manual" | "ocr" | "import";

/** 通常シーズン / 交流戦（混在させない） */
export type TeamCompetition = "regular" | "interleague";

/** 年度 × 球団 × 競技区分の正式チーム成績レコード */
export type TeamSeasonStatsRecord = {
  /**
   * 正式 WORLD: `${world}:${year}:${teamId}:${competition}`
   * レガシー／DEMO: `${year}:${teamId}:${competition}`（既存IDは変更しない）
   */
  id: string;
  year: number;
  /**
   * 正式 WORLD。未設定／null は既存レガシー・2000 DEMO（自動移行しない）。
   */
  world?: SeasonWorld | null;
  teamId: TeamId;
  teamName: string;
  competition: TeamCompetition;
  batting: TeamSeasonBatting | null;
  pitching: TeamSeasonPitching | null;
  source: TeamSeasonStatsSource;
  createdAt: string;
  updatedAt: string;
};

/**
 * チーム成績の upsert / 取得用 ID。
 * world がある正式データのみ ID に WORLD を含める。既存 world 無し ID 形式は維持する。
 */
export function teamSeasonStatsKey(
  year: number,
  teamId: TeamId,
  competition: TeamCompetition = "regular",
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  if (w) {
    return `${w}:${year}:${teamId}:${competition}`;
  }
  return `${year}:${teamId}:${competition}`;
}

/** 打者正式項目の表示キー（ゲーム画面のチーム打撃成績に準拠） */
export const TEAM_BATTING_FIELD_KEYS = [
  "avg",
  "g",
  "pa",
  "ab",
  "h",
  "singles",
  "doubles",
  "triples",
  "hr",
  "hrRate",
  "tb",
  "slg",
  "rbi",
  "rispAvg",
  "rispAvgDiff",
  "rispAb",
  "rispH",
  "basesLoadedAvg",
  "basesLoadedAvgDiff",
  "basesLoadedAb",
  "basesLoadedH",
  "vsRhbAvg",
  "vsRhbAvgDiff",
  "vsRhbAb",
  "vsRhbH",
  "vsLhbAvg",
  "vsLhbAvgDiff",
  "vsLhbAb",
  "vsLhbH",
  "r",
  "so",
  "soRate",
  "bb",
  "hbp",
  "sac",
  "sf",
  "gdp",
  "gdpRate",
  "sba",
  "sb",
  "sbRate",
  "obp",
  "multiHit",
  "bip",
  "ops",
] as const;

/** 投手正式項目の表示キー（ゲーム画面のチーム投手成績に準拠） */
export const TEAM_PITCHING_FIELD_KEYS = [
  "era",
  "starterEra",
  "reliefEra",
  "ip",
  "winPct",
  "w",
  "l",
  "sv",
  "hp",
  "hld",
  "g",
  "sho",
  "cg",
  "so",
  "soRate",
  "bb",
  "bbRate",
  "hbp",
  "hbpRate",
  "bf",
  "abAgainst",
  "hitsAllowed",
  "avgAgainst",
  "rispAvg",
  "rispAvgDiff",
  "rispH",
  "vsRhbAvg",
  "vsRhbAvgDiff",
  "vsRhbH",
  "vsLhbAvg",
  "vsLhbAvgDiff",
  "vsLhbH",
  "hrAllowed",
  "hrRateAllowed",
  "sbaAgainst",
  "sbAllowed",
  "sbRateAgainst",
  "wp",
  "r",
  "er",
  "starterEr",
  "reliefEr",
] as const;

export type TeamBattingFieldKey = (typeof TEAM_BATTING_FIELD_KEYS)[number];
export type TeamPitchingFieldKey = (typeof TEAM_PITCHING_FIELD_KEYS)[number];
