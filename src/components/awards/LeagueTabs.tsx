"use client";

import { cn } from "@/lib/cn";
import type { LeagueSide } from "@/data/awards";

const LEAGUES = [
  ["central", "セ・リーグ"],
  ["pacific", "パ・リーグ"],
] as const;

export function LeagueTabs({
  value,
  onChange,
  className,
}: {
  value: LeagueSide;
  onChange: (league: LeagueSide) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="tablist">
      {LEAGUES.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md border px-3.5 py-1.5 text-[13px] leading-snug tracking-[0.06em] transition-colors",
            value === id
              ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
              : "border-white/15 bg-black/40 text-white/70 hover:border-white/30 hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
