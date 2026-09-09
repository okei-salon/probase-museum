/**
 * シーズンサマリー — 既存 Museum データの読み取り専用ビュー。
 * 表彰・優勝などは専用保存せず既存データを参照。
 * シーズン総評（SEASON_REVIEW）の有無のみ YEAR×WORLD ストアを参照する。
 */

import type { StandingRow } from "@/components/views/StandingsTable";
import { getInterleagueChampion } from "@/data/interleague";
import { getJapanSeriesMvp, getPostseason } from "@/data/postseason";
import { getSeasonReviewBody } from "@/data/seasonReview";
import { isRegisteredAwardNone } from "@/lib/import/partnerPaste/awardOutcome";
import { resolveMuseumPlayerName } from "@/lib/playerMaster";
import {
  listRegisteredAwardsForSeason,
  type RegisteredSeasonAward,
} from "@/data/sop/awardsRegistry";
import {
  allowsLayoutSampleFallback,
  formatSeasonLineLabel,
  identityFromWorldYear,
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  centralStandings,
  pacificStandings,
} from "@/data/seasonViews";
import { getTeam, npbTeams } from "@/data/teams";
import {
  getStandingsForSeason,
  getYearStandings,
  type StandingEntry,
} from "@/data/teamStandings";

export type SummaryChampion = {
  id: string;
  title: string;
  teamName: string;
  note?: string;
  /** 日本一など特に強調する枠 */
  featured?: boolean;
};

export type SummaryAward = {
  id: string;
  title: string;
  playerName: string;
  teamName: string;
  /** 将来 PLAYERS 詳細へ遷移するためのID（未登録時は null） */
  playerId: string | null;
};

export type SummaryHighlight = {
  id: string;
  kind:
    | "perfect-game"
    | "no-hitter"
    | "cycle"
    | "homerun-50"
    | "triple-three"
    | "streak"
    | "special"
    | "sop-1st"
    | "symbol";
  title: string;
  description: string;
  meta?: string;
};

export type SeasonSummaryData = {
  year: string;
  tagline: string;
  champions: SummaryChampion[];
  awards: SummaryAward[];
  /**
   * 登録済みシーズン総評があるか（本文は詳細画面で表示）。
   * 正本は SEASON_REVIEW / yearbook-reviews。旧ハイライトは読み取り互換。
   */
  hasSeasonReview: boolean;
  standings: {
    central: StandingRow[];
    pacific: StandingRow[];
  };
};

const PLACEHOLDER = "登録待ち";
const AWARD_NONE_LABEL = "該当なし";

function resolveIdentity(
  year: string,
  seasonKeyOrIdentity?: string | SeasonIdentity | null,
): SeasonIdentity {
  if (typeof seasonKeyOrIdentity === "object" && seasonKeyOrIdentity != null) {
    return seasonKeyOrIdentity;
  }
  if (typeof seasonKeyOrIdentity === "string") {
    const parsed = parseSeasonKey(seasonKeyOrIdentity);
    if (parsed) return parsed;
  }
  const yearNum = Number(year);
  return identityFromWorldYear(
    Number.isFinite(yearNum) ? yearNum : 0,
    null,
  );
}

function isPlaceholder(name: string | null | undefined): boolean {
  if (!name) return true;
  return name === PLACEHOLDER || name.includes(PLACEHOLDER);
}

/** 球団表示名（正式名を優先。teamId / 短縮名 / 正式名から解決） */
function resolveTeamDisplayName(input: {
  teamId?: string | null;
  teamName?: string | null;
  teamShort?: string | null;
}): string {
  if (input.teamId) {
    const t = getTeam(input.teamId);
    if (t) return t.name;
  }
  const raw = (input.teamName ?? input.teamShort ?? "").trim();
  if (!raw || isPlaceholder(raw)) return PLACEHOLDER;
  const hit =
    npbTeams.find((t) => t.name === raw) ??
    npbTeams.find((t) => t.short === raw) ??
    npbTeams.find((t) => raw.includes(t.short) || t.name.includes(raw));
  return hit?.name ?? raw;
}

function leagueChampionFromStandings(
  entries: StandingEntry[] | undefined,
): string {
  if (!entries?.length) return PLACEHOLDER;
  const top =
    entries.find((e) => e.rank === 1) ??
    [...entries].sort((a, b) => a.rank - b.rank)[0];
  if (!top) return PLACEHOLDER;
  return resolveTeamDisplayName({
    teamId: top.teamId,
    teamName: top.team,
  });
}

/**
 * 表彰の表示名。
 * 選手マスタ共通処理（playerId / 正式登録名）でフルネームを解決する。
 */
export function resolveSummaryAwardPlayerName(
  award: RegisteredSeasonAward | null | undefined,
  fallbackPlayerId?: string | null,
  fallbackName?: string | null,
): string {
  if (award && isRegisteredAwardNone(award)) return AWARD_NONE_LABEL;
  const playerId = award?.playerId || fallbackPlayerId || null;
  const name = (award?.playerName ?? fallbackName ?? "").trim();
  if (!name || isPlaceholder(name)) {
    if (playerId) {
      const full = resolveMuseumPlayerName(playerId, "");
      if (full) return full;
    }
    return PLACEHOLDER;
  }
  if (name === AWARD_NONE_LABEL) return AWARD_NONE_LABEL;
  return resolveMuseumPlayerName(playerId, name);
}

function awardTeamDisplay(award: RegisteredSeasonAward | null): string {
  if (!award || isRegisteredAwardNone(award)) return "—";
  return resolveTeamDisplayName({ teamShort: award.teamShort });
}

function pickAward(
  awards: RegisteredSeasonAward[],
  kind: RegisteredSeasonAward["kind"],
  league?: "central" | "pacific",
): RegisteredSeasonAward | null {
  return (
    awards.find(
      (a) =>
        a.kind === kind &&
        (league == null || a.league === league),
    ) ?? null
  );
}

function toAwardCard(
  id: string,
  title: string,
  award: RegisteredSeasonAward | null,
  jsFallback?: {
    playerId: string | null;
    playerName: string;
    teamName: string;
  },
): SummaryAward {
  if (award) {
    const none = isRegisteredAwardNone(award);
    return {
      id,
      title,
      playerName: resolveSummaryAwardPlayerName(award),
      teamName: none ? "—" : awardTeamDisplay(award),
      playerId: none ? null : award.playerId || null,
    };
  }
  if (jsFallback && !isPlaceholder(jsFallback.playerName)) {
    const playerName = resolveSummaryAwardPlayerName(
      null,
      jsFallback.playerId,
      jsFallback.playerName,
    );
    return {
      id,
      title,
      playerName,
      teamName: resolveTeamDisplayName({ teamName: jsFallback.teamName }),
      playerId: jsFallback.playerId,
    };
  }
  return {
    id,
    title,
    playerName: PLACEHOLDER,
    teamName: PLACEHOLDER,
    playerId: null,
  };
}

function buildChampions(identity: SeasonIdentity): SummaryChampion[] {
  const stored = getStandingsForSeason(identity);
  const central = leagueChampionFromStandings(stored?.central);
  const pacific = leagueChampionFromStandings(stored?.pacific);

  const japanRaw = getPostseason(identity).japanSeries.champion;
  const japan = isPlaceholder(japanRaw)
    ? PLACEHOLDER
    : resolveTeamDisplayName({ teamName: japanRaw });

  const ilRaw = getInterleagueChampion(identity);
  const interleague = isPlaceholder(ilRaw)
    ? PLACEHOLDER
    : resolveTeamDisplayName({ teamName: ilRaw });

  return [
    { id: "central", title: "セ・リーグ優勝", teamName: central },
    { id: "pacific", title: "パ・リーグ優勝", teamName: pacific },
    {
      id: "japan",
      title: "日本一",
      teamName: japan,
      featured: true,
      note: japan !== PLACEHOLDER ? "日本シリーズ優勝" : undefined,
    },
    { id: "interleague", title: "交流戦優勝", teamName: interleague },
  ];
}

function buildAwards(identity: SeasonIdentity): SummaryAward[] {
  let registered: RegisteredSeasonAward[] = [];
  try {
    registered = listRegisteredAwardsForSeason(identity);
  } catch {
    registered = [];
  }

  const jsMvp = getJapanSeriesMvp(identity);
  const jsFallback =
    jsMvp.playerId || !isPlaceholder(jsMvp.playerName)
      ? {
          playerId: jsMvp.playerId,
          playerName: jsMvp.playerName,
          teamName: jsMvp.teamName,
        }
      : undefined;

  return [
    toAwardCard(
      "mvp-c",
      "セ・リーグ MVP",
      pickAward(registered, "mvp", "central"),
    ),
    toAwardCard(
      "mvp-p",
      "パ・リーグ MVP",
      pickAward(registered, "mvp", "pacific"),
    ),
    toAwardCard(
      "rookie-c",
      "セ・リーグ 新人王",
      pickAward(registered, "rookie", "central"),
    ),
    toAwardCard(
      "rookie-p",
      "パ・リーグ 新人王",
      pickAward(registered, "rookie", "pacific"),
    ),
    toAwardCard(
      "sawamura",
      "沢村賞",
      pickAward(registered, "sawamura"),
    ),
    toAwardCard(
      "js-mvp",
      "日本シリーズMVP",
      pickAward(registered, "japanSeriesMvp"),
      jsFallback,
    ),
  ];
}

/**
 * 指定シーズンのサマリーを既存データから構築する（書き込みなし）。
 */
export function getSeasonSummary(
  year: string,
  seasonKeyOrIdentity?: string | SeasonIdentity | null,
): SeasonSummaryData {
  const identity = resolveIdentity(year, seasonKeyOrIdentity);
  const yearStr = String(identity.year);
  const label = formatSeasonLineLabel(identity);

  const stored = getStandingsForSeason(identity);
  const legacy =
    identity.world == null && Number.isFinite(identity.year)
      ? getYearStandings(identity.year)
      : null;
  const standingsSource = stored ?? legacy;

  const toRows = (
    entries: StandingEntry[] | undefined,
  ): StandingRow[] =>
    (entries ?? []).map((e) => ({
      rank: e.rank,
      team: e.team,
      w: e.w,
      l: e.l,
      d: e.d,
      pct: e.pct,
      gb: e.gb,
    }));

  const hasCentral = Boolean(standingsSource?.central?.length);
  const hasPacific = Boolean(standingsSource?.pacific?.length);
  const allowSample = allowsLayoutSampleFallback(identity);
  const useFullSample = allowSample && !hasCentral && !hasPacific;

  return {
    year: yearStr,
    tagline: `${label}の記録と栄光を振り返る`,
    champions: buildChampions(identity),
    awards: buildAwards(identity),
    hasSeasonReview: getSeasonReviewBody(identity) != null,
    standings: {
      central: hasCentral
        ? toRows(standingsSource!.central)
        : useFullSample
          ? centralStandings
          : [],
      pacific: hasPacific
        ? toRows(standingsSource!.pacific)
        : useFullSample
          ? pacificStandings
          : [],
    },
  };
}
