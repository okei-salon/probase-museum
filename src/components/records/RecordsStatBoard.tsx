"use client";

import { useMemo, useState } from "react";
import {
  buildCareerRecordsBoard,
  buildSeasonRecordsBoard,
  statsForRole,
  type RecordsRankEntry,
  type RecordsRole,
  type RecordsStatDef,
} from "@/data/recordsRankings";
import type { SeasonLineScope } from "@/data/playerSeasonLines";
import { cn } from "@/lib/cn";

type Mode = "season" | "career";

type RecordsStatBoardProps = {
  mode: Mode;
  /** 既定 pennant。交流戦記録は interleague */
  scope?: SeasonLineScope;
};

export function RecordsStatBoard({
  mode,
  scope = "pennant",
}: RecordsStatBoardProps) {
  const [role, setRole] = useState<RecordsRole>("batter");
  const defs = useMemo(() => statsForRole(role), [role]);
  const [statId, setStatId] = useState(defs[0]?.id ?? "avg");

  const board = useMemo(() => {
    const def =
      statsForRole(role).find((d) => d.id === statId) ??
      statsForRole(role)[0];
    if (!def) {
      return {
        def: null as RecordsStatDef | null,
        entries: [] as RecordsRankEntry[],
        emptyReason: "項目がありません。",
      };
    }
    return mode === "season"
      ? buildSeasonRecordsBoard(def, scope)
      : buildCareerRecordsBoard(def, scope);
  }, [mode, role, statId, scope]);

  const modeLabel =
    scope === "interleague"
      ? mode === "season"
        ? "交流戦・歴代（年度）"
        : "交流戦・通算"
      : mode === "season"
        ? "シーズン"
        : "通算";

  return (
    <div className="space-y-5">
      {scope === "interleague" ? (
        <p className="text-[12px] text-museum-ivory-soft">
          交流戦個人成績のみを対象とします。通常シーズン成績とは混ぜません。通算は
          BLUE＋RED を合算し、率は元数字から再計算します。
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "batter" as const, label: "野手" },
            { id: "pitcher" as const, label: "投手" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRole(r.id);
              const next = statsForRole(r.id)[0];
              if (next) setStatId(next.id);
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[12px] tracking-[0.08em] transition-colors",
              role === r.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {defs.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setStatId(d.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
              (board.def?.id ?? statId) === d.id
                ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
        <p className="border-b border-white/10 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
          {modeLabel}
          {board.def ? ` · ${board.def.label}` : ""}
        </p>
        {board.emptyReason && board.entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-white/45">
            {board.emptyReason}
          </p>
        ) : (
          <table className="min-w-full text-left text-[12px]">
            <thead>
              <tr className="text-white/50">
                <th className="px-3 py-2">順位</th>
                <th className="px-3 py-2">選手</th>
                <th className="px-3 py-2">球団</th>
                <th className="px-3 py-2">
                  {mode === "season" ? "シーズン" : "シーズン数"}
                </th>
                <th className="px-3 py-2">記録</th>
              </tr>
            </thead>
            <tbody>
              {board.entries.map((row) => (
                <tr
                  key={`${row.playerId}-${row.year}-${row.world ?? ""}-${row.rank}`}
                  className="border-t border-white/5 text-museum-ivory"
                >
                  <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                  <td className="px-3 py-2">{row.playerName}</td>
                  <td className="px-3 py-2">{row.teamShort}</td>
                  <td className="px-3 py-2">
                    {mode === "season" ? row.seasonLabel : row.year}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                    {row.valueText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
