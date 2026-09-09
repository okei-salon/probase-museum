/**
 * 年度SOPランキング構築。
 * 個人成績・タイトル・表彰・特殊記録・前年達成から自動計算。
 *
 * Step10: SeasonIdentity（world + year）単位で計算。
 * 連続ボーナスは同一 WORLD の前年のみ参照する。
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLinesForSeason,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import { buildTitleRankings } from "@/data/titleRankings/buildRankings";
import { getTeam } from "@/data/teams";
import {
  identityFromWorldYear,
  priorSeasonIdentity,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  classifyPitcherWorkload,
  computeSeasonSop,
  rankSopResults,
  type SopAwardInput,
  type SopBatterStats,
  type SopFeatsInput,
  type SopPitcherStats,
  type SopPlayerYearInput,
  type SopPriorYearFlags,
  type SopRankEntry,
  type SopSeasonResult,
  type SopTitlePlacement,
} from "@/lib/sop";
import {
  buildTeamGamesContext,
  evaluateIpQualified,
  evaluatePaQualified,
  resolveTeamGamesForPlayer,
  type TeamGamesContext,
} from "@/lib/stats";
import { buildFormalAnnualAwardsByPlayer } from "./formalAnnualAwards";
import { getSopFeat } from "./featsStore";
import {
  achievementsToSopFeats,
  collectYearAchievementsRaw,
  FEATS_LEAGUE_LEADER_TYPES,
  leagueSideFromTeamShort,
  listAchievementsForPlayer,
  mergeSopFeats,
  pickLeagueLeaderPlayerIds,
} from "@/data/seasonAchievements";
import {
  buildInterleagueSopItemsForSeason,
  buildInterleagueSopRankings,
  mergeInterleagueIntoPennantSop,
} from "./buildInterleagueSop";
import { INTERLEAGUE_SOP_TITLES } from "@/lib/sop/rules";

function resolveIdentity(
  yearOrIdentity: number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "number") {
    // 数値のみ: world 無しレガシー／DEMO として扱う（BLUE/RED を混ぜない）
    return identityFromWorldYear(yearOrIdentity, null);
  }
  return yearOrIdentity;
}

function teamShortOf(line: PlayerSeasonLine): string {
  return getTeam(line.teamId)?.short ?? line.teamName;
}

function leagueOf(line: PlayerSeasonLine) {
  return getTeam(line.teamId)?.league === "パ" ? "pacific" : "central";
}

function batterStatsFromLine(
  line: Extract<PlayerSeasonLine, { role: "batter" }>,
  teamGamesCtx?: TeamGamesContext | null,
): SopBatterStats {
  const c = line.counting;
  const d = line.derived;
  const teamGames = teamGamesCtx
    ? resolveTeamGamesForPlayer(teamGamesCtx, line.teamId)
    : null;
  const paStatus = evaluatePaQualified({
    pa: c.pa ?? null,
    ab: c.ab ?? null,
    teamGames,
    flag: c.paQualified ?? null,
  });
  return {
    avg: d.avg,
    pa: c.pa ?? null,
    h: c.h,
    hr: c.hr,
    rbi: c.rbi,
    r: c.r ?? null,
    doubles: c.doubles,
    triples: c.triples,
    sb: c.sb ?? null,
    sac: c.sac ?? null,
    bb: c.bb,
    obp: d.obp,
    ops: d.ops,
    rispAvg: d.rispAvg,
    csRate: d.csRate,
    csAttempted: c.csAttempted ?? null,
    // 率系SOP用: 判定不能は false（未到達扱い）
    paQualified: paStatus.qualified,
  };
}

function pitcherStatsFromLine(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
  teamGamesCtx?: TeamGamesContext | null,
): SopPitcherStats {
  const c = line.counting;
  const d = line.derived;
  const { class: pitcherClass, startRate } = classifyPitcherWorkload(
    c.g,
    c.gs ?? null,
  );
  const reliefIp =
    c.reliefIpOuts != null ? c.reliefIpOuts / 3 : null;
  const reliefEra =
    reliefIp != null && reliefIp > 0 && c.reliefEr != null
      ? (c.reliefEr * 9) / reliefIp
      : null;
  const reliefSoRate =
    reliefIp != null && reliefIp > 0 && c.reliefSo != null
      ? (c.reliefSo * 9) / reliefIp
      : null;
  const teamGames = teamGamesCtx
    ? resolveTeamGamesForPlayer(teamGamesCtx, line.teamId)
    : null;
  const ipStatus = evaluateIpQualified({
    ipOuts: c.ipOuts,
    teamGames,
    flag: c.ipQualified ?? null,
  });
  return {
    era: d.era,
    w: c.w,
    l: c.l,
    winPct: d.winPct,
    so: c.so,
    soRate: d.soRate,
    sho: c.sho ?? null,
    cg: c.cg ?? null,
    ip: c.ipOuts / 3,
    qsRate: d.qsRate,
    g: c.g,
    gs: c.gs ?? null,
    hp: c.hld ?? c.hp ?? null,
    hld: c.hld ?? null,
    sv: c.sv ?? null,
    reliefEra,
    reliefSoRate,
    reliefIp,
    ipQualified: ipStatus.qualified,
    pitcherClass,
    startRate,
  };
}

function featsFor(
  identity: SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
  line: PlayerSeasonLine,
  streakLeaders?: {
    hit: Set<string>;
    onBase: Set<string>;
    hr: Set<string>;
    paHr: Set<string>;
    abHit: Set<string>;
    gameSo: Set<string>;
  },
): SopFeatsInput {
  const fromAchievements = achievementsToSopFeats(
    listAchievementsForPlayer(identity, playerId, role),
  );
  // 旧 featsStore は world 無しレガシーのみ互換利用
  const stored =
    identity.world == null
      ? getSopFeat(playerId, identity.year, role)
      : null;
  const fromLegacyStore: SopFeatsInput = stored
    ? {
        cycle: stored.cycle,
        hitStreak: stored.hitStreak ?? null,
        onBaseStreak: stored.onBaseStreak ?? null,
        hrStreak: stored.hrStreak ?? null,
        perfectGame: stored.perfectGame,
        noHitter: stored.noHitter,
        scorelessIp: stored.scorelessIp ?? null,
        gameSo: stored.gameSo ?? null,
        winStreak: stored.winStreak ?? null,
      }
    : {};
  const fromLine: SopFeatsInput =
    line.role === "batter"
      ? {
          hitStreak: line.counting.hitStreak ?? null,
          onBaseStreak: line.counting.onBaseStreak ?? null,
          hrStreak: line.counting.hrStreak ?? null,
          paHrStreak: line.counting.paHrStreak ?? null,
          abHitStreak: line.counting.abHitStreak ?? null,
          hitStreakLeagueLeader: streakLeaders?.hit.has(playerId) ?? false,
          onBaseStreakLeagueLeader:
            streakLeaders?.onBase.has(playerId) ?? false,
          hrStreakLeagueLeader: streakLeaders?.hr.has(playerId) ?? false,
          paHrStreakLeagueLeader: streakLeaders?.paHr.has(playerId) ?? false,
          abHitStreakLeagueLeader: streakLeaders?.abHit.has(playerId) ?? false,
        }
      : {
          gameSoLeagueLeader: streakLeaders?.gameSo.has(playerId) ?? false,
        };

  return mergeSopFeats(
    fromAchievements,
    mergeSopFeats(fromLegacyStore, fromLine),
  );
}

/**
 * 連続系5種＋1試合奪三振のリーグ1位（同率含む）playerId 集合。
 * SOP +5 ボーナス専用（表示フィルタとは別経路）。
 *
 * 判定単位: YEAR × WORLD × リーグ（セ／パ）× 記録項目
 * 値の出どころ: ペナント成績行 + 記録・偉業生データ（大きい方を採用）
 */
function seasonFeatLeagueLeaders(
  identity: SeasonIdentity,
  lines: PlayerSeasonLine[],
): {
  hit: Set<string>;
  onBase: Set<string>;
  hr: Set<string>;
  paHr: Set<string>;
  abHit: Set<string>;
  gameSo: Set<string>;
} {
  type Row = { playerId: string; league: "central" | "pacific"; value: number };
  type Bucket = "hit" | "onBase" | "hr" | "paHr" | "abHit" | "gameSo";
  const buckets: Record<Bucket, Row[]> = {
    hit: [],
    onBase: [],
    hr: [],
    paHr: [],
    abHit: [],
    gameSo: [],
  };
  const typeToBucket: Record<string, Bucket> = {
    hit_streak: "hit",
    on_base_streak: "onBase",
    hr_streak: "hr",
    pa_hr_streak: "paHr",
    ab_hit_streak: "abHit",
    game_so: "gameSo",
  };

  const push = (
    bucket: Bucket,
    playerId: string,
    league: "central" | "pacific",
    value: number | null | undefined,
  ) => {
    if (value == null || !Number.isFinite(value) || value < 1) return;
    buckets[bucket].push({ playerId, league, value });
  };

  // 1) ペナント成績行（teamId でリーグ確定）
  for (const line of lines) {
    if (line.scope !== "pennant") continue;
    const league = leagueOf(line) as "central" | "pacific";
    if (line.role === "batter") {
      const c = line.counting;
      push("hit", line.playerId, league, c.hitStreak);
      push("onBase", line.playerId, league, c.onBaseStreak);
      push("hr", line.playerId, league, c.hrStreak);
      push("paHr", line.playerId, league, c.paHrStreak);
      push("abHit", line.playerId, league, c.abHitStreak);
    }
  }

  // 2) 記録・偉業（手動含む）。成績行に無い値も拾う
  for (const a of collectYearAchievementsRaw(identity)) {
    if (a.source === "demo") continue;
    if (!FEATS_LEAGUE_LEADER_TYPES.has(a.recordType)) continue;
    if (a.category !== "streak" && a.category !== "single_game") continue;
    const bucket = typeToBucket[a.recordType];
    if (!bucket) continue;
    push(
      bucket,
      a.playerId,
      leagueSideFromTeamShort(a.teamShort),
      a.value,
    );
  }

  return {
    hit: pickLeagueLeaderPlayerIds(buckets.hit),
    onBase: pickLeagueLeaderPlayerIds(buckets.onBase),
    hr: pickLeagueLeaderPlayerIds(buckets.hr),
    paHr: pickLeagueLeaderPlayerIds(buckets.paHr),
    abHit: pickLeagueLeaderPlayerIds(buckets.abHit),
    gameSo: pickLeagueLeaderPlayerIds(buckets.gameSo),
  };
}

/**
 * 年間表彰SOP。
 * 画面と同じ正式受賞者（枠解決後）だけを加点する。
 * レジストリの余剰・重複行からの推測加点はしない。
 */
function collectAwardsForPlayer(
  identity: SeasonIdentity,
  playerId: string,
  awardsByPlayer?: Map<string, SopAwardInput[]>,
): SopAwardInput[] {
  const index = awardsByPlayer ?? buildFormalAnnualAwardsByPlayer(identity);
  return index.get(playerId) ?? [];
}

function titlesForPlayer(
  identity: SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
): SopTitlePlacement[] {
  const board = buildTitleRankings(identity.year, role, {
    persistHistory: false,
    identity,
  });
  const placements: SopTitlePlacement[] = [];
  for (const section of board.sections) {
    if (section.unavailable) continue;
    for (const league of ["central", "pacific"] as const) {
      for (const entry of section.board[league]) {
        if (
          entry.playerId === playerId &&
          entry.rank != null &&
          entry.rank >= 1 &&
          entry.rank <= 5
        ) {
          placements.push({
            titleId: section.def.id,
            titleLabel: section.def.label,
            rank: entry.rank as 1 | 2 | 3 | 4 | 5,
          });
        }
      }
    }
  }
  return placements;
}

function priorFlagsFromResult(
  prev: SopSeasonResult | undefined,
): SopPriorYearFlags | null {
  if (!prev?.achievementIds) return null;
  return {
    basicIds: prev.achievementIds.basicIds,
    comboIds: prev.achievementIds.comboIds,
  };
}

/**
 * 指定シーズンの全選手 SOP を計算してランキング化。
 * - SeasonIdentity: WORLD 厳密
 * - number: world 無しレガシー／DEMO のみ（BLUE/RED を混ぜない）
 */
export function buildYearSopRankings(
  yearOrIdentity: number | SeasonIdentity,
): {
  rankings: SopRankEntry[];
  results: SopSeasonResult[];
  notes: string[];
} {
  const identity = resolveIdentity(yearOrIdentity);
  const notes: string[] = [];
  const lines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "pennant",
  );
  const hasInterleague =
    listSeasonLinesForSeason(identity).some((l) => l.scope === "interleague");

  if (lines.length === 0 && !hasInterleague) {
    notes.push(
      "このシーズンの登録済み個人成績がありません。手入力・画像取込後にSOPが計算されます。",
    );
    return { rankings: [], results: [], notes };
  }

  if (lines.length === 0 && hasInterleague) {
    const il = buildInterleagueSopRankings(identity);
    notes.push(...il.notes);
    notes.push(
      "ペナント個人成績が未登録のため、交流戦SOPのみを最終SOPとして表示しています。",
    );
    return {
      rankings: il.rankings,
      results: il.results.filter((r) => r.total > 0),
      notes,
    };
  }

  // 前年結果（同一 WORLD のみ — WORLD をまたいで連続判定しない）
  const priorIdentity = priorSeasonIdentity(identity);
  const prevLines = listSeasonLinesForSeason(priorIdentity).filter(
    (l) => l.scope === "pennant",
  );
  const prevTeamGamesCtx = buildTeamGamesContext({
    scope: "pennant",
    identity: priorIdentity,
    year: priorIdentity.year,
    world: priorIdentity.world,
  });
  const prevAwardsByPlayer = buildFormalAnnualAwardsByPlayer(priorIdentity);
  const prevByKey = new Map<string, SopSeasonResult>();
  const prevByPlayer = groupLinesByPlayer(prevLines);
  for (const line of prevLines) {
    const key = `${line.playerId}:${line.role}`;
    const input = lineToInput(
      line,
      priorIdentity,
      null,
      prevByPlayer.get(line.playerId),
      undefined,
      prevTeamGamesCtx,
      prevAwardsByPlayer,
    );
    prevByKey.set(key, computeSeasonSop(input));
  }

  const results: SopSeasonResult[] = [];
  const byPlayer = groupLinesByPlayer(lines);
  const interleagueItemsByPlayer = buildInterleagueSopItemsForSeason(identity);
  const streakLeaders = seasonFeatLeagueLeaders(identity, lines);
  const teamGamesCtx = buildTeamGamesContext({
    scope: "pennant",
    identity,
    year: identity.year,
    world: identity.world,
  });
  const awardsByPlayer = buildFormalAnnualAwardsByPlayer(identity);

  for (const line of lines) {
    const key = `${line.playerId}:${line.role}`;
    const prior = priorFlagsFromResult(prevByKey.get(key));
    const pennant = computeSeasonSop(
      lineToInput(
        line,
        identity,
        prior,
        byPlayer.get(line.playerId),
        streakLeaders,
        teamGamesCtx,
        awardsByPlayer,
      ),
    );
    const ilItems = (interleagueItemsByPlayer.get(line.playerId) ?? []).filter(
      (it) => {
        const titleId = it.id.split(":")[1];
        const def = INTERLEAGUE_SOP_TITLES.find((t) => t.id === titleId);
        return def?.role === line.role;
      },
    );
    results.push(mergeInterleagueIntoPennantSop(pennant, ilItems));
  }

  // 交流戦のみ成績がある選手（ペナント無し）も最終SOPへ載せる
  const pennantPlayerRoles = new Set(
    lines.map((l) => `${l.playerId}:${l.role}`),
  );
  const { results: ilOnly } = buildInterleagueSopRankings(identity);
  for (const r of ilOnly) {
    if (r.total <= 0) continue;
    if (pennantPlayerRoles.has(`${r.playerId}:${r.role}`)) continue;
    results.push(r);
  }

  notes.push(
    "率系のシーズン達成・大記録・NPB記録は規定到達者のみ加点します（打席／投球回。阻止率は被盗企、勝率は13勝）。",
  );
  notes.push(
    "二刀流SOPの打率・防御率も率系として規定到達者のみ加点します（累積項目は従来どおり）。",
  );
  notes.push(
    "特殊・連続記録は「記録・偉業」登録データ（および成績内の連続記録）から参照します。",
  );
  notes.push(
    "二刀流SOPは同一シーズンに野手・投手の双方成績があり、両側とも1点以上の場合のみ加算します。",
  );
  notes.push(
    "交流戦SOP（10部門）は通常部分SOPへ加算し、最終SOPとして集計します（二重加算なし）。",
  );
  notes.push(
    "年間表彰SOPは画面と同じ正式受賞者（ポジション枠解決後）のみ加点します。",
  );
  if (identity.world) {
    notes.push(
      `WORLD ${identity.world} のみを対象に計算しています（他WORLDは含めません）。`,
    );
  }

  return {
    rankings: rankSopResults(results),
    results,
    notes,
  };
}

function groupLinesByPlayer(lines: PlayerSeasonLine[]) {
  const map = new Map<
    string,
    {
      batter?: Extract<PlayerSeasonLine, { role: "batter" }>;
      pitcher?: Extract<PlayerSeasonLine, { role: "pitcher" }>;
    }
  >();
  for (const line of lines) {
    const cur = map.get(line.playerId) ?? {};
    if (line.role === "batter") cur.batter = line;
    else cur.pitcher = line;
    map.set(line.playerId, cur);
  }
  return map;
}

function lineToInput(
  line: PlayerSeasonLine,
  identity: SeasonIdentity,
  prior: SopPriorYearFlags | null,
  peers?: {
    batter?: Extract<PlayerSeasonLine, { role: "batter" }>;
    pitcher?: Extract<PlayerSeasonLine, { role: "pitcher" }>;
  },
  streakLeaders?: {
    hit: Set<string>;
    onBase: Set<string>;
    hr: Set<string>;
    paHr: Set<string>;
    abHit: Set<string>;
    gameSo: Set<string>;
  },
  teamGamesCtx?: TeamGamesContext | null,
  awardsByPlayer?: Map<string, SopAwardInput[]>,
): SopPlayerYearInput {
  const name =
    getPlayerMaster(line.playerId)?.fullName ?? line.playerName;
  const batterLine = peers?.batter;
  const pitcherLine = peers?.pitcher;
  const hasBothRoles = Boolean(batterLine && pitcherLine);

  const base = {
    playerId: line.playerId,
    playerName: name,
    year: identity.year,
    world: identity.world,
    teamId: line.teamId,
    teamShort: teamShortOf(line),
    league: leagueOf(line) as "central" | "pacific",
    awards: collectAwardsForPlayer(
      identity,
      line.playerId,
      awardsByPlayer,
    ),
    titles: titlesForPlayer(identity, line.playerId, line.role),
    feats: featsFor(identity, line.playerId, line.role, line, streakLeaders),
    priorYear: prior,
    applyTwoWay: hasBothRoles,
  };

  if (line.role === "batter") {
    return {
      ...base,
      role: "batter",
      batter: batterStatsFromLine(line, teamGamesCtx),
      pitcher: pitcherLine
        ? pitcherStatsFromLine(pitcherLine, teamGamesCtx)
        : null,
    };
  }
  return {
    ...base,
    role: "pitcher",
    batter: batterLine ? batterStatsFromLine(batterLine, teamGamesCtx) : null,
    pitcher: pitcherStatsFromLine(line, teamGamesCtx),
  };
}

export function getPlayerYearSopDetail(
  yearOrIdentity: number | SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
): SopSeasonResult | null {
  const { results } = buildYearSopRankings(yearOrIdentity);
  return (
    results.find((r) => r.playerId === playerId && r.role === role) ?? null
  );
}
