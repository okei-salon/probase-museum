"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTeamYearlyBoard } from "@/data/teamDetail";
import type { TeamId } from "@/data/teams";

type Props = { teamId: TeamId };

export function TeamYearlyBoard({ teamId }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, [teamId]);

  const board = useMemo(
    () => (ready ? buildTeamYearlyBoard(teamId) : null),
    [ready, teamId],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  if (!board || board.rows.length === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        この球団の年度成績はまだありません。チーム打撃・投手成績の登録後に、勝敗・順位が自動で一覧表示されます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-left text-[12px] md:text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] text-white/55">
            <th className="px-2.5 py-2 font-medium">年度</th>
            <th className="px-2.5 py-2 font-medium">順位</th>
            <th className="px-2.5 py-2 font-medium">勝</th>
            <th className="px-2.5 py-2 font-medium">敗</th>
            <th className="px-2.5 py-2 font-medium">分</th>
            <th className="px-2.5 py-2 font-medium">勝率</th>
            <th className="px-2.5 py-2 font-medium">得点</th>
            <th className="px-2.5 py-2 font-medium">失点</th>
          </tr>
        </thead>
        <tbody>
          {board.rows.map((row) => (
            <tr key={row.seasonKey} className="border-b border-white/8">
              <td className="px-2.5 py-2 text-white/85">{row.seasonLabel}</td>
              <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                {row.rank != null ? `${row.rank}位` : "—"}
              </td>
              <td className="px-2.5 py-2 tabular-nums">{row.w ?? "—"}</td>
              <td className="px-2.5 py-2 tabular-nums">{row.l ?? "—"}</td>
              <td className="px-2.5 py-2 tabular-nums">{row.t ?? "—"}</td>
              <td className="px-2.5 py-2 tabular-nums font-medium text-white">
                {row.winPctText ?? "—"}
              </td>
              <td className="px-2.5 py-2 tabular-nums">
                {row.runsScored ?? "—"}
              </td>
              <td className="px-2.5 py-2 tabular-nums">
                {row.runsAllowed ?? "—"}
              </td>
            </tr>
          ))}
          {board.career ? (
            <tr className="border-t border-[color:var(--museum-accent,#d4af37)]/35 bg-black/30">
              <td className="px-2.5 py-2.5 font-medium text-[color:var(--museum-accent,#d4af37)]">
                通算
              </td>
              <td className="px-2.5 py-2.5 text-white/50">—</td>
              <td className="px-2.5 py-2.5 tabular-nums">
                {board.career.w ?? "—"}
              </td>
              <td className="px-2.5 py-2.5 tabular-nums">
                {board.career.l ?? "—"}
              </td>
              <td className="px-2.5 py-2.5 tabular-nums">—</td>
              <td className="px-2.5 py-2.5 tabular-nums font-medium text-white">
                {board.career.winPctText ?? "—"}
              </td>
              <td className="px-2.5 py-2.5 tabular-nums">
                {board.career.runsScored ?? "—"}
              </td>
              <td className="px-2.5 py-2.5 tabular-nums">—</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="border-t border-white/8 px-2.5 py-2 text-[10px] text-museum-ivory-soft">
        順位は同リーグ内の登録チーム勝率から算出。分・失点は正式データ未整備のため「—」表示です。
      </p>
    </div>
  );
}
