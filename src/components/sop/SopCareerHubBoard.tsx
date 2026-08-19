"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildSopCareerRankings,
  type SopRoleFilter,
} from "@/data/sop";
import { RoleTabs } from "@/components/sop/SopSeasonHubBoard";

export function SopCareerHubBoard() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<SopRoleFilter>("all");

  useEffect(() => {
    setReady(true);
  }, []);

  const rows = useMemo(
    () => (ready ? buildSopCareerRankings(role) : []),
    [ready, role],
  );

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  return (
    <div className="space-y-4">
      <RoleTabs role={role} onChange={setRole} />

      {rows.length === 0 ? (
        <p className="text-[13px] text-museum-ivory-soft">
          通算SOPを計算できる個人成績がまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[520px] border-collapse text-left text-[12px] md:text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
                <th className="px-2.5 py-2 font-medium">順位</th>
                <th className="px-2.5 py-2 font-medium">選手</th>
                <th className="px-2.5 py-2 font-medium">主な所属球団</th>
                <th className="px-2.5 py-2 font-medium">通算SOP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className="border-b border-white/8">
                  <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                    {row.rank}
                  </td>
                  <td className="px-2.5 py-2 font-medium text-museum-ivory">
                    {row.playerName}
                  </td>
                  <td className="px-2.5 py-2 text-museum-ivory-soft">
                    {row.teamShort}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums font-medium text-museum-ivory">
                    {row.total}pt
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
