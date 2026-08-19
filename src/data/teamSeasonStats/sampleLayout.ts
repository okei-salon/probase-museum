import { npbTeams } from "@/data/teams";
import type { TeamStatRow } from "@/data/seasonViews";
import {
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
} from "./types";

/**
 * レイアウト確認用サンプル行（メモリ上のみ。localStorage には保存しない）。
 * 全正式キーを持ち、値は --- 表示用の -1。
 */
function emptyValues(keys: readonly string[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const key of keys) values[key] = -1;
  return values;
}

export function buildLayoutSampleBattingRows(): TeamStatRow[] {
  const base = emptyValues(TEAM_BATTING_FIELD_KEYS);
  return npbTeams.map((t) => ({
    team: t.short,
    league: t.league === "パ" ? "pacific" : "central",
    values: { ...base },
  }));
}

export function buildLayoutSamplePitchingRows(): TeamStatRow[] {
  const base = emptyValues(TEAM_PITCHING_FIELD_KEYS);
  return npbTeams.map((t) => ({
    team: t.short,
    league: t.league === "パ" ? "pacific" : "central",
    values: { ...base },
  }));
}
