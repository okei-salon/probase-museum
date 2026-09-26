"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  buildYearFeats,
  SHOW_SEASON_FEATS_DEMO,
  type AchievementCategory,
  type SeasonAchievement,
} from "@/data/seasonAchievements";
import { npbBadgeLabel } from "@/data/seasonAchievements/annotateNpb";
import { subscribeImportDemoMode } from "@/data/import/demoMode";
import { parseSeasonKey } from "@/data/seasons";
import { cn } from "@/lib/cn";

type FilterId = "all" | AchievementCategory;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "special", label: "特殊記録" },
  { id: "streak", label: "連続記録" },
  { id: "single_game", label: "1試合記録" },
  { id: "season", label: "シーズン偉業" },
  { id: "npb_record", label: "NPB記録" },
];

type SeasonFeatsBoardProps = {
  year: number;
  seasonKey?: string;
};

export function SeasonFeatsBoard({ year, seasonKey }: SeasonFeatsBoardProps) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return subscribeImportDemoMode(() => setTick((t) => t + 1));
  }, []);

  const built = useMemo(() => {
    void tick;
    if (!mounted) {
      return { items: [] as SeasonAchievement[], demoCount: 0, autoCount: 0, manualCount: 0 };
    }
    if (seasonKey) {
      const identity = parseSeasonKey(seasonKey);
      if (identity) return buildYearFeats(identity);
    }
    return buildYearFeats(year);
  }, [year, seasonKey, tick, mounted]);
  const [filter, setFilter] = useState<FilterId>("all");

  const items = useMemo(() => {
    if (filter === "all") return built.items;
    if (filter === "npb_record") {
      return built.items.filter(
        (i) => i.category === "npb_record" || i.isNpbRecord === true,
      );
    }
    return built.items.filter((i) => i.category === filter);
  }, [built.items, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
              filter === f.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!mounted ? (
        <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>
      ) : SHOW_SEASON_FEATS_DEMO &&
        process.env.NODE_ENV === "development" &&
        built.demoCount > 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          デモデータを {built.demoCount}{" "}
          件表示中です（開発中のUI確認用）。正式登録データとは混在しません。
        </p>
      ) : null}

      {!mounted ? null : items.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          この条件に該当する記録・偉業はまだありません。
          個人成績の登録や、特殊記録の登録後に表示されます。
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <AchievementCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 単独の「達成」は出さない。履歴ラベル（初達成など）は別表示。 */
function valueDisplay(item: SeasonAchievement): string | null {
  const raw = item.valueLabel?.trim() || null;
  if (raw === "達成") return null;
  if (raw) return raw;
  if (item.value != null && Number.isFinite(item.value)) {
    return `${item.value}${item.unit ?? ""}`;
  }
  return null;
}

function AchievementCard({ item }: { item: SeasonAchievement }) {
  const isNpb = item.category === "npb_record" || item.isNpbRecord;
  const badge = npbBadgeLabel(item);
  const totalSop = (item.sopPoints ?? 0) + (item.npbBonusPoints ?? 0);
  const valueText = valueDisplay(item);

  return (
    <article
      className={cn(
        "rounded-xl border bg-black/50 p-4 backdrop-blur-sm sm:p-5",
        isNpb
          ? "border-[color:var(--museum-accent,#d4af37)]/55 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
          : "border-white/12",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[12px] leading-snug tracking-[0.12em] sm:text-[13px]",
              isNpb
                ? "text-[color:var(--museum-accent,#d4af37)]"
                : "text-museum-ivory-soft",
            )}
          >
            {isNpb && item.category !== "npb_record"
              ? `${ACHIEVEMENT_CATEGORY_LABELS[item.category]} · NPB`
              : ACHIEVEMENT_CATEGORY_LABELS[item.category]}
            {item.source === "demo" &&
            process.env.NODE_ENV === "development"
              ? " · DEMO"
              : null}
          </p>
          <h3
            className={cn(
              "mt-1 font-display text-[18px] leading-snug tracking-[0.03em] sm:text-[20px]",
              isNpb
                ? "text-[color:var(--museum-accent,#d4af37)]"
                : "text-museum-ivory",
            )}
          >
            {item.recordName}
          </h3>
        </div>
        {totalSop > 0 ? (
          <div
            className="shrink-0 rounded-md border border-sky-400/50 bg-black/70 px-2 py-1 sm:px-2.5"
            title={`SOP +${totalSop}`}
          >
            <p className="whitespace-nowrap text-[12px] tabular-nums leading-none tracking-[0.04em] text-sky-100/90 sm:text-[13px]">
              SOP +{totalSop}
            </p>
          </div>
        ) : null}
      </div>

      {valueText ? (
        <p
          className={cn(
            "mt-3 font-display text-[24px] font-semibold leading-tight tracking-[0.01em] tabular-nums sm:text-[26px] md:text-[28px]",
            isNpb
              ? "text-[color:var(--museum-accent,#d4af37)]"
              : "text-museum-ivory",
          )}
        >
          {valueText}
        </p>
      ) : null}

      <div className={cn(valueText ? "mt-3" : "mt-3")}>
        {item.playerId.startsWith("demo-") ? (
          <p className="text-[17px] font-semibold leading-snug text-museum-ivory sm:text-[18px] md:text-[19px]">
            {item.playerName}
          </p>
        ) : (
          <Link
            href={`/players/${item.playerId}/yearly`}
            className="text-[17px] font-semibold leading-snug text-museum-ivory underline-offset-2 hover:text-[color:var(--museum-accent,#d4af37)] hover:underline sm:text-[18px] md:text-[19px]"
          >
            {item.playerName}
          </Link>
        )}
        <p className="mt-0.5 text-[13px] text-museum-ivory-soft sm:text-[14px]">
          {item.teamShort}
          <span className="mx-1.5 opacity-40">·</span>
          {item.role === "batter" ? "野手" : "投手"}
        </p>
      </div>

      {badge ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] sm:text-[12px]",
              item.isNpbUpdate
                ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 text-[color:var(--museum-accent,#d4af37)]"
                : "border-sky-300/45 bg-sky-400/15 text-sky-100",
            )}
          >
            {badge}
          </span>
          {item.npbCaption ? (
            <span className="text-[12px] text-museum-ivory-soft sm:text-[13px]">
              {item.npbCaption}
            </span>
          ) : null}
        </div>
      ) : null}

      {item.repeatLabel ? (
        <p className="mt-2.5 text-[13px] font-medium tracking-[0.04em] text-museum-ivory sm:text-[14px]">
          {item.repeatLabel}
        </p>
      ) : null}
    </article>
  );
}
