"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type {
  LeagueSide,
  MonthlyMvpLeagueBoard,
  ResolvedAwardCard,
} from "@/data/awards";
import { subscribeImportDemoMode } from "@/data/import/demoMode";
import { listSavedMonthlyMvpRecords } from "@/data/import/store";
import type { SavedMonthlyMvpRecord } from "@/data/import/types";
import { MonthlyWinnerCell } from "@/components/awards/AwardCards";
import { LeagueTabs } from "@/components/awards/LeagueTabs";
import {
  countMonthlyMvpCareerTimes,
  formatAwardTimesLabel,
} from "@/lib/awardCareerCount";
import {
  allowsLayoutSampleFallback,
  normalizeSeasonWorld,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";

const MONTHS = [4, 5, 6, 7, 8, 9] as const;

type MonthlyMvpBoardProps = {
  year: string;
  /** ルート seasonKey（BLUE_2026 等）。指定時は world+year で厳密取得 */
  seasonKey?: string;
  central: MonthlyMvpLeagueBoard;
  pacific: MonthlyMvpLeagueBoard;
};

type MvpRole = "pitcher" | "batter";

function emptyMonthlyCard(
  month: number,
  role: MvpRole,
  league: LeagueSide,
): ResolvedAwardCard {
  return {
    playerId: "",
    playerName: "未登録",
    teamName: "—",
    historyLabel: "—",
    month,
    role,
    league,
    stats: null,
  };
}

function formatPitcherStats(
  era: number,
  wins: number,
  losses: number,
  hp?: number | null,
  saves?: number | null,
) {
  const eraText = Number.isFinite(era) ? era.toFixed(2) : "—";
  const w = Number.isFinite(wins) ? wins : 0;
  const l = Number.isFinite(losses) ? losses : 0;
  const stats: { label: string; value: string }[] = [
    { label: "防御率", value: eraText },
    { label: "", value: `${w}勝` },
    { label: "", value: `${l}敗` },
  ];
  if (hp != null && Number.isFinite(hp) && hp >= 1) {
    stats.push({ label: "", value: `${hp}HP` });
  }
  if (saves != null && Number.isFinite(saves) && saves >= 1) {
    stats.push({ label: "", value: `${saves}S` });
  }
  return stats;
}

function formatBatterStats(
  avg: number,
  hr: number,
  rbi: number,
  sb: number,
) {
  const avgText = Number.isFinite(avg)
    ? avg.toFixed(3).replace(/^0/, "")
    : "—";
  const h = Number.isFinite(hr) ? hr : 0;
  const r = Number.isFinite(rbi) ? rbi : 0;
  const s = Number.isFinite(sb) ? sb : 0;
  return [
    { label: "打率", value: avgText },
    { label: "", value: `${h}本` },
    { label: "", value: `${r}打点` },
    { label: "", value: `${s}盗` },
  ];
}

/**
 * useSyncExternalStore の getSnapshot は Object.is で比較されるため、
 * 毎回新しい配列を返すと無限再レンダーになる。キャッシュして参照を安定させる。
 */
const EMPTY_MONTHLY_MVP: SavedMonthlyMvpRecord[] = [];
let monthlyMvpSnapshotCache: SavedMonthlyMvpRecord[] | null = null;

function getMonthlyMvpSnapshot(): SavedMonthlyMvpRecord[] {
  if (monthlyMvpSnapshotCache) return monthlyMvpSnapshotCache;
  monthlyMvpSnapshotCache = listSavedMonthlyMvpRecords();
  return monthlyMvpSnapshotCache;
}

function getMonthlyMvpServerSnapshot(): SavedMonthlyMvpRecord[] {
  return EMPTY_MONTHLY_MVP;
}

function subscribeMonthlyMvpStore(onStoreChange: () => void): () => void {
  return subscribeImportDemoMode(() => {
    monthlyMvpSnapshotCache = null;
    onStoreChange();
  });
}

export function MonthlyMvpBoard({
  year,
  seasonKey,
  central,
  pacific,
}: MonthlyMvpBoardProps) {
  const [league, setLeague] = useState<LeagueSide>("central");

  const identity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );
  const allowSample = allowsLayoutSampleFallback(identity);
  const currentWorld = identity?.world ?? null;

  const allSaved = useSyncExternalStore(
    subscribeMonthlyMvpStore,
    getMonthlyMvpSnapshot,
    getMonthlyMvpServerSnapshot,
  );

  const saved = useMemo(() => {
    if (identity) {
      return allSaved.filter(
        (r) =>
          r.year === identity.year &&
          normalizeSeasonWorld(r.world) ===
            normalizeSeasonWorld(identity.world),
      );
    }
    const y = Number(year);
    return allSaved.filter((r) => r.year === y && r.world == null);
  }, [allSaved, identity, year]);

  const board = useMemo(() => {
    const base = league === "central" ? central : pacific;
    const y = Number(year);
    const months = allowSample ? base.months : [...MONTHS];
    return {
      months,
      pitchers: months.map((month, i) =>
        mergePitcher(
          allowSample
            ? base.pitchers[i]!
            : emptyMonthlyCard(month, "pitcher", league),
          saved,
          allSaved,
          y,
          currentWorld,
          month,
          league,
        ),
      ),
      batters: months.map((month, i) =>
        mergeBatter(
          allowSample
            ? base.batters[i]!
            : emptyMonthlyCard(month, "batter", league),
          saved,
          allSaved,
          y,
          currentWorld,
          month,
          league,
        ),
      ),
    };
  }, [
    central,
    pacific,
    saved,
    allSaved,
    year,
    league,
    allowSample,
    currentWorld,
  ]);

  const hasAnySaved = saved.some((r) => r.league === league);
  const allEmpty =
    !allowSample &&
    !hasAnySaved &&
    board.pitchers.every((c) => c.playerName === "未登録") &&
    board.batters.every((c) => c.playerName === "未登録");

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

      {allEmpty ? (
        <p className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-museum-ivory-soft">
          月間MVPはまだ登録されていません。
        </p>
      ) : null}

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
                  <MonthlyWinnerCell card={board.pitchers[i]!} />
                </td>
                <td className="px-2.5 py-2.5 align-middle md:px-3 md:py-3">
                  <MonthlyWinnerCell card={board.batters[i]!} />
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
  allSaved: SavedMonthlyMvpRecord[],
  year: number,
  world: SeasonWorld | null,
  month: number,
  league: LeagueSide,
): ResolvedAwardCard {
  const rec = findSaved(saved, year, month, league);
  if (!rec) return fallback;

  const times = countMonthlyMvpCareerTimes(
    allSaved,
    "pitcher",
    {
      playerId: rec.pitcher.playerId,
      playerName: rec.pitcher.playerName,
    },
    { year, world, league, month },
  );

  return {
    playerId: rec.pitcher.playerId ?? fallback.playerId,
    playerName: rec.pitcher.playerName,
    teamName: rec.pitcher.teamName,
    historyLabel: formatAwardTimesLabel(times),
    month,
    role: "pitcher",
    league,
    stats: formatPitcherStats(
      rec.pitcher.era,
      rec.pitcher.wins,
      rec.pitcher.losses,
      rec.pitcher.hp,
      rec.pitcher.saves,
    ),
  };
}

function mergeBatter(
  fallback: ResolvedAwardCard,
  saved: SavedMonthlyMvpRecord[],
  allSaved: SavedMonthlyMvpRecord[],
  year: number,
  world: SeasonWorld | null,
  month: number,
  league: LeagueSide,
): ResolvedAwardCard {
  const rec = findSaved(saved, year, month, league);
  if (!rec) return fallback;

  const times = countMonthlyMvpCareerTimes(
    allSaved,
    "batter",
    {
      playerId: rec.batter.playerId,
      playerName: rec.batter.playerName,
    },
    { year, world, league, month },
  );

  return {
    playerId: rec.batter.playerId ?? fallback.playerId,
    playerName: rec.batter.playerName,
    teamName: rec.batter.teamName,
    historyLabel: formatAwardTimesLabel(times),
    month,
    role: "batter",
    league,
    stats: formatBatterStats(
      rec.batter.avg,
      rec.batter.hr,
      rec.batter.rbi,
      rec.batter.sb,
    ),
  };
}
