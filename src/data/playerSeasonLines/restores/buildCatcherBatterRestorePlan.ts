/**
 * ユーザー提供貼り付け → 捕手打撃 counting 計画（副作用なし）
 */

import { rowToBatterCounting } from "@/lib/import/seasonBatchConvert";
import { parsePartnerSeasonPaste } from "@/lib/import/parsePartnerSeasonPaste";
import type { SeasonBatchPlayerRow } from "@/data/import/seasonBatchTypes";
import type { BatterCountingInput } from "@/lib/manualEntry/computeSeasonStats";
import {
  SKIPPED_NON_CATCHER_PASTE_NAMES,
  VERIFIED_2026_BLUE_CATCHER_BATTER_TARGETS,
  type VerifiedCatcherBatterTarget,
} from "./verifiedCatcherTargets2026Blue";
import { USER_PROVIDED_CATCHER_BATTER_2026_BLUE_PASTE } from "./userProvidedCatcherBatter2026BluePaste";

const YEAR = 2026;

function partialToBatchRow(
  partial: ReturnType<typeof parsePartnerSeasonPaste>["rows"][number],
  target: VerifiedCatcherBatterTarget,
): SeasonBatchPlayerRow {
  return {
    rowId: `restore-${target.playerId}`,
    rowIndex: partial.rowIndex,
    displayRank: partial.displayRank,
    year: YEAR,
    playerName: target.fullName,
    playerId: target.playerId,
    teamShort: target.teamName,
    teamId: target.teamId,
    teamName: target.teamName,
    fields: Object.fromEntries(
      Object.entries(partial.fields).map(([k, cell]) => [
        k,
        {
          value: cell?.value ?? null,
          display: cell?.raw != null ? String(cell.raw) : "",
          status: cell?.status ?? "ok",
          sources: [],
          note: cell?.note,
        },
      ]),
    ) as SeasonBatchPlayerRow["fields"],
    nameStatus: "ok",
    teamStatus: "ok",
    pendingNewPlayer: false,
  };
}

export function buildCatcherBatterRestorePlan(
  pasteText: string = USER_PROVIDED_CATCHER_BATTER_2026_BLUE_PASTE,
): {
  plans: Array<{
    target: VerifiedCatcherBatterTarget;
    counting: BatterCountingInput;
  }>;
  skippedNonCatcher: string[];
  missingFromPaste: string[];
  errors: string[];
} {
  const normalized = pasteText.replace(
    /OPS=([^\s|\n]+?)YEAR=/g,
    "OPS=$1\n\nYEAR=",
  );
  const parsed = parsePartnerSeasonPaste(normalized, YEAR, "batter");
  const byPasteName = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) {
    const name = (row.playerName || "").trim();
    if (!name) continue;
    if (!byPasteName.has(name)) byPasteName.set(name, row);
  }

  const skippedNonCatcher = SKIPPED_NON_CATCHER_PASTE_NAMES.filter((n) =>
    byPasteName.has(n),
  );
  const plans: Array<{
    target: VerifiedCatcherBatterTarget;
    counting: BatterCountingInput;
  }> = [];
  const missingFromPaste: string[] = [];
  const errors: string[] = [];

  for (const target of VERIFIED_2026_BLUE_CATCHER_BATTER_TARGETS) {
    const partial = byPasteName.get(target.pasteName);
    if (!partial) {
      missingFromPaste.push(target.pasteName);
      continue;
    }
    try {
      const row = partialToBatchRow(partial, target);
      const counting = rowToBatterCounting(row);
      if (
        (counting.ab ?? 0) === 0 &&
        (counting.pa ?? 0) === 0 &&
        (counting.h ?? 0) === 0
      ) {
        errors.push(`${target.fullName}: 貼り付け打撃が空のためスキップ`);
        continue;
      }
      plans.push({ target, counting });
    } catch (e) {
      errors.push(
        `${target.fullName}: ${e instanceof Error ? e.message : "parse error"}`,
      );
    }
  }

  return { plans, skippedNonCatcher, missingFromPaste, errors };
}
