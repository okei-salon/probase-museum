"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  LeagueSide,
  MonthlyMvpLeagueBoard,
  ResolvedAwardCard,
} from "@/data/awards";
import {
  listSavedMonthlyMvpForSeason,
  listSavedMonthlyMvpRecords,
} from "@/data/import/store";
import type { SavedMonthlyMvpRecord } from "@/data/import/types";
import { MonthlyWinnerCell } from "@/components/awards/AwardCards";
import { LeagueTabs } from "@/components/awards/LeagueTabs";
import { formatMonthlyAwardHistory } from "@/lib/awardHistory";
import { parseSeasonKey } from "@/data/seasons";

type MonthlyMvpBoardProps = {
  year: string;
  /** ルート seasonKey（BLUE_2026 等）。指定時は world+year で厳密取得 */
  seasonKey?: string;
  central: MonthlyMvpLeagueBoard;
  pacific: MonthlyMvpLeagueBoard;
};

export function MonthlyMvpBoard({
  year,
  seasonKey,
  central,
  pacific,
}: MonthlyMvpBoardProps) {
  const [league, setLeague] = useState<LeagueSide>("central");
  const [saved, setSaved] = useState<SavedMonthlyMvpRecord[]>([]);

  const identity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );

  useEffect(() => {
    if (identity) {
      setSaved(listSavedMonthlyMvpForSeason(identity));
      return;
    }
    // seasonKey 無し: レガシー互換（その年の world 無しのみ）
    const y = Number(year);
    setSaved(
      listSavedMonthlyMvpRecords().filter(
        (r) => r.year === y && r.world == null,
      ),
    );
  }, [year, league, identity]);

  const board = useMemo(() => {
    const base = league === "central" ? central : pacific;
    const y = Number(year);
    return {
      months: base.months,
      pitchers: base.months.map((month, i) =>
        mergePitcher(base.pitchers[i]!, saved, y, month, league),
      ),
      batters: base.months.map((month, i) =>
        mergeBatter(base.batters[i]!, saved, y, month, league),
      ),
    };
  }, [central, pacific, saved, year, league]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LeagueTabs value={league} onChange={setLeague} />
        <a
          href="/import"
          className="text-[12px] text-white/65 underline-offset-2 hover:text-[color:var(--museum-accent,#d4af37)] hover:underline"
        >
          画像から取り込む
        </a>
      </div>

      <div className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50">
        <table className="w-full border-collapse text-left text-[12px] leading-snug md:text-[13px]">
          <thead>
            <tr className="border-b border-white/10 text-[11px] tracking-[0.08em] text-white/60">
              <th className="w-14 px-2.5 py-2 font-medium md:w-16 md:px-3">
                月
              </th>
              <th className="px-2.5 py-2 font-medium md:px-3">投手部門</th>
              <th className="px-2.5 py-2 font-medium md:px-3">野手部門</th>
            </tr>
          </thead>
          <tbody>
            {board.months.map((month, i) => (
              <tr
                key={month}
                className="border-b border-white/8 last:border-b-0"
              >
                <td className="whitespace-nowrap px-2.5 py-2.5 font-medium text-white/85 md:px-3 md:py-3">
                  {month}月
                </td>
                <td className="px-2.5 py-2.5 align-middle md:px-3 md:py-3">
                  <MonthlyWinnerCell card={board.pitchers[i]} />
                </td>
                <td className="px-2.5 py-2.5 align-middle md:px-3 md:py-3">
                  <MonthlyWinnerCell card={board.batters[i]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function findSaved(
  saved: SavedMonthlyMvpRecord[],
  year: number,
  month: number,
  league: LeagueSide,
) {
  return (
    saved.find(
      (r) => r.year === year && r.month === month && r.league === league,
    ) ?? null
  );
}

function mergePitcher(
  fallback: ResolvedAwardCard,
  saved: SavedMonthlyMvpRecord[],
  year: number,
  month: number,
  league: LeagueSide,
): ResolvedAwardCard {
  const rec = findSaved(saved, year, month, league);
  if (!rec) return fallback;
  return {
    playerId: rec.pitcher.playerId ?? fallback.playerId,
    playerName: rec.pitcher.playerName,
    teamName: rec.pitcher.teamName,
    historyLabel: formatMonthlyAwardHistory(
      [{ year, month }],
      { year, month },
    ),
    month,
    role: "pitcher",
    league,
    stats: [
      { label: "防御率", value: rec.pitcher.era.toFixed(2) },
      { label: "勝", value: String(rec.pitcher.wins) },
      { label: "敗", value: String(rec.pitcher.losses) },
    ],
  };
}

function mergeBatter(
  fallback: ResolvedAwardCard,
  saved: SavedMonthlyMvpRecord[],
  year: number,
  month: number,
  league: LeagueSide,
): ResolvedAwardCard {
  const rec = findSaved(saved, year, month, league);
  if (!rec) return fallback;
  const avg = rec.batter.avg;
  return {
    playerId: rec.batter.playerId ?? fallback.playerId,
    playerName: rec.batter.playerName,
    teamName: rec.batter.teamName,
    historyLabel: formatMonthlyAwardHistory(
      [{ year, month }],
      { year, month },
    ),
    month,
    role: "batter",
    league,
    stats: [
      {
        label: "打率",
        value: avg.toFixed(3).replace(/^0/, ""),
      },
      { label: "本塁打", value: String(rec.batter.hr) },
      { label: "打点", value: String(rec.batter.rbi) },
      { label: "盗塁", value: String(rec.batter.sb) },
    ],
  };
}
