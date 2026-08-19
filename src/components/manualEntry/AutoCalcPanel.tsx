"use client";

import type { AutoCalcItem } from "@/lib/manualEntry/computeSeasonStats";
import { cn } from "@/lib/cn";

type AutoCalcPanelProps = {
  items: AutoCalcItem[];
  warnings?: string[];
  className?: string;
};

/** 手入力フォーム横の自動計算リアルタイム表示（入力欄ではない） */
export function AutoCalcPanel({
  items,
  warnings = [],
  className,
}: AutoCalcPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[color:var(--museum-accent,#d4af37)]/35 bg-[color:var(--museum-accent,#d4af37)]/8 px-3 py-2.5",
        className,
      )}
      aria-live="polite"
    >
      <p className="text-[11px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        自動計算
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10px] tracking-[0.06em] text-white/45">
              {item.label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 text-[15px] tabular-nums font-medium md:text-[16px]",
                item.ready
                  ? "text-white"
                  : "text-white/35",
              )}
            >
              {item.text}
            </dd>
          </div>
        ))}
      </dl>
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[11px] text-amber-200/90">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
