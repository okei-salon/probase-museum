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
  hrRate: "本打率",
  tb: "塁打",
  slg: "長打率",
  rbi: "打点",
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
  "starterEr",
  "reliefEr",
]);

/** 正式打者28項目の表カラム */
export const formalTeamBattingColumns: TeamStatColumn[] =
  TEAM_BATTING_FIELD_KEYS.map((key) => ({
    key,
    label: BATTING_LABELS[key],
    lowerIsBetter: LOWER_BETTER.has(key) || undefined,
  }));

/** 正式投手19項目の表カラム */
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
