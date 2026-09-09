"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import { cn } from "@/lib/cn";
import type { CategoryThemeId } from "@/config/categoryThemes";
import {
  getSeasonSummary,
  type SeasonSummaryData,
  type SummaryAward,
  type SummaryChampion,
} from "@/data/seasonSummary";
import { FinalStandingsBoard } from "@/components/seasons/FinalStandingsBoard";
import { hydrateInterleagueFromCloud } from "@/data/interleague";
import { hydratePlayerMasterFromCloud } from "@/data/playerMaster";
import { hydratePostseasonFromCloud } from "@/data/postseason";
import { hydrateSeasonHighlightsFromCloud } from "@/data/seasonHighlights";
import { hydrateSopAwardsFromCloud } from "@/data/sop";
import { hydrateTeamStandingsFromCloud } from "@/data/teamStandings";
import { parseSeasonKey } from "@/data/seasons";

type SeasonSummaryPageProps = {
  year: string;
  /** ルート識別子（BLUE_2026 等）。未指定時は year を使用 */
  seasonKey?: string;
  theme?: CategoryThemeId;
  backLabel?: string;
};

/** シーズン年鑑の表紙・展示入口としてのサマリー（既存データの読み取り専用） */
export function SeasonSummaryPage({
  year,
  seasonKey = year,
  theme = "seasonHub",
  backLabel,
}: SeasonSummaryPageProps) {
  const [data, setData] = useState<SeasonSummaryData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.allSettled([
        hydrateTeamStandingsFromCloud(),
        hydrateSopAwardsFromCloud(),
        hydratePostseasonFromCloud(),
        hydrateInterleagueFromCloud(),
        hydratePlayerMasterFromCloud(),
        hydrateSeasonHighlightsFromCloud(),
      ]);
      if (cancelled) return;
      const identity = parseSeasonKey(seasonKey);
      setData(getSeasonSummary(year, identity ?? seasonKey));
    })();
    return () => {
      cancelled = true;
    };
  }, [year, seasonKey]);

  return (
    <CategoryShell
      theme={theme}
      back={{
        href: `/seasons/${seasonKey}`,
        label: backLabel ?? `${year} SEASON`,
      }}
    >
      <PageHeading
        title="サマリー"
        subtitle={`${backLabel ?? `${year}シーズン`}`}
        icon="book"
      />
      <p className="mb-6 -mt-2 text-[13px] tracking-[0.04em] text-museum-ivory-soft md:text-sm">
        {data
          ? `「${data.tagline}」`
          : "登録済みのシーズンデータを読み込み中…"}
      </p>

      <div className="space-y-8 md:space-y-10">
        <SummarySection
          eyebrow="01"
          title={`${year} SEASON CHAMPIONS`}
          description="シーズンを代表する4つの優勝"
        >
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {(data?.champions ?? emptyChampions()).map((item) => (
              <ChampionCard key={item.id} item={item} />
            ))}
          </div>
        </SummarySection>

        <SummarySection
          eyebrow="02"
          title="SEASON AWARDS"
          description="その年を代表する個人表彰"
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data?.awards ?? emptyAwards()).map((item) => (
              <AwardCard key={item.id} item={item} />
            ))}
          </div>
        </SummarySection>

        <SummarySection
          eyebrow="03"
          title="SEASON HIGHLIGHTS"
          description="その年を象徴する記録・出来事"
        >
          <DataPanel>
            {data?.seasonHighlightText ? (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-museum-ivory md:text-[14px]">
                {data.seasonHighlightText}
              </p>
            ) : (
              <p className="text-[13px] text-museum-ivory-soft">登録待ち</p>
            )}
          </DataPanel>
        </SummarySection>

        <SummarySection
          eyebrow="04"
          title="FINAL STANDINGS"
          description="最終順位（詳細はペナントレースへ）"
        >
          <FinalStandingsBoard year={year} seasonKey={seasonKey} compact />
          <p className="mt-2 text-right text-[11px]">
            <Link
              href={`/seasons/${seasonKey}/pennant/standings`}
              className="text-museum-gold hover:text-museum-gold-soft"
            >
              詳細な順位表を見る →
            </Link>
          </p>
        </SummarySection>
      </div>
    </CategoryShell>
  );
}

function emptyChampions(): SummaryChampion[] {
  return [
    { id: "central", title: "セ・リーグ優勝", teamName: "…" },
    { id: "pacific", title: "パ・リーグ優勝", teamName: "…" },
    { id: "japan", title: "日本一", teamName: "…", featured: true },
    { id: "interleague", title: "交流戦優勝", teamName: "…" },
  ];
}

function emptyAwards(): SummaryAward[] {
  return [
    {
      id: "mvp-c",
      title: "セ・リーグ MVP",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
    {
      id: "mvp-p",
      title: "パ・リーグ MVP",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
    {
      id: "rookie-c",
      title: "セ・リーグ 新人王",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
    {
      id: "rookie-p",
      title: "パ・リーグ 新人王",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
    {
      id: "sawamura",
      title: "沢村賞",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
    {
      id: "js-mvp",
      title: "日本シリーズMVP",
      playerName: "…",
      teamName: "…",
      playerId: null,
    },
  ];
}

function SummarySection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex items-end justify-between gap-3 border-b border-museum-gold/25 pb-2">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-museum-gold/80">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 font-display text-[clamp(1.15rem,2.4vw,1.45rem)] tracking-[0.06em] text-museum-ivory">
            {title}
          </h2>
        </div>
        <p className="hidden text-[11px] text-museum-ivory-soft sm:block">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

/** カード幅を超える長い球団名を1行に収める（フォント自動縮小） */
function AutoFitOneLineText({
  text,
  className,
  maxPx = 17,
  minPx = 9,
}: {
  text: string;
  className?: string;
  maxPx?: number;
  minPx?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = maxPx;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = `${size}px`;
      while (size > minPx && el.scrollWidth > el.clientWidth + 0.5) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [text, maxPx, minPx]);

  return (
    <p
      ref={ref}
      className={cn("overflow-hidden whitespace-nowrap", className)}
      title={text}
    >
      {text}
    </p>
  );
}

function ChampionCard({ item }: { item: SummaryChampion }) {
  return (
    <article
      className={cn(
        "flex min-h-[118px] flex-col justify-between rounded-xl border px-3 py-3.5 backdrop-blur-md",
        item.featured
          ? "border-museum-gold/65 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.22),rgba(0,0,0,0.88)_72%)]"
          : "border-white/15 bg-black/85",
      )}
    >
      <p
        className={cn(
          "text-[10px] tracking-[0.12em]",
          item.featured ? "text-museum-gold" : "text-museum-ivory-soft",
        )}
      >
        {item.title}
      </p>
      <div className="min-w-0">
        <AutoFitOneLineText
          text={item.teamName}
          maxPx={item.featured ? 18 : 16}
          minPx={9}
          className={cn(
            "font-display leading-none",
            item.featured ? "text-museum-gold-soft" : "text-museum-ivory",
          )}
        />
        {item.note ? (
          <p className="mt-1 text-[10px] text-museum-ivory-soft">{item.note}</p>
        ) : null}
      </div>
    </article>
  );
}

function AwardCard({ item }: { item: SummaryAward }) {
  const content = (
    <>
      <p className="text-[10px] tracking-[0.1em] text-museum-gold">{item.title}</p>
      <p className="mt-2 text-[15px] font-medium text-museum-ivory">
        {item.playerName}
      </p>
      <p className="mt-1 text-[11px] text-museum-ivory-soft">{item.teamName}</p>
    </>
  );

  const className =
    "block rounded-xl border border-white/15 bg-black/85 px-3.5 py-3.5 backdrop-blur-md transition-colors hover:border-museum-gold/40";

  if (item.playerId) {
    return (
      <Link href={`/players/${item.playerId}`} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}
