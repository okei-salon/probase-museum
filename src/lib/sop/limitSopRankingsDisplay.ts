/**
 * SOPランキング画面の表示用ヘルパー（データ自体は削らない）。
 */

import type { SeasonWorld } from "@/data/seasons";
import { rankSopResults } from "./computeSeasonSop";
import { mergeRoleSeasonSopTotal } from "./mergeSeasonSop";
import type { SopRankEntry, SopRole, SopSeasonResult } from "./types";

/** 野手／投手それぞれ最大表示人数 */
export const SOP_RANKING_DISPLAY_LIMIT = 50;

/**
 * 指定ロールの SOP合計順上位 N 人だけ残し、ロール内で順位を付け直す。
 */
export function limitSopRankingsForDisplay(
  rankings: SopRankEntry[],
  role: SopRole,
  limit: number = SOP_RANKING_DISPLAY_LIMIT,
): SopRankEntry[] {
  const filtered = rankings
    .filter((e) => e.result.role === role && e.result.total > 0)
    .map((e) => e.result);
  return rankSopResults(filtered).slice(0, limit);
}

export type SopOverallClassification = "batter" | "pitcher" | "two_way";

/** 総合ランキング1行（同一 YEAR×WORLD×playerId で野手＋投手を統合） */
export type SopOverallRankEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  teamShort: string;
  year: number;
  world: SeasonWorld | null;
  classification: SopOverallClassification;
  /** 総合SOP（野手固有＋投手固有＋共有1回） */
  total: number;
  /** 野手ロール行の生合計（個別SOPと同じ） */
  batterTotal: number;
  /** 投手ロール行の生合計（個別SOPと同じ） */
  pitcherTotal: number;
  batterUnique: number;
  pitcherUnique: number;
  /** 年間表彰＋二刀流など、総合では1回だけ数える点 */
  sharedTotal: number;
  batterResult: SopSeasonResult | null;
  pitcherResult: SopSeasonResult | null;
};

function mergeKey(r: SopSeasonResult): string {
  if (r.playerId) {
    return `${r.world ?? ""}:${r.year}:${r.playerId}`;
  }
  // playerId 欠落時のみ名前＋球団（同名誤統合を抑える）
  return `${r.world ?? ""}:${r.year}:name:${r.playerName}|${r.teamShort}`;
}

/**
 * シーズン総合ランキング用：同一選手の野手SOP・投手SOPを統合。
 * 総合点 = 野手固有 + 投手固有 + 共有（年間表彰・二刀流）1回。
 * 二刀流は1行・区分「二刀流」。順位は総合点の高い順。
 * 各ロール行の生合計（batterTotal / pitcherTotal）は個別ランキングと一致させる。
 */
export function buildOverallSeasonSopRankings(
  results: SopSeasonResult[],
): SopOverallRankEntry[] {
  type Acc = {
    playerId: string;
    playerName: string;
    teamShort: string;
    year: number;
    world: SeasonWorld | null;
    batter: SopSeasonResult | null;
    pitcher: SopSeasonResult | null;
  };

  const map = new Map<string, Acc>();
  for (const r of results) {
    if (r.total <= 0 && (r.items?.length ?? 0) === 0) continue;
    const key = mergeKey(r);
    const cur = map.get(key) ?? {
      playerId: r.playerId,
      playerName: r.playerName,
      teamShort: r.teamShort,
      year: r.year,
      world: r.world ?? null,
      batter: null,
      pitcher: null,
    };
    if (r.playerId) cur.playerId = r.playerId;
    cur.playerName = r.playerName;
    cur.teamShort = r.teamShort || cur.teamShort;
    if (r.role === "batter") cur.batter = r;
    else cur.pitcher = r;
    map.set(key, cur);
  }

  const rows: Omit<SopOverallRankEntry, "rank">[] = [];
  for (const cur of map.values()) {
    const merged = mergeRoleSeasonSopTotal(cur.batter, cur.pitcher);
    if (merged.batterTotal <= 0 && merged.pitcherTotal <= 0) continue;
    const hasBatter = cur.batter != null && merged.batterTotal > 0;
    const hasPitcher = cur.pitcher != null && merged.pitcherTotal > 0;
    const classification: SopOverallClassification =
      hasBatter && hasPitcher
        ? "two_way"
        : hasPitcher
          ? "pitcher"
          : "batter";
    rows.push({
      playerId: cur.playerId,
      playerName: cur.playerName,
      teamShort: cur.teamShort,
      year: cur.year,
      world: cur.world,
      classification,
      total: merged.total,
      batterTotal: merged.batterTotal,
      pitcherTotal: merged.pitcherTotal,
      batterUnique: merged.batterUnique,
      pitcherUnique: merged.pitcherUnique,
      sharedTotal: merged.shared,
      batterResult: cur.batter,
      pitcherResult: cur.pitcher,
    });
  }

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.playerName.localeCompare(b.playerName, "ja");
  });

  const out: SopOverallRankEntry[] = [];
  let i = 0;
  while (i < rows.length) {
    const score = rows[i]!.total;
    let j = i;
    while (j < rows.length && rows[j]!.total === score) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      out.push({ ...rows[k]!, rank });
    }
    i = j;
  }
  return out;
}

export function overallClassificationLabel(
  c: SopOverallClassification,
): string {
  if (c === "two_way") return "二刀流";
  if (c === "pitcher") return "投手";
  return "野手";
}
