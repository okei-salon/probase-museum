"use client";

import { useState } from "react";
import { RecordsStatBoard } from "@/components/records/RecordsStatBoard";
import { cn } from "@/lib/cn";

type IlMode = "season" | "career";

/** 交流戦記録：歴代（年度）／通算を切替。通常 RECORDS とは scope で分離。 */
export function InterleagueRecordsBoard() {
  const [mode, setMode] = useState<IlMode>("season");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "season" as const, label: "歴代（年度）" },
            { id: "career" as const, label: "通算" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
              mode === m.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <RecordsStatBoard mode={mode} scope="interleague" />
    </div>
  );
}
