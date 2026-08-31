/**
 * チーム成績ラベル → フィールドキー
 */

import type {
  TeamBattingFieldKey,
  TeamPitchingFieldKey,
} from "@/data/teamSeasonStats";
import {
  isMissingStatToken,
  normalizeAvgInput,
  normalizeEraInput,
  normalizeIntegerInput,
  normalizeIpInput,
  normalizeSignedRateInput,
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
  { keys: ["本塁打率", "本打率", "hrRate"], field: "hrRate" },
  { keys: ["塁打", "tb"], field: "tb" },
  { keys: ["長打率", "slg"], field: "slg" },
  { keys: ["打点", "rbi"], field: "rbi" },
  { keys: ["得点圏打率", "rispAvg"], field: "rispAvg" },
  { keys: ["得点圏打率差", "rispAvgDiff"], field: "rispAvgDiff" },
  { keys: ["得点圏打数", "rispAb"], field: "rispAb" },
  { keys: ["得点圏安打", "rispH"], field: "rispH" },
  { keys: ["満塁率", "basesLoadedAvg"], field: "basesLoadedAvg" },
  { keys: ["満塁率差", "basesLoadedAvgDiff"], field: "basesLoadedAvgDiff" },
  { keys: ["満塁数", "basesLoadedAb"], field: "basesLoadedAb" },
  { keys: ["満塁安打", "basesLoadedH"], field: "basesLoadedH" },
  { keys: ["対右率", "vsRhbAvg"], field: "vsRhbAvg" },
  { keys: ["右率差", "vsRhbAvgDiff"], field: "vsRhbAvgDiff" },
  { keys: ["対右数", "vsRhbAb"], field: "vsRhbAb" },
  { keys: ["対右安打", "vsRhbH"], field: "vsRhbH" },
  { keys: ["対左率", "vsLhbAvg"], field: "vsLhbAvg" },
  { keys: ["左率差", "vsLhbAvgDiff"], field: "vsLhbAvgDiff" },
  { keys: ["対左数", "vsLhbAb"], field: "vsLhbAb" },
  { keys: ["対左安打", "vsLhbH"], field: "vsLhbH" },
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
  { keys: ["均野数", "bip"], field: "bip" },
  { keys: ["ops", "OPS"], field: "ops" },
];

const PITCHING_ALIASES: Array<{ keys: string[]; field: TeamPitchingFieldKey }> =
  [
    { keys: ["防御率", "era"], field: "era" },
    { keys: ["先発防御率", "先発防", "starterEra"], field: "starterEra" },
    { keys: ["救援防御率", "救援防", "reliefEra"], field: "reliefEra" },
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
    { keys: ["与死球", "hbp"], field: "hbp" },
    { keys: ["死球率", "hbpRate"], field: "hbpRate" },
    { keys: ["打者", "bf"], field: "bf" },
    { keys: ["打数", "abAgainst", "ab"], field: "abAgainst" },
    { keys: ["被安打", "hitsAllowed"], field: "hitsAllowed" },
    { keys: ["被打率", "avgAgainst"], field: "avgAgainst" },
    { keys: ["圏打率", "rispAvg"], field: "rispAvg" },
    { keys: ["圏率差", "rispAvgDiff"], field: "rispAvgDiff" },
    { keys: ["圏安打", "rispH"], field: "rispH" },
    { keys: ["右被率", "vsRhbAvg"], field: "vsRhbAvg" },
    { keys: ["右率差", "vsRhbAvgDiff"], field: "vsRhbAvgDiff" },
    { keys: ["右被安", "vsRhbH"], field: "vsRhbH" },
    { keys: ["左被率", "vsLhbAvg"], field: "vsLhbAvg" },
    { keys: ["左率差", "vsLhbAvgDiff"], field: "vsLhbAvgDiff" },
    { keys: ["左被安", "vsLhbH"], field: "vsLhbH" },
    { keys: ["被本打", "被本塁打", "hrAllowed"], field: "hrAllowed" },
    { keys: ["被本率", "hrRateAllowed"], field: "hrRateAllowed" },
    { keys: ["被盗企", "sbaAgainst"], field: "sbaAgainst" },
    { keys: ["許盗数", "sbAllowed"], field: "sbAllowed" },
    { keys: ["許盗率", "sbRateAgainst"], field: "sbRateAgainst" },
    { keys: ["暴投", "wp"], field: "wp" },
    { keys: ["失点", "r"], field: "r" },
    { keys: ["自責点", "er"], field: "er" },
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

const AVG_LIKE = new Set([
  "avg",
  "obp",
  "slg",
  "ops",
  "hrRate",
  "gdpRate",
  "sbRate",
  "winPct",
  "avgAgainst",
  "rispAvg",
  "basesLoadedAvg",
  "vsRhbAvg",
  "vsLhbAvg",
  "sbRateAgainst",
]);

const SIGNED_AVG_LIKE = new Set([
  "rispAvgDiff",
  "basesLoadedAvgDiff",
  "vsRhbAvgDiff",
  "vsLhbAvgDiff",
]);

const ERA_LIKE = new Set([
  "era",
  "starterEra",
  "reliefEra",
  "bbRate",
  "hbpRate",
  "hrRateAllowed",
]);

export function parseTeamFieldValue(
  field: string,
  raw: string,
): { raw: string; value: number | null } {
  const trimmed = raw.trim();
  if (isMissingStatToken(trimmed)) {
    return { raw: trimmed, value: null };
  }
  if (SIGNED_AVG_LIKE.has(field)) {
    const p = normalizeSignedRateInput(trimmed);
    return { raw: p.text || trimmed, value: p.value };
  }
  if (field === "soRate") {
    // 投手は K/9（≥1）、打者は SO/PA（<1）をヒューリスティックで分岐
    const asEra = normalizeEraInput(trimmed);
    if (asEra.value != null && asEra.value >= 1) {
      return { raw: asEra.text || trimmed, value: asEra.value };
    }
    const asAvg = normalizeAvgInput(trimmed);
    if (asAvg.value != null) {
      return { raw: asAvg.text || trimmed, value: asAvg.value };
    }
    return { raw: asEra.text || trimmed, value: asEra.value };
  }
  if (AVG_LIKE.has(field)) {
    const p = normalizeAvgInput(trimmed);
    return { raw: p.text || trimmed, value: p.value };
  }
  if (ERA_LIKE.has(field)) {
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
