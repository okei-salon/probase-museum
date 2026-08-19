"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPlayerFeatsSummary } from "@/data/playerDetail";

type PlayerOtherRecordsBoardProps = {
  playerId: string;
};

export function PlayerOtherRecordsBoard({
  playerId,
}: PlayerOtherRecordsBoardProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, [playerId]);

  const items = useMemo(
    () => (ready ? buildPlayerFeatsSummary(playerId) : []),
    [ready, playerId],
  );

  if (!ready) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        この選手の特殊記録・偉業はまだありません。SEASON「記録・偉業」への登録や個人成績からの自動判定が反映されます。
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.key}
          className="rounded-xl border border-white/12 bg-black/50 p-4"
        >
          <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
            {item.label}
          </p>
          <p className="mt-2 font-display text-[22px] text-[color:var(--museum-accent,#d4af37)]">
            {item.valueLabel}
          </p>
          {item.detail ? (
            <p className="mt-1 text-[11px] text-museum-ivory-soft">
              {item.detail}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
