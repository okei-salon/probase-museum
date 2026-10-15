"use client";

import { useMemo } from "react";
import { AwardListTable } from "@/components/awards/AwardCards";
import { MuseumBoardStatusMessage } from "@/components/museum/MuseumBoardStatusMessage";
import { getMuseumCloudLoadState } from "@/data/museumCloudLoadState";
import { getSeasonLinesCacheState } from "@/data/playerSeasonLines";
import {
  identityFromSeasonKey,
  resolveGoldenGloveBoard,
} from "@/data/sop/seasonAwardsView";
import {
  useMuseumBoardStatus,
  useMuseumBoardTick,
} from "@/hooks/useMuseumBoardStatus";

export function RegisteredGoldenGloveBoard({
  year,
  seasonKey,
}: {
  year: string;
  seasonKey: string;
}) {
  const { tick } = useMuseumBoardTick();
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey, year),
    [seasonKey, year],
  );
  const data = useMemo(() => {
    void tick;
    return resolveGoldenGloveBoard(identity);
  }, [identity, tick]);

  const hasLocalOrCloud = useMemo(() => {
    void tick;
    const cloudReady =
      getMuseumCloudLoadState().phase === "ready" ||
      getSeasonLinesCacheState().cloudHydrated;
    return cloudReady || data.central.length > 0 || data.pacific.length > 0;
  }, [tick, data.central.length, data.pacific.length]);

  const { status } = useMuseumBoardStatus(hasLocalOrCloud);

  if (status !== "ready") {
    return (
      <MuseumBoardStatusMessage
        status={status}
        emptyMessage="このシーズンのゴールデングラブはまだ登録されていません。"
      />
    );
  }

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
