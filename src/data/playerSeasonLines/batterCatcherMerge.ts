/**
 * BATTER_SEASON と CATCHER_SEASON の共存マージ。
 * - 捕手取込は盗塁阻止3項目のみ更新し、打撃 counting を絶対に0埋めしない
 * - 野手取込は打撃を更新しつつ、未入力の盗塁阻止は既存を保持する
 */

import type { BatterCountingInput } from "@/lib/manualEntry/computeSeasonStats";

export type CatcherCsCounting = {
  csAttempted: number | null;
  csAllowed: number | null;
  csCaught: number | null;
};

/**
 * 捕手守備のみ先行登録するときの空シェル。
 * 既存行が無い場合に限り使う。既存打撃の上書きには使わない。
 */
export function emptyOffenseShellCounting(
  cs?: CatcherCsCounting,
): BatterCountingInput {
  return {
    ab: 0,
    h: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    csAttempted: cs?.csAttempted ?? null,
    csAllowed: cs?.csAllowed ?? null,
    csCaught: cs?.csCaught ?? null,
  };
}

/**
 * CATCHER_SEASON: 既存 counting があれば打撃フィールドをすべて保持し、
 * CS 3項目だけを更新する。欠損 CS は既存値を残す（null で消さない）。
 */
export function applyCatcherCsToCounting(
  existing: BatterCountingInput | null | undefined,
  cs: CatcherCsCounting,
): BatterCountingInput {
  const base = existing ?? emptyOffenseShellCounting();
  return {
    ...base,
    csAttempted: cs.csAttempted ?? base.csAttempted ?? null,
    csAllowed: cs.csAllowed ?? base.csAllowed ?? null,
    csCaught: cs.csCaught ?? base.csCaught ?? null,
  };
}

/**
 * BATTER_SEASON: 打撃は incoming を採用し、
 * CS が未入力なら既存の捕手守備を残す。
 */
export function mergeBatterCountingPreserveCatcherCs(
  incoming: BatterCountingInput,
  existing: BatterCountingInput | null | undefined,
): BatterCountingInput {
  if (!existing) return incoming;
  return {
    ...incoming,
    csAttempted: incoming.csAttempted ?? existing.csAttempted ?? null,
    csAllowed: incoming.csAllowed ?? existing.csAllowed ?? null,
    csCaught: incoming.csCaught ?? existing.csCaught ?? null,
  };
}

/** 年度実績が消えている（0化）判定 */
export function isZeroedBatterOffense(
  counting: BatterCountingInput | null | undefined,
): boolean {
  if (!counting) return true;
  return (
    (counting.pa ?? 0) === 0 &&
    (counting.ab ?? 0) === 0 &&
    (counting.h ?? 0) === 0
  );
}
