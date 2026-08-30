"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import {
  allowsLayoutSampleFallback,
  parseSeasonKey,
} from "@/data/seasons";
import { getTeam } from "@/data/teams";
import type { TeamStatColumn } from "@/data/seasonViews";
import {
  buildTeamGamesContext,
  compareStatRowsForRanking,
  evaluateCsRateQualified,
  evaluateIpQualified,
  evaluatePaQualified,
  isRateStatKey,
  rankingDisplayRank,
  resolveTeamGamesForPlayer,
  teamIdFromShortName,
  type TeamGamesContext,
} from "@/lib/stats";

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

type EnrichedStatRow = PlayerStatRow & {
  qualified: boolean;
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

  const registered = useMemo(() => {
    if (seasonIdentity) return listSeasonLinesForSeason(seasonIdentity);
    return listSeasonLines();
  }, [seasonIdentity]);

  const allowSample = allowsLayoutSampleFallback(seasonIdentity);

  const teamGamesCtx: TeamGamesContext = useMemo(
    () =>
      buildTeamGamesContext({
        scope,
        identity: seasonIdentity,
        year: seasonIdentity?.year ?? year ?? null,
        world: seasonIdentity?.world ?? null,
      }),
    [scope, seasonIdentity, year],
  );

  const rows = useMemo(() => {
    const extras = registered
      .filter((l) => {
        if (l.role !== role || l.scope !== scope) return false;
        if (seasonIdentity) return true;
        if (year == null) return true;
        return l.year === year && l.world == null;
      })
      .map(seasonLineToStatRow);
    // 正式 WORLD: 登録行のみ（サンプル野手／投手へフォールバックしない）
    if (!allowSample) {
      return extras;
    }
    const base = getPlayerStats(scope, role);
    // 登録済みを先頭に（同一 id は登録側を優先）
    const byId = new Map<string, PlayerStatRow>();
    for (const r of extras) byId.set(r.id, r);
    for (const r of base) {
      if (!byId.has(r.id)) byId.set(r.id, r);
    }
    return [...byId.values()];
  }, [registered, role, scope, year, seasonIdentity, allowSample]);

  const enriched = useMemo((): EnrichedStatRow[] => {
    return rows.map((row) => ({
      ...row,
      qualified: resolveRowQualified(row, role, sortKey, teamGamesCtx),
    }));
  }, [rows, role, sortKey, teamGamesCtx]);

  const filtered = useMemo(() => {
    if (view === "team") {
      return enriched.filter((r) => r.team === team);
    }
    if (!enableLeagueFilter || league === "all") return enriched;
    return enriched.filter((r) => r.league === league);
  }, [enableLeagueFilter, enriched, league, team, view]);

  const rateStat = isRateStatKey(role, sortKey);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (view === "ranking") {
      // 率系（打率等）は規定到達 → 未到達、各グループ内は選択列
      list.sort((a, b) =>
        compareStatRowsForRanking(a, b, {
          sortKey,
          dir,
          rateStat,
        }),
      );
      return list;
    }
    // チーム別
    // 野手・率系: 規定打席到達を優先（初期の打率降順を含む）
    // 交流戦・投手: 従来どおり防御率＋規定投球回優先
    // 累計系などユーザーが明示ソートした非率系: 規定で強制しない
    const interleaguePitcherTeam =
      scope === "interleague" && role === "pitcher";
    const batterRateTeam = role === "batter" && rateStat;
    list.sort((a, b) =>
      compareStatRowsForRanking(a, b, {
        sortKey: interleaguePitcherTeam ? "era" : sortKey,
        dir: interleaguePitcherTeam ? "asc" : dir,
        rateStat: interleaguePitcherTeam || batterRateTeam,
      }),
    );
    return list;
  }, [dir, filtered, rateStat, role, scope, sortKey, view]);

  const scheduleNote = useMemo(() => {
    const g = teamGamesCtx.scheduleGames;
    if (g == null) return null;
    if (role === "batter") {
      return `規定打席: チーム試合数×3.1（代表 ${g}試合 → ${Math.floor(g * 3.1)}打席）`;
    }
    return `規定投球回: チーム試合数×1.0（代表 ${g}試合 → ${g}.0回）`;
  }, [role, teamGamesCtx.scheduleGames]);

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

      {!allowSample && sorted.length === 0 ? (
        <p className="rounded-md border border-white/10 bg-black/40 px-3 py-3 text-[13px] text-museum-ivory-soft">
          個人成績はまだ登録されていません。
        </p>
      ) : null}

      {sorted.length > 0 ? (
        <div
          className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-white/10"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table
            className={cn(
              "w-max min-w-full border-collapse text-left text-[11px] md:text-[12px]",
              role === "pitcher"
                ? "min-w-[820px] md:min-w-[1100px]"
                : showCatcherColumns
                  ? "min-w-[820px] md:min-w-[1100px]"
                  : "min-w-[720px] md:min-w-[980px]",
            )}
          >
            <thead>
              <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50">
                <th
                  className={cn(
                    rankHeadClass,
                    colDividerClass,
                    stickyRankHeadClass,
                  )}
                >
                  #
                </th>
                <th
                  className={cn(
                    playerHeadClass,
                    colDividerClass,
                    stickyPlayerHeadClass,
                    view === "ranking"
                      ? "max-md:shadow-none md:shadow-[2px_0_6px_rgba(0,0,0,0.35)]"
                      : "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                  )}
                >
                  選手
                </th>
                {view === "ranking" ? (
                  <th
                    className={cn(
                      teamHeadClass,
                      colDividerClass,
                      stickyTeamHeadClass,
                    )}
                  >
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
              {sorted.map((row, index) => {
                const displayRank =
                  view === "ranking"
                    ? rankingDisplayRank(index, row, sorted, rateStat)
                    : index + 1;
                const highlight = row.qualified && rateStat;
                const muted =
                  view === "ranking" && rateStat && !row.qualified;
                const stickyBg = highlight
                  ? STICKY_BG_HIGHLIGHT
                  : STICKY_BG_BODY;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-white/10",
                      muted
                        ? "text-museum-ivory-soft/80"
                        : "text-museum-ivory",
                      highlight &&
                        "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.06))]",
                    )}
                  >
                    <td
                      className={cn(
                        rankCellClass,
                        colDividerClass,
                        "sticky z-10",
                        stickyBg,
                      )}
                    >
                      {displayRank == null ? "―" : displayRank}
                    </td>
                    <td
                      className={cn(
                        playerCellClass,
                        colDividerClass,
                        "sticky z-10",
                        stickyBg,
                        view === "ranking"
                          ? "max-md:shadow-none md:shadow-[2px_0_6px_rgba(0,0,0,0.35)]"
                          : "shadow-[2px_0_6px_rgba(0,0,0,0.35)]",
                      )}
                    >
                      {row.playerId ? (
                        <Link
                          href={`/players/${row.playerId}/yearly`}
                          className={cn(
                            "block truncate whitespace-nowrap underline-offset-2 hover:underline",
                            highlight
                              ? "text-[color:var(--museum-accent,#d4af37)] hover:text-[color:var(--museum-accent,#d4af37)]"
                              : "text-museum-ivory hover:text-[color:var(--museum-accent,#d4af37)]",
                          )}
                          title={row.name}
                        >
                          {row.name}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "block truncate whitespace-nowrap",
                            highlight &&
                              "text-[color:var(--museum-accent,#d4af37)]",
                          )}
                          title={row.name}
                        >
                          {row.name}
                        </span>
                      )}
                    </td>
                    {view === "ranking" ? (
                      <td
                        className={cn(
                          teamCellClass,
                          colDividerClass,
                          "sticky z-10 max-md:shadow-[2px_0_6px_rgba(0,0,0,0.35)] md:static md:shadow-none",
                          stickyBg,
                          "md:bg-transparent",
                        )}
                      >
                        <span className="md:hidden" title={row.team}>
                          {teamMobileChar(row.team)}
                        </span>
                        <span className="hidden md:inline">{row.team}</span>
                      </td>
                    ) : null}
                    {visibleColumns.map((col, colIndex) => {
                      const last = colIndex === visibleColumns.length - 1;
                      const activeCol = sortKey === col.key;
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            statCellClass(col),
                            !last && colDividerClass,
                            highlight &&
                              activeCol &&
                              "font-medium text-[color:var(--museum-accent,#d4af37)]",
                          )}
                        >
                          {formatPlayerStatValue(
                            col.key,
                            row.values[col.key] ?? null,
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-[10px] text-museum-ivory-soft">
        {scope === "pennant" ? "シーズン全体" : "交流戦期間"}の個人成績。
        手入力・画像取込で登録した年度成績はランキングに反映されます。
        選手名をクリックすると詳細成績へ移動できます。
        {view === "ranking" && rateStat
          ? " 率系は規定到達者を正式順位とし、未到達者は一覧下部に残します。"
          : null}
        {scheduleNote ? ` ${scheduleNote}` : null}
      </p>
    </div>
  );
}

function resolveRowQualified(
  row: PlayerStatRow,
  role: PlayerRole,
  sortKey: string,
  ctx: TeamGamesContext,
): boolean {
  const teamId =
    row.teamId ?? teamIdFromShortName(row.team) ?? null;
  const teamGames = resolveTeamGamesForPlayer(ctx, teamId);

  if (role === "batter") {
    if (sortKey === "csRate") {
      return evaluateCsRateQualified(row.values.csAttempted);
    }
    const pa =
      row.paCount ??
      (row.values.pa != null && Number.isFinite(row.values.pa)
        ? row.values.pa
        : null);
    return evaluatePaQualified({
      pa,
      teamGames,
      flag: row.paQualifiedFlag,
    }).qualified;
  }

  const ipOuts =
    row.ipOuts ??
    (row.values.ip != null && Number.isFinite(row.values.ip)
      ? Math.round(row.values.ip * 3)
      : null);
  return evaluateIpQualified({
    ipOuts,
    teamGames,
    flag: row.ipQualifiedFlag,
  }).qualified;
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

/**
 * Sticky 列幅（モバイル / md以上）。
 * モバイル: # 36px + 選手 100px (+ 球団 38px) → left をそれに合わせる
 * PC: # 2.75rem + 選手 8.5rem（球団は sticky しない）
 */
const STICKY_BG_HEAD = "bg-[#0d1118]";
const STICKY_BG_BODY = "bg-[#0a0a0a]";
const STICKY_BG_HIGHLIGHT = "bg-[#14110c]";

const stickyRankHeadClass = cn("sticky left-0 z-30", STICKY_BG_HEAD);
const stickyPlayerHeadClass = cn(
  "sticky z-30 left-9 md:left-[2.75rem]",
  STICKY_BG_HEAD,
);
const stickyTeamHeadClass = cn(
  "sticky z-30 left-[8.5rem] shadow-[2px_0_6px_rgba(0,0,0,0.35)] md:static md:left-auto md:shadow-none",
  STICKY_BG_HEAD,
  "md:bg-transparent",
);

const rankHeadClass = cn(
  "whitespace-nowrap py-2 font-medium text-[color:var(--museum-accent,#d4af37)]",
  "w-9 min-w-9 max-w-9 px-1 text-center",
  "md:w-[2.75rem] md:min-w-[2.75rem] md:max-w-none md:px-2 md:text-left",
);
const rankCellClass = cn(
  "whitespace-nowrap py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]",
  "left-0 w-9 min-w-9 max-w-9 px-1 text-center",
  "md:w-[2.75rem] md:min-w-[2.75rem] md:max-w-none md:px-2 md:text-left",
);

const playerHeadClass = cn(
  "whitespace-nowrap py-2 font-medium text-[color:var(--museum-accent,#d4af37)]",
  "w-[6.25rem] min-w-[6.25rem] max-w-[6.25rem] px-1.5",
  "md:w-[8.5rem] md:min-w-[8.5rem] md:max-w-none md:px-3",
);
const playerCellClass = cn(
  "whitespace-nowrap py-2 font-medium [word-break:keep-all]",
  "left-9 w-[6.25rem] min-w-[6.25rem] max-w-[6.25rem] px-1.5",
  "md:left-[2.75rem] md:w-[8.5rem] md:min-w-[8.5rem] md:max-w-none md:px-3",
);

const teamHeadClass = cn(
  "whitespace-nowrap py-2 font-medium text-[color:var(--museum-accent,#d4af37)]",
  "w-[2.375rem] min-w-[2.375rem] max-w-[2.375rem] px-0.5 text-center",
  "md:w-auto md:min-w-[4.5rem] md:max-w-none md:px-2.5 md:text-left",
);
const teamCellClass = cn(
  "whitespace-nowrap py-2 text-museum-ivory-soft",
  "left-[8.5rem] w-[2.375rem] min-w-[2.375rem] max-w-[2.375rem] px-0.5 text-center",
  "md:left-auto md:w-auto md:min-w-[4.5rem] md:max-w-none md:px-2.5 md:text-left",
);

/** スマホ表示用・球団1文字 */
const TEAM_MOBILE_CHAR: Record<string, string> = {
  阪神: "阪",
  巨人: "巨",
  DeNA: "横",
  広島: "広",
  ヤクルト: "ヤ",
  中日: "中",
  ソフトバンク: "ソ",
  日本ハム: "日",
  楽天: "楽",
  ロッテ: "ロ",
  オリックス: "オ",
  西武: "西",
};

function teamMobileChar(teamShort: string): string {
  return TEAM_MOBILE_CHAR[teamShort] ?? teamShort.slice(0, 1);
}

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
    compact
      ? "min-w-[2rem] px-1 md:min-w-[2.5rem] md:px-1.5"
      : "min-w-[2.5rem] px-1 md:min-w-[3.25rem] md:px-2",
  );
}

function statCellClass(col: TeamStatColumn) {
  const compact = COMPACT_STAT_KEYS.has(col.key) || col.label.length <= 2;
  return cn(
    "whitespace-nowrap tabular-nums",
    compact
      ? "min-w-[2rem] px-1 py-2 md:min-w-[2.5rem] md:px-1.5"
      : "min-w-[2.5rem] px-1 py-2 md:min-w-[3.25rem] md:px-2",
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
      teamId: line.teamId,
      league,
      paCount: pa,
      paQualifiedFlag: c.paQualified ?? null,
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
    teamId: line.teamId,
    league,
    ipOuts: c.ipOuts,
    ipQualifiedFlag: c.ipQualified ?? null,
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
