/**
 * 交流戦SOP（10部門・順位5〜1点）
 * 通常タイトル／通常SOPとは独立計算し、最終SOPへ加算する。
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLines,
  listSeasonLinesForSeason,
  type BatterSeasonLine,
  type PitcherSeasonLine,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  type SeasonIdentity,
} from "@/data/seasons";
import { getTeam } from "@/data/teams";
import {
  INTERLEAGUE_SOP_RANK_POINTS,
  INTERLEAGUE_SOP_TITLES,
  type InterleagueSopTitleDef,
} from "@/lib/sop/rules";
import { rankSopResults } from "@/lib/sop/computeSeasonSop";
import {
  buildTeamGamesContext,
  evaluateIpQualified,
  evaluatePaQualified,
  resolveTeamGamesForPlayer,
  type TeamGamesContext,
} from "@/lib/stats";
import type {
  SopLineItem,
  SopRankEntry,
  SopRole,
  SopSeasonResult,
} from "@/lib/sop/types";

function resolveIdentity(
  yearOrIdentity: number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "number") {
    return identityFromWorldYear(yearOrIdentity, null);
  }
  return yearOrIdentity;
}

function fullName(playerId: string, fallback: string) {
  return getPlayerMaster(playerId)?.fullName ?? fallback;
}

function teamShortOf(line: PlayerSeasonLine) {
  return getTeam(line.teamId)?.short ?? line.teamName;
}

function batterValue(
  line: BatterSeasonLine,
  def: InterleagueSopTitleDef,
): number | null {
  const c = line.counting;
  const d = line.derived;
  switch (def.id) {
    case "avg":
      return d.avg;
    case "h":
      return c.h;
    case "hr":
      return c.hr;
    case "rbi":
      return c.rbi;
    case "sb":
      return c.sb ?? null;
    default:
      return null;
  }
}

function pitcherValue(
  line: PitcherSeasonLine,
  def: InterleagueSopTitleDef,
): number | null {
  const c = line.counting;
  const d = line.derived;
  switch (def.id) {
    case "era":
      return d.era;
    case "w":
      return c.w;
    case "hp":
      return c.hld ?? c.hp ?? null;
    case "sv":
      return c.sv ?? null;
    case "so":
      return c.so;
    default:
      return null;
  }
}

function eligible(
  line: PlayerSeasonLine,
  def: InterleagueSopTitleDef,
  teamGamesCtx: TeamGamesContext,
): boolean {
  if (!def.requireQualified) return true;
  if (line.role === "batter") {
    const c = line.counting;
    const pa =
      c.pa ??
      c.ab + c.bb + (c.hbp ?? 0) + (c.sf ?? 0) + (c.sac ?? 0);
    return evaluatePaQualified({
      pa,
      teamGames: resolveTeamGamesForPlayer(teamGamesCtx, line.teamId),
      flag: c.paQualified,
    }).qualified;
  }
  return evaluateIpQualified({
    ipOuts: line.counting.ipOuts,
    teamGames: resolveTeamGamesForPlayer(teamGamesCtx, line.teamId),
    flag: line.counting.ipQualified,
  }).qualified;
}

export type InterleagueTitleBoardEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  teamShort: string;
  value: number;
  points: number;
};

export type InterleagueTitleBoard = {
  def: InterleagueSopTitleDef;
  entries: InterleagueTitleBoardEntry[];
};

/** 1部門の上位5（同点同順位） */
export function buildInterleagueTitleBoard(
  identity: SeasonIdentity,
  def: InterleagueSopTitleDef,
): InterleagueTitleBoard {
  const lines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "interleague" && l.role === def.role,
  );
  const teamGamesCtx = buildTeamGamesContext({
    scope: "interleague",
    identity,
  });
  const pool: {
    playerId: string;
    playerName: string;
    teamShort: string;
    value: number;
  }[] = [];

  for (const line of lines) {
    if (!eligible(line, def, teamGamesCtx)) continue;
    const value =
      line.role === "batter"
        ? batterValue(line, def)
        : pitcherValue(line, def);
    if (value == null || !Number.isFinite(value)) continue;
    pool.push({
      playerId: line.playerId,
      playerName: fullName(line.playerId, line.playerName),
      teamShort: teamShortOf(line),
      value,
    });
  }

  const sorted = [...pool].sort((a, b) => {
    if (def.lowerIsBetter) return a.value - b.value;
    return b.value - a.value;
  });

  const entries: InterleagueTitleBoardEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.value;
    let j = i;
    while (j < sorted.length && sorted[j]!.value === score) j += 1;
    const rank = i + 1;
    if (rank > 5) break;
    const points =
      INTERLEAGUE_SOP_RANK_POINTS[rank as 1 | 2 | 3 | 4 | 5] ?? 0;
    for (let k = i; k < j; k += 1) {
      const row = sorted[k]!;
      entries.push({
        rank,
        playerId: row.playerId,
        playerName: row.playerName,
        teamShort: row.teamShort,
        value: row.value,
        points,
      });
    }
    i = j;
  }

  return { def, entries };
}

export function buildAllInterleagueTitleBoards(
  identity: SeasonIdentity,
): InterleagueTitleBoard[] {
  return INTERLEAGUE_SOP_TITLES.map((def) =>
    buildInterleagueTitleBoard(identity, def),
  );
}

/** 選手ごとの交流戦SOPライン項目（10部門のみ） */
export function buildInterleagueSopItemsForSeason(
  identity: SeasonIdentity,
): Map<string, SopLineItem[]> {
  const byPlayer = new Map<string, SopLineItem[]>();
  for (const board of buildAllInterleagueTitleBoards(identity)) {
    for (const entry of board.entries) {
      if (entry.points <= 0) continue;
      const list = byPlayer.get(entry.playerId) ?? [];
      list.push({
        id: `interleague:${board.def.id}:${entry.rank}`,
        category: "interleague_titles",
        label: `${board.def.label}${entry.rank}位`,
        points: entry.points,
        detail: formatSeasonLineLabel(identity),
      });
      byPlayer.set(entry.playerId, list);
    }
  }
  return byPlayer;
}

function emptyInterleagueResult(
  line: PlayerSeasonLine,
  identity: SeasonIdentity,
  items: SopLineItem[],
): SopSeasonResult {
  const total = items.reduce((s, it) => s + it.points, 0);
  return {
    playerId: line.playerId,
    playerName: fullName(line.playerId, line.playerName),
    year: identity.year,
    world: identity.world,
    role: line.role,
    teamId: line.teamId,
    teamShort: teamShortOf(line),
    league: getTeam(line.teamId)?.league === "パ" ? "pacific" : "central",
    total,
    items,
    meta: {
      pennantTotal: 0,
      interleagueTotal: total,
      finalTotal: total,
    },
  };
}

/**
 * 交流戦SOPのみのランキング（野手／投手別行）。
 * 最終SOPへの加算用にも利用。
 */
export function buildInterleagueSopRankings(
  yearOrIdentity: number | SeasonIdentity,
): {
  rankings: SopRankEntry[];
  results: SopSeasonResult[];
  notes: string[];
} {
  const identity = resolveIdentity(yearOrIdentity);
  const notes: string[] = [
    "交流戦SOPは打率・安打・本塁打・打点・盗塁／防御率・勝利・HP・セーブ・奪三振の10部門のみです。",
    "各部門1位5pt〜5位1pt。6位以下は0pt。通常タイトル点とは別です。",
  ];
  const lines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "interleague",
  );
  if (lines.length === 0) {
    notes.push("このシーズンの交流戦個人成績がありません。");
    return { rankings: [], results: [], notes };
  }

  const itemsByPlayer = buildInterleagueSopItemsForSeason(identity);
  const results: SopSeasonResult[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = `${line.playerId}:${line.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const items = (itemsByPlayer.get(line.playerId) ?? []).filter((it) => {
      const def = INTERLEAGUE_SOP_TITLES.find((t) =>
        it.id.startsWith(`interleague:${t.id}:`),
      );
      return def?.role === line.role;
    });
    results.push(emptyInterleagueResult(line, identity, items));
  }

  // 成績はあるがポイント0の選手も含む（表示用）。ランキングは点数>0のみでも可
  return {
    rankings: rankSopResults(results.filter((r) => r.total > 0)),
    results,
    notes,
  };
}

/**
 * 交流戦SOP四天王（そのシーズン・WORLD、野手＋投手混合上位4）
 */
export function buildInterleagueSopFourKings(
  yearOrIdentity: number | SeasonIdentity,
): SopSeasonResult[] {
  const { results } = buildInterleagueSopRankings(yearOrIdentity);
  // 同一選手が野手・投手両方ある場合は高い方を採用
  const bestByPlayer = new Map<string, SopSeasonResult>();
  for (const r of results) {
    const cur = bestByPlayer.get(r.playerId);
    if (!cur || r.total > cur.total) bestByPlayer.set(r.playerId, r);
  }
  return [...bestByPlayer.values()]
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.playerName.localeCompare(b.playerName, "ja");
    })
    .slice(0, 4);
}

/** 交流戦SOP通算（全WORLD・全年度の交流戦タイトル点のみ合算） */
export function collectAllInterleagueSopResults(): SopSeasonResult[] {
  const identities = new Map<string, SeasonIdentity>();
  for (const line of listSeasonLines().filter(
    (l) => l.scope === "interleague",
  )) {
    const id = identityFromWorldYear(line.year, line.world);
    identities.set(id.seasonKey, id);
  }
  const out: SopSeasonResult[] = [];
  for (const identity of identities.values()) {
    const { results } = buildInterleagueSopRankings(identity);
    out.push(...results.filter((r) => r.total > 0));
  }
  return out;
}

export function buildInterleagueSopCareerRankings(
  role: SopRole | "all" = "all",
): {
  rank: number;
  playerId: string;
  playerName: string;
  teamShort: string;
  total: number;
  seasons: SopSeasonResult[];
}[] {
  let seasons = collectAllInterleagueSopResults();
  if (role !== "all") {
    seasons = seasons.filter((s) => s.role === role);
  }
  const byPlayer = new Map<string, SopSeasonResult[]>();
  for (const s of seasons) {
    const list = byPlayer.get(s.playerId) ?? [];
    list.push(s);
    byPlayer.set(s.playerId, list);
  }
  const careers = [...byPlayer.entries()].map(([playerId, list]) => {
    // 同一年・同一WORLDで野手投手両方ある場合は合算（部門が分かれているため）
    const bySeason = new Map<string, number>();
    for (const s of list) {
      const key = `${s.world ?? ""}:${s.year}`;
      bySeason.set(key, (bySeason.get(key) ?? 0) + s.total);
    }
    const total = [...bySeason.values()].reduce((a, b) => a + b, 0);
    const latest = [...list].sort((a, b) => b.year - a.year)[0]!;
    return {
      playerId,
      playerName: fullName(playerId, latest.playerName),
      teamShort: latest.teamShort,
      total,
      seasons: list,
    };
  });
  careers.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.playerName.localeCompare(b.playerName, "ja");
  });
  return careers.map((c, i) => ({ ...c, rank: i + 1 }));
}

/** pennant SOP 結果へ交流戦SOPを加算（二重加算しない） */
export function mergeInterleagueIntoPennantSop(
  pennant: SopSeasonResult,
  interleagueItems: SopLineItem[],
): SopSeasonResult {
  const existingIl = pennant.items.filter(
    (it) => it.category === "interleague_titles",
  );
  if (existingIl.length > 0) {
    // 既にマージ済み
    return pennant;
  }
  const ilTotal = interleagueItems.reduce((s, it) => s + it.points, 0);
  const pennantTotal = pennant.total;
  return {
    ...pennant,
    items: [...pennant.items, ...interleagueItems],
    total: pennantTotal + ilTotal,
    meta: {
      ...pennant.meta,
      pennantTotal,
      interleagueTotal: ilTotal,
      finalTotal: pennantTotal + ilTotal,
    },
  };
}
