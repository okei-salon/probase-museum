"use client";

import { useMemo } from "react";
import { MuseumBoardStatusMessage } from "@/components/museum/MuseumBoardStatusMessage";
import { buildPlayerSopCareer } from "@/data/playerDetail";
import {
  useMuseumBoardStatus,
  useMuseumBoardTick,
} from "@/hooks/useMuseumBoardStatus";
import { cn } from "@/lib/cn";

type PlayerSopBoardProps = {
  playerId: string;
};

export function PlayerSopBoard({ playerId }: PlayerSopBoardProps) {
  const { tick } = useMuseumBoardTick();

  const career = useMemo(() => {
    void tick;
    return buildPlayerSopCareer(playerId);
  }, [tick, playerId]);

  const hasRows = Boolean(career && career.years.length > 0);
  const { status } = useMuseumBoardStatus(hasRows);

  if (status !== "ready") {
    return (
      <MuseumBoardStatusMessage
        status={status}
        emptyMessage="この選手のSOPを計算できる年度成績はまだありません。"
      />
    );
  }

  if (!career) {
    return (
      <MuseumBoardStatusMessage
        status="empty"
        emptyMessage="この選手のSOPを計算できる年度成績はまだありません。"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--museum-accent,#d4af37)]/40 bg-black/50 px-4 py-3">
          <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
            通算SOP（最終）
          </p>
          <p className="mt-1 font-display text-[26px] text-[color:var(--museum-accent,#d4af37)]">
            {career.careerTotal != null ? `${career.careerTotal}pt` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-black/50 px-4 py-3">
          <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
            交流戦通算SOP
          </p>
          <p className="mt-1 font-display text-[26px] text-museum-ivory">
            {career.interleagueCareerTotal != null
              ? `${career.interleagueCareerTotal}pt`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-black/50 px-4 py-3">
          <p className="text-[10px] tracking-[0.14em] text-museum-ivory-soft">
            歴代通算
          </p>
          <p className="mt-1 font-display text-[26px] text-museum-ivory">
            {career.careerRank != null ? `${career.careerRank}位` : "—"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {career.years.map((row) => (
          <div
            key={`${row.world ?? ""}-${row.year}-${row.role}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5",
            )}
          >
            <div>
              <p className="text-[14px] text-museum-ivory">
                {row.seasonLabel}
                <span className="ml-2 text-[11px] text-museum-ivory-soft">
                  {row.role === "batter" ? "野手" : "投手"}
                </span>
              </p>
              {row.pennantPoints != null || row.interleaguePoints != null ? (
                <p className="mt-0.5 text-[11px] text-museum-ivory-soft">
                  通常 {row.pennantPoints ?? 0}pt
                  {row.interleaguePoints != null && row.interleaguePoints > 0
                    ? ` ＋ 交流戦 ${row.interleaguePoints}pt`
                    : ""}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-display text-[18px] text-[color:var(--museum-accent,#d4af37)]">
                {row.points}pt
              </p>
              <p className="text-[11px] text-museum-ivory-soft">
                年度{row.yearRank}位
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
