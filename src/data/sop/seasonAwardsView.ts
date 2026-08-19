/**
 * シーズン表彰画面用: レジストリを ResolvedAwardCard に重ねる。
 * 正式 WORLD はレジストリ優先（未登録はプレースホルダ）。
 * レガシー／DEMO は従来サンプルの上に world 無しレジストリを重ねる。
 */

import type { LeagueSide, ResolvedAwardCard } from "@/data/awards";
import {
  getBestNineAwards,
  getGoldenGloveAwards,
  getMvpAwards,
  getRookieAwards,
  getSawamuraAwards,
} from "@/data/awards";
import { formatSeasonAwardHistory } from "@/lib/awardHistory";
import type { AnnualAwardKind } from "@/lib/sop/rules";
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
): ResolvedAwardCard {
  return {
    playerId: a.playerId,
    playerName: a.playerName,
    teamName: a.teamShort ?? "—",
    historyLabel: formatSeasonAwardHistory([a.year], currentYear),
    league: a.league,
    position: a.position,
    stats: null,
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

  if (kind === "sawamura") {
    const reg = pickMajor(awards, kind, undefined);
    if (reg) {
      return { central: toCard(reg, year), pacific: null };
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
      ? toCard(cReg, year)
      : formal
        ? emptyCard("central")
        : sample.central,
    pacific: pReg
      ? toCard(pReg, year)
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

function mergePositionBoard(
  identity: SeasonIdentity,
  kind: "bestNine" | "goldenGlove",
  sample: { central: ResolvedAwardCard[]; pacific: ResolvedAwardCard[] },
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
    const reg = awards.filter((a) => a.league === league);
    if (reg.length === 0) {
      return formal
        ? base.map((b) => emptyCard(league, b.position))
        : base;
    }
    // 守備位置で上書き。同一位置が複数なら登録順で並べ、余りは末尾追加
    const used = new Set<string>();
    const out: ResolvedAwardCard[] = base.map((b) => {
      const hit = reg.find(
        (a) =>
          a.position === b.position &&
          !used.has(a.id),
      );
      if (hit) {
        used.add(hit.id);
        return toCard(hit, year);
      }
      return formal ? emptyCard(league, b.position) : b;
    });
    for (const a of reg) {
      if (!used.has(a.id)) out.push(toCard(a, year));
    }
    return out;
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
  );
}

export function resolveGoldenGloveBoard(identity: SeasonIdentity) {
  return mergePositionBoard(
    identity,
    "goldenGlove",
    getGoldenGloveAwards(String(identity.year)),
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
