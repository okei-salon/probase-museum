"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import {
  groupPlayersByPosition,
  listPlayersOnCurrentTeam,
} from "@/data/players/directory";
import type { TeamId } from "@/data/teams";
import { cn } from "@/lib/cn";

type PlayerTeamRosterBoardProps = {
  teamId: TeamId;
  teamShort: string;
};

/** 球団の現時点所属選手一覧（サンプルなし） */
export function PlayerTeamRosterBoard({
  teamId,
  teamShort,
}: PlayerTeamRosterBoardProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
    setReady(true);
  }, []);

  const groups = useMemo(() => {
    if (!ready) return [];
    return groupPlayersByPosition(listPlayersOnCurrentTeam(teamId));
  }, [ready, teamId]);

  const total = groups.reduce((s, g) => s + g.players.length, 0);

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  if (total === 0) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        {teamShort}
        に現在所属として登録されている選手はいません。選手名検索から探すか、成績取込で所属を登録してください。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-museum-ivory-soft">
        現在の所属が{teamShort}の選手 {total}名（最新年度の所属情報）
      </p>
      {groups.map((g) => (
        <section key={g.group} className="space-y-2">
          <h2 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
            {g.label}
            <span className="ml-2 text-museum-ivory-soft">{g.players.length}</span>
          </h2>
          <ul className="space-y-2">
            {g.players.map((p) => (
              <li key={p.playerId}>
                <Link
                  href={`/players/${p.playerId}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-3 py-3",
                    "transition-colors hover:border-white/25 hover:bg-black/70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-museum-ivory">
                      {p.fullName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-museum-ivory-soft">
                      {p.teamShort ?? teamShort}
                      {" / "}
                      {p.role === "pitcher" ? "投手" : "野手"}
                      {p.position ? `（${p.position}）` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
