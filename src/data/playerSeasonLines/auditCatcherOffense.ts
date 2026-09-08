/**
 * 2026 BLUE 捕手の打撃 0化監査（読み取り専用分類）。
 * 推測復元は行わない。
 */

import type { BatterCountingInput } from "@/lib/manualEntry/computeSeasonStats";
import { normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";
import {
  hasOffensiveBatterCounting,
  isEmptyOffensiveBatterLine,
} from "./restoreEmptyBatterOffense";
import { isZeroedBatterOffense } from "./batterCatcherMerge";
import type { BatterSeasonLine, PlayerSeasonLine } from "./types";

export type CatcherOffenseAuditRow = {
  playerId: string;
  playerName: string;
  teamName: string;
  recordId: string;
  world: SeasonWorld | null;
  year: number;
  source: string;
  status: "ok" | "zeroed" | "missing";
  avg: number | null;
  g: number | null;
  pa: number | null;
  ab: number | null;
  h: number | null;
  hr: number | null;
  rbi: number | null;
  sb: number | null;
  obp: number | null;
  ops: number | null;
  csAttempted: number | null;
  csAllowed: number | null;
  csCaught: number | null;
  /** 同一 playerId+year+WORLD の別レコードに正常打撃があるか */
  sameWorldOffensePeerId: string | null;
  restoreFrom: string | null;
  needsUserData: boolean;
};

function countingSnapshot(c: BatterCountingInput | undefined) {
  return {
    g: c?.g ?? null,
    pa: c?.pa ?? null,
    ab: c?.ab ?? null,
    h: c?.h ?? null,
    hr: c?.hr ?? null,
    rbi: c?.rbi ?? null,
    sb: c?.sb ?? null,
    csAttempted: c?.csAttempted ?? null,
    csAllowed: c?.csAllowed ?? null,
    csCaught: c?.csCaught ?? null,
  };
}

/**
 * 同一 WORLD・年度・選手の pennant 野手行のうち、打撃がある別 id を探す。
 * 他 WORLD / legacy / demo は候補にしない。
 */
export function findSameWorldOffensePeer(
  target: BatterSeasonLine,
  pool: PlayerSeasonLine[],
): BatterSeasonLine | null {
  const tw = normalizeSeasonWorld(target.world);
  if (tw == null) return null;
  const peers = pool.filter(
    (l): l is BatterSeasonLine =>
      l.role === "batter" &&
      l.scope === "pennant" &&
      l.playerId === target.playerId &&
      Number(l.year) === Number(target.year) &&
      normalizeSeasonWorld(l.world) === tw &&
      l.id !== target.id &&
      hasOffensiveBatterCounting(l.counting),
  );
  return peers[0] ?? null;
}

export function auditCatcherOffenseForSeason(options: {
  lines: PlayerSeasonLine[];
  year: number;
  world: SeasonWorld;
  /** 捕手の playerId 一覧（マスター等）。未指定時は CS 付き or 0化行を対象 */
  catcherPlayerIds?: string[];
  catcherNamesById?: Record<string, string>;
}): {
  ok: CatcherOffenseAuditRow[];
  zeroed: CatcherOffenseAuditRow[];
  missing: CatcherOffenseAuditRow[];
  restorableFromSameWorldPeer: CatcherOffenseAuditRow[];
  needsUserData: CatcherOffenseAuditRow[];
} {
  const { lines, year, world } = options;
  const catcherSet = options.catcherPlayerIds
    ? new Set(options.catcherPlayerIds)
    : null;

  const formal = lines.filter(
    (l): l is BatterSeasonLine =>
      l.role === "batter" &&
      l.scope === "pennant" &&
      Number(l.year) === year &&
      normalizeSeasonWorld(l.world) === world,
  );

  const byPlayer = new Map<string, BatterSeasonLine>();
  for (const line of formal) {
    const prev = byPlayer.get(line.playerId);
    if (!prev) {
      byPlayer.set(line.playerId, line);
      continue;
    }
    // 打撃がある方を「現在参照」とみなす
    if (
      !hasOffensiveBatterCounting(prev.counting) &&
      hasOffensiveBatterCounting(line.counting)
    ) {
      byPlayer.set(line.playerId, line);
    }
  }

  const playerIds =
    catcherSet != null
      ? [...catcherSet]
      : formal
          .filter(
            (l) =>
              l.counting.csAttempted != null ||
              l.counting.csAllowed != null ||
              l.counting.csCaught != null ||
              isZeroedBatterOffense(l.counting),
          )
          .map((l) => l.playerId);

  const uniqueIds = [...new Set(playerIds)];
  const ok: CatcherOffenseAuditRow[] = [];
  const zeroed: CatcherOffenseAuditRow[] = [];
  const missing: CatcherOffenseAuditRow[] = [];

  for (const playerId of uniqueIds) {
    if (catcherSet && !catcherSet.has(playerId)) continue;
    const line = byPlayer.get(playerId) ?? null;
    if (!line) {
      missing.push({
        playerId,
        playerName: options.catcherNamesById?.[playerId] ?? playerId,
        teamName: "",
        recordId: "(none)",
        world,
        year,
        source: "",
        status: "missing",
        avg: null,
        g: null,
        pa: null,
        ab: null,
        h: null,
        hr: null,
        rbi: null,
        sb: null,
        obp: null,
        ops: null,
        csAttempted: null,
        csAllowed: null,
        csCaught: null,
        sameWorldOffensePeerId: null,
        restoreFrom: null,
        needsUserData: true,
      });
      continue;
    }

    const snap = countingSnapshot(line.counting);
    const peer = findSameWorldOffensePeer(line, lines);
    const zeroedOffense =
      isEmptyOffensiveBatterLine(line) || isZeroedBatterOffense(line.counting);
    const row: CatcherOffenseAuditRow = {
      playerId,
      playerName: line.playerName,
      teamName: line.teamName,
      recordId: line.id,
      world: normalizeSeasonWorld(line.world),
      year: Number(line.year),
      source: line.source,
      status: zeroedOffense ? "zeroed" : "ok",
      avg: line.derived?.avg ?? null,
      ...snap,
      obp: line.derived?.obp ?? null,
      ops: line.derived?.ops ?? null,
      sameWorldOffensePeerId: peer?.id ?? null,
      restoreFrom: peer
        ? `same-world peer ${peer.id}`
        : null,
      needsUserData: Boolean(zeroedOffense && !peer),
    };

    if (zeroedOffense) zeroed.push(row);
    else ok.push(row);
  }

  const restorableFromSameWorldPeer = zeroed.filter(
    (r) => r.sameWorldOffensePeerId != null,
  );
  const needsUserData = [
    ...zeroed.filter((r) => r.needsUserData),
    ...missing,
  ];

  return {
    ok,
    zeroed,
    missing,
    restorableFromSameWorldPeer,
    needsUserData,
  };
}
