"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTeamCareerCards } from "@/data/teamDetail";
import type { TeamId } from "@/data/teams";

type Props = { teamId: TeamId };

export function TeamCareerBoard({ teamId }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, [teamId]);

  const cards = useMemo(
    () => (ready ? buildTeamCareerCards(teamId) : []),
    [ready, teamId],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  if (cards.length === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        通算成績を表示できるデータはまだありません。
      </p>
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
