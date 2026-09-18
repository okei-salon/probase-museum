"use client";

import { useEffect, useMemo, useState } from "react";
import { SortableTeamStatsTable } from "@/components/views/SortableTeamStatsTable";
import {
  formatSeasonLineLabel,
  listEntrySeasonIdentities,
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  formalTeamBattingColumns,
  formalTeamPitchingColumns,
  getOfficialTeamBattingRows,
  getOfficialTeamPitchingRows,
} from "@/data/teamSeasonStats";
import type { TeamStatColumn, TeamStatRow } from "@/data/seasonViews";
import { cn } from "@/lib/cn";

type Kind = "batting" | "pitching";

type PanelData = {
  rows: TeamStatRow[];
  columns: TeamStatColumn[];
  seasonKey: string;
  kind: Kind;
};

function defaultSeasonKey(): string {
  return listEntrySeasonIdentities()[0]?.seasonKey ?? "BLUE_2026";
}

/**
 * 12球団横断ランキング（YEAR×WORLD 厳密・打撃／投手切替）。
 * 既存 teamSeasonStats を読むだけ。通算は WORLD 混在のため今回は対象外。
 */
export function AllTeamsRankingBoard() {
  const seasons = useMemo(() => listEntrySeasonIdentities(), []);
  const [seasonKey, setSeasonKey] = useState(defaultSeasonKey);
  const [kind, setKind] = useState<Kind>("batting");
  const [data, setData] = useState<PanelData | null>(null);

  const identity: SeasonIdentity | null = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { hydrateTeamSeasonStatsFromCloud } = await import(
        "@/data/teamSeasonStats"
      );
      await hydrateTeamSeasonStatsFromCloud();
      if (cancelled || !identity) return;

      const columns =
        kind === "batting"
          ? formalTeamBattingColumns
          : formalTeamPitchingColumns;
      const rows =
        kind === "batting"
          ? getOfficialTeamBattingRows(identity.year, "regular", identity)
          : getOfficialTeamPitchingRows(identity.year, "regular", identity);

      setData({
        rows,
        columns,
        seasonKey: identity.seasonKey,
        kind,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, kind]);

  const ready =
    data != null &&
    data.seasonKey === seasonKey &&
    data.kind === kind;

  const seasonLabel = identity
    ? formatSeasonLineLabel(identity)
    : seasonKey;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] tracking-[0.08em] text-museum-ivory-soft">
          シーズン（YEAR × WORLD）
        </p>
        <div className="flex flex-wrap gap-2">
          {seasons.map((s) => {
            const label = formatSeasonLineLabel(s);
            const active = s.seasonKey === seasonKey;
            return (
              <button
                key={s.seasonKey}
                type="button"
                onClick={() => setSeasonKey(s.seasonKey)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
                  active
                    ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                    : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["batting", "打撃"],
            ["pitching", "投手"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
              kind === id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>
      ) : data.rows.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          {seasonLabel} のチーム
          {kind === "batting" ? "打撃" : "投手"}
          成績はまだ登録されていません。
        </p>
      ) : (
        <SortableTeamStatsTable
          key={`${seasonKey}:${kind}`}
          rows={data.rows}
          columns={data.columns}
          defaultSortKey={kind === "batting" ? "avg" : "era"}
          lockLeagueToAll
          useCompetitionRank
          footerNote={`${seasonLabel} · 列名クリックでソート（同値は同順位 1,2,2,4）。表は横スクロールで全項目を確認できます。BLUE / RED は混在しません。`}
        />
      )}
    </div>
  );
}
