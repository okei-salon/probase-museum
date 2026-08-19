"use client";

import { cn } from "@/lib/cn";

export type ImportMethod = "ocr" | "manual";

type ImportMethodPickerProps = {
  value: ImportMethod;
  onChange: (method: ImportMethod) => void;
};

export function ImportMethodPicker({
  value,
  onChange,
}: ImportMethodPickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("ocr")}
        className={cn(
          "rounded-xl border px-4 py-4 text-left transition-colors",
          value === "ocr"
            ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/12"
            : "border-white/12 bg-black/40 hover:border-white/25",
        )}
      >
        <p className="text-[13px] font-medium text-white">画像から読み込み</p>
        <p className="mt-1 text-[12px] text-white/55">
          月間MVP、または年度個人成績ランキング（約10人一括）
        </p>
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={cn(
          "rounded-xl border px-4 py-4 text-left transition-colors",
          value === "manual"
            ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/12"
            : "border-white/12 bg-black/40 hover:border-white/25",
        )}
      >
        <p className="text-[13px] font-medium text-white">手入力</p>
        <p className="mt-1 text-[12px] text-white/55">
          1選手ずつ詳細入力・修正（年度個人成績など）
        </p>
      </button>
    </div>
  );
}
