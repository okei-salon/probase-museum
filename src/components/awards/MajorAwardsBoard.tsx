"use client";

import { useMemo, useState } from "react";
import {
  AwardWinnerCard,
  LeagueTwoColumn,
} from "@/components/awards/AwardCards";
import {
  identityFromSeasonKey,
  resolveMvpBoard,
  resolveRookieBoard,
  resolveSawamuraBoard,
} from "@/data/sop/seasonAwardsView";
import { cn } from "@/lib/cn";

type MajorKind = "mvp" | "rookie" | "sawamura";

const TABS: { id: MajorKind; label: string; badge: string }[] = [
  { id: "mvp", label: "MVP", badge: "MVP" },
  { id: "rookie", label: "新人王", badge: "新人王" },
  { id: "sawamura", label: "沢村賞", badge: "沢村賞" },
];

type MajorAwardsBoardProps = {
  year: string;
  seasonKey?: string;
};

/** 年間主要表彰：MVP / 新人王 / 沢村賞（レジストリ優先・WORLD 分離） */
export function MajorAwardsBoard({
  year,
  seasonKey,
}: MajorAwardsBoardProps) {
  const [kind, setKind] = useState<MajorKind>("mvp");
  const identity = useMemo(
    () => identityFromSeasonKey(seasonKey ?? year, year),
    [seasonKey, year],
  );

  const data = useMemo(() => {
    if (kind === "rookie") return resolveRookieBoard(identity);
    if (kind === "sawamura") return resolveSawamuraBoard(identity);
    return resolveMvpBoard(identity);
  }, [kind, identity]);

  const badge = TABS.find((t) => t.id === kind)?.badge ?? "MVP";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setKind(tab.id)}
            className={cn(
              "rounded-md border px-4 py-2 text-[13px] tracking-[0.08em] transition-colors",
              kind === tab.id
                ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-white/65 hover:border-white/30",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <LeagueTwoColumn
        central={data.central}
        pacific={data.pacific}
        render={(c) => <AwardWinnerCard card={c} badge={badge} />}
      />
    </div>
  );
}
