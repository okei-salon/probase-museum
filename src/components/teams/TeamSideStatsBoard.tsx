"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTeamBattingBoard,
  buildTeamPitchingBoard,
  TEAM_DETAIL_BATTING_KEYS,
  TEAM_DETAIL_PITCHING_KEYS,
  type TeamSideBoard,
  type TeamStatFieldRow,
} from "@/data/teamDetail";
import {
  battingFieldLabel,
  pitchingFieldLabel,
} from "@/data/teamSeasonStats";
import type { TeamId } from "@/data/teams";
import { cn } from "@/lib/cn";

type Props = {
  teamId: TeamId;
  kind: "batting" | "pitching";
};

type LoadedState = {
  key: string;
  board: TeamSideBoard;
  mode: "year" | "career";
};

type TableColumn = { key: string; label: string };

/** 個人成績（PlayerStatsExplorer）と同じ黒系。球場背景を透けさせない */
const STICKY_BG = "bg-[#0a0a0a]";
const STICKY_BG_HEAD = "bg-[#0d1118]";
const TABLE_SURFACE = "bg-[#0a0a0a]";
const THEAD_ROW = "bg-black/50";

function fieldLabel(kind: "batting" | "pitching", key: string): string {
  if (kind === "batting") {
    if (key === "cs") return "盗塁死";
    return battingFieldLabel(key);
  }
  return pitchingFieldLabel(key);
}

function columnsForBoard(
  kind: "batting" | "pitching",
  board: TeamSideBoard,
  mode: "year" | "career",
): TableColumn[] {
  const preferred =
    kind === "batting" ? TEAM_DETAIL_BATTING_KEYS : TEAM_DETAIL_PITCHING_KEYS;
  const present = new Set<string>();
  const sources: TeamStatFieldRow[][] =
    mode === "career"
      ? board.career
        ? [board.career]
        : []
      : board.years.map((y) => y.fields);

  for (const fields of sources) {
    for (const f of fields) present.add(f.key);
  }

  return preferred
    .filter((key) => present.has(key))
    .map((key) => ({ key, label: fieldLabel(kind, key) }));
}

function fieldMap(fields: TeamStatFieldRow[]): Map<string, string> {
  return new Map(fields.map((f) => [f.key, f.valueText]));
}

export function TeamSideStatsBoard({ teamId, kind }: Props) {
  const loadKey = `${teamId}:${kind}`;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { hydrateTeamSeasonStatsFromCloud } = await import(
        "@/data/teamSeasonStats"
      );
      await hydrateTeamSeasonStatsFromCloud();
      if (cancelled) return;
      const board =
        kind === "batting"
          ? buildTeamBattingBoard(teamId)
          : buildTeamPitchingBoard(teamId);
      setState({
        key: `${teamId}:${kind}`,
        board,
        mode: "year",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, kind]);

  const columns = useMemo(() => {
    if (!state || state.key !== loadKey) return [];
    return columnsForBoard(kind, state.board, state.mode);
  }, [state, loadKey, kind]);

  if (!state || state.key !== loadKey) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  const { board, mode } = state;

  if (board.years.length === 0 && !board.career) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        この球団の
        {kind === "batting" ? "チーム打撃" : "チーム投手"}
        成績はまだありません。
      </p>
    );
  }

  const rows =
    mode === "career"
      ? board.career
        ? [{ id: "career", label: "通算", fields: board.career }]
        : []
      : board.years.map((y) => ({
          id: y.seasonKey,
          label: y.seasonLabel,
          fields: y.fields,
        }));

  const stickyWidthRem = 7.5;
  const colWidthRem = 4.75;
  const tableMinWidthRem = stickyWidthRem + columns.length * colWidthRem;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ModeBtn
          active={mode === "year"}
          label="年度"
          onClick={() =>
            setState((prev) =>
              prev ? { ...prev, mode: "year" } : prev,
            )
          }
        />
        {board.career ? (
          <ModeBtn
            active={mode === "career"}
            label="通算"
            onClick={() =>
              setState((prev) =>
                prev ? { ...prev, mode: "career" } : prev,
              )
            }
          />
        ) : null}
      </div>

      {rows.length === 0 || columns.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          表示できる項目がありません。
        </p>
      ) : (
        <div className="min-w-0 w-full">
          <div
            className={cn(
              "w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-white/10",
              TABLE_SURFACE,
            )}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <table
              className="border-collapse text-left text-[12px] md:text-[13px]"
              style={{
                minWidth: `${tableMinWidthRem}rem`,
                width: "max-content",
              }}
            >
              <thead>
                <tr
                  className={cn(
                    "border-b border-[color:var(--museum-accent-border,#d4af3773)]",
                    THEAD_ROW,
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 z-20 whitespace-nowrap px-2.5 py-2.5 font-medium text-[color:var(--museum-accent,#d4af37)]",
                      STICKY_BG_HEAD,
                      "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                    )}
                    style={{ minWidth: `${stickyWidthRem}rem` }}
                  >
                    {mode === "career" ? "区分" : "年度"}
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="whitespace-nowrap px-2.5 py-2.5 font-medium tracking-[0.04em] text-museum-ivory-soft"
                      style={{ minWidth: `${colWidthRem}rem` }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const values = fieldMap(row.fields);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-white/10 text-museum-ivory"
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-10 whitespace-nowrap px-2.5 py-2.5 font-medium",
                          STICKY_BG,
                          "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                          mode === "career" &&
                            "text-[color:var(--museum-accent,#d4af37)]",
                        )}
                        style={{ minWidth: `${stickyWidthRem}rem` }}
                      >
                        {row.label}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="whitespace-nowrap px-2.5 py-2.5 tabular-nums"
                          style={{ minWidth: `${colWidthRem}rem` }}
                        >
                          {values.get(col.key) ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-museum-ivory-soft">
            表は横スクロールで全項目を確認できます。BLUE / RED
            は別シーズン行として表示します。
          </p>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
        active
          ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
          : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
      )}
    >
      {label}
    </button>
  );
}
