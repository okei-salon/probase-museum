"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aggregateSopBreakdown,
  buildSopFourKings,
  type SopBreakdownRow,
  type SopCareerRankRow,
} from "@/data/sop";
import type { SopRole } from "@/lib/sop";
import { cn } from "@/lib/cn";

export function SopFourKingsBoard() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<SopRole>("batter");

  useEffect(() => {
    setReady(true);
  }, []);

  const kings = useMemo(
    () => (ready ? buildSopFourKings(role) : []),
    [ready, role],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  const first = kings[0] ?? null;
  const rest = kings.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "batter" as const, label: "野手" },
            { id: "pitcher" as const, label: "投手" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
              role === r.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <header className="space-y-1 border-b border-[color:var(--museum-accent,#d4af37)]/25 pb-3">
        <p className="text-[10px] tracking-[0.22em] text-[color:var(--museum-accent,#d4af37)]">
          HALL OF SOP · FOUR KINGS
        </p>
        <p className="text-[12px] text-museum-ivory-soft">
          {role === "batter" ? "野手" : "投手"}
          通算SOP上位4名の特別展示。順位変動に応じて自動で入れ替わります。
        </p>
      </header>

      {kings.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          四天王を選出できる通算SOPデータがまだありません。
        </p>
      ) : (
        <div className="space-y-5">
          {first ? <KingCard king={first} featured /> : null}
          {rest.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((king) => (
                <KingCard key={king.playerId} king={king} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function KingCard({
  king,
  featured = false,
}: {
  king: SopCareerRankRow;
  featured?: boolean;
}) {
  const breakdown = aggregateSopBreakdown(king.seasons);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-sm",
        featured
          ? "border-[color:var(--museum-accent,#d4af37)]/70 bg-gradient-to-br from-black/80 via-black/70 to-[rgba(212,175,55,0.12)] p-5 shadow-[0_0_40px_rgba(212,175,55,0.18)] md:p-7"
          : "border-white/14 bg-black/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      )}
    >
      {/* 展示フレーム装飾 */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-3 top-3 h-px bg-gradient-to-r from-transparent via-[color:var(--museum-accent,#d4af37)]/50 to-transparent",
          featured ? "opacity-100" : "opacity-40",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-3 bottom-3 h-px bg-gradient-to-r from-transparent via-[color:var(--museum-accent,#d4af37)]/35 to-transparent",
          featured ? "opacity-80" : "opacity-30",
        )}
      />

      <div className={cn(featured ? "md:flex md:items-start md:gap-8" : "")}>
        <div className={cn(featured ? "md:min-w-[220px] md:shrink-0" : "")}>
          <p
            className={cn(
              "tracking-[0.2em] text-[color:var(--museum-accent,#d4af37)]",
              featured ? "text-[11px]" : "text-[10px]",
            )}
          >
            {featured ? "FIRST KING" : "KING"} · {king.rank}位
          </p>
          <h3
            className={cn(
              "mt-2 font-display tracking-[0.04em] text-museum-ivory",
              featured
                ? "text-[28px] md:text-[34px]"
                : "text-[18px] md:text-[20px]",
            )}
          >
            {king.playerName}
          </h3>
          <p
            className={cn(
              "mt-1 text-museum-ivory-soft",
              featured ? "text-[13px]" : "text-[12px]",
            )}
          >
            {king.teamShort}
          </p>
          <p
            className={cn(
              "mt-4 font-display tabular-nums text-[color:var(--museum-accent,#d4af37)]",
              featured ? "text-[40px] leading-none md:text-[48px]" : "text-[26px] leading-none",
            )}
          >
            {king.total}
            <span
              className={cn(
                "ml-1.5 tracking-normal text-museum-ivory-soft",
                featured ? "text-[16px]" : "text-[12px]",
              )}
            >
              pt
            </span>
          </p>
          <p className="mt-1 text-[10px] tracking-[0.12em] text-museum-ivory-soft">
            通算SOP
          </p>
        </div>

        <div
          className={cn(
            "border-[color:var(--museum-accent,#d4af37)]/20",
            featured
              ? "mt-5 flex-1 border-t pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0"
              : "mt-4 border-t pt-3",
          )}
        >
          <p
            className={cn(
              "mb-2 tracking-[0.14em] text-museum-ivory-soft",
              featured ? "text-[11px]" : "text-[10px]",
            )}
          >
            SOP獲得内訳
          </p>
          <BreakdownList rows={breakdown} featured={featured} />
        </div>
      </div>
    </article>
  );
}

function BreakdownList({
  rows,
  featured,
}: {
  rows: SopBreakdownRow[];
  featured: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-museum-ivory-soft">
        内訳データがありません。
      </p>
    );
  }

  const visible = featured ? rows : rows.slice(0, 8);
  const more = !featured && rows.length > 8 ? rows.length - 8 : 0;

  return (
    <ul className={cn("space-y-1.5", featured ? "md:columns-2 md:gap-x-6" : "")}>
      {visible.map((row) => (
        <li
          key={`${row.label}-${row.count}-${row.points}`}
          className={cn(
            "break-inside-avoid text-museum-ivory-muted",
            featured ? "text-[13px]" : "text-[11px]",
          )}
        >
          <span className="text-museum-ivory">{row.label}</span>
          <span className="mx-1 text-museum-ivory-soft">×{row.count}</span>
          <span className="text-museum-ivory-soft">→</span>
          <span className="ml-1 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
            {row.points}pt
          </span>
        </li>
      ))}
      {more > 0 ? (
        <li className="text-[10px] text-museum-ivory-soft">
          ほか {more} 件
        </li>
      ) : null}
    </ul>
  );
}
