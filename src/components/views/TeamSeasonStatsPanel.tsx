"use client";

import { useEffect, useMemo, useState } from "react";
import { SortableTeamStatsTable } from "@/components/views/SortableTeamStatsTable";
import {
  buildLayoutSampleBattingRows,
  buildLayoutSamplePitchingRows,
  formalTeamBattingColumns,
  formalTeamPitchingColumns,
  getOfficialTeamBattingRows,
  getOfficialTeamPitchingRows,
  type TeamCompetition,
} from "@/data/teamSeasonStats";
import type { TeamStatColumn, TeamStatRow } from "@/data/seasonViews";
import {
  allowsLayoutSampleFallback,
  formatSeasonLineLabel,
  parseSeasonKey,
} from "@/data/seasons";

type TeamSeasonStatsPanelProps = {
  year: string;
  kind: "batting" | "pitching";
  /** 通常シーズン / 交流戦 */
  competition?: TeamCompetition;
  /** 交流戦は最初から12球団 */
  defaultLeague?: "central" | "pacific" | "all";
  /** ルート seasonKey（BLUE_2026 等）。指定時は world+year で厳密取得 */
  seasonKey?: string;
};

type PanelData = {
  rows: TeamStatRow[];
  columns: TeamStatColumn[];
  official: boolean;
};

/**
 * セ／パ／12球団／交流戦で共通利用。
 * 列定義は常に正式全項目。
 * 表示前に team_season_stats をクラウドから hydrate。
 * 正式 WORLD の未登録時は空表示。DEMO／レガシーのみレイアウト用サンプル。
 */
export function TeamSeasonStatsPanel({
  year,
  kind,
  competition = "regular",
  defaultLeague = "central",
  seasonKey,
}: TeamSeasonStatsPanelProps) {
  const y = Number(year);
  const identity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );
  const allowSample = allowsLayoutSampleFallback(identity);
  const [data, setData] = useState<PanelData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { hydrateTeamSeasonStatsFromCloud } = await import(
        "@/data/teamSeasonStats"
      );
      await hydrateTeamSeasonStatsFromCloud();
      if (cancelled) return;

      const columns =
        kind === "batting"
          ? formalTeamBattingColumns
          : formalTeamPitchingColumns;

      if (kind === "batting") {
        const officialRows = getOfficialTeamBattingRows(
          y,
          competition,
          identity,
        );
        setData({
          rows:
            officialRows.length > 0
              ? officialRows
              : allowSample
                ? buildLayoutSampleBattingRows()
                : [],
          columns,
          official: officialRows.length > 0,
        });
        return;
      }

      const officialRows = getOfficialTeamPitchingRows(
        y,
        competition,
        identity,
      );
      setData({
        rows:
          officialRows.length > 0
            ? officialRows
            : allowSample
              ? buildLayoutSamplePitchingRows()
              : [],
        columns,
        official: officialRows.length > 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, y, competition, identity, allowSample]);

  const competitionLabel =
    competition === "interleague" ? "交流戦" : "通常シーズン";
  const fieldLabel =
    kind === "batting" ? "打者成績（全項目）" : "投手成績（全項目）";
  const seasonLabel = identity
    ? formatSeasonLineLabel(identity)
    : `${y}年`;

  const rows = data?.rows ?? [];
  const columns = data?.columns ?? (kind === "batting"
    ? formalTeamBattingColumns
    : formalTeamPitchingColumns);
  const official = data?.official ?? false;

  return (
    <div className="min-w-0 w-full space-y-2">
      {official ? (
        <p className="text-[11px] text-[color:var(--museum-accent,#d4af37)]/80">
          {seasonLabel}・{competitionLabel}・正式チーム成績（{fieldLabel}）
        </p>
      ) : allowSample ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          【レイアウト確認用サンプル】正式な{competitionLabel}
          チーム成績は未登録です。下表の「---」は保存データではなく、
          {fieldLabel}
          の列構成確認用です。マスターには保存されません。
        </p>
      ) : (
        <p className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-museum-ivory-soft">
          正式な{competitionLabel}チーム成績はまだ登録されていません。
        </p>
      )}
      {rows.length > 0 ? (
        <SortableTeamStatsTable
          rows={rows}
          columns={columns}
          defaultSortKey={kind === "batting" ? "avg" : "era"}
          defaultLeague={defaultLeague}
          footerNote={
            official
              ? `列名クリックでソート。横スクロールで${fieldLabel}の最後まで確認できます。球団列は左に固定されます。`
              : `サンプル表示中。横スクロールで${fieldLabel}の最後まで到達できます。球団列は左に固定されます。`
          }
        />
      ) : null}
    </div>
  );
}
