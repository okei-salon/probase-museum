"use client";

import { useEffect, useMemo, useState } from "react";
import { DataPanel } from "@/components/category";
import { CrossMatchMatrix, StandingsTable } from "@/components/views";
import {
  getInterleagueView,
  type InterleagueView,
} from "@/data/interleague";
import { formatSeasonLineLabel, parseSeasonKey } from "@/data/seasons";

type InterleagueStandingsBoardProps = {
  year: string;
  seasonKey?: string;
};

/**
 * 交流戦順位 + 対戦表。
 * SeasonIdentity 単位で保存データを表示。正式 WORLD の未登録時は空表示。
 */
export function InterleagueStandingsBoard({
  year,
  seasonKey,
}: InterleagueStandingsBoardProps) {
  const identity = useMemo(
    () => parseSeasonKey(seasonKey ?? year),
    [seasonKey, year],
  );

  const [view, setView] = useState<InterleagueView | null>(null);

  useEffect(() => {
    if (!identity) return;
    setView(getInterleagueView(identity));
  }, [identity]);

  const seasonLabel = identity
    ? formatSeasonLineLabel(identity)
    : year;
  const data = view;
  const official = Boolean(data?.official);
  const hasStandings = (data?.standings.length ?? 0) > 0;
  const hasMatrix =
    (data?.matrix.rowTeams.length ?? 0) > 0 &&
    (data?.matrix.colTeams.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#60a5fa)]">
          1. 交流戦順位（12球団）
        </h3>
        <DataPanel
          description={
            official
              ? `${seasonLabel} 交流戦（正式）`
              : hasStandings
                ? `${seasonLabel} 交流戦（レイアウト確認用サンプル）`
                : `${seasonLabel} 交流戦`
          }
        >
          {official ? (
            <p className="mb-2 text-[11px] text-[color:var(--museum-accent,#60a5fa)]/80">
              優勝: {data?.champion}
              {data?.mvp.playerName !== "登録待ち"
                ? ` / MVP: ${data?.mvp.playerName}`
                : ""}
            </p>
          ) : hasStandings ? (
            <p className="mb-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
              正式な交流戦順位は未登録です。下表は保存されないサンプル表示です。
            </p>
          ) : (
            <p className="mb-2 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-museum-ivory-soft">
              交流戦順位はまだ登録されていません。
            </p>
          )}
          {hasStandings ? (
            <StandingsTable
              title="勝敗・勝率・ゲーム差"
              rows={data?.standings ?? []}
            />
          ) : null}
        </DataPanel>
      </section>

      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#60a5fa)]">
          2. 対戦成績
        </h3>
        <DataPanel
          description={
            official
              ? "セ×パ マトリクス（正式）"
              : hasMatrix
                ? "セ×パ マトリクス（レイアウト確認用サンプル）"
                : "セ×パ マトリクス"
          }
        >
          {hasMatrix ? (
            <CrossMatchMatrix
              title="セ・リーグ ＼ パ・リーグ"
              rowTeams={data?.matrix.rowTeams ?? []}
              colTeams={data?.matrix.colTeams ?? []}
              cells={data?.matrix.cells ?? []}
            />
          ) : (
            <p className="text-[13px] text-museum-ivory-soft">未登録</p>
          )}
        </DataPanel>
      </section>
    </div>
  );
}
