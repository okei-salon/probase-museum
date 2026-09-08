/**
 * 空の野手 pennant 行の判定・同一 id hydrate 用マージ。
 *
 * 注意: 他 WORLD / legacy / demo からの自動ピア復元は行わない
 *（store.restoreEmptyBatterOffenseFromPeers は no-op）。
 * 復元は同一 WORLD の検証済みソース、またはユーザー再提供データのみ。
 */

import { computeBatterDerived } from "@/lib/manualEntry/computeSeasonStats";
import { listDemoSeasonLines } from "@/data/import/demoStore";
import { normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";
import type { BatterSeasonLine, PlayerSeasonLine } from "./types";

export function hasOffensiveBatterCounting(
  counting: BatterSeasonLine["counting"] | null | undefined,
): boolean {
  if (!counting) return false;
  return (
    (counting.ab ?? 0) > 0 ||
    (counting.pa ?? 0) > 0 ||
    (counting.h ?? 0) > 0 ||
    (counting.hr ?? 0) > 0 ||
    (counting.rbi ?? 0) > 0
  );
}

export function isEmptyOffensiveBatterLine(
  line: PlayerSeasonLine | null | undefined,
): boolean {
  return Boolean(
    line &&
      line.role === "batter" &&
      line.scope === "pennant" &&
      !hasOffensiveBatterCounting(line.counting),
  );
}

/**
 * 捕手 CS 保存のベース行選択。
 * 空の正式 WORLD 行より、打撃がある legacy / 既存行を優先する。
 */
export function pickBatterBasePreferringOffense(
  candidates: Array<PlayerSeasonLine | null | undefined>,
): BatterSeasonLine | null {
  const batters = candidates.filter(
    (l): l is BatterSeasonLine => Boolean(l && l.role === "batter"),
  );
  const withOffense = batters.find((l) =>
    hasOffensiveBatterCounting(l.counting),
  );
  return withOffense ?? batters[0] ?? null;
}

/** 空ターゲットへ、ソースの打撃をコピー（盗塁阻止はターゲット優先で保持） */
export function mergeOffenseFromSourcePreserveCs(
  target: BatterSeasonLine,
  source: BatterSeasonLine,
): BatterSeasonLine {
  const counting = {
    ...source.counting,
    csAttempted:
      target.counting.csAttempted ?? source.counting.csAttempted ?? null,
    csAllowed: target.counting.csAllowed ?? source.counting.csAllowed ?? null,
    csCaught: target.counting.csCaught ?? source.counting.csCaught ?? null,
  };
  return {
    ...target,
    counting,
    derived: computeBatterDerived(counting),
    teamId: target.teamId || source.teamId,
    teamName: target.teamName || source.teamName,
    playerName: target.playerName || source.playerName,
  };
}

function peerScore(
  peer: BatterSeasonLine,
  targetWorld: SeasonWorld | null,
): number {
  const pw = normalizeSeasonWorld(peer.world);
  if (pw === targetWorld) return 3;
  if (pw == null) return 2;
  return 1;
}

/**
 * 同一 playerId・year の pennant 野手行から、打撃がある最良ソースを選ぶ。
 */
export function findOffensivePeerForEmptyBatter(
  target: BatterSeasonLine,
  pool: PlayerSeasonLine[],
): BatterSeasonLine | null {
  if (!isEmptyOffensiveBatterLine(target)) return null;
  const targetWorld = normalizeSeasonWorld(target.world);
  const peers = pool.filter(
    (l): l is BatterSeasonLine =>
      l.playerId === target.playerId &&
      Number(l.year) === Number(target.year) &&
      l.role === "batter" &&
      l.scope === "pennant" &&
      l.id !== target.id &&
      hasOffensiveBatterCounting(l.counting),
  );
  if (peers.length === 0) return null;
  peers.sort(
    (a, b) =>
      peerScore(b, targetWorld) - peerScore(a, targetWorld) ||
      Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || ""),
  );
  return peers[0] ?? null;
}

/** 復元適用後の全行を返す */
export function applyEmptyBatterOffenseRestore(
  lines: PlayerSeasonLine[],
  extraSources: PlayerSeasonLine[] = [],
): {
  lines: PlayerSeasonLine[];
  repaired: BatterSeasonLine[];
  skippedEmptyWithoutSource: number;
} {
  const pool = [...lines, ...extraSources];
  const repaired: BatterSeasonLine[] = [];
  let skippedEmptyWithoutSource = 0;

  const next = lines.map((line) => {
    if (line.role !== "batter" || line.scope !== "pennant") return line;
    if (hasOffensiveBatterCounting(line.counting)) return line;
    const source = findOffensivePeerForEmptyBatter(line, pool);
    if (!source) {
      skippedEmptyWithoutSource += 1;
      return line;
    }
    const merged = mergeOffenseFromSourcePreserveCs(line, source);
    repaired.push(merged);
    return merged;
  });

  return { lines: next, repaired, skippedEmptyWithoutSource };
}

/** hydrate merge 用: 新しい側が空で古い側に打撃があれば打撃を残す */
export function mergeSeasonLinePreferOffense(
  preferred: PlayerSeasonLine,
  other: PlayerSeasonLine,
): PlayerSeasonLine {
  if (
    preferred.role === "batter" &&
    other.role === "batter" &&
    preferred.scope === "pennant" &&
    other.scope === "pennant" &&
    !hasOffensiveBatterCounting(preferred.counting) &&
    hasOffensiveBatterCounting(other.counting)
  ) {
    return mergeOffenseFromSourcePreserveCs(preferred, other);
  }
  return preferred;
}

export function demoSeasonLinesAsSources(): PlayerSeasonLine[] {
  try {
    return listDemoSeasonLines().map((l) => {
      const { dataMode: _d, isDemo: _i, ...rest } = l;
      void _d;
      void _i;
      return rest as PlayerSeasonLine;
    });
  } catch {
    return [];
  }
}
