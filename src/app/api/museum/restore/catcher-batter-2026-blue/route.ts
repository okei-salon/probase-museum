import { NextResponse } from "next/server";
import {
  requireDatabaseOr503,
  requireMuseumApiSession,
} from "@/lib/db/apiGuard";
import {
  getMuseumDocument,
  SEASON_LINES_COLLECTION,
  upsertMuseumDocument,
} from "@/lib/db/museumDocuments";
import { computeBatterDerived } from "@/lib/manualEntry/computeSeasonStats";
import { mergeBatterCountingPreserveCatcherCs } from "@/data/playerSeasonLines/batterCatcherMerge";
import { buildCatcherBatterRestorePlan } from "@/data/playerSeasonLines/restores/buildCatcherBatterRestorePlan";
import type { BatterSeasonLine } from "@/data/playerSeasonLines/types";
import { seasonLineKey } from "@/data/playerSeasonLines/types";

export const runtime = "nodejs";

const YEAR = 2026;
const WORLD = "BLUE" as const;

/**
 * ユーザー提供の捕手打撃を 2026 BLUE 正式行へ復元。
 * 既存 CS は保持。他 YEAR/WORLD は変更しない。
 */
export async function POST() {
  const session = await requireMuseumApiSession();
  if (session instanceof NextResponse) return session;
  const dbErr = requireDatabaseOr503();
  if (dbErr) return dbErr;

  const { plans, skippedNonCatcher, missingFromPaste, errors } =
    buildCatcherBatterRestorePlan();
  const restored: Array<{
    playerId: string;
    fullName: string;
    recordId: string;
    ab: number;
    h: number;
    hr: number;
    preservedCs: boolean;
  }> = [];
  const now = new Date().toISOString();

  for (const { target, counting: incoming } of plans) {
    const id = seasonLineKey(target.playerId, YEAR, "batter", "pennant", WORLD);
    const existingRow = await getMuseumDocument(SEASON_LINES_COLLECTION, id);
    let existing: BatterSeasonLine | null = null;
    if (existingRow?.payload && typeof existingRow.payload === "object") {
      existing = existingRow.payload as BatterSeasonLine;
    }

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

    await upsertMuseumDocument({
      id,
      collection: SEASON_LINES_COLLECTION,
      year: YEAR,
      world: WORLD,
      payload: line,
    });

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

  return NextResponse.json({
    ok: true,
    restored,
    skippedNonCatcher,
    missingFromPaste,
    errors,
  });
}
