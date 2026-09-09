/**
 * シーズン表彰画面用: レジストリを ResolvedAwardCard に重ねる。
 * 正式 WORLD はレジストリ優先（未登録はプレースホルダ）。
 * レガシー／DEMO は従来サンプルの上に world 無しレジストリを重ねる。
 *
 * ベストナインの主要成績は表彰レコードに持たず、
 * 同年度・同 WORLD の保存済み個人成績を表示時に参照する。
 */

import type { LeagueSide, ResolvedAwardCard } from "@/data/awards";
import {
  getBestNineAwards,
  getGoldenGloveAwards,
  getMvpAwards,
  getRookieAwards,
  getSawamuraAwards,
  normalizeBestNinePosition,
} from "@/data/awards";
import { getRegisteredSeasonHighlightStats } from "@/data/playerSeasonStats";
import { formatSeasonAwardHistory } from "@/lib/awardHistory";
import type { AnnualAwardKind } from "@/lib/sop/rules";
import {
  AWARD_NONE_PLAYER_ID,
  isRegisteredAwardNone,
} from "@/lib/import/partnerPaste/awardOutcome";
import {
  listRegisteredAwardsForSeason,
  type RegisteredSeasonAward,
} from "@/data/sop/awardsRegistry";
import {
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";

function emptyCard(
  league?: LeagueSide,
  position?: string,
): ResolvedAwardCard {
  return {
    playerId: "",
    playerName: "未登録",
    teamName: "—",
    historyLabel: "—",
    league,
    position,
    stats: null,
  };
}

function toCard(
  a: RegisteredSeasonAward,
  currentYear: number,
  stats: ResolvedAwardCard["stats"] = null,
  statSections: ResolvedAwardCard["statSections"] = null,
): ResolvedAwardCard {
  if (isRegisteredAwardNone(a)) {
    return {
      playerId: AWARD_NONE_PLAYER_ID,
      playerName: "該当なし",
      teamName: "",
      historyLabel: "",
      league: a.league,
      position: a.position,
      stats: null,
      statSections: null,
    };
  }
  return {
    playerId: a.playerId,
    playerName: a.playerName,
    teamName: a.teamShort ?? "—",
    historyLabel: formatSeasonAwardHistory([a.year], currentYear),
    league: a.league,
    position: a.position,
    stats,
    statSections,
  };
}

function bestNineStatsFor(
  a: RegisteredSeasonAward,
  identity: SeasonIdentity,
): ResolvedAwardCard["stats"] {
  return getRegisteredSeasonHighlightStats({
    playerId: a.playerId,
    year: identity.year,
    world: identity.world,
    position: a.position,
  });
}

/** 2026 BLUE 新人王・柴田獅子（日本ハム）のみ二刀流表示 */
const TWO_WAY_ROOKIE_2026_BLUE = {
  year: 2026,
  world: "BLUE" as const,
  playerId: "nipponham_81085150_31",
  playerName: "柴田獅子",
  teamShort: "日本ハム",
};

function isExplicitTwoWayRookie2026Blue(
  a: RegisteredSeasonAward,
  identity: SeasonIdentity,
): boolean {
  if (identity.year !== TWO_WAY_ROOKIE_2026_BLUE.year) return false;
  if (identity.world !== TWO_WAY_ROOKIE_2026_BLUE.world) return false;
  if (a.kind !== "rookie") return false;
  if (a.playerId === TWO_WAY_ROOKIE_2026_BLUE.playerId) return true;
  return (
    a.playerName === TWO_WAY_ROOKIE_2026_BLUE.playerName &&
    (a.teamShort === TWO_WAY_ROOKIE_2026_BLUE.teamShort ||
      a.teamShort === "北海道日本ハムファイターズ")
  );
}

function majorAwardHighlight(
  a: RegisteredSeasonAward,
  identity: SeasonIdentity,
  kind: "mvp" | "rookie" | "sawamura",
): {
  stats: ResolvedAwardCard["stats"];
  statSections: ResolvedAwardCard["statSections"];
} {
  if (isRegisteredAwardNone(a)) {
    return { stats: null, statSections: null };
  }

  if (kind === "rookie" && isExplicitTwoWayRookie2026Blue(a, identity)) {
    // 明示二刀流は正規 master id で PITCHER/BATTER を独立参照（片方欠落で他方を消さない）
    const playerId = TWO_WAY_ROOKIE_2026_BLUE.playerId;
    const teamShort = a.teamShort ?? TWO_WAY_ROOKIE_2026_BLUE.teamShort;
    const pitcher = getRegisteredSeasonHighlightStats({
      playerId,
      year: identity.year,
      world: identity.world,
      teamShort,
      roleMode: "pitcher",
    });
    const batter = getRegisteredSeasonHighlightStats({
      playerId,
      year: identity.year,
      world: identity.world,
      teamShort,
      roleMode: "batter",
    });
    const sections: NonNullable<ResolvedAwardCard["statSections"]> = [];
    if (pitcher && pitcher.length > 0) {
      sections.push({ title: "投手成績", stats: pitcher });
    }
    if (batter && batter.length > 0) {
      sections.push({ title: "野手成績", stats: batter });
    }
    return {
      stats: null,
      statSections: sections.length > 0 ? sections : null,
    };
  }

  return {
    stats: getRegisteredSeasonHighlightStats({
      playerId: a.playerId,
      year: identity.year,
      world: identity.world,
      teamShort: a.teamShort,
      roleMode: kind === "sawamura" ? "pitcher" : "auto",
    }),
    statSections: null,
  };
}

function pickMajor(
  awards: RegisteredSeasonAward[],
  kind: AnnualAwardKind,
  league: LeagueSide | undefined,
): RegisteredSeasonAward | null {
  return (
    awards.find(
      (a) =>
        a.kind === kind &&
        (kind === "sawamura" || a.league === league),
    ) ?? null
  );
}

function resolveMajorPair(
  identity: SeasonIdentity,
  kind: "mvp" | "rookie" | "sawamura",
  sample: {
    central: ResolvedAwardCard | null;
    pacific: ResolvedAwardCard | null;
  },
): {
  central: ResolvedAwardCard | null;
  pacific: ResolvedAwardCard | null;
} {
  const year = identity.year;
  const awards = listRegisteredAwardsForSeason(identity).filter(
    (a) => a.kind === kind,
  );
  const formal = identity.world != null;

  const toMajorCard = (reg: RegisteredSeasonAward) => {
    const hi = majorAwardHighlight(reg, identity, kind);
    return toCard(reg, year, hi.stats, hi.statSections);
  };

  if (kind === "sawamura") {
    const reg = pickMajor(awards, kind, undefined);
    if (reg) {
      return { central: toMajorCard(reg), pacific: null };
    }
    if (formal) {
      return { central: emptyCard("central"), pacific: null };
    }
    return sample;
  }

  const cReg = pickMajor(awards, kind, "central");
  const pReg = pickMajor(awards, kind, "pacific");

  return {
    central: cReg
      ? toMajorCard(cReg)
      : formal
        ? emptyCard("central")
        : sample.central,
    pacific: pReg
      ? toMajorCard(pReg)
      : formal
        ? emptyCard("pacific")
        : sample.pacific,
  };
}

export function resolveMvpBoard(identity: SeasonIdentity) {
  const y = String(identity.year);
  return resolveMajorPair(identity, "mvp", getMvpAwards(y));
}

export function resolveRookieBoard(identity: SeasonIdentity) {
  const y = String(identity.year);
  return resolveMajorPair(identity, "rookie", getRookieAwards(y));
}

export function resolveSawamuraBoard(identity: SeasonIdentity) {
  const y = String(identity.year);
  return resolveMajorPair(identity, "sawamura", getSawamuraAwards(y));
}

/**
 * 守備位置ボードをリーグ枠に固定して解決する。
 * セ B9 / GG: 9枠、パ B9: DH 込み10枠。
 * 余りレコード（空ポジション・非正規・重複）は末尾追加しない。
 */
function mergePositionBoard(
  identity: SeasonIdentity,
  kind: "bestNine" | "goldenGlove",
  sample: { central: ResolvedAwardCard[]; pacific: ResolvedAwardCard[] },
  withSeasonStats: boolean,
): { central: ResolvedAwardCard[]; pacific: ResolvedAwardCard[] } {
  const year = identity.year;
  const awards = listRegisteredAwardsForSeason(identity).filter(
    (a) => a.kind === kind,
  );
  const formal = identity.world != null;

  function mergeLeague(
    league: LeagueSide,
    base: ResolvedAwardCard[],
  ): ResolvedAwardCard[] {
    const reg = awards.filter((a) => {
      if (a.league !== league) return false;
      return Boolean(normalizeBestNinePosition(a.position));
    });
    if (reg.length === 0) {
      return formal
        ? base.map((b) => emptyCard(league, b.position))
        : base;
    }
    // 守備位置で上書き（DH / 指名打者を同一視）。同一位置が複数なら登録順で消費。
    const used = new Set<string>();
    return base.map((b) => {
      const slot = normalizeBestNinePosition(b.position);
      const hit = reg.find(
        (a) =>
          normalizeBestNinePosition(a.position) === slot && !used.has(a.id),
      );
      if (hit) {
        used.add(hit.id);
        const stats = withSeasonStats
          ? bestNineStatsFor(hit, identity)
          : null;
        const card = toCard(hit, year, stats);
        // 表示は正規ポジション名（指名打者 → DH）
        return { ...card, position: slot || card.position };
      }
      return formal ? emptyCard(league, b.position) : b;
    });
  }

  return {
    central: mergeLeague("central", sample.central),
    pacific: mergeLeague("pacific", sample.pacific),
  };
}

export function resolveBestNineBoard(identity: SeasonIdentity) {
  return mergePositionBoard(
    identity,
    "bestNine",
    getBestNineAwards(String(identity.year)),
    true,
  );
}

export function resolveGoldenGloveBoard(identity: SeasonIdentity) {
  return mergePositionBoard(
    identity,
    "goldenGlove",
    getGoldenGloveAwards(String(identity.year)),
    false,
  );
}

/** seasonKey 文字列から identity を解決（失敗時は year のみレガシー） */
export function identityFromSeasonKey(
  seasonKey: string,
  yearFallback: string,
): SeasonIdentity {
  return (
    parseSeasonKey(seasonKey) ??
    parseSeasonKey(yearFallback) ?? {
      seasonKey: yearFallback,
      year: Number(yearFallback) || 0,
      world: null,
      kind: "legacy",
    }
  );
}
