"use client";

import { useMemo, useState } from "react";
import {
  STREAK_DEPARTMENTS,
  buildStreakBoard,
  type StreakDeptId,
} from "@/data/recordsRankings";
import { cn } from "@/lib/cn";

export function RecordsStreakBoard() {
  const [deptId, setDeptId] = useState<StreakDeptId>("hit_streak");
  const def =
    STREAK_DEPARTMENTS.find((d) => d.id === deptId) ?? STREAK_DEPARTMENTS[0]!;

  const board = useMemo(() => buildStreakBoard(def), [def]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {STREAK_DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDeptId(d.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
              deptId === d.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/12 bg-black/50 p-4 backdrop-blur-sm">
        <p className="text-[10px] tracking-[0.18em] text-museum-ivory-soft">
          STREAK TOP10
        </p>
        <h3 className="mb-4 font-display text-[20px] tracking-[0.04em] text-museum-ivory">
          {def.label}
        </h3>

        {!board.entries.length ? (
          <p className="text-[13px] text-museum-ivory-soft">
            {board.emptyReason}
          </p>
        ) : (
          <div className="space-y-3">
            {board.entries.map((row, idx) => (
              <div
                key={`${row.playerId}-${row.seasonLabel}-${idx}`}
                className="flex items-center gap-4 border-b border-white/5 pb-3 last:border-0"
              >
                <span className="w-8 shrink-0 font-display text-[22px] text-[color:var(--museum-accent,#d4af37)]">
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-museum-ivory">
                    {row.playerName}
                  </p>
                  <p className="text-[11px] text-museum-ivory-soft">
                    {row.teamShort}　{row.seasonLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[26px] leading-none tracking-[0.02em] text-[color:var(--museum-accent,#d4af37)]">
                    {row.valueText}
                  </p>
                  <p className="mt-1 text-[10px] text-museum-ivory-soft">
                    {def.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
