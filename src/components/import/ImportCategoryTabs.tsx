"use client";

import {
  IMPORT_CATEGORIES,
  type ImportCategoryId,
} from "@/data/import/categories";
import { cn } from "@/lib/cn";

type ImportCategoryTabsProps = {
  value: ImportCategoryId;
  onChange: (id: ImportCategoryId) => void;
};

export function ImportCategoryTabs({
  value,
  onChange,
}: ImportCategoryTabsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {IMPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors sm:px-4",
              value === cat.id
                ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15"
                : "border-white/12 bg-black/40 hover:border-white/25",
            )}
          >
            <p
              className={cn(
                "text-[13px] font-medium",
                value === cat.id
                  ? "text-[color:var(--museum-accent,#d4af37)]"
                  : "text-white",
              )}
            >
              {cat.label}
            </p>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-white/55">
        {IMPORT_CATEGORIES.find((c) => c.id === value)?.description}
      </p>
    </div>
  );
}
