"use client";

import { cn } from "@/lib/cn";

type SubOption = { id: string; label: string };

type ImportSubTabsProps = {
  options: SubOption[];
  value: string;
  onChange: (id: string) => void;
};

/** カテゴリ内の2段目タブ（シーズン／表彰／特別記録など） */
export function ImportSubTabs({
  options,
  value,
  onChange,
}: ImportSubTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-[12px]",
            value === opt.id
              ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
              : "border-white/15 text-white/70 hover:border-white/30",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
