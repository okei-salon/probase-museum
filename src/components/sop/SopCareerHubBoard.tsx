"use client";

import { useMemo, useState } from "react";
import { MuseumBoardStatusMessage } from "@/components/museum/MuseumBoardStatusMessage";
import {
  buildSopCareerRankingsFromResults,
  collectAllSopSeasonResults,
  limitSopCareerRankingsForDisplay,
  type SopRoleFilter,
} from "@/data/sop";
import {
  useMuseumBoardStatus,
  useMuseumBoardTick,
} from "@/hooks/useMuseumBoardStatus";
import { RoleTabs } from "@/components/sop/RoleTabs";

export function SopCareerHubBoard() {
  const { tick, mounted } = useMuseumBoardTick();
  const [role, setRole] = useState<SopRoleFilter>("all");

  /** 全シーズンSOPは role 切替では再計算しない（fingerprint キャッシュ＋ここでも共有） */
  const allSeasonResults = useMemo(() => {
    void tick;
    if (!mounted) return [];
    return collectAllSopSeasonResults();
  }, [mounted, tick]);

  const rankedAll = useMemo(
    () => buildSopCareerRankingsFromResults(allSeasonResults, role),
    [allSeasonResults, role],
  );

  const rows = useMemo(
    () => limitSopCareerRankingsForDisplay(rankedAll),
    [rankedAll],
  );

  const { status } = useMuseumBoardStatus(rows.length > 0);

  return (
    <div className="space-y-4">
      <RoleTabs role={role} onChange={setRole} />

      {status !== "ready" ? (
        <MuseumBoardStatusMessage
          status={status}
          emptyMessage="通算SOPを計算できる個人成績がまだありません。"
        />
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
