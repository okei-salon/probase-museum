/**
 * SOP 通算ランキング・四天王
 * - 年度SOPは SeasonIdentity（WORLD + YEAR）単位
 * - 通算は全 WORLD を合算（同一年 BLUE/RED を除外しない）
 */

import { getPlayerMaster } from "@/data/playerMaster";
import { listPennantSeasonIdentities } from "@/data/playerSeasonLines";
import { buildYearSopRankings } from "@/data/sop/buildYearSop";
import {
  formatSeasonLineLabel,
  type SeasonIdentity,
} from "@/data/seasons";
import { aggregateCareerSop } from "@/lib/sop/computeSeasonSop";
import type { SopRole, SopSeasonResult } from "@/lib/sop/types";

export type SopRoleFilter = "all" | SopRole;

export type SopCareerRankRow = {
  rank: number;
  playerId: string;
  playerName: string;
  teamShort: string;
  total: number;
  role: SopRoleFilter;
  /** 内訳集計用に保持 */
  seasons: SopSeasonResult[];
};

export type SopBreakdownRow = {
  label: string;
  count: number;
  points: number;
  display: string;
};

/** pennant 行から WORLD + YEAR のシーズン一覧を構築 */
export function listSopSeasonIdentities(): SeasonIdentity[] {
  return listPennantSeasonIdentities();
}

/** @deprecated カレンダー年のみ。HUB は listSopSeasonIdentities を使う */
export function listSopSeasonYears(): number[] {
  return [
    ...new Set(listSopSeasonIdentities().map((i) => i.year)),
  ].sort((a, b) => b - a);
}

/** 全登録シーズン（WORLD × YEAR）のシーズンSOP結果 */
export function collectAllSopSeasonResults(): SopSeasonResult[] {
  const out: SopSeasonResult[] = [];
  for (const identity of listSopSeasonIdentities()) {
    const { results } = buildYearSopRankings(identity);
    out.push(...results);
  }
  return out;
}

function primaryTeam(seasons: SopSeasonResult[]): string {
  if (seasons.length === 0) return "—";
  const sorted = [...seasons].sort((a, b) => b.year - a.year);
  return sorted[0]!.teamShort || "—";
}

function fullName(playerId: string, fallback: string) {
  return getPlayerMaster(playerId)?.fullName ?? fallback;
}

function rankCareers(
  careers: { playerId: string; playerName: string; total: number }[],
): { playerId: string; playerName: string; total: number; rank: number }[] {
  const sorted = [...careers].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.playerName.localeCompare(b.playerName, "ja");
  });
  const out: {
    playerId: string;
    playerName: string;
    total: number;
    rank: number;
  }[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.total;
    let j = i;
    while (j < sorted.length && sorted[j]!.total === score) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      out.push({ ...sorted[k]!, rank });
    }
    i = j;
  }
  return out;
}

/**
 * 通算SOPランキング
 * - all: 野手・投手シーズンを合算（playerId単位）
 * - batter / pitcher: 当該ロールのシーズンのみ合算
 * BLUE + RED は両方合算（同一年でも除外しない）
 */
export function buildSopCareerRankings(
  roleFilter: SopRoleFilter,
): SopCareerRankRow[] {
  const all = collectAllSopSeasonResults();
  if (all.length === 0) return [];

  const filtered =
    roleFilter === "all" ? all : all.filter((r) => r.role === roleFilter);

  if (filtered.length === 0) return [];

  const careers = aggregateCareerSop(filtered);
  const ranked = rankCareers(careers);

  const byPlayer = new Map<string, SopSeasonResult[]>();
  for (const r of filtered) {
    const list = byPlayer.get(r.playerId) ?? [];
    list.push(r);
    byPlayer.set(r.playerId, list);
  }

  return ranked.map((c) => {
    const seasons = byPlayer.get(c.playerId) ?? [];
    return {
      rank: c.rank,
      playerId: c.playerId,
      playerName: fullName(c.playerId, c.playerName),
      teamShort: primaryTeam(seasons),
      total: c.total,
      role: roleFilter,
      seasons,
    };
  });
}

/** 通算SOP上位4名（四天王）。role は batter | pitcher 必須 */
export function buildSopFourKings(role: SopRole): SopCareerRankRow[] {
  return buildSopCareerRankings(role).slice(0, 4);
}

/**
 * 複数シーズンの SOP 内訳を実績ごとに集約
 * 実績名 / 達成回数 / 獲得ポイント
 */
export function aggregateSopBreakdown(
  seasons: SopSeasonResult[],
): SopBreakdownRow[] {
  const map = new Map<
    string,
    { label: string; count: number; points: number }
  >();

  for (const season of seasons) {
    for (const item of season.items) {
      if (item.points <= 0) continue;
      const key = item.id.split(":").slice(0, 2).join(":") || item.label;
      const prev = map.get(key) ?? {
        label: item.label,
        count: 0,
        points: 0,
      };
      prev.label = item.label;
      prev.count += 1;
      prev.points += item.points;
      map.set(key, prev);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.points - a.points || b.count - a.count)
    .map((r) => ({
      label: r.label,
      count: r.count,
      points: r.points,
      display: `${r.label} ×${r.count} → ${r.points}pt`,
    }));
}

/** 表示用: シーズンラベル（WORLD 付き） */
export function formatSopSeasonLabel(result: {
  year: number;
  world?: SeasonIdentity["world"];
}): string {
  return formatSeasonLineLabel({
    year: result.year,
    world: result.world,
  });
}
