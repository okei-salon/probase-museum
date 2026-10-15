"use client";

import { useEffect, useMemo, useState } from "react";
import { DataPanel } from "@/components/category";
import { MuseumBoardStatusMessage } from "@/components/museum/MuseumBoardStatusMessage";
import { StandingsTable } from "@/components/views";
import { MUSEUM_BOARD_LOADING_MESSAGE } from "@/data/museumBoardDataStatus";
import {
  centralStandings,
  pacificStandings,
} from "@/data/seasonViews";
import {
  allowsLayoutSampleFallback,
  parseSeasonKey,
} from "@/data/seasons";
import {
  getStandingsForSeasonAsync,
  getYearStandingsAsync,
  type StandingEntry,
} from "@/data/teamStandings";
import { useMuseumBoardTick } from "@/hooks/useMuseumBoardStatus";
import { cn } from "@/lib/cn";

type FinalStandingsBoardProps = {
  year: string;
  seasonKey?: string;
  /** サマリー用のコンパクト表示 */
  compact?: boolean;
  className?: string;
};

/**
 * 最終順位（セ・パ）。
 * 保存済みリーグのみ正式表示。未登録リーグは空（正式 WORLD ではサンプルへフォールバックしない）。
 * DEMO／レガシーで両リーグとも未登録のときのみレイアウト用ダミーを表示。
 */
export function FinalStandingsBoard({
  year,
  seasonKey,
  compact = false,
  className,
}: FinalStandingsBoardProps) {
  const { tick } = useMuseumBoardTick();
  const [central, setCentral] = useState<StandingEntry[] | null>(null);
  const [pacific, setPacific] = useState<StandingEntry[] | null>(null);
  const [hasAnyStored, setHasAnyStored] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const identity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );
  const allowSample = allowsLayoutSampleFallback(identity);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(false);
    void (async () => {
      try {
        const stored = identity
          ? await getStandingsForSeasonAsync(identity)
          : await getYearStandingsAsync(Number(year));
        if (cancelled) return;
        const c = stored?.central?.length ? stored.central : null;
        const p = stored?.pacific?.length ? stored.pacific : null;
        setCentral(c);
        setPacific(p);
        setHasAnyStored(Boolean(c || p));
        setReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, identity]);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const stored = identity
        ? await getStandingsForSeasonAsync(identity)
        : await getYearStandingsAsync(Number(year));
      const c = stored?.central?.length ? stored.central : null;
      const p = stored?.pacific?.length ? stored.pacific : null;
      setCentral(c);
      setPacific(p);
      setHasAnyStored(Boolean(c || p));
    })();
    // Local rebuild after Museum notify — standings helpers are cached reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick-driven refresh
  }, [tick]);

  const useFullSample = allowSample && !hasAnyStored;

  const centralRows = central
    ? central
    : useFullSample
      ? centralStandings
      : [];
  const pacificRows = pacific
    ? pacific
    : useFullSample
      ? pacificStandings
      : [];

  const showingSample = useFullSample;
  const bothEmpty = centralRows.length === 0 && pacificRows.length === 0;

  if (loadError) {
    return (
      <div className={cn("space-y-2", className)}>
        <MuseumBoardStatusMessage status="error" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[13px] text-museum-ivory-soft">
          {MUSEUM_BOARD_LOADING_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showingSample ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          【レイアウト確認用サンプル】正式な最終順位は未登録です。下表は保存データではありません。
        </p>
      ) : null}
      {!showingSample && bothEmpty ? (
        <MuseumBoardStatusMessage
          status="empty"
          emptyMessage="最終順位はまだ登録されていません。"
          className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-museum-ivory-soft"
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <DataPanel className={compact ? "!p-3 md:!p-3.5" : undefined}>
          {centralRows.length > 0 ? (
            <StandingsTable
              title="セ・リーグ"
              rows={centralRows}
              className={
                compact
                  ? "[&_table]:min-w-0 [&_td]:py-1.5 [&_th]:py-1.5"
                  : undefined
              }
            />
          ) : (
            <EmptyLeagueNotice title="セ・リーグ" />
          )}
        </DataPanel>
        <DataPanel className={compact ? "!p-3 md:!p-3.5" : undefined}>
          {pacificRows.length > 0 ? (
            <StandingsTable
              title="パ・リーグ"
              rows={pacificRows}
              className={
                compact
                  ? "[&_table]:min-w-0 [&_td]:py-1.5 [&_th]:py-1.5"
                  : undefined
              }
            />
          ) : (
            <EmptyLeagueNotice title="パ・リーグ" />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

function EmptyLeagueNotice({ title }: { title: string }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <p className="text-[13px] text-museum-ivory-soft">未登録</p>
    </div>
  );
}
