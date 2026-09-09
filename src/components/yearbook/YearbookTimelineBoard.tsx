"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildYearbookSeasonContext,
  getSeasonReviewBody,
  hydrateSeasonReviewSources,
} from "@/data/yearbook";
import {
  formatSeasonLineLabel,
  parseSeasonKey,
  seasonDisplayTitle,
  type SeasonIdentity,
} from "@/data/seasons";
import { useMuseumBack } from "@/hooks/useMuseumBack";

type Props = {
  seasonKey: string;
  year?: number;
};

type TimelineEntry = {
  id: string;
  label: string;
  detail: string;
};

/**
 * 年表: 登録済み事実を時系列っぽい一覧で見せる入口。
 * 総評本文とは別。同じ YEAR×WORLD に紐付く。
 */
export function YearbookTimelineBoard({ seasonKey, year }: Props) {
  const { onBackClick } = useMuseumBack();
  const identity: SeasonIdentity | null = useMemo(() => {
    const parsed = parseSeasonKey(seasonKey);
    if (parsed) return parsed;
    if (year != null) {
      return {
        seasonKey: String(year),
        year,
        world: null,
        kind: "legacy",
      };
    }
    return null;
  }, [seasonKey, year]);

  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateSeasonReviewSources();
      if (cancelled || !identity) return;
      const ctx = buildYearbookSeasonContext(identity);
      const next: TimelineEntry[] = ctx.factLines
        .filter((line) => !line.startsWith("シーズン総評:"))
        .map((line, i) => {
          const split = line.indexOf(":");
          if (split > 0) {
            return {
              id: `e-${i}`,
              label: line.slice(0, split).trim(),
              detail: line.slice(split + 1).trim(),
            };
          }
          return { id: `e-${i}`, label: "記録", detail: line };
        });
      setEntries(next);
      setHasReview(getSeasonReviewBody(identity) != null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  if (!identity) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        シーズンを特定できません。
      </p>
    );
  }

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  const label = formatSeasonLineLabel(identity);
  const title = seasonDisplayTitle(identity);

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-[color:var(--museum-accent,#d4af37)]/25 pb-4">
        <p className="text-[10px] tracking-[0.22em] text-[color:var(--museum-accent,#d4af37)]">
          CHRONICLE · {label}
        </p>
        <h3 className="font-display text-[24px] tracking-[0.04em] text-museum-ivory md:text-[28px]">
          {title} 年表
        </h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-museum-ivory-soft">
          登録済みデータから拾った主要出来事の入口です。文章での振り返りはシーズン総評へ。
          {identity.world
            ? `（${identity.world} のみ。他WORLDは含めません）`
            : null}
        </p>
      </header>

      <p>
        <Link
          href={`/yearbook/${identity.seasonKey}/overview`}
          className="inline-flex rounded-md border border-[color:var(--museum-accent,#d4af37)]/50 bg-[color:var(--museum-accent,#d4af37)]/10 px-3.5 py-2 text-[12px] tracking-[0.06em] text-[color:var(--museum-accent,#d4af37)] hover:bg-[color:var(--museum-accent,#d4af37)]/20"
        >
          {hasReview ? "シーズン総評を読む →" : "シーズン総評（登録待ち） →"}
        </Link>
      </p>

      {entries.length > 0 ? (
        <ol className="space-y-0 border-l border-museum-gold/30 pl-4 md:pl-5">
          {entries.map((entry, index) => (
            <li key={entry.id} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-museum-gold md:-left-[1.6rem]" />
              <p className="text-[10px] tracking-[0.14em] text-museum-gold/80">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-0.5 text-[14px] font-medium text-museum-ivory">
                {entry.label}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-museum-ivory-soft">
                {entry.detail}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-8 text-center text-[13px] text-museum-ivory-soft">
          このシーズンの年表に載せる出来事はまだ登録されていません。
        </p>
      )}

      <p className="text-[12px]">
        <Link
          href={`/seasons/${identity.seasonKey}/summary`}
          onClick={(e) =>
            onBackClick(`/seasons/${identity.seasonKey}/summary`, e)
          }
          className="text-museum-gold hover:text-museum-gold-soft"
        >
          ← サマリーへ戻る
        </Link>
      </p>
    </div>
  );
}
