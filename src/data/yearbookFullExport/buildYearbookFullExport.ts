/**
 * YEARBOOK 分析用フルデータエクスポート（完全読み取り専用）。
 * 既存の YEAR×WORLD データのみを集約する。書き込み・Neon・計算ロジック変更なし。
 */

import { listSavedMonthlyMvpForSeason } from "@/data/import/store";
import { getInterleagueView } from "@/data/interleague";
import {
  getPlayerAffiliation,
  getPlayerMaster,
} from "@/data/playerMaster";
import {
  listSeasonLinesForSeason,
  type BatterSeasonLine,
  type PitcherSeasonLine,
} from "@/data/playerSeasonLines";
import { getJapanSeriesMvp, getPostseasonView } from "@/data/postseason";
import { getAllSeasonReviewSections } from "@/data/seasonReview";
import { buildYearFeats } from "@/data/seasonAchievements";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/data/seasonAchievements/types";
import {
  buildAllInterleagueTitleBoards,
  buildInterleagueSopRankings,
  buildYearSopRankings,
  listRegisteredAwardsForSeason,
} from "@/data/sop";
import {
  resolveBestNineBoard,
  resolveGoldenGloveBoard,
  resolveMvpBoard,
  resolveRookieBoard,
  resolveSawamuraBoard,
} from "@/data/sop/seasonAwardsView";
import {
  AWARD_NONE_PLAYER_ID,
  isRegisteredAwardNone,
} from "@/lib/import/partnerPaste/awardOutcome";
import { listStandingsHistoryForSeason } from "@/data/standingsHistory";
import { getStandingsForSeason } from "@/data/teamStandings";
import { listTeamSeasonStatsForSeason } from "@/data/teamSeasonStats";
import { buildTitleRankings } from "@/data/titleRankings";
import { getTeam } from "@/data/teams";
import {
  formatSeasonLineLabel,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  SOP_CATEGORY_LABELS,
  type SopSeasonResult,
} from "@/lib/sop";
import { outsToIpDisplay } from "@/lib/manualEntry/normalizeInput";
import { resolveMuseumPlayerName } from "@/lib/playerMaster";
import {
  buildTeamGamesContext,
  evaluateIpQualified,
  evaluatePaQualified,
  resolveTeamGamesForPlayer,
} from "@/lib/stats";
import type {
  YearbookFullExportBundle,
  YearbookFullExportPayload,
  YearbookFullExportSummary,
} from "./types";
import { formatYearbookFullExportTxt } from "./formatTxt";

function nameOf(playerId: string, fallback: string): string {
  return resolveMuseumPlayerName(playerId, fallback);
}

function teamShortOf(teamId: string, fallback?: string): string {
  return getTeam(teamId as never)?.short ?? fallback ?? teamId;
}

function serializeAwardCard(
  card: {
    playerId: string | null;
    playerName: string;
    teamName: string;
    position?: string;
    league?: string;
  } | null,
) {
  if (!card) return null;
  if (
    card.playerId === AWARD_NONE_PLAYER_ID ||
    card.playerName === "該当なし"
  ) {
    return {
      outcome: "none" as const,
      playerId: AWARD_NONE_PLAYER_ID,
      playerName: "該当なし",
      teamName: "",
      position: card.position ?? null,
      league: card.league ?? null,
    };
  }
  if (!card.playerId || card.playerName === "未登録" || card.playerName === "登録待ち") {
    return {
      outcome: "unregistered" as const,
      playerId: card.playerId || null,
      playerName: card.playerName === "登録待ち" ? "登録待ち" : "未登録",
      teamName: card.teamName || null,
      position: card.position ?? null,
      league: card.league ?? null,
    };
  }
  return {
    outcome: "winner" as const,
    playerId: card.playerId,
    playerName: nameOf(card.playerId, card.playerName),
    teamName: card.teamName,
    position: card.position ?? null,
    league: card.league ?? null,
  };
}

function serializeBatterLine(
  line: BatterSeasonLine,
  paQualified: boolean | null,
) {
  const master = getPlayerMaster(line.playerId);
  return {
    playerId: line.playerId,
    playerName: nameOf(line.playerId, line.playerName),
    gameDisplayName: master?.gameDisplayName ?? null,
    teamId: line.teamId,
    teamName: line.teamName,
    teamShort: teamShortOf(line.teamId, line.teamName),
    year: line.year,
    world: line.world ?? null,
    scope: line.scope,
    paQualified,
    counting: { ...line.counting },
    derived: { ...line.derived },
  };
}

function serializePitcherLine(
  line: PitcherSeasonLine,
  ipQualified: boolean | null,
) {
  const master = getPlayerMaster(line.playerId);
  const ipDisplay =
    line.counting.ipOuts != null && line.counting.ipOuts >= 0
      ? outsToIpDisplay(line.counting.ipOuts)
      : null;
  return {
    playerId: line.playerId,
    playerName: nameOf(line.playerId, line.playerName),
    gameDisplayName: master?.gameDisplayName ?? null,
    teamId: line.teamId,
    teamName: line.teamName,
    teamShort: teamShortOf(line.teamId, line.teamName),
    year: line.year,
    world: line.world ?? null,
    scope: line.scope,
    ipQualified,
    ipDisplay,
    ipOuts: line.counting.ipOuts,
    counting: { ...line.counting },
    derived: { ...line.derived },
  };
}

function hasCatcherData(line: BatterSeasonLine): boolean {
  const c = line.counting;
  return (
    c.csAttempted != null ||
    c.csAllowed != null ||
    c.csCaught != null ||
    line.derived.csRate != null
  );
}

function serializeSopResult(r: SopSeasonResult) {
  return {
    playerId: r.playerId,
    playerName: nameOf(r.playerId, r.playerName),
    teamShort: r.teamShort,
    teamId: r.teamId ?? null,
    league: r.league ?? null,
    role: r.role,
    total: r.total,
    meta: r.meta ?? null,
    items: r.items.map((it) => ({
      id: it.id,
      category: it.category,
      categoryLabel: SOP_CATEGORY_LABELS[it.category],
      label: it.label,
      points: it.points,
      detail: it.detail ?? null,
      rank: it.rank ?? null,
      value: it.value ?? null,
    })),
  };
}

function serializeTitles(identity: SeasonIdentity, role: "batter" | "pitcher") {
  const board = buildTitleRankings(identity.year, role, {
    persistHistory: false,
    identity,
  });
  return {
    role: board.role,
    year: board.year,
    usingSample: board.usingSample,
    dataGaps: board.dataGaps,
    sections: board.sections.map((sec) => ({
      id: sec.def.id,
      label: sec.def.label,
      unavailable: sec.unavailable,
      note: sec.note ?? null,
      central: sec.board.central.map((e) => ({
        rank: e.rank,
        playerId: e.playerId,
        playerName: nameOf(e.playerId, e.playerName),
        teamShort: e.teamShort,
        value: e.value,
        valueText: e.valueText,
        historyLabel: e.historyLabel ?? null,
      })),
      pacific: sec.board.pacific.map((e) => ({
        rank: e.rank,
        playerId: e.playerId,
        playerName: nameOf(e.playerId, e.playerName),
        teamShort: e.teamShort,
        value: e.value,
        valueText: e.valueText,
        historyLabel: e.historyLabel ?? null,
      })),
    })),
  };
}

function filenameBase(identity: SeasonIdentity): string {
  const world = identity.world?.toLowerCase() ?? "legacy";
  return `pro-base-museum-yearbook-${identity.year}-${world}`;
}

/**
 * 選択中 YEAR×WORLD のフルエクスポートを構築（読み取り専用）。
 */
export function buildYearbookFullExport(
  identity: SeasonIdentity,
): YearbookFullExportBundle {
  const missingNotes: string[] = [];
  const teamGamesCtx = buildTeamGamesContext({
    scope: "pennant",
    identity,
    year: identity.year,
    world: identity.world,
  });

  // —— Standings ——
  const standingsRec = getStandingsForSeason(identity);
  const standings = standingsRec
    ? {
        year: standingsRec.year,
        world: standingsRec.world ?? null,
        central: standingsRec.central,
        pacific: standingsRec.pacific,
        source: standingsRec.source,
      }
    : null;
  if (!standings) missingNotes.push("最終順位未登録");

  // —— Monthly standings ——
  const monthlyStandings = listStandingsHistoryForSeason(identity).map((r) => ({
    checkpoint: r.checkpoint,
    year: r.year,
    world: r.world ?? null,
    central: r.central,
    pacific: r.pacific,
    source: r.source,
  }));
  if (monthlyStandings.length === 0) {
    missingNotes.push("月次順位未登録");
  }

  // —— Team stats ——
  const teamStats = listTeamSeasonStatsForSeason(identity, "regular");
  const teamBatting = teamStats
    .filter((t) => t.batting)
    .map((t) => ({
      teamId: t.teamId,
      teamName: getTeam(t.teamId)?.name ?? t.teamId,
      teamShort: getTeam(t.teamId)?.short ?? t.teamId,
      year: t.year,
      world: t.world ?? null,
      competition: t.competition,
      batting: t.batting,
    }));
  const teamPitching = teamStats
    .filter((t) => t.pitching)
    .map((t) => {
      const ipOuts = t.pitching?.counting.ipOuts;
      return {
        teamId: t.teamId,
        teamName: getTeam(t.teamId)?.name ?? t.teamId,
        teamShort: getTeam(t.teamId)?.short ?? t.teamId,
        year: t.year,
        world: t.world ?? null,
        competition: t.competition,
        ipDisplay:
          ipOuts != null && ipOuts >= 0 ? outsToIpDisplay(ipOuts) : null,
        pitching: t.pitching,
      };
    });
  if (teamBatting.length === 0) missingNotes.push("チーム打撃未登録");
  if (teamPitching.length === 0) missingNotes.push("チーム投手未登録");

  // —— Player season lines ——
  const allLines = listSeasonLinesForSeason(identity);
  const pennantBatters = allLines.filter(
    (l): l is BatterSeasonLine =>
      l.role === "batter" && l.scope === "pennant",
  );
  const pennantPitchers = allLines.filter(
    (l): l is PitcherSeasonLine =>
      l.role === "pitcher" && l.scope === "pennant",
  );

  // Deduplicate by playerId within category (keep latest updatedAt)
  function dedupeByPlayerId<T extends { playerId: string; updatedAt: string }>(
    rows: T[],
  ): T[] {
    const map = new Map<string, T>();
    for (const row of rows) {
      const prev = map.get(row.playerId);
      if (!prev || prev.updatedAt <= row.updatedAt) map.set(row.playerId, row);
    }
    return [...map.values()].sort((a, b) =>
      a.playerId.localeCompare(b.playerId),
    );
  }

  const battersUnique = dedupeByPlayerId(pennantBatters);
  const pitchersUnique = dedupeByPlayerId(pennantPitchers);

  const batters = battersUnique.map((line) => {
    const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, line.teamId);
    const status = evaluatePaQualified({
      pa: line.counting.pa,
      teamGames,
      flag: line.counting.paQualified ?? null,
    });
    return serializeBatterLine(
      line,
      status.known ? status.qualified : line.counting.paQualified ?? null,
    );
  });

  const pitchers = pitchersUnique.map((line) => {
    const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, line.teamId);
    const status = evaluateIpQualified({
      ipOuts: line.counting.ipOuts,
      teamGames,
      flag: line.counting.ipQualified ?? null,
    });
    return serializePitcherLine(
      line,
      status.known ? status.qualified : line.counting.ipQualified ?? null,
    );
  });

  const catchers = battersUnique.filter(hasCatcherData).map((line) => {
    const c = line.counting;
    return {
      playerId: line.playerId,
      playerName: nameOf(line.playerId, line.playerName),
      teamId: line.teamId,
      teamName: line.teamName,
      teamShort: teamShortOf(line.teamId, line.teamName),
      year: line.year,
      world: line.world ?? null,
      csAttempted: c.csAttempted ?? null,
      csAllowed: c.csAllowed ?? null,
      csCaught: c.csCaught ?? null,
      csRate: line.derived.csRate ?? null,
    };
  });

  if (batters.length === 0) missingNotes.push("野手個人成績未登録");
  if (pitchers.length === 0) missingNotes.push("投手個人成績未登録");

  // —— Titles ——
  const titlesBatter = serializeTitles(identity, "batter");
  const titlesPitcher = serializeTitles(identity, "pitcher");

  // —— Awards ——
  const mvp = resolveMvpBoard(identity);
  const rookie = resolveRookieBoard(identity);
  const sawamura = resolveSawamuraBoard(identity);
  const bestNine = resolveBestNineBoard(identity);
  const goldenGlove = resolveGoldenGloveBoard(identity);
  const jsMvp = getJapanSeriesMvp(identity);
  const registry = listRegisteredAwardsForSeason(identity);

  const awards = {
    mvp: {
      central: serializeAwardCard(mvp.central),
      pacific: serializeAwardCard(mvp.pacific),
    },
    rookie: {
      central: serializeAwardCard(rookie.central),
      pacific: serializeAwardCard(rookie.pacific),
    },
    sawamura: {
      central: serializeAwardCard(sawamura.central),
      pacific: serializeAwardCard(sawamura.pacific),
    },
    bestNine: {
      central: bestNine.central.map(serializeAwardCard),
      pacific: bestNine.pacific.map(serializeAwardCard),
    },
    goldenGlove: {
      central: goldenGlove.central.map(serializeAwardCard),
      pacific: goldenGlove.pacific.map(serializeAwardCard),
    },
    japanSeriesMvp: serializeAwardCard({
      playerId: jsMvp.playerId,
      playerName: jsMvp.playerName,
      teamName: jsMvp.teamName ?? "",
    }),
    registry: registry.map((a) => ({
      id: a.id,
      kind: a.kind,
      year: a.year,
      world: a.world ?? null,
      league: a.league ?? null,
      position: a.position ?? null,
      month: a.month ?? null,
      outcome: isRegisteredAwardNone(a) ? "none" : "winner",
      playerId: a.playerId,
      playerName: isRegisteredAwardNone(a)
        ? "該当なし"
        : nameOf(a.playerId, a.playerName),
      teamShort: a.teamShort ?? null,
    })),
  };

  const awardCount =
    [mvp.central, mvp.pacific, rookie.central, rookie.pacific, sawamura.central]
      .filter((c) => c && c.playerId && c.playerName !== "未登録").length +
    [...bestNine.central, ...bestNine.pacific, ...goldenGlove.central, ...goldenGlove.pacific]
      .filter((c) => c.playerId && c.playerName !== "未登録").length +
    (jsMvp.playerId && jsMvp.playerName !== "未登録" && jsMvp.playerName !== "登録待ち"
      ? 1
      : 0);

  // —— Monthly MVP ——
  const monthlyMvp = listSavedMonthlyMvpForSeason(identity).map((r) => ({
    year: r.year,
    world: r.world ?? null,
    month: r.month,
    league: r.league,
    batter: r.batter
      ? {
          playerId: r.batter.playerId,
          playerName: r.batter.playerId
            ? nameOf(r.batter.playerId, r.batter.playerName)
            : r.batter.playerName,
          teamName: r.batter.teamName ?? null,
          avg: r.batter.avg,
          hr: r.batter.hr,
          rbi: r.batter.rbi,
          sb: r.batter.sb,
        }
      : null,
    pitcher: r.pitcher
      ? {
          playerId: r.pitcher.playerId,
          playerName: r.pitcher.playerId
            ? nameOf(r.pitcher.playerId, r.pitcher.playerName)
            : r.pitcher.playerName,
          teamName: r.pitcher.teamName ?? null,
          era: r.pitcher.era,
          wins: r.pitcher.wins,
          losses: r.pitcher.losses,
        }
      : null,
  }));

  // —— SOP (full, no display limit) ——
  const sopBuilt = buildYearSopRankings(identity);
  const sopResults = sopBuilt.results.map(serializeSopResult);
  const sopRankings = sopBuilt.rankings.map((e) => ({
    rank: e.rank,
    playerId: e.result.playerId,
    playerName: nameOf(e.result.playerId, e.result.playerName),
    teamShort: e.result.teamShort,
    role: e.result.role,
    total: e.result.total,
  }));

  const byPlayerMap = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      teamShort: string;
      batterSop: number | null;
      pitcherSop: number | null;
      totalSop: number;
      batterItems: ReturnType<typeof serializeSopResult>["items"] | null;
      pitcherItems: ReturnType<typeof serializeSopResult>["items"] | null;
    }
  >();
  for (const r of sopBuilt.results) {
    const cur = byPlayerMap.get(r.playerId) ?? {
      playerId: r.playerId,
      playerName: nameOf(r.playerId, r.playerName),
      teamShort: r.teamShort,
      batterSop: null as number | null,
      pitcherSop: null as number | null,
      totalSop: 0,
      batterItems: null as ReturnType<typeof serializeSopResult>["items"] | null,
      pitcherItems: null as ReturnType<
        typeof serializeSopResult
      >["items"] | null,
    };
    const ser = serializeSopResult(r);
    if (r.role === "batter") {
      cur.batterSop = r.total;
      cur.batterItems = ser.items;
    } else {
      cur.pitcherSop = r.total;
      cur.pitcherItems = ser.items;
    }
    cur.totalSop = (cur.batterSop ?? 0) + (cur.pitcherSop ?? 0);
    byPlayerMap.set(r.playerId, cur);
  }
  const sopByPlayer = [...byPlayerMap.values()].sort(
    (a, b) => b.totalSop - a.totalSop,
  );

  // —— Records ——
  const feats = buildYearFeats(identity);
  const records = feats.items.map((it) => ({
    id: it.id,
    playerId: it.playerId,
    playerName: nameOf(it.playerId, it.playerName),
    teamShort: it.teamShort,
    role: it.role,
    category: it.category,
    categoryLabel: ACHIEVEMENT_CATEGORY_LABELS[it.category] ?? it.category,
    recordType: it.recordType,
    recordName: it.recordName,
    value: it.value ?? null,
    valueLabel: it.valueLabel ?? null,
    sopPoints: it.sopPoints,
    npbBonusPoints: it.npbBonusPoints ?? null,
    source: it.source,
  }));

  // —— Interleague ——
  let interleague: unknown = null;
  let hasInterleague = false;
  try {
    const view = getInterleagueView(identity);
    const ilTitles = buildAllInterleagueTitleBoards(identity);
    const ilSop = buildInterleagueSopRankings(identity);
    const ilTeamStats = listTeamSeasonStatsForSeason(identity, "interleague");
    const ilLines = allLines.filter((l) => l.scope === "interleague");
    hasInterleague =
      view.official ||
      ilTeamStats.length > 0 ||
      ilLines.length > 0 ||
      ilSop.results.some((r) => r.total > 0);
    interleague = {
      official: view.official,
      standings: view.standings ?? [],
      champion: view.champion ?? null,
      mvp: view.mvp
        ? {
            playerId: view.mvp.playerId,
            playerName: view.mvp.playerId
              ? nameOf(view.mvp.playerId, view.mvp.playerName)
              : view.mvp.playerName,
            teamName: view.mvp.teamName ?? null,
          }
        : null,
      titles: ilTitles.map((b) => ({
        id: b.def.id,
        label: b.def.label,
        entries: b.entries.map((e) => ({
          rank: e.rank,
          playerId: e.playerId,
          playerName: nameOf(e.playerId, e.playerName),
          teamShort: e.teamShort,
          value: e.value,
          points: e.points,
        })),
      })),
      sop: {
        rankings: ilSop.rankings.map((e) => ({
          rank: e.rank,
          playerId: e.result.playerId,
          playerName: nameOf(e.result.playerId, e.result.playerName),
          role: e.result.role,
          total: e.result.total,
        })),
        results: ilSop.results.map(serializeSopResult),
        notes: ilSop.notes,
      },
      teamStats: ilTeamStats.map((t) => ({
        teamId: t.teamId,
        teamShort: getTeam(t.teamId)?.short ?? t.teamId,
        batting: t.batting,
        pitching: t.pitching,
      })),
      playerLines: {
        batters: ilLines
          .filter((l): l is BatterSeasonLine => l.role === "batter")
          .map((l) => serializeBatterLine(l, l.counting.paQualified ?? null)),
        pitchers: ilLines
          .filter((l): l is PitcherSeasonLine => l.role === "pitcher")
          .map((l) => serializePitcherLine(l, l.counting.ipQualified ?? null)),
      },
    };
    if (!hasInterleague) {
      missingNotes.push("交流戦データ未登録");
    }
  } catch {
    interleague = null;
    hasInterleague = false;
    missingNotes.push("交流戦データ取得失敗または未登録");
  }

  // —— Postseason ——
  let postseason: unknown = null;
  try {
    const ps = getPostseasonView(identity);
    postseason = {
      year: ps.year,
      world: ps.world ?? null,
      central: ps.central,
      pacific: ps.pacific,
      japanSeries: {
        ...ps.japanSeries,
        mvp: serializeAwardCard({
          playerId: ps.japanSeries.mvp.playerId,
          playerName: ps.japanSeries.mvp.playerName,
          teamName: ps.japanSeries.mvp.teamName ?? "",
        }),
      },
    };
  } catch {
    postseason = null;
    missingNotes.push("ポストシーズン未登録");
  }

  // —— Two-way ——
  const batterIds = new Set(battersUnique.map((b) => b.playerId));
  const pitcherIds = new Set(pitchersUnique.map((p) => p.playerId));
  const twoWayIds = [...batterIds].filter((id) => pitcherIds.has(id));
  const twoWayPlayers = twoWayIds.map((playerId) => {
    const b = batters.find((x) => x.playerId === playerId)!;
    const p = pitchers.find((x) => x.playerId === playerId)!;
    const sop = byPlayerMap.get(playerId);
    return {
      playerId,
      playerName: nameOf(playerId, b.playerName),
      teamId: b.teamId,
      teamShort: b.teamShort,
      batting: b,
      pitching: p,
      batterPaQualified: b.paQualified,
      pitcherIpQualified: p.ipQualified,
      batterSop: sop?.batterSop ?? null,
      pitcherSop: sop?.pitcherSop ?? null,
      totalSop: sop?.totalSop ?? null,
    };
  });

  // —— Player profiles (master fields only — no invented bio) ——
  const profileIds = new Set<string>([
    ...battersUnique.map((b) => b.playerId),
    ...pitchersUnique.map((p) => p.playerId),
  ]);
  const playerProfiles = [...profileIds]
    .map((playerId) => {
      const master = getPlayerMaster(playerId);
      if (!master) return null;
      const aff = getPlayerAffiliation(
        playerId,
        identity.year,
        identity.world,
      );
      return {
        playerId,
        fullName: master.fullName,
        gameDisplayName: master.gameDisplayName,
        aliases: master.aliases,
        position: aff?.position ?? master.position,
        uniformNumber: aff?.uniformNumber ?? master.uniformNumber,
        isRealPlayer: master.isRealPlayer,
        affiliation: aff
          ? {
              year: aff.year,
              world: aff.world ?? null,
              teamId: aff.teamId,
              teamName: aff.teamName,
            }
          : null,
        // 未保存の属性は出さない（推測禁止）
        birthDate: null,
        age: null,
        yearsPro: null,
        throws: null,
        bats: null,
        draft: null,
        notes:
          "生年月日・プロ年数・投打・ドラフトは選手マスターに未保存のため null",
      };
    })
    .filter(Boolean);

  // —— Season reviews (4 sections) ——
  const seasonReviews = getAllSeasonReviewSections(identity);
  const seasonReview = seasonReviews.general;

  const summary: YearbookFullExportSummary = {
    teams: new Set([
      ...teamBatting.map((t) => t.teamId),
      ...teamPitching.map((t) => t.teamId),
      ...(standings
        ? [...standings.central, ...standings.pacific].map(
            (r) => r.teamId ?? r.team,
          )
        : []),
    ]).size,
    batters: batters.length,
    pitchers: pitchers.length,
    catchers: catchers.length,
    awards: awardCount,
    records: records.length,
    sopPlayers: sopByPlayer.length,
    titlesBatterSections: titlesBatter.sections.length,
    titlesPitcherSections: titlesPitcher.sections.length,
    monthlyMvp: monthlyMvp.length,
    twoWayPlayers: twoWayPlayers.length,
    playerProfiles: playerProfiles.length,
    hasStandings: Boolean(standings),
    hasMonthlyStandings: monthlyStandings.length > 0,
    hasInterleague,
    hasPostseason: postseason != null,
    hasSeasonReview: Boolean(
      seasonReviews.general ||
        seasonReviews.central ||
        seasonReviews.pacific ||
        seasonReviews.teams,
    ),
    seasonReviewSections: {
      general: Boolean(seasonReviews.general),
      central: Boolean(seasonReviews.central),
      pacific: Boolean(seasonReviews.pacific),
      teams: Boolean(seasonReviews.teams),
    },
    missingNotes,
  };

  const payload: YearbookFullExportPayload = {
    format: "probase-museum-yearbook-full",
    version: 1,
    exportedAt: new Date().toISOString(),
    year: identity.year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    seasonLabel: formatSeasonLineLabel(identity),
    summary,
    standings,
    monthlyStandings,
    teamBatting,
    teamPitching,
    batters,
    pitchers,
    catchers,
    titles: { batter: titlesBatter, pitcher: titlesPitcher },
    awards,
    monthlyMvp,
    sop: {
      rankings: sopRankings,
      results: sopResults,
      byPlayer: sopByPlayer,
      notes: sopBuilt.notes,
    },
    records,
    interleague,
    postseason,
    twoWayPlayers,
    playerProfiles,
    seasonReview: seasonReview?.trim() ? seasonReview : null,
    seasonReviews: {
      general: seasonReviews.general,
      central: seasonReviews.central,
      pacific: seasonReviews.pacific,
      teams: seasonReviews.teams,
    },
  };

  const base = filenameBase(identity);
  const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
  const txtText = formatYearbookFullExportTxt(payload);

  return {
    payload,
    filenameBase: base,
    jsonText,
    txtText,
  };
}

export function downloadYearbookExportFile(
  filename: string,
  content: string,
  mime: string,
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
