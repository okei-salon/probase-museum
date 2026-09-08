/**
 * ブラウザ正式ストアへ、ユーザー提供の捕手打撃を適用（CS 保持）。
 */

import { computeBatterDerived } from "@/lib/manualEntry/computeSeasonStats";
import { mergeBatterCountingPreserveCatcherCs } from "../batterCatcherMerge";
import { getSeasonLine, upsertBatterSeasonLine } from "../store";
import { seasonLineKey } from "../types";
import type { BatterSeasonLine } from "../types";
import { buildCatcherBatterRestorePlan } from "./buildCatcherBatterRestorePlan";

const YEAR = 2026;
const WORLD = "BLUE" as const;

export type CatcherBatterRestoreResult = {
  restored: Array<{
    playerId: string;
    fullName: string;
    recordId: string;
    ab: number;
    h: number;
    hr: number;
    preservedCs: boolean;
  }>;
  skippedNonCatcher: string[];
  missingFromPaste: string[];
  errors: string[];
};

export function applyCatcherBatterRestore2026Blue(
  pasteText?: string,
): CatcherBatterRestoreResult {
  const { plans, skippedNonCatcher, missingFromPaste, errors } =
    buildCatcherBatterRestorePlan(pasteText);
  const restored: CatcherBatterRestoreResult["restored"] = [];
  const now = new Date().toISOString();

  for (const { target, counting: incoming } of plans) {
    const id = seasonLineKey(target.playerId, YEAR, "batter", "pennant", WORLD);
    const existing = getSeasonLine(
      target.playerId,
      YEAR,
      "batter",
      "pennant",
      WORLD,
    );
    const existingBatter =
      existing && existing.role === "batter" ? existing : null;
    const counting = mergeBatterCountingPreserveCatcherCs(
      incoming,
      existingBatter?.counting,
    );
    const derived = computeBatterDerived(counting);
    const line: BatterSeasonLine = {
      id,
      playerId: target.playerId,
      playerName: target.fullName,
      year: YEAR,
      world: WORLD,
      teamId: existingBatter?.teamId || target.teamId,
      teamName: existingBatter?.teamName || target.teamName,
      scope: "pennant",
      role: "batter",
      source: existingBatter?.source ?? "ocr",
      counting,
      derived,
      createdAt: existingBatter?.createdAt ?? now,
      updatedAt: now,
    };
    upsertBatterSeasonLine(line);
    restored.push({
      playerId: target.playerId,
      fullName: target.fullName,
      recordId: id,
      ab: counting.ab,
      h: counting.h,
      hr: counting.hr,
      preservedCs:
        existingBatter?.counting.csAttempted != null ||
        existingBatter?.counting.csAllowed != null ||
        existingBatter?.counting.csCaught != null,
    });
  }

  return { restored, skippedNonCatcher, missingFromPaste, errors };
}
