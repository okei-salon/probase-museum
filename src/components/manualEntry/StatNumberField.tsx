"use client";

import { useState } from "react";
import type { NormalizedNumber } from "@/lib/manualEntry/normalizeInput";
import { cn } from "@/lib/cn";

type StatNumberFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (raw: string) => void;
  normalize: (raw: string) => NormalizedNumber;
  optional?: boolean;
};

export function StatNumberField({
  label,
  hint,
  value,
  onChange,
  normalize,
  optional,
}: StatNumberFieldProps) {
  const [touched, setTouched] = useState(false);
  const result = value.trim() ? normalize(value) : null;

  const showNote =
    touched &&
    result &&
    (result.confidence === "needs_confirm" || result.confidence === "invalid");

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-[11px] tracking-[0.08em] text-white/55">
        <span>
          {label}
          {optional ? (
            <span className="ml-1 text-white/35">任意</span>
          ) : null}
        </span>
        {result && result.value != null && result.confidence !== "invalid" ? (
          <span
            className={cn(
              "tabular-nums text-[11px]",
              result.confidence === "needs_confirm"
                ? "text-amber-200"
                : "text-[color:var(--museum-accent,#d4af37)]/80",
            )}
          >
            → {result.text}
          </span>
        ) : null}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setTouched(true);
          if (
            result &&
            result.value != null &&
            result.confidence !== "invalid"
          ) {
            onChange(result.text);
          }
        }}
        className={cn(
          "w-full rounded-lg border bg-black/50 px-2.5 py-1.5 text-[14px] tabular-nums text-white outline-none",
          result?.confidence === "invalid"
            ? "border-red-400/50"
            : result?.confidence === "needs_confirm"
              ? "border-amber-400/45"
              : "border-white/15 focus:border-[color:var(--museum-accent,#d4af37)]/60",
        )}
      />
      {hint && !showNote ? (
        <span className="mt-0.5 block text-[10px] text-white/35">{hint}</span>
      ) : null}
      {showNote && result?.note ? (
        <span
          className={cn(
            "mt-0.5 block text-[10px]",
            result.confidence === "invalid" ? "text-red-300" : "text-amber-200",
          )}
        >
          {result.note}
        </span>
      ) : null}
    </label>
  );
}
