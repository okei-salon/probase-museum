/**
 * 年度SOPランキング構築。
 * 個人成績・タイトル・表彰・特殊記録・前年達成から自動計算。
 *
 * Step10: SeasonIdentity（world + year）単位で計算。
 * 連続ボーナスは同一 WORLD の前年のみ参照する。
 */

import {
  getBestNineAwards,
  getGoldenGloveAwards,
  getMvpAwards,
  getRookieAwards,
  getSawamuraAwards,
} from "@/data/awards";
import { listSavedMonthlyMvpForSeason } from "@/data/import/store";
import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLinesForSeason,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import { getJapanSeriesMvp } from "@/data/postseason";
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
import { listRegisteredAwardsForSeason } from "./awardsRegistry";
import { getSopFeat } from "./featsStore";
import {
  achievementsToSopFeats,
  listAchievementsForPlayer,
  mergeSopFeats,
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
): SopBatterStats {
  const c = line.counting;
  const d = line.derived;
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
    paQualified: c.paQualified ?? null,
  };
}

function pitcherStatsFromLine(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
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
    ipQualified: c.ipQualified ?? null,
    pitcherClass,
    startRate,
  };
}

function featsFor(
  identity: SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
  line: PlayerSeasonLine,
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
        }
      : {};

  return mergeSopFeats(
    fromAchievements,
    mergeSopFeats(fromLegacyStore, fromLine),
  );
}

/** レジストリ + 月間MVP（WORLD 厳密）。レガシーのみハードコード表彰フォールバック */
function collectAwardsForPlayer(
  identity: SeasonIdentity,
  playerId: string,
): SopAwardInput[] {
  const out: SopAwardInput[] = [];
  const year = identity.year;
  const registered = listRegisteredAwardsForSeason(identity).filter(
    (a) => a.playerId === playerId,
  );

  if (registered.length > 0) {
    const monthly = registered.filter((a) => a.kind === "monthlyMvp");
    const others = registered.filter((a) => a.kind !== "monthlyMvp");
    for (const a of others) {
      out.push({ kind: a.kind, label: undefined });
    }
    if (monthly.length > 0) {
      out.push({ kind: "monthlyMvp", count: monthly.length });
    }
    return out;
  }

  // 月間MVP（実保存・WORLD 分離）
  try {
    const monthly = listSavedMonthlyMvpForSeason(identity);
    let count = 0;
    for (const r of monthly) {
      if (r.batter?.playerId === playerId) count += 1;
      if (r.pitcher?.playerId === playerId) count += 1;
    }
    if (count > 0) out.push({ kind: "monthlyMvp", count });
  } catch {
    /* ignore */
  }

  // 正式 WORLD: ハードコード表彰は使わない（BLUE/RED に同一サンプルが付かない）
  if (identity.world != null) {
    return out;
  }

  // フォールバック: 既存ハードコード（レガシー／DEMO のみ）
  const y = String(year);
  try {
    const mvp = getMvpAwards(y);
    if (mvp.central.playerId === playerId || mvp.pacific.playerId === playerId) {
      out.push({ kind: "mvp" });
    }
  } catch {
    /* ignore */
  }
  try {
    const rook = getRookieAwards(y);
    if (
      rook.central.playerId === playerId ||
      rook.pacific.playerId === playerId
    ) {
      out.push({ kind: "rookie" });
    }
  } catch {
    /* ignore */
  }
  try {
    const saw = getSawamuraAwards(y);
    if (
      saw.central?.playerId === playerId ||
      saw.pacific?.playerId === playerId
    ) {
      out.push({ kind: "sawamura" });
    }
  } catch {
    /* ignore */
  }
  try {
    const b9 = getBestNineAwards(y);
    const hit = [...b9.central, ...b9.pacific].some(
      (c) => c.playerId === playerId,
    );
    if (hit) out.push({ kind: "bestNine" });
  } catch {
    /* ignore */
  }
  try {
    const gg = getGoldenGloveAwards(y);
    const hit = [...gg.central, ...gg.pacific].some(
      (c) => c.playerId === playerId,
    );
    if (hit) out.push({ kind: "goldenGlove" });
  } catch {
    /* ignore */
  }

  try {
    const js = getJapanSeriesMvp(identity);
    if (js?.playerId === playerId) {
      out.push({ kind: "japanSeriesMvp" });
    }
  } catch {
    /* ignore */
  }

  return out;
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
        if (entry.playerId === playerId && entry.rank >= 1 && entry.rank <= 5) {
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
  const prevByKey = new Map<string, SopSeasonResult>();
  const prevByPlayer = groupLinesByPlayer(prevLines);
  for (const line of prevLines) {
    const key = `${line.playerId}:${line.role}`;
    const input = lineToInput(
      line,
      priorIdentity,
      null,
      prevByPlayer.get(line.playerId),
    );
    prevByKey.set(key, computeSeasonSop(input));
  }

  const results: SopSeasonResult[] = [];
  const byPlayer = groupLinesByPlayer(lines);
  const interleagueItemsByPlayer = buildInterleagueSopItemsForSeason(identity);

  for (const line of lines) {
    const key = `${line.playerId}:${line.role}`;
    const prior = priorFlagsFromResult(prevByKey.get(key));
    const pennant = computeSeasonSop(
      lineToInput(line, identity, prior, byPlayer.get(line.playerId)),
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
    "規定到達フラグ未設定の率系タイトルはSOPタイトル点に含めません。",
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
    awards: collectAwardsForPlayer(identity, line.playerId),
    titles: titlesForPlayer(identity, line.playerId, line.role),
    feats: featsFor(identity, line.playerId, line.role, line),
    priorYear: prior,
    applyTwoWay: hasBothRoles,
  };

  if (line.role === "batter") {
    return {
      ...base,
      role: "batter",
      batter: batterStatsFromLine(line),
      pitcher: pitcherLine ? pitcherStatsFromLine(pitcherLine) : null,
    };
  }
  return {
    ...base,
    role: "pitcher",
    batter: batterLine ? batterStatsFromLine(batterLine) : null,
    pitcher: pitcherStatsFromLine(line),
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
