"use client";

import { useMemo } from "react";
import { buildSopRulesCatalog } from "@/data/sop";

export function SopRulesBoard() {
  const sections = useMemo(() => buildSopRulesCatalog(), []);

  return (
    <div className="space-y-6">
      <p className="text-[12px] text-museum-ivory-soft">
        表示内容は既存のSOP計算ロジック（rules）と同一です。新しい採点ルールは追加していません。
      </p>
      {sections.map((section) => (
        <section
          key={section.id}
          className="rounded-xl border border-white/12 bg-black/50 p-4"
        >
          <h3 className="mb-3 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
            {section.title}
          </h3>
          <ul className="space-y-1.5">
            {section.rows.map((row) => (
              <li
                key={`${section.id}-${row.label}`}
                className="flex justify-between gap-3 border-b border-white/5 py-1.5 text-[13px] last:border-0"
              >
                <span className="text-museum-ivory">{row.label}</span>
                <span className="shrink-0 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                  {row.pointsText}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
