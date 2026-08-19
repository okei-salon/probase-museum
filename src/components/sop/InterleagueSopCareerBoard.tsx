"use client";

import { useEffect, useMemo, useState } from "react";
import { buildInterleagueSopCareerRankings } from "@/data/sop";
import type { SopRole } from "@/lib/sop";
import { cn } from "@/lib/cn";

/** 交流戦だけで獲得したSOPの通算ランキング */
export function InterleagueSopCareerBoard() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<SopRole | "all">("all");

  useEffect(() => {
    setReady(true);
  }, []);

  const rows = useMemo(
    () => (ready ? buildInterleagueSopCareerRankings(role) : []),
    [ready, role],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-museum-ivory-soft">
        交流戦SOPのみの通算（通常SOPは含みません）。BLUE＋RED
        を合算します。
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "総合" },
            { id: "batter" as const, label: "野手" },
            { id: "pitcher" as const, label: "投手" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
              role === r.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
        <table className="min-w-full text-left text-[12px]">
          <thead>
            <tr className="text-white/50">
              <th className="px-3 py-2">順位</th>
              <th className="px-3 py-2">選手</th>
              <th className="px-3 py-2">球団</th>
              <th className="px-3 py-2">通算</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row) => (
              <tr key={row.playerId} className="border-t border-white/5">
                <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                <td className="px-3 py-2 text-museum-ivory">{row.playerName}</td>
                <td className="px-3 py-2">{row.teamShort}</td>
                <td className="px-3 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                  {row.total}pt
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-white/45">
            交流戦通算SOPデータがありません。
          </p>
        ) : null}
      </div>
    </div>
  );
}
