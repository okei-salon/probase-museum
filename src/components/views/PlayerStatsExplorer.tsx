"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  BATTER_CATCHER_STAT_KEYS,
  batterColumns,
  formatPlayerStatValue,
  getPlayerStats,
  isBatterCatcherStatKey,
  pitcherColumns,
  playerStatTeams,
  type PlayerRole,
  type PlayerStatRow,
  type StatsScope,
} from "@/data/playerStats";
import {
  listSeasonLines,
  listSeasonLinesForSeason,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import { parseSeasonKey } from "@/data/seasons";
import { getTeam } from "@/data/teams";
import type { TeamStatColumn } from "@/data/seasonViews";

type LeagueFilter = "central" | "pacific" | "all";
type ViewMode = "ranking" | "team";

type PlayerStatsExplorerProps = {
  scope: StatsScope;
  /** 対象シーズン（登録済み年度成績の絞り込み） */
  year?: number;
  /**
   * ルート seasonKey（例: BLUE_2026）。指定時は world+year で厳密フィルタ。
   * 未指定で year のみの場合はレガシー互換（その年の world 無し行）。
   */
  seasonKey?: string;
  /** ペナント／SEASON個人成績はリーグ切替あり、交流戦は基本12球団 */
  enableLeagueFilter?: boolean;
};

export function PlayerStatsExplorer({
  scope,
  year,
  seasonKey,
  enableLeagueFilter = true,
}: PlayerStatsExplorerProps) {
  const [role, setRole] = useState<PlayerRole>("batter");
  const [view, setView] = useState<ViewMode>("ranking");
  const [league, setLeague] = useState<LeagueFilter>(
    enableLeagueFilter ? "central" : "all",
  );
  const [team, setTeam] = useState<string>(playerStatTeams[0].id);
  const columns = role === "batter" ? batterColumns : pitcherColumns;
  const defaultSortKey = role === "batter" ? "avg" : "era";
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [registered, setRegistered] = useState<PlayerSeasonLine[]>([]);

  /** 盗塁阻止率を選択中のみ捕手系4項目を表示（保存データは変更しない） */
  const showCatcherColumns =
    role === "batter" && isBatterCatcherStatKey(sortKey);

  const visibleColumns = useMemo(() => {
    if (role !== "batter" || showCatcherColumns) return columns;
    return columns.filter(
      (c) => !(BATTER_CATCHER_STAT_KEYS as readonly string[]).includes(c.key),
    );
  }, [columns, role, showCatcherColumns]);

  const seasonIdentity = useMemo(
    () => (seasonKey ? parseSeasonKey(seasonKey) : null),
    [seasonKey],
  );

  useEffect(() => {
    if (seasonIdentity) {
      setRegistered(listSeasonLinesForSeason(seasonIdentity));
      return;
    }
    setRegistered(listSeasonLines());
  }, [scope, role, year, seasonIdentity]);

  const rows = useMemo(() => {
    const base = getPlayerStats(scope, role);
    const extras = registered
      .filter((l) => {
        if (l.role !== role || l.scope !== scope) return false;
        if (seasonIdentity) return true;
        if (year == null) return true;
        return l.year === year && l.world == null;
      })
      .map(seasonLineToStatRow);
    // 登録済みを先頭に（同一 id は登録側を優先）
    const byId = new Map<string, PlayerStatRow>();
    for (const r of extras) byId.set(r.id, r);
    for (const r of base) {
      if (!byId.has(r.id)) byId.set(r.id, r);
    }
    return [...byId.values()];
  }, [registered, role, scope, year, seasonIdentity]);

  const filtered = useMemo(() => {
    if (view === "team") {
      return rows.filter((r) => r.team === team);
    }
    if (!enableLeagueFilter || league === "all") return rows;
    return rows.filter((r) => r.league === league);
  }, [enableLeagueFilter, league, rows, team, view]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a.values[sortKey];
      const bv = b.values[sortKey];
      const aNull = av == null || !Number.isFinite(av);
      const bNull = bv == null || !Number.isFinite(bv);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [dir, filtered, sortKey]);

  function switchRole(next: PlayerRole) {
    setRole(next);
    const key = next === "batter" ? "avg" : "era";
    const col = (next === "batter" ? batterColumns : pitcherColumns).find(
      (c) => c.key === key,
    );
    setSortKey(key);
    setDir(col?.lowerIsBetter ? "asc" : "desc");
  }

  function handleSort(col: TeamStatColumn) {
    if (sortKey === col.key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(col.key);
    setDir(col.lowerIsBetter ? "asc" : "desc");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["batter", "野手"],
            ["pitcher", "投手"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => switchRole(id)}
            className={toggleClass(role === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "ranking" && enableLeagueFilter ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["central", "セ・リーグ"],
              ["pacific", "パ・リーグ"],
              ["all", "12球団"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLeague(id)}
              className={toggleClass(league === id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ranking", "ランキング"],
            ["team", "チーム別"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={toggleClass(view === id)}
          >
            {label}
          </button>
        ))}
        {role === "batter" ? (
          <button
            type="button"
            onClick={() => {
              const col = batterColumns.find((c) => c.key === "csRate");
              setSortKey("csRate");
              setDir(col?.lowerIsBetter ? "asc" : "desc");
            }}
            className={toggleClass(showCatcherColumns)}
            title="捕手系4項目（被盗塁企図数・許盗塁数・盗塁刺・盗塁阻止率）を表示して並べ替え"
          >
            盗塁阻止率
          </button>
        ) : null}
      </div>

      {view === "team" ? (
        <div className="flex flex-wrap gap-1.5">
          {playerStatTeams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTeam(t.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                team === t.id
                  ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
                  : "border-white/15 text-museum-ivory-soft hover:border-white/30",
              )}
            >
              {t.id}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table
          className={cn(
            "w-max min-w-full border-collapse text-left text-[11px] md:text-[12px]",
            role === "pitcher"
              ? "min-w-[1100px]"
              : showCatcherColumns
                ? "min-w-[1100px]"
                : "min-w-[980px]",
          )}
        >
          <thead>
            <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50">
              <th className={cn(rankHeadClass, colDividerClass)}>
                #
              </th>
              <th className={cn(playerHeadClass, colDividerClass)}>
                選手
              </th>
              {view === "ranking" ? (
                <th className={cn(teamHeadClass, colDividerClass)}>
                  球団
                </th>
              ) : null}
              {visibleColumns.map((col, colIndex) => {
                const active = sortKey === col.key;
                const last = colIndex === visibleColumns.length - 1;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      statHeadClass(col),
                      !last && colDividerClass,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={cn(
                        "inline-flex items-center gap-0.5 whitespace-nowrap font-medium",
                        active
                          ? "text-[color:var(--museum-accent,#d4af37)]"
                          : "text-museum-ivory-soft hover:text-museum-ivory",
                      )}
                    >
                      {col.label}
                      <span className="text-[9px] opacity-80">
                        {active ? (dir === "asc" ? "▲" : "▼") : "◇"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-white/10 text-museum-ivory"
              >
                <td className={cn(rankCellClass, colDividerClass)}>
                  {index + 1}
                </td>
                <td className={cn(playerCellClass, colDividerClass)}>
                  {row.playerId ? (
                    <Link
                      href={`/players/${row.playerId}/yearly`}
                      className="block whitespace-nowrap text-museum-ivory underline-offset-2 hover:text-[color:var(--museum-accent,#d4af37)] hover:underline"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <span className="whitespace-nowrap">{row.name}</span>
                  )}
                </td>
                {view === "ranking" ? (
                  <td className={cn(teamCellClass, colDividerClass)}>
                    {row.team}
                  </td>
                ) : null}
                {visibleColumns.map((col, colIndex) => {
                  const last = colIndex === visibleColumns.length - 1;
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        statCellClass(col),
                        !last && colDividerClass,
                      )}
                    >
                      {formatPlayerStatValue(col.key, row.values[col.key] ?? null)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-museum-ivory-soft">
        {scope === "pennant" ? "シーズン全体" : "交流戦期間"}の個人成績。
        手入力・画像取込で登録した年度成績はランキングに反映されます。
        選手名をクリックすると詳細成績へ移動できます。
      </p>
    </div>
  );
}

function toggleClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[11px] tracking-[0.06em] transition-colors",
    active
      ? "border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] text-[color:var(--museum-accent,#d4af37)]"
      : "border-white/15 bg-black/40 text-museum-ivory-soft hover:border-white/30",
  );
}

/** 横罫線（white/10）より弱い縦区切り */
const colDividerClass = "border-r border-[color:rgba(212,175,55,0.12)]";

const rankHeadClass =
  "whitespace-nowrap px-2 py-2 font-medium text-[color:var(--museum-accent,#d4af37)]";
const rankCellClass =
  "whitespace-nowrap px-2 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]";

const playerHeadClass =
  "min-w-[8.5rem] whitespace-nowrap px-3 py-2 font-medium text-[color:var(--museum-accent,#d4af37)]";
const playerCellClass =
  "min-w-[8.5rem] whitespace-nowrap px-3 py-2 font-medium [word-break:keep-all]";

const teamHeadClass =
  "min-w-[4.5rem] whitespace-nowrap px-2.5 py-2 font-medium text-[color:var(--museum-accent,#d4af37)]";
const teamCellClass =
  "min-w-[4.5rem] whitespace-nowrap px-2.5 py-2 text-museum-ivory-soft";

const COMPACT_STAT_KEYS = new Set([
  "w",
  "l",
  "sv",
  "hp",
  "hld",
  "g",
  "gs",
  "sho",
  "cg",
  "qs",
  "hqs",
  "h",
  "hr",
  "r",
  "er",
  "bb",
  "hbp",
  "so",
  "ab",
  "pa",
  "sb",
  "cs",
  "sac",
  "sf",
  "doubles",
  "triples",
  "rbi",
  "tb",
  "multiHit",
]);

function statHeadClass(col: TeamStatColumn) {
  const compact = COMPACT_STAT_KEYS.has(col.key) || col.label.length <= 2;
  return cn(
    "whitespace-nowrap py-2 font-medium",
    compact ? "min-w-[2.5rem] px-1.5" : "min-w-[3.25rem] px-2",
  );
}

function statCellClass(col: TeamStatColumn) {
  const compact = COMPACT_STAT_KEYS.has(col.key) || col.label.length <= 2;
  return cn(
    "whitespace-nowrap tabular-nums",
    compact ? "min-w-[2.5rem] px-1.5 py-2" : "min-w-[3.25rem] px-2 py-2",
  );
}

function seasonLineToStatRow(line: PlayerSeasonLine): PlayerStatRow {
  const team = getTeam(line.teamId);
  const teamShort = team?.short ?? line.teamName;
  const league = team?.league === "パ" ? "pacific" : "central";

  if (line.role === "batter") {
    const c = line.counting;
    const d = line.derived;
    const pa =
      c.pa ??
      c.ab + c.bb + (c.hbp ?? 0) + (c.sf ?? 0) + (c.sac ?? 0);
    return {
      id: line.id,
      playerId: line.playerId,
      name: line.playerName,
      team: teamShort,
      league,
      values: {
        avg: d.avg,
        g: c.g ?? null,
        pa,
        ab: c.ab,
        h: c.h,
        doubles: c.doubles,
        triples: c.triples,
        hr: c.hr,
        tb: d.tb ?? c.tb ?? null,
        slg: d.slg,
        rbi: c.rbi,
        rispAvg: d.rispAvg,
        rispAb: c.rispAb ?? null,
        rispH: c.rispH ?? null,
        r: c.r ?? null,
        bb: c.bb,
        hbp: c.hbp ?? null,
        sac: c.sac ?? null,
        sf: c.sf ?? null,
        sb: c.sb ?? null,
        cs: c.cs ?? null,
        obp: d.obp,
        hitStreak: c.hitStreak ?? null,
        onBaseStreak: c.onBaseStreak ?? null,
        multiHit: c.multiHit ?? null,
        ops: d.ops,
        csAttempted: c.csAttempted ?? null,
        csAllowed: c.csAllowed ?? null,
        csCaught: c.csCaught ?? null,
        csRate: d.csRate,
      },
    };
  }

  const c = line.counting;
  const d = line.derived;
  const ip = c.ipOuts / 3;
  return {
    id: line.id,
    playerId: line.playerId,
    name: line.playerName,
    team: teamShort,
    league,
    values: {
      era: d.era ?? 0,
      ip,
      winPct: d.winPct ?? 0,
      w: c.w,
      l: c.l,
      sv: c.sv ?? 0,
      hp: c.hp ?? 0,
      hld: c.hld ?? 0,
      g: c.g,
      gs: c.gs ?? 0,
      sho: c.sho ?? 0,
      cg: c.cg ?? 0,
      qs: c.qs ?? 0,
      qsRate: d.qsRate ?? 0,
      hqs: c.hqs ?? 0,
      hqsRate: d.hqsRate ?? 0,
      so: c.so,
      soRate: d.soRate ?? 0,
      bb: c.bb ?? 0,
      bbRate: d.bbRate ?? 0,
      hbp: c.hbp ?? 0,
      h: c.h ?? 0,
      hr: c.hr ?? 0,
      kbb: d.kbb ?? 0,
      whip: d.whip ?? 0,
      r: c.r ?? 0,
      er: c.er,
    },
  };
}
