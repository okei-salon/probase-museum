"use client";

import { cn } from "@/lib/cn";

export type ImportInputMode = "image" | "partner" | "manual";

type ImportModeTabsProps = {
  value: ImportInputMode;
  onChange: (m: ImportInputMode) => void;
  modes?: ImportInputMode[];
};

const LABELS: Record<ImportInputMode, string> = {
  image: "画像から読み込み",
  partner: "相棒データ貼り付け",
  manual: "手入力",
};

export function ImportModeTabs({
  value,
  onChange,
  modes = ["image", "partner", "manual"],
}: ImportModeTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-[12px]",
            value === id
              ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
              : "border-white/15 text-white/70 hover:border-white/30",
          )}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
