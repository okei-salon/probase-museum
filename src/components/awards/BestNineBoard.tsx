"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { LeagueSide, ResolvedAwardCard } from "@/data/awards";
import { AwardListTable } from "@/components/awards/AwardCards";
import { LeagueTabs } from "@/components/awards/LeagueTabs";
import { subscribeImportDemoMode } from "@/data/import/demoMode";
import { listSeasonLines } from "@/data/playerSeasonLines";
import { listRegisteredAwards } from "@/data/sop/awardsRegistry";
import {
  identityFromSeasonKey,
  resolveBestNineBoard,
} from "@/data/sop/seasonAwardsView";

type BestNineBoardProps = {
  year: string;
  seasonKey?: string;
  /** レガシー互換: 直接 rows を渡す場合 */
  central?: ResolvedAwardCard[];
  pacific?: ResolvedAwardCard[];
};

const EMPTY_AWARDS: ReturnType<typeof listRegisteredAwards> = [];
let awardsSnapshotCache: ReturnType<typeof listRegisteredAwards> | null = null;
let linesSnapshotCache: ReturnType<typeof listSeasonLines> | null = null;

function getAwardsSnapshot() {
  if (awardsSnapshotCache) return awardsSnapshotCache;
  awardsSnapshotCache = listRegisteredAwards();
  return awardsSnapshotCache;
}

function getLinesSnapshot() {
  if (linesSnapshotCache) return linesSnapshotCache;
  linesSnapshotCache = listSeasonLines();
  return linesSnapshotCache;
}

function getEmptyAwardsSnapshot() {
  return EMPTY_AWARDS;
}

function getEmptyLinesSnapshot(): ReturnType<typeof listSeasonLines> {
  return [];
}

function subscribeAwardStatsStore(onStoreChange: () => void): () => void {
  return subscribeImportDemoMode(() => {
    awardsSnapshotCache = null;
    linesSnapshotCache = null;
    onStoreChange();
  });
}

export function BestNineBoard({
  year,
  seasonKey,
  central: centralProp,
  pacific: pacificProp,
}: BestNineBoardProps) {
  const [league, setLeague] = useState<LeagueSide>("central");
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey ?? year, year),
    [seasonKey, year],
  );

  const awardsVersion = useSyncExternalStore(
    subscribeAwardStatsStore,
    getAwardsSnapshot,
    getEmptyAwardsSnapshot,
  );
  const linesVersion = useSyncExternalStore(
    subscribeAwardStatsStore,
    getLinesSnapshot,
    getEmptyLinesSnapshot,
  );

  const resolved = useMemo(() => {
    void awardsVersion;
    void linesVersion;
    if (centralProp && pacificProp) {
      return { central: centralProp, pacific: pacificProp };
    }
    return resolveBestNineBoard(identity);
  }, [centralProp, pacificProp, identity, awardsVersion, linesVersion]);
  const rows = league === "central" ? resolved.central : resolved.pacific;

  return (
    <div className="space-y-3">
      <LeagueTabs value={league} onChange={setLeague} />
      <AwardListTable rows={rows} showStats dense />
    </div>
  );
}
