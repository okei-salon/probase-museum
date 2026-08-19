"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CategoryShell,
  DataPanel,
  PageHeading,
} from "@/components/category";
import { cn } from "@/lib/cn";
import type { CategoryThemeId } from "@/config/categoryThemes";
import {
  getPostseasonView,
  placeholderSeason,
  type JapanSeriesGameMark,
  type LeagueCsRecord,
  type PostseasonSeason,
  type SeriesResult,
} from "@/data/postseason";
import { parseSeasonKey } from "@/data/seasons";

type PostseasonPageProps = {
  year: string;
  seasonKey?: string;
  theme?: CategoryThemeId;
  backLabel?: string;
};

/** ポストシーズン：CS記録 + 日本シリーズ記録（SeasonIdentity 単位） */
export function PostseasonPage({
  year,
  seasonKey = year,
  theme = "postseason",
  backLabel,
}: PostseasonPageProps) {
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? parseSeasonKey(year),
    [seasonKey, year],
  );

  const [data, setData] = useState<PostseasonSeason>(() =>
    placeholderSeason(year, identity?.world ?? null),
  );

  useEffect(() => {
    if (!identity) return;
    setData(getPostseasonView(identity));
  }, [identity]);

  const js = data.japanSeries;
  const titleYear = backLabel ?? year;

  return (
    <CategoryShell
      theme={
        theme === "seasonHubBlue" || theme === "seasonHubRed"
          ? theme
          : "postseason"
      }
      back={{
        href: `/seasons/${seasonKey}`,
        label: backLabel ?? `${year} SEASON`,
      }}
    >
      <PageHeading
        title={`${titleYear} ポストシーズン`}
        subtitle="クライマックスシリーズ / 日本シリーズ"
        icon="trophy"
      />

      <div className="space-y-10 md:space-y-12">
        {/* ① CS */}
        <section>
          <SectionLabel index="01" title="クライマックスシリーズ" />
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <LeagueCsPanel path={data.central} />
            <LeagueCsPanel path={data.pacific} />
          </div>
        </section>

        {/* ② 日本シリーズ */}
        <section>
          <SectionLabel index="02" title={`${titleYear} 日本シリーズ`} />
          <DataPanel className="border-[color:var(--museum-accent,#d4af37)]/55 bg-black/90">
            <div className="mx-auto max-w-xl text-center">
              <p className="font-display text-2xl text-white md:text-3xl">
                <span
                  className={
                    js.champion === js.teamLeft
                      ? "font-semibold text-[color:var(--museum-accent,#d4af37)]"
                      : undefined
                  }
                >
                  {js.teamLeft}
                </span>
                <span className="mx-3 font-sans text-base tracking-normal text-white/70 md:mx-4 md:text-lg">
                  {js.winsLeft}勝{js.winsRight}敗
                </span>
                <span
                  className={
                    js.champion === js.teamRight
                      ? "font-semibold text-[color:var(--museum-accent,#d4af37)]"
                      : undefined
                  }
                >
                  {js.teamRight}
                </span>
              </p>

              {js.gameMarks.length > 0 ? (
                <div
                  className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
                  aria-label="シリーズ勝敗推移"
                >
                  {js.gameMarks.map((mark, i) => (
                    <GameMark key={`${mark}-${i}`} mark={mark} index={i + 1} />
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-[13px] text-white/60">
                  試合結果は登録待ちです
                </p>
              )}

              <div className="mx-auto mt-8 max-w-sm border-t border-[color:var(--museum-accent,#d4af37)]/35 pt-5">
                <p className="text-[11px] tracking-[0.18em] text-white/70">
                  日本一
                </p>
                <p className="mt-1.5 font-display text-3xl text-[color:var(--museum-accent,#d4af37)] md:text-4xl">
                  {js.champion}
                </p>
              </div>

              <div className="mx-auto mt-7 max-w-sm border-t border-white/10 pt-5">
                <p className="text-[11px] tracking-[0.16em] text-white/70">
                  日本シリーズMVP
                </p>
                <p className="mt-2 font-display text-xl text-[color:var(--museum-accent,#d4af37)] md:text-2xl">
                  {js.mvp.playerName}
                </p>
                <p className="mt-1 text-[13px] text-white/80">
                  {js.mvp.teamName}
                </p>
              </div>
            </div>
          </DataPanel>
        </section>
      </div>
    </CategoryShell>
  );
}

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <header className="mb-3 flex items-baseline gap-3">
      <span className="text-[11px] tracking-[0.18em] text-[color:var(--museum-accent,#d4af37)]">
        {index}
      </span>
      <h2 className="font-display text-lg tracking-[0.06em] text-white md:text-xl">
        {title}
      </h2>
    </header>
  );
}

function LeagueCsPanel({ path }: { path: LeagueCsRecord }) {
  return (
    <DataPanel>
      <p className="mb-4 text-[12px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
        {path.leagueLabel}
      </p>
      <div className="space-y-4">
        <SeriesCard stage="CS 1st" series={path.first} />
        <SeriesCard stage="CS Final" series={path.final} />
      </div>
      <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-white/70">
        日本シリーズ進出{" "}
        <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
          {path.representative}
        </span>
      </p>
    </DataPanel>
  );
}

function SeriesCard({
  stage,
  series,
}: {
  stage: string;
  series: SeriesResult;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <p className="text-[11px] tracking-[0.14em] text-white/75">{stage}</p>
      <p className="mt-2 text-[15px] text-white md:text-[16px]">
        <span
          className={
            series.winner === series.teamA
              ? "font-semibold text-[color:var(--museum-accent,#d4af37)]"
              : undefined
          }
        >
          {series.teamA}
        </span>
        <span className="mx-2 text-[13px] text-white/65">
          {series.winsA}勝{series.winsB}敗
        </span>
        <span
          className={
            series.winner === series.teamB
              ? "font-semibold text-[color:var(--museum-accent,#d4af37)]"
              : undefined
          }
        >
          {series.teamB}
        </span>
      </p>
      <p className="mt-1.5 text-[12px] text-white/70">
        勝者{" "}
        <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
          {series.winner}
        </span>
      </p>
    </article>
  );
}

function GameMark({
  mark,
  index,
}: {
  mark: JapanSeriesGameMark;
  index: number;
}) {
  const win = mark === "W";
  return (
    <span
      title={`第${index}戦 ${win ? "勝利" : "敗戦"}`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border text-[15px] font-medium",
        win
          ? "border-[color:var(--museum-accent,#d4af37)]/65 text-[color:var(--museum-accent,#d4af37)]"
          : "border-white/25 text-white/65",
      )}
    >
      {win ? "○" : "●"}
    </span>
  );
}
