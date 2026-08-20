import type { TeamStatColumn } from "@/data/seasonViews";
import {
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
} from "./types";

const BATTING_LABELS: Record<(typeof TEAM_BATTING_FIELD_KEYS)[number], string> = {
  avg: "打率",
  g: "試合",
  pa: "打席",
  ab: "打数",
  h: "安打",
  singles: "単打",
  doubles: "二塁打",
  triples: "三塁打",
  hr: "本塁打",
  hrRate: "本塁打率",
  tb: "塁打",
  slg: "長打率",
  rbi: "打点",
  rispAvg: "得点圏打率",
  rispAvgDiff: "得点圏打率差",
  rispAb: "得点圏打数",
  rispH: "得点圏安打",
  basesLoadedAvg: "満塁率",
  basesLoadedAvgDiff: "満塁率差",
  basesLoadedAb: "満塁数",
  basesLoadedH: "満塁安打",
  vsRhbAvg: "対右率",
  vsRhbAvgDiff: "右率差",
  vsRhbAb: "対右数",
  vsRhbH: "対右安打",
  vsLhbAvg: "対左率",
  vsLhbAvgDiff: "左率差",
  vsLhbAb: "対左数",
  vsLhbH: "対左安打",
  r: "得点",
  so: "三振",
  soRate: "三振率",
  bb: "四球",
  hbp: "死球",
  sac: "犠打",
  sf: "犠飛",
  gdp: "併殺打",
  gdpRate: "併打率",
  sba: "盗企数",
  sb: "盗塁",
  sbRate: "盗塁率",
  obp: "出塁率",
  multiHit: "猛打賞",
  bip: "均野数",
  ops: "OPS",
};

const PITCHING_LABELS: Record<
  (typeof TEAM_PITCHING_FIELD_KEYS)[number],
  string
> = {
  era: "防御率",
  starterEra: "先発防御率",
  reliefEra: "救援防御率",
  ip: "投球回",
  winPct: "勝率",
  w: "勝",
  l: "敗",
  sv: "セーブ",
  hp: "HP",
  hld: "H",
  g: "登板",
  sho: "完封",
  cg: "完投",
  so: "奪三振",
  soRate: "奪三振率",
  bb: "与四球",
  bbRate: "四球率",
  hbp: "与死球",
  hbpRate: "死球率",
  bf: "打者",
  abAgainst: "打数",
  hitsAllowed: "被安打",
  avgAgainst: "被打率",
  rispAvg: "圏打率",
  rispAvgDiff: "圏率差",
  rispH: "圏安打",
  vsRhbAvg: "右被率",
  vsRhbAvgDiff: "右率差",
  vsRhbH: "右被安",
  vsLhbAvg: "左被率",
  vsLhbAvgDiff: "左率差",
  vsLhbH: "左被安",
  hrAllowed: "被本打",
  hrRateAllowed: "被本率",
  sbaAgainst: "被盗企",
  sbAllowed: "許盗数",
  sbRateAgainst: "許盗率",
  wp: "暴投",
  r: "失点",
  er: "自責点",
  starterEr: "先発自責点",
  reliefEr: "救援自責点",
};

const LOWER_BETTER = new Set([
  "so",
  "soRate",
  "gdp",
  "gdpRate",
  "era",
  "starterEra",
  "reliefEra",
  "l",
  "bb",
  "bbRate",
  "hbp",
  "hbpRate",
  "hitsAllowed",
  "avgAgainst",
  "hrAllowed",
  "hrRateAllowed",
  "sbAllowed",
  "sbRateAgainst",
  "wp",
  "r",
  "er",
  "starterEr",
  "reliefEr",
]);

/** 正式打者全項目の表カラム */
export const formalTeamBattingColumns: TeamStatColumn[] =
  TEAM_BATTING_FIELD_KEYS.map((key) => ({
    key,
    label: BATTING_LABELS[key],
    lowerIsBetter: LOWER_BETTER.has(key) || undefined,
  }));

/** 正式投手項目の表カラム */
export const formalTeamPitchingColumns: TeamStatColumn[] =
  TEAM_PITCHING_FIELD_KEYS.map((key) => ({
    key,
    label: PITCHING_LABELS[key],
    lowerIsBetter: LOWER_BETTER.has(key) || undefined,
  }));

export function battingFieldLabel(key: string): string {
  return BATTING_LABELS[key as keyof typeof BATTING_LABELS] ?? key;
}

export function pitchingFieldLabel(key: string): string {
  return PITCHING_LABELS[key as keyof typeof PITCHING_LABELS] ?? key;
}
