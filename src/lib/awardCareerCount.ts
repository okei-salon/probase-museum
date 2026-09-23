/**
 * 表彰の通算受賞回数（WORLD 内・種別単位）。
 * 保存済みの誤った count に依存せず、履歴から再計算する。
 */

import type { LeagueSide } from "@/data/awards";
import type { SavedMonthlyMvpRecord } from "@/data/import/types";
import { normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";
import {
  formatMonthlyMvpCareerLabel,
  formatSeasonAwardHistory,
} from "@/lib/awardHistory";
import {
  isRealAwardPlayerName,
  sameAwardPlayer,
} from "@/lib/awardPlayerNormalize";

/** 集計バケット（種類ごとに別カウント） */
export type AwardCareerScope =
  | { type: "monthlyMvp"; role: "pitcher" | "batter" }
  | { type: "title"; titleId: string; league: "central" | "pacific" }
  | { type: "bestNine" }
  | { type: "goldenGlove" }
  | { type: "mvp" }
  | { type: "rookie" }
  | { type: "sawamura" }
  | { type: "japanSeriesMvp" }
  | { type: "interleagueMvp" };

export type AwardOccurrence = {
  year: number;
  month?: number;
  world: SeasonWorld | null;
  /** 重複排除用の追加キー（league / position 等） */
  slotKey?: string;
  playerId?: string | null;
  playerName: string;
};

function scopeKey(scope: AwardCareerScope): string {
  switch (scope.type) {
    case "monthlyMvp":
      return `monthlyMvp:${scope.role}`;
    case "title":
      return `title:${scope.titleId}:${scope.league}`;
    default:
      return scope.type;
  }
}

function occurrenceDedupeKey(
  scope: AwardCareerScope,
  o: AwardOccurrence,
): string {
  const w = normalizeSeasonWorld(o.world) ?? "";
  const month = o.month ?? 0;
  const slot = o.slotKey ?? "";
  return `${scopeKey(scope)}|${w}|${o.year}|${month}|${slot}`;
}

function sortKey(o: AwardOccurrence): number {
  const month = o.month ?? 0;
  return o.year * 100 + month;
}

/**
 * 同一 WORLD・同一 scope の履歴から、current を含めた何回目かを返す。
 * BLUE/RED は呼び出し側で world を揃えた occurrences のみ渡すこと。
 */
export function countAwardCareerTimes(input: {
  scope: AwardCareerScope;
  occurrences: AwardOccurrence[];
  current: AwardOccurrence;
  player: { playerId?: string | null; playerName: string };
}): number {
  const { scope, current, player } = input;
  if (
    !isRealAwardPlayerName(player.playerName) &&
    !(player.playerId ?? "").trim()
  ) {
    return 1;
  }

  const currentWorld = normalizeSeasonWorld(current.world);
  const seen = new Set<string>();
  const list: AwardOccurrence[] = [];

  for (const o of input.occurrences) {
    if (normalizeSeasonWorld(o.world) !== currentWorld) continue;
    if (!sameAwardPlayer(player, o)) continue;
    const key = occurrenceDedupeKey(scope, o);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(o);
  }

  const curKey = occurrenceDedupeKey(scope, current);
  if (!seen.has(curKey)) {
    list.push({ ...current, world: currentWorld });
  }

  list.sort((a, b) => sortKey(a) - sortKey(b));

  const idx = list.findIndex(
    (o) => occurrenceDedupeKey(scope, o) === curKey,
  );
  return idx >= 0 ? idx + 1 : list.length;
}

/** 単純回数ラベル（初受賞 / N回目） */
export function formatAwardTimesLabel(times: number): string {
  return formatMonthlyMvpCareerLabel(times);
}

/**
 * 年度表彰用: 勝利年リストから履歴ラベル（連続・ぶり付き）。
 * years は同一 WORLD・同一種別の勝利年のみ。
 */
export function formatSeasonCareerLabel(
  winYears: number[],
  currentYear: number,
): string {
  return formatSeasonAwardHistory(winYears, currentYear);
}

/**
 * 履歴 occurrences から勝利年を抽出し、currentYear のラベルを返す。
 */
export function seasonCareerLabelFromOccurrences(input: {
  scope: AwardCareerScope;
  occurrences: AwardOccurrence[];
  currentYear: number;
  world: SeasonWorld | null;
  player: { playerId?: string | null; playerName: string };
}): string {
  const world = normalizeSeasonWorld(input.world);
  const years = input.occurrences
    .filter(
      (o) =>
        normalizeSeasonWorld(o.world) === world &&
        sameAwardPlayer(input.player, o) &&
        o.year <= input.currentYear,
    )
    .map((o) => o.year);
  const unique = [...new Set(years)].sort((a, b) => a - b);
  return formatSeasonCareerLabel(unique, input.currentYear);
}

export function awardScopeEquals(
  a: AwardCareerScope,
  b: AwardCareerScope,
): boolean {
  return scopeKey(a) === scopeKey(b);
}

type MvpRole = "pitcher" | "batter";

/**
 * 月間MVP: 選手 × WORLD × 部門の通算何回目か。
 * セ/パ移動・表記差・年度またぎを同一部門として通算する。
 */
export function countMonthlyMvpCareerTimes(
  all: SavedMonthlyMvpRecord[],
  role: MvpRole,
  player: { playerId: string | null; playerName: string },
  current: {
    year: number;
    world: SeasonWorld | null;
    league: LeagueSide;
    month: number;
  },
): number {
  if (!isRealAwardPlayerName(player.playerName)) return 1;

  const occurrences: AwardOccurrence[] = [];
  for (const r of all) {
    const side = role === "pitcher" ? r.pitcher : r.batter;
    if (!isRealAwardPlayerName(side.playerName)) continue;
    occurrences.push({
      year: r.year,
      month: r.month,
      world: normalizeSeasonWorld(r.world),
      slotKey: r.league,
      playerId: side.playerId,
      playerName: side.playerName,
    });
  }

  return countAwardCareerTimes({
    scope: { type: "monthlyMvp", role },
    occurrences,
    current: {
      year: current.year,
      month: current.month,
      world: current.world,
      slotKey: current.league,
      playerId: player.playerId,
      playerName: player.playerName,
    },
    player,
  });
}
