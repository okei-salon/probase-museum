"use client";

import { useMemo, useState } from "react";
import type { LeagueSide, ResolvedAwardCard } from "@/data/awards";
import { AwardListTable } from "@/components/awards/AwardCards";
import { LeagueTabs } from "@/components/awards/LeagueTabs";
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
  const resolved = useMemo(() => {
    if (centralProp && pacificProp) {
      return { central: centralProp, pacific: pacificProp };
    }
    return resolveBestNineBoard(identity);
  }, [centralProp, pacificProp, identity]);
  const rows = league === "central" ? resolved.central : resolved.pacific;

  return (
    <div className="space-y-3">
      <LeagueTabs value={league} onChange={setLeague} />
      <AwardListTable rows={rows} showStats dense />
    </div>
  );
}
