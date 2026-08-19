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
 * SeasonIdentity 単位で保存データを表示。未登録時はレイアウト用静的ダミー。
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

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#60a5fa)]">
          1. 交流戦順位（12球団）
        </h3>
        <DataPanel
          description={
            data?.official
              ? `${seasonLabel} 交流戦（正式）`
              : `${seasonLabel} 交流戦（レイアウト確認用サンプル）`
          }
        >
          {data?.official ? (
            <p className="mb-2 text-[11px] text-[color:var(--museum-accent,#60a5fa)]/80">
              優勝: {data.champion}
              {data.mvp.playerName !== "登録待ち"
                ? ` / MVP: ${data.mvp.playerName}`
                : ""}
            </p>
          ) : (
            <p className="mb-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
              正式な交流戦順位は未登録です。下表は保存されないサンプル表示です。
            </p>
          )}
          <StandingsTable
            title="勝敗・勝率・ゲーム差"
            rows={data?.standings ?? []}
          />
        </DataPanel>
      </section>

      <section>
        <h3 className="mb-2 text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#60a5fa)]">
          2. 対戦成績
        </h3>
        <DataPanel
          description={
            data?.official
              ? "セ×パ マトリクス（正式）"
              : "セ×パ マトリクス（レイアウト確認用サンプル）"
          }
        >
          <CrossMatchMatrix
            title="セ・リーグ ＼ パ・リーグ"
            rowTeams={data?.matrix.rowTeams ?? []}
            colTeams={data?.matrix.colTeams ?? []}
            cells={data?.matrix.cells ?? []}
          />
        </DataPanel>
      </section>
    </div>
  );
}
