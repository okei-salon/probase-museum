/**
 * チーム成績ラベル → フィールドキー
 */

import type {
  TeamBattingFieldKey,
  TeamPitchingFieldKey,
} from "@/data/teamSeasonStats";
import {
  normalizeAvgInput,
  normalizeEraInput,
  normalizeIntegerInput,
  normalizeIpInput,
} from "@/lib/manualEntry/normalizeInput";

const BATTING_ALIASES: Array<{ keys: string[]; field: TeamBattingFieldKey }> = [
  { keys: ["打率", "avg"], field: "avg" },
  { keys: ["試合", "g"], field: "g" },
  { keys: ["打席", "pa"], field: "pa" },
  { keys: ["打数", "ab"], field: "ab" },
  { keys: ["安打", "h"], field: "h" },
  { keys: ["単打", "singles", "1b"], field: "singles" },
  { keys: ["二塁打", "2塁打", "doubles", "2b"], field: "doubles" },
  { keys: ["三塁打", "3塁打", "triples", "3b"], field: "triples" },
  { keys: ["本塁打", "hr"], field: "hr" },
  { keys: ["本打率", "hrRate"], field: "hrRate" },
  { keys: ["塁打", "tb"], field: "tb" },
  { keys: ["長打率", "slg"], field: "slg" },
  { keys: ["打点", "rbi"], field: "rbi" },
  { keys: ["得点", "r"], field: "r" },
  { keys: ["三振", "so"], field: "so" },
  { keys: ["三振率", "soRate"], field: "soRate" },
  { keys: ["四球", "bb"], field: "bb" },
  { keys: ["死球", "hbp"], field: "hbp" },
  { keys: ["犠打", "sac"], field: "sac" },
  { keys: ["犠飛", "sf"], field: "sf" },
  { keys: ["併殺打", "gdp"], field: "gdp" },
  { keys: ["併打率", "gdpRate"], field: "gdpRate" },
  { keys: ["盗企数", "盗塁企図", "sba"], field: "sba" },
  { keys: ["盗塁", "sb"], field: "sb" },
  { keys: ["盗塁率", "sbRate"], field: "sbRate" },
  { keys: ["出塁率", "obp"], field: "obp" },
  { keys: ["猛打賞", "multiHit"], field: "multiHit" },
  { keys: ["ops", "OPS"], field: "ops" },
];

const PITCHING_ALIASES: Array<{ keys: string[]; field: TeamPitchingFieldKey }> =
  [
    { keys: ["防御率", "era"], field: "era" },
    { keys: ["先発防御率", "starterEra"], field: "starterEra" },
    { keys: ["救援防御率", "reliefEra"], field: "reliefEra" },
    { keys: ["投球回", "ip"], field: "ip" },
    { keys: ["勝率", "winPct"], field: "winPct" },
    { keys: ["勝", "勝利", "w"], field: "w" },
    { keys: ["敗", "敗戦", "l"], field: "l" },
    { keys: ["セーブ", "sv"], field: "sv" },
    { keys: ["hp", "HP"], field: "hp" },
    { keys: ["h", "H", "ホールド", "hld"], field: "hld" },
    { keys: ["登板", "g"], field: "g" },
    { keys: ["完封", "sho"], field: "sho" },
    { keys: ["完投", "cg"], field: "cg" },
    { keys: ["奪三振", "so"], field: "so" },
    { keys: ["奪三振率", "soRate"], field: "soRate" },
    { keys: ["与四球", "bb"], field: "bb" },
    { keys: ["四球率", "bbRate"], field: "bbRate" },
    { keys: ["先発自責点", "starterEr"], field: "starterEr" },
    { keys: ["救援自責点", "reliefEr"], field: "reliefEr" },
  ];

function matchAlias<T extends string>(
  label: string,
  aliases: Array<{ keys: string[]; field: T }>,
): T | null {
  const compact = label.replace(/\s+/g, "").trim();
  if (!compact) return null;
  let best: { field: T; len: number } | null = null;
  for (const entry of aliases) {
    for (const k of entry.keys) {
      if (
        k.toLowerCase() === compact.toLowerCase() ||
        compact === k
      ) {
        if (!best || k.length > best.len) {
          best = { field: entry.field, len: k.length };
        }
      }
    }
  }
  return best?.field ?? null;
}

export function resolveTeamBattingField(
  label: string,
): TeamBattingFieldKey | null {
  return matchAlias(label, BATTING_ALIASES);
}

export function resolveTeamPitchingField(
  label: string,
): TeamPitchingFieldKey | null {
  return matchAlias(label, PITCHING_ALIASES);
}

export function parseTeamFieldValue(
  field: string,
  raw: string,
): { raw: string; value: number | null } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") {
    return { raw: trimmed, value: null };
  }
  if (
    field === "avg" ||
    field === "obp" ||
    field === "slg" ||
    field === "ops" ||
    field === "hrRate" ||
    field === "soRate" ||
    field === "gdpRate" ||
    field === "sbRate" ||
    field === "winPct"
  ) {
    const p = normalizeAvgInput(trimmed);
    return { raw: p.text || trimmed, value: p.value };
  }
  if (
    field === "era" ||
    field === "starterEra" ||
    field === "reliefEra" ||
    field === "bbRate"
  ) {
    const p = normalizeEraInput(trimmed);
    return { raw: p.text || trimmed, value: p.value };
  }
  if (field === "ip") {
    const p = normalizeIpInput(trimmed);
    return { raw: p.text || trimmed, value: p.value };
  }
  const p = normalizeIntegerInput(trimmed);
  return { raw: p.text || trimmed, value: p.value };
}
