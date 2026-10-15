"use client";

import { useMemo } from "react";
import { MuseumBoardStatusMessage } from "@/components/museum/MuseumBoardStatusMessage";
import { buildTeamCareerCards } from "@/data/teamDetail";
import type { TeamId } from "@/data/teams";
import {
  useMuseumBoardStatus,
  useMuseumBoardTick,
} from "@/hooks/useMuseumBoardStatus";

type Props = { teamId: TeamId };

export function TeamCareerBoard({ teamId }: Props) {
  const { tick } = useMuseumBoardTick();

  const cards = useMemo(() => {
    void tick;
    return buildTeamCareerCards(teamId);
  }, [tick, teamId]);

  const { status } = useMuseumBoardStatus(cards.length > 0);

  if (status !== "ready") {
    return (
      <MuseumBoardStatusMessage
        status={status}
        emptyMessage="通算成績を表示できるデータはまだありません。"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.id}
          className="rounded-xl border border-white/12 bg-black/50 p-4"
        >
          <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
            {card.label}
          </p>
          <p className="mt-2 font-display text-[26px] text-[color:var(--museum-accent,#d4af37)]">
            {card.valueText}
          </p>
          <p className="mt-2 text-[13px] text-museum-ivory">
            {card.rank != null ? `${card.rank}位` : "—"}
          </p>
        </article>
      ))}
    </div>
  );
}
