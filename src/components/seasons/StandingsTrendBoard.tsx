"use client";

import { useEffect, useMemo, useState } from "react";
import { DataPanel } from "@/components/category";
import { TrendChart } from "@/components/views";
import {
  buildStandingsTrendBoard,
  type StandingsTrendBoardData,
} from "@/data/standingsHistory";
import {
  allowsLayoutSampleFallback,
  parseSeasonKey,
} from "@/data/seasons";
import {
  pacificStandingsTrend,
  standingsTrend,
} from "@/data/seasonViews";

type StandingsTrendBoardProps = {
  year: string;
  seasonKey: string;
};

/**
 * ペナント「順位推移」。
 * 正式履歴があれば表示。正式 WORLD で未登録のときは空（サンプル推移へフォールバックしない）。
 * DEMO／レガシーのみ静的ダミーを許可。
 */
export function StandingsTrendBoard({
  year,
  seasonKey,
}: StandingsTrendBoardProps) {
  const identity = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );
  const allowSample = allowsLayoutSampleFallback(identity);
  const [central, setCentral] = useState<StandingsTrendBoardData | null>(null);
  const [pacific, setPacific] = useState<StandingsTrendBoardData | null>(null);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    void (async () => {
      const { hydrateTeamStandingsFromCloud } = await import(
        "@/data/teamStandings"
      );
      await hydrateTeamStandingsFromCloud();
      if (cancelled) return;
      setCentral(buildStandingsTrendBoard(identity, "central"));
      setPacific(buildStandingsTrendBoard(identity, "pacific"));
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, year]);

  const centralView: StandingsTrendBoardData | null = !identity
    ? null
    : central?.official && central.series.length > 0
      ? central
      : allowSample
        ? {
            months: standingsTrend.months,
            series: standingsTrend.series,
            official: false,
          }
        : null;
  const pacificView: StandingsTrendBoardData | null = !identity
    ? null
    : pacific?.official && pacific.series.length > 0
      ? pacific
      : allowSample
        ? {
            months: pacificStandingsTrend.months,
            series: pacificStandingsTrend.series,
            official: false,
          }
        : null;

  const anyOfficial =
    Boolean(centralView?.official) || Boolean(pacificView?.official);
  const showingSample =
    allowSample &&
    !anyOfficial &&
    ((centralView?.series.length ?? 0) > 0 ||
      (pacificView?.series.length ?? 0) > 0);
  const bothEmpty =
    (centralView?.series.length ?? 0) === 0 &&
    (pacificView?.series.length ?? 0) === 0;

  return (
    <div className="space-y-2">
      {showingSample ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          【レイアウト確認用サンプル】正式な月別順位推移は未登録です。下図は保存データではありません。
        </p>
      ) : null}
      {!showingSample && bothEmpty ? (
        <p className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-museum-ivory-soft">
          月別順位推移はまだ登録されていません。
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <DataPanel title="セ・リーグ" description="4月〜最終">
          {centralView && centralView.series.length > 0 ? (
            <TrendChart
              months={centralView.months}
              series={centralView.series}
            />
          ) : (
            <p className="text-[13px] text-museum-ivory-soft">未登録</p>
          )}
        </DataPanel>
        <DataPanel title="パ・リーグ" description="4月〜最終">
          {pacificView && pacificView.series.length > 0 ? (
            <TrendChart
              months={pacificView.months}
              series={pacificView.series}
            />
          ) : (
            <p className="text-[13px] text-museum-ivory-soft">未登録</p>
          )}
        </DataPanel>
      </div>
    </div>
  );
}
