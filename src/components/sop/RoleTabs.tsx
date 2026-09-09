"use client";

import { cn } from "@/lib/cn";

export function RoleTabs<T extends string>({
  role,
  onChange,
  labels = [
    { id: "all" as T, label: "総合" },
    { id: "batter" as T, label: "野手" },
    { id: "pitcher" as T, label: "投手" },
  ],
}: {
  role: T;
  onChange: (r: T) => void;
  labels?: { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
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
  );
}
