"use client";

import { useMemo } from "react";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type SeasonAchievement,
} from "@/data/seasonAchievements";
import {
  achievementSeasonLabel,
  buildOtherFeatsSections,
} from "@/data/recordsRankings";
import { cn } from "@/lib/cn";

export function RecordsOtherFeatsBoard() {
  const sections = useMemo(() => buildOtherFeatsSections(), []);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  if (total === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        全年度を通じた偉業はまだありません。SEASON「記録・偉業」への登録・個人成績からの自動判定が反映されます。
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <section key={section.id} className="space-y-3">
            <h3 className="font-display text-[18px] tracking-[0.06em] text-museum-ivory">
              {section.label}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {section.items.map((item) => (
                <FeatCard
                  key={item.id}
                  item={item}
                  highlightNpb={section.id === "npb"}
                />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

function FeatCard({
  item,
  highlightNpb,
}: {
  item: SeasonAchievement;
  highlightNpb?: boolean;
}) {
  const isNpb =
    highlightNpb ||
    item.category === "npb_record" ||
    item.isNpbRecord ||
    item.isNpbUpdate;

  const valueText =
    item.valueLabel ??
    (item.value != null
      ? `${item.value}${item.unit ? item.unit : ""}`
      : "達成");

  return (
    <article
      className={cn(
        "rounded-xl border bg-black/50 p-4 backdrop-blur-sm",
        isNpb
          ? "border-[color:var(--museum-accent,#d4af37)]/60 shadow-[0_0_28px_rgba(212,175,55,0.14)]"
          : "border-white/12",
      )}
    >
      <p
        className={cn(
          "text-[10px] tracking-[0.16em]",
          isNpb
            ? "text-[color:var(--museum-accent,#d4af37)]"
            : "text-museum-ivory-soft",
        )}
      >
        {isNpb && item.category !== "npb_record"
          ? `${ACHIEVEMENT_CATEGORY_LABELS[item.category]} · NPB`
          : item.recordType === "hr_sb_combo"
            ? "本塁打 × 盗塁"
            : ACHIEVEMENT_CATEGORY_LABELS[item.category]}
        {item.isNpbUpdate ? " · 更新" : item.isNpbRecord ? " · 到達" : null}
      </p>
      <h4
        className={cn(
          "mt-1 font-display text-[17px] tracking-[0.04em]",
          isNpb
            ? "text-[color:var(--museum-accent,#d4af37)]"
            : "text-museum-ivory",
        )}
      >
        {item.recordName}
      </h4>
      <p className="mt-3 text-[15px] text-museum-ivory">{item.playerName}</p>
      <p className="text-[12px] text-museum-ivory-soft">
        {item.teamShort}
        <span className="mx-1.5 opacity-40">·</span>
        {achievementSeasonLabel(item)}
      </p>
      <p
        className={cn(
          "mt-3 text-[13px]",
          isNpb
            ? "text-[color:var(--museum-accent,#d4af37)]"
            : "text-museum-ivory-soft",
        )}
      >
        {valueText}
      </p>
    </article>
  );
}
