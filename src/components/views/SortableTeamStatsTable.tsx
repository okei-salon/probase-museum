"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatTeamStatValue,
  type TeamStatColumn,
  type TeamStatRow,
} from "@/data/seasonViews";

type LeagueFilter = "central" | "pacific" | "all";

type SortableTeamStatsTableProps = {
  rows: TeamStatRow[];
  columns: TeamStatColumn[];
  defaultSortKey: string;
  /** 交流戦など最初から12球団表示したい場合 */
  defaultLeague?: LeagueFilter;
  /** フッター注記（サンプル／正式など） */
  footerNote?: string;
};

const STICKY_BG = "bg-[#0a0f18]";
const STICKY_BG_HEAD = "bg-[#0d1520]";

export function SortableTeamStatsTable({
  rows,
  columns,
  defaultSortKey,
  defaultLeague = "central",
  footerNote,
}: SortableTeamStatsTableProps) {
  const [league, setLeague] = useState<LeagueFilter>(defaultLeague);
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [dir, setDir] = useState<"asc" | "desc">(() => {
    const col = columns.find((c) => c.key === defaultSortKey);
    return col?.lowerIsBetter ? "asc" : "desc";
  });

  const showLeagueCol = league === "all";

  const filtered = useMemo(() => {
    if (league === "all") return rows;
    return rows.filter((row) => row.league === league);
  }, [league, rows]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a.values[sortKey] ?? 0;
      const bv = b.values[sortKey] ?? 0;
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [dir, filtered, sortKey]);

  // 順位+球団(+リーグ) + 各列。列を潰さず最後まで到達できる幅
  const stickyWidth = showLeagueCol ? 9.5 : 7.5; // rem
  const colWidthRem = 4.75;
  const tableMinWidthRem = stickyWidth + columns.length * colWidthRem;

  function handleSort(key: string) {
    if (sortKey === key) {
      setDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    const col = columns.find((c) => c.key === key);
    setSortKey(key);
    setDir(col?.lowerIsBetter ? "asc" : "desc");
  }

  return (
    <div className="min-w-0 w-full">
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["central", "セ・リーグ"],
            ["pacific", "パ・リーグ"],
            ["all", "12球団"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLeague(id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
              league === id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-white/10"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table
          className="border-collapse text-left text-[12px] md:text-[13px]"
          style={{ minWidth: `${tableMinWidthRem}rem`, width: "max-content" }}
        >
          <thead>
            <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)]">
              <th
                className={cn(
                  "sticky left-0 z-20 whitespace-nowrap px-2.5 py-2.5 font-medium text-[color:var(--museum-accent,#d4af37)]",
                  STICKY_BG_HEAD,
                  "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                )}
                style={{ minWidth: `${stickyWidth}rem` }}
              >
                順位 / 球団
                {showLeagueCol ? " / リーグ" : ""}
              </th>
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-2.5 py-2.5"
                    style={{ minWidth: `${colWidthRem}rem` }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap font-medium tracking-[0.04em]",
                        active
                          ? "text-[color:var(--museum-accent,#d4af37)]"
                          : "text-museum-ivory-soft hover:text-museum-ivory",
                      )}
                    >
                      {col.label}
                      <span className="text-[10px] opacity-80">
                        {active ? (dir === "asc" ? "▲" : "▼") : "◇"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                key={row.team}
                className="border-b border-white/10 text-museum-ivory"
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 whitespace-nowrap px-2.5 py-2.5 font-medium",
                    STICKY_BG,
                    "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                  )}
                  style={{ minWidth: `${stickyWidth}rem` }}
                >
                  <span className="mr-2 inline-block w-5 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                    {index + 1}
                  </span>
                  <span className="whitespace-nowrap">{row.team}</span>
                  {showLeagueCol ? (
                    <span className="ml-2 text-museum-ivory-soft">
                      {row.league === "central" ? "セ" : "パ"}
                    </span>
                  ) : null}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="whitespace-nowrap px-2.5 py-2.5 tabular-nums"
                    style={{ minWidth: `${colWidthRem}rem` }}
                  >
                    {formatTeamStatValue(col.key, row.values[col.key] ?? -1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-museum-ivory-soft">
        {footerNote ??
          "列名クリックでソート。表は横スクロールで全項目を確認できます。"}
      </p>
    </div>
  );
}
