"use client";

import { useEffect, useMemo, useState } from "react";
import { DataPanel } from "@/components/category";
import { StandingsTable } from "@/components/views";
import {
  centralStandings,
  pacificStandings,
} from "@/data/seasonViews";
import { parseSeasonKey } from "@/data/seasons";
import {
  getStandingsForSeason,
  getYearStandings,
  type StandingEntry,
} from "@/data/teamStandings";
import { cn } from "@/lib/cn";

type FinalStandingsBoardProps = {
  year: string;
  seasonKey?: string;
  /** サマリー用のコンパクト表示 */
  compact?: boolean;
  className?: string;
};

/**
 * 最終順位（セ・パ）。取込済みがあれば優先、なければレイアウト用ダミー。
 * 順位推移（月別）は含まない。
 */
export function FinalStandingsBoard({
  year,
  seasonKey,
  compact = false,
  className,
}: FinalStandingsBoardProps) {
  const [central, setCentral] = useState<StandingEntry[] | null>(null);
  const [pacific, setPacific] = useState<StandingEntry[] | null>(null);
  const [official, setOfficial] = useState(false);

  const identity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );

  useEffect(() => {
    const stored = identity
      ? getStandingsForSeason(identity)
      : getYearStandings(Number(year));
    if (stored?.central?.length || stored?.pacific?.length) {
      setCentral(stored.central?.length ? stored.central : null);
      setPacific(stored.pacific?.length ? stored.pacific : null);
      setOfficial(true);
    } else {
      setCentral(null);
      setPacific(null);
      setOfficial(false);
    }
  }, [year, identity]);

  const centralRows = central ?? centralStandings;
  const pacificRows = pacific ?? pacificStandings;

  return (
    <div className={cn("space-y-2", className)}>
      {!official ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          【レイアウト確認用サンプル】正式な最終順位は未登録です。下表は保存データではありません。
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <DataPanel className={compact ? "!p-3 md:!p-3.5" : undefined}>
          <StandingsTable
            title="セ・リーグ"
            rows={centralRows}
            className={
              compact
                ? "[&_table]:min-w-0 [&_td]:py-1.5 [&_th]:py-1.5"
                : undefined
            }
          />
        </DataPanel>
        <DataPanel className={compact ? "!p-3 md:!p-3.5" : undefined}>
          <StandingsTable
            title="パ・リーグ"
            rows={pacificRows}
            className={
              compact
                ? "[&_table]:min-w-0 [&_td]:py-1.5 [&_th]:py-1.5"
                : undefined
            }
          />
        </DataPanel>
      </div>
    </div>
  );
}
