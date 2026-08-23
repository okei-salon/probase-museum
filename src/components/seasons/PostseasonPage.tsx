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
  hydratePostseasonFromCloud,
  placeholderSeason,
  type JapanSeriesGameMark,
  type LeagueCsRecord,
  type PostseasonSeason,
  type SeriesGameScore,
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
    let cancelled = false;
    void (async () => {
      await hydratePostseasonFromCloud();
      if (cancelled) return;
      setData(getPostseasonView(identity));
    })();
    return () => {
      cancelled = true;
    };
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
        <section>
          <SectionLabel index="01" title="クライマックスシリーズ（セ・リーグ）" />
          <LeagueCsFlow path={data.central} />
        </section>

        <section>
          <SectionLabel index="02" title="クライマックスシリーズ（パ・リーグ）" />
          <LeagueCsFlow path={data.pacific} />
        </section>

        <section>
          <SectionLabel index="03" title={`${titleYear} 日本シリーズ`} />
          <DataPanel className="border-[color:var(--museum-accent,#d4af37)]/55 bg-black/90">
            <div className="mx-auto max-w-2xl">
              <p className="text-center font-display text-2xl text-white md:text-3xl">
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
              <p className="mt-2 text-center text-[12px] text-white/55">
                セ代表 {js.teamLeft} ／ パ代表 {js.teamRight}
              </p>

              <GameScoreList
                games={js.games}
                teamA={js.teamLeft}
                teamB={js.teamRight}
                fallbackMarks={js.gameMarks}
              />

              <div className="mx-auto mt-8 max-w-sm border-t border-[color:var(--museum-accent,#d4af37)]/35 pt-5 text-center">
                <p className="text-[11px] tracking-[0.18em] text-white/70">
                  日本一
                </p>
                <p className="mt-1.5 font-display text-3xl text-[color:var(--museum-accent,#d4af37)] md:text-4xl">
                  {js.champion}
                </p>
              </div>

              <div className="mx-auto mt-7 max-w-md border-t border-white/10 pt-5 text-center">
                <p className="text-[11px] tracking-[0.16em] text-white/70">
                  日本シリーズMVP
                </p>
                <p className="mt-2 font-display text-xl text-[color:var(--museum-accent,#d4af37)] md:text-2xl">
                  {js.mvp.playerName}
                </p>
                <p className="mt-1 text-[13px] text-white/80">{js.mvp.teamName}</p>
                <MvpStats mvp={js.mvp} />
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

function LeagueCsFlow({ path }: { path: LeagueCsRecord }) {
  return (
    <div className="space-y-4">
      <SeriesCard stage="ファーストステージ" series={path.first} />
      <div className="flex justify-center text-[11px] tracking-[0.16em] text-white/45">
        ↓
      </div>
      <SeriesCard stage="ファイナルステージ" series={path.final} showAdvantage />
      <p className="border-t border-white/10 pt-3 text-[12px] text-white/70">
        日本シリーズ進出{" "}
        <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
          {path.representative}
        </span>
      </p>
    </div>
  );
}

function SeriesCard({
  stage,
  series,
  showAdvantage = false,
}: {
  stage: string;
  series: SeriesResult;
  showAdvantage?: boolean;
}) {
  return (
    <DataPanel>
      <article>
        <p className="text-[11px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
          {stage}
        </p>
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
        {showAdvantage &&
        series.advantageTeam &&
        (series.advantageWins ?? 0) > 0 ? (
          <p className="mt-2 text-[12px] text-white/70">
            アドバンテージ{" "}
            <span className="text-[color:var(--museum-accent,#d4af37)]">
              {series.advantageTeam}
            </span>{" "}
            +{series.advantageWins}勝
          </p>
        ) : null}
        <GameScoreList
          games={series.games}
          teamA={series.teamA}
          teamB={series.teamB}
        />
        <p className="mt-3 text-[12px] text-white/70">
          勝ち抜け{" "}
          <span className="font-medium text-[color:var(--museum-accent,#d4af37)]">
            {series.winner}
          </span>
        </p>
      </article>
    </DataPanel>
  );
}

function GameScoreList({
  games,
  teamA,
  teamB,
  fallbackMarks,
}: {
  games?: SeriesGameScore[];
  teamA: string;
  teamB: string;
  fallbackMarks?: JapanSeriesGameMark[];
}) {
  if (games && games.length > 0) {
    return (
      <ul className="mt-4 space-y-1.5 text-[13px] text-white/85">
        {games.map((g) => (
          <li key={g.game} className="flex flex-wrap items-center gap-x-2">
            <span className="w-14 text-white/55">第{g.game}戦</span>
            <span>
              {teamA} {g.scoreA} - {g.scoreB} {teamB}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (fallbackMarks && fallbackMarks.length > 0) {
    return (
      <div
        className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
        aria-label="シリーズ勝敗推移"
      >
        {fallbackMarks.map((mark, i) => (
          <GameMark key={`${mark}-${i}`} mark={mark} index={i + 1} />
        ))}
      </div>
    );
  }
  return (
    <p className="mt-4 text-[13px] text-white/55">試合スコアは登録待ちです</p>
  );
}

function MvpStats({
  mvp,
}: {
  mvp: PostseasonSeason["japanSeries"]["mvp"];
}) {
  const parts: string[] = [];
  if (mvp.avg) parts.push(`打率 ${mvp.avg}`);
  if (mvp.hr != null && Number.isFinite(mvp.hr)) parts.push(`本塁打 ${mvp.hr}`);
  if (mvp.rbi != null && Number.isFinite(mvp.rbi)) parts.push(`打点 ${mvp.rbi}`);
  return (
    <div className="mt-2 space-y-1 text-[12px] text-white/70">
      {parts.length > 0 ? <p>{parts.join(" ／ ")}</p> : null}
      {mvp.note ? <p className="whitespace-pre-wrap">{mvp.note}</p> : null}
    </div>
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
