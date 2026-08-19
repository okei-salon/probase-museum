"use client";

import { useEffect, useMemo, useState } from "react";
import { DataPanel } from "@/components/category";
import { TrendChart } from "@/components/views";
import {
  buildStandingsTrendBoard,
  type StandingsTrendBoardData,
} from "@/data/standingsHistory";
import { parseSeasonKey } from "@/data/seasons";
import {
  pacificStandingsTrend,
  standingsTrend,
} from "@/data/seasonViews";

type StandingsTrendBoardProps = {
  year: string;
  seasonKey: string;
};

/**
 * ペナント「順位推移」。正式履歴があれば優先、無ければ静的ダミーへフォールバック。
 * グラフデザインは既存 TrendChart をそのまま使用。
 */
export function StandingsTrendBoard({
  year,
  seasonKey,
}: StandingsTrendBoardProps) {
  const identity = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );
  const [central, setCentral] = useState<StandingsTrendBoardData | null>(null);
  const [pacific, setPacific] = useState<StandingsTrendBoardData | null>(null);

  useEffect(() => {
    if (!identity) {
      setCentral(null);
      setPacific(null);
      return;
    }
    setCentral(buildStandingsTrendBoard(identity, "central"));
    setPacific(buildStandingsTrendBoard(identity, "pacific"));
  }, [identity, year]);

  const centralView =
    central?.official && central.series.length > 0
      ? central
      : {
          months: standingsTrend.months,
          series: standingsTrend.series,
          official: false,
        };
  const pacificView =
    pacific?.official && pacific.series.length > 0
      ? pacific
      : {
          months: pacificStandingsTrend.months,
          series: pacificStandingsTrend.series,
          official: false,
        };

  const anyOfficial = centralView.official || pacificView.official;

  return (
    <div className="space-y-2">
      {!anyOfficial ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          【レイアウト確認用サンプル】正式な月別順位推移は未登録です。下図は保存データではありません。
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <DataPanel title="セ・リーグ" description="4月〜最終">
          <TrendChart
            months={centralView.months}
            series={centralView.series}
          />
        </DataPanel>
        <DataPanel title="パ・リーグ" description="4月〜最終">
          <TrendChart
            months={pacificView.months}
            series={pacificView.series}
          />
        </DataPanel>
      </div>
    </div>
  );
}
