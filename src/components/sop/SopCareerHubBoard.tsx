"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeImportDemoMode } from "@/data/import/demoMode";
import { getSeasonLinesCacheState } from "@/data/playerSeasonLines";
import {
  buildSopCareerRankings,
  type SopRoleFilter,
} from "@/data/sop";
import { resolveSopBoardDataStatus } from "@/data/sop/sopBoardDataStatus";
import { RoleTabs } from "@/components/sop/RoleTabs";

export function SopCareerHubBoard() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [role, setRole] = useState<SopRoleFilter>("all");

  useEffect(() => {
    setMounted(true);
    return subscribeImportDemoMode(() => setTick((t) => t + 1));
  }, []);

  const rows = useMemo(() => {
    void tick;
    if (!mounted) return [];
    return buildSopCareerRankings(role);
  }, [mounted, role, tick]);

  const dataStatus = useMemo(() => {
    void tick;
    const cache = getSeasonLinesCacheState();
    return resolveSopBoardDataStatus({
      mounted,
      cloudHydrated: cache.cloudHydrated,
      hasRows: rows.length > 0,
    });
  }, [mounted, rows.length, tick]);

  return (
    <div className="space-y-4">
      <RoleTabs role={role} onChange={setRole} />

      {dataStatus === "loading" ? (
        <p className="text-[13px] text-museum-ivory-soft">
          成績データを読み込み中…
        </p>
      ) : dataStatus === "empty" ? (
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
