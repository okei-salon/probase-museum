"use client";

import { useMemo } from "react";
import { AwardListTable } from "@/components/awards/AwardCards";
import {
  identityFromSeasonKey,
  resolveGoldenGloveBoard,
} from "@/data/sop/seasonAwardsView";

export function RegisteredGoldenGloveBoard({
  year,
  seasonKey,
}: {
  year: string;
  seasonKey: string;
}) {
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey, year),
    [seasonKey, year],
  );
  const data = useMemo(
    () => resolveGoldenGloveBoard(identity),
    [identity],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-[12px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
          セ・リーグ
        </p>
        <AwardListTable rows={data.central} showStats={false} dense />
      </div>
      <div>
        <p className="mb-3 text-[12px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
          パ・リーグ
        </p>
        <AwardListTable rows={data.pacific} showStats={false} dense />
      </div>
    </div>
  );
}
