/**
 * SOP 通算ランキング・四天王
 * - 年度SOPは SeasonIdentity（WORLD + YEAR）単位
 * - 通算は全 WORLD を合算（同一年 BLUE/RED を除外しない）
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  getSeasonLinesCacheState,
  listPennantSeasonIdentities,
} from "@/data/playerSeasonLines";
import { buildYearSopRankings } from "@/data/sop/buildYearSop";
import {
  formatSeasonLineLabel,
  type SeasonIdentity,
} from "@/data/seasons";
import { aggregateCareerSop } from "@/lib/sop/computeSeasonSop";
import type { SopRole, SopSeasonResult } from "@/lib/sop/types";

export type SopRoleFilter = "all" | SopRole;

/** 通算SOPランキング（総合／野手／投手）の画面表示上限。計算対象は削らない。 */
export const SOP_CAREER_RANKING_DISPLAY_LIMIT = 100;

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

/** ストア更新時に上げる。行数だけでは内容変更を検知できないため。 */
let sopSeasonResultsCacheGeneration = 0;

function seasonLinesFingerprint(): string {
  const s = getSeasonLinesCacheState();
  return `${sopSeasonResultsCacheGeneration}:${s.cloudHydrated}:${s.runtimeRows ?? "null"}:${s.diskRows}`;
}

let sopSeasonResultsCache: {
  fingerprint: string;
  results: SopSeasonResult[];
} | null = null;

/**
 * season_lines / 表彰など正式ストア更新後に呼ぶ。
 * タブ切替だけでは呼ばない（同一世代内の再集計を抑止）。
 */
export function clearSopSeasonResultsCache(): void {
  sopSeasonResultsCache = null;
  sopSeasonResultsCacheGeneration += 1;
}

/** @deprecated テスト互換エイリアス */
export function clearSopSeasonResultsCacheForTests(): void {
  clearSopSeasonResultsCache();
}

/**
 * 全登録シーズン（WORLD × YEAR）のシーズンSOP結果。
 * 同一キャッシュ世代かつ fingerprint が同じ間は再計算しない
 * （総合／野手／投手の表示切替での不要な再集計を抑止）。
 */
export function collectAllSopSeasonResults(): SopSeasonResult[] {
  const fingerprint = seasonLinesFingerprint();
  if (
    sopSeasonResultsCache &&
    sopSeasonResultsCache.fingerprint === fingerprint
  ) {
    return sopSeasonResultsCache.results;
  }
  const out: SopSeasonResult[] = [];
  for (const identity of listSopSeasonIdentities()) {
    const { results } = buildYearSopRankings(identity);
    out.push(...results);
  }
  sopSeasonResultsCache = { fingerprint, results: out };
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
 * 通算SOPランキング（全件・0pt含む）。表示制限は
 * {@link limitSopCareerRankingsForDisplay} で別途かける。
 * - all: 野手・投手シーズンを合算（playerId単位）
 * - batter / pitcher: 当該ロールのシーズンのみ合算
 * BLUE + RED は両方合算（同一年でも除外しない）
 */
export function buildSopCareerRankingsFromResults(
  all: SopSeasonResult[],
  roleFilter: SopRoleFilter,
): SopCareerRankRow[] {
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

export function buildSopCareerRankings(
  roleFilter: SopRoleFilter,
): SopCareerRankRow[] {
  return buildSopCareerRankingsFromResults(
    collectAllSopSeasonResults(),
    roleFilter,
  );
}

/**
 * 通算ランキングの画面表示用。
 * 0pt を除き、順位・ソート済み配列の先頭から最大 limit 件。
 * 元の rank は付け直さない（同点ルール維持）。
 */
export function limitSopCareerRankingsForDisplay(
  rows: SopCareerRankRow[],
  limit: number = SOP_CAREER_RANKING_DISPLAY_LIMIT,
): SopCareerRankRow[] {
  return rows.filter((r) => r.total > 0).slice(0, Math.max(0, limit));
}

/**
 * 通算SOP上位4名（四天王）。role は batter | pitcher 必須。
 * 上位4名分だけ seasons を付与し、全選手の内訳組立はしない。
 */
export function buildSopFourKings(role: SopRole): SopCareerRankRow[] {
  const all = collectAllSopSeasonResults();
  const filtered = all.filter((r) => r.role === role);
  if (filtered.length === 0) return [];

  const careers = aggregateCareerSop(filtered);
  const top = rankCareers(careers)
    .filter((c) => c.total > 0)
    .slice(0, 4);

  return top.map((c) => {
    const seasons = filtered.filter((r) => r.playerId === c.playerId);
    return {
      rank: c.rank,
      playerId: c.playerId,
      playerName: fullName(c.playerId, c.playerName),
      teamShort: primaryTeam(seasons),
      total: c.total,
      role,
      seasons,
    };
  });
}

/**
 * 複数シーズンの SOP 内訳を実績ごとに集約
 * 実績名 / 達成回数 / 獲得ポイント
 *
 * 集約キーは計算時の item.id 全体（例: title:hr:1 と title:hr:2 は別行）。
 * 同一 id のみ回数を合算し、ラベルは最初に出現した表記を維持する（後勝ち上書きしない）。
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
      const key = item.id || item.label;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          label: item.label,
          count: 1,
          points: item.points,
        });
        continue;
      }
      prev.count += 1;
      prev.points += item.points;
    }
  }

  return [...map.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.count - a.count ||
        a.label.localeCompare(b.label, "ja"),
    )
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
