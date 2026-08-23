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
import { formatMonthlyMvpCareerLabel } from "@/lib/awardHistory";
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

type MvpOccurrence = {
  year: number;
  world: SeasonWorld | null;
  league: LeagueSide;
  month: number;
};

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

function normalizePlayerName(name: string): string {
  return name.replace(/\s+/g, "").trim();
}

function isRealPlayerName(name: string): boolean {
  const n = normalizePlayerName(name);
  return Boolean(n) && n !== "未登録" && !n.includes("登録待ち");
}

function occurrenceKey(o: MvpOccurrence, role: MvpRole): string {
  return `${o.year}|${o.world ?? ""}|${o.league}|${o.month}|${role}`;
}

function occurrenceSortKey(o: MvpOccurrence): number {
  const w = o.world === "BLUE" ? 0 : o.world === "RED" ? 1 : 2;
  const lg = o.league === "central" ? 0 : 1;
  return o.year * 10000 + o.month * 100 + w * 10 + lg;
}

/**
 * 選手名（空白無視）を基準に、部門別の通算何回目かを返す。
 * セ/パ・BLUE/RED・年度をまたいで通算。YEAR×WORLD×LEAGUE×MONTH×部門は重複排除。
 * その受賞（current）を含めた回数。
 */
export function countMonthlyMvpCareerTimes(
  all: SavedMonthlyMvpRecord[],
  role: MvpRole,
  player: { playerId: string | null; playerName: string },
  current: MvpOccurrence,
): number {
  if (!isRealPlayerName(player.playerName)) return 1;

  const targetName = normalizePlayerName(player.playerName);
  const targetId = player.playerId;
  const seen = new Set<string>();
  const list: MvpOccurrence[] = [];

  for (const r of all) {
    const side = role === "pitcher" ? r.pitcher : r.batter;
    if (!isRealPlayerName(side.playerName)) continue;

    const sameId =
      Boolean(targetId) &&
      Boolean(side.playerId) &&
      targetId === side.playerId;
    const sameName = normalizePlayerName(side.playerName) === targetName;
    if (!sameId && !sameName) continue;

    const occ: MvpOccurrence = {
      year: r.year,
      world: normalizeSeasonWorld(r.world),
      league: r.league,
      month: r.month,
    };
    const key = occurrenceKey(occ, role);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(occ);
  }

  const curKey = occurrenceKey(current, role);
  if (!seen.has(curKey)) {
    list.push(current);
  }

  list.sort((a, b) => occurrenceSortKey(a) - occurrenceSortKey(b));

  const idx = list.findIndex(
    (o) =>
      o.year === current.year &&
      o.month === current.month &&
      o.league === current.league &&
      normalizeSeasonWorld(o.world) === normalizeSeasonWorld(current.world),
  );
  return idx >= 0 ? idx + 1 : list.length;
}

function formatPitcherStats(era: number, wins: number, losses: number) {
  return [
    { label: "防御率", value: era.toFixed(2) },
    { label: "", value: `${wins}勝${losses}敗` },
  ];
}

function formatBatterStats(
  avg: number,
  hr: number,
  rbi: number,
  sb: number,
) {
  return [
    { label: "打率", value: avg.toFixed(3).replace(/^0/, "") },
    { label: "", value: `${hr}本` },
    { label: "", value: `${rbi}打点` },
    { label: "", value: `${sb}盗` },
  ];
}

function getMonthlyMvpSnapshot(): SavedMonthlyMvpRecord[] {
  return listSavedMonthlyMvpRecords();
}

function getMonthlyMvpServerSnapshot(): SavedMonthlyMvpRecord[] {
  return [];
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
    subscribeImportDemoMode,
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
    historyLabel: formatMonthlyMvpCareerLabel(times),
    month,
    role: "pitcher",
    league,
    stats: formatPitcherStats(
      rec.pitcher.era,
      rec.pitcher.wins,
      rec.pitcher.losses,
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
    historyLabel: formatMonthlyMvpCareerLabel(times),
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
