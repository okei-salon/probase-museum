"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  buildYearFeats,
  SHOW_SEASON_FEATS_DEMO,
  type AchievementCategory,
  type SeasonAchievement,
} from "@/data/seasonAchievements";
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
  const built = useMemo(() => {
    if (seasonKey) {
      const identity = parseSeasonKey(seasonKey);
      if (identity) return buildYearFeats(identity);
    }
    return buildYearFeats(year);
  }, [year, seasonKey]);
  const [filter, setFilter] = useState<FilterId>("all");

  const items = useMemo(() => {
    if (filter === "all") return built.items;
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

      {SHOW_SEASON_FEATS_DEMO &&
      process.env.NODE_ENV === "development" &&
      built.demoCount > 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          デモデータを {built.demoCount}{" "}
          件表示中です（開発中のUI確認用）。正式登録データとは混在しません。
        </p>
      ) : null}

      {items.length === 0 ? (
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

function AchievementCard({ item }: { item: SeasonAchievement }) {
  const isNpb = item.category === "npb_record" || item.isNpbRecord;
  const totalSop =
    (item.sopPoints ?? 0) + (item.npbBonusPoints ?? 0);

  return (
    <article
      className={cn(
        "rounded-xl border bg-black/50 p-4 backdrop-blur-sm",
        isNpb
          ? "border-[color:var(--museum-accent,#d4af37)]/55 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
          : "border-white/12",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
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
              : ACHIEVEMENT_CATEGORY_LABELS[item.category]}
            {item.source === "demo" &&
            process.env.NODE_ENV === "development"
              ? " · DEMO"
              : null}
          </p>
          <h3
            className={cn(
              "mt-1 font-display text-[17px] tracking-[0.04em]",
              isNpb
                ? "text-[color:var(--museum-accent,#d4af37)]"
                : "text-museum-ivory",
            )}
          >
            {item.category === "npb_record"
              ? "NPB RECORD"
              : item.recordName}
          </h3>
        </div>
        {totalSop > 0 ? (
          <div className="shrink-0 rounded-md border border-[color:var(--museum-accent-border,#d4af3773)] px-2 py-1 text-right">
            <p className="text-[9px] tracking-[0.1em] text-museum-ivory-soft">
              SOP
            </p>
            <p className="text-[14px] tabular-nums text-[color:var(--museum-accent,#d4af37)]">
              +{totalSop}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {item.playerId.startsWith("demo-") ? (
          <p className="text-[15px] font-medium text-museum-ivory">
            {item.playerName}
          </p>
        ) : (
          <Link
            href={`/players/${item.playerId}/yearly`}
            className="text-[15px] font-medium text-museum-ivory underline-offset-2 hover:text-[color:var(--museum-accent,#d4af37)] hover:underline"
          >
            {item.playerName}
          </Link>
        )}
        <p className="mt-0.5 text-[12px] text-museum-ivory-soft">
          {item.teamShort}
          <span className="mx-1.5 opacity-40">·</span>
          {item.role === "batter" ? "野手" : "投手"}
        </p>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-museum-ivory-muted">
        {item.category === "npb_record" ? (
          <>
            {item.valueLabel ?? item.recordName}
            {item.isNpbUpdate ? (
              <>
                <br />
                <span className="text-[color:var(--museum-accent,#d4af37)]">
                  NPB歴代シーズン記録更新
                </span>
                {item.npbPreviousValue != null ? (
                  <span className="text-museum-ivory-soft">
                    {" "}
                    旧記録：{item.npbPreviousValue}
                    {item.unit ?? ""}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <br />
                <span className="text-[color:var(--museum-accent,#d4af37)]">
                  NPB歴代シーズン記録到達
                </span>
              </>
            )}
          </>
        ) : (
          item.valueLabel ??
          (item.value != null
            ? `${item.value}${item.unit ?? ""}`
            : "達成")
        )}
      </p>

      {(item.sopPoints > 0 || (item.npbBonusPoints ?? 0) > 0) &&
      item.category === "npb_record" ? (
        <p className="mt-2 text-[11px] text-museum-ivory-soft">
          SOP史実ボーナス +{item.npbBonusPoints ?? 0}
        </p>
      ) : item.sopPoints > 0 && item.npbBonusPoints ? (
        <p className="mt-2 text-[11px] text-museum-ivory-soft">
          SOP +{item.sopPoints}
          {item.npbBonusPoints
            ? ` ／ 史実ボーナス +${item.npbBonusPoints}`
            : ""}
        </p>
      ) : item.sopPoints > 0 ? (
        <p className="mt-2 text-[11px] text-museum-ivory-soft">
          SOP +{item.sopPoints}
        </p>
      ) : null}
    </article>
  );
}
