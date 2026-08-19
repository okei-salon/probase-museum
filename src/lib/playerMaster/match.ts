import {
  getPlayerAffiliation,
  getPlayerMaster,
  listPlayerAffiliations,
  listPlayerMasters,
  normalizeTeamId,
} from "@/data/playerMaster";
import type {
  OcrPlayerObservation,
  PlayerMatchCandidate,
  PlayerMatchQuery,
  PlayerMatchResult,
  PlayerMaster,
  PlayerRef,
  PlayerSeasonAffiliation,
} from "@/data/playerMaster/types";
import { UNKNOWN_PLAYER_STATUS } from "@/data/playerMaster/types";
import {
  isFuzzyNameCandidate,
  normalizePlayerToken,
} from "@/lib/playerMaster/similarity";

function normalizePosition(pos: string | null | undefined): string | null {
  if (!pos) return null;
  return pos.trim().replace(/\s+/g, "");
}

export function positionsCompatible(a: string, b: string): boolean {
  const x = normalizePosition(a);
  const y = normalizePosition(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const infield = ["内野手", "一塁手", "二塁手", "三塁手", "遊撃手"];
  const outfield = ["外野手"];
  if (infield.includes(x) && infield.includes(y)) return true;
  if (outfield.includes(x) && outfield.includes(y)) return true;
  return false;
}

function parseUniform(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildUnknownKey(observation: OcrPlayerObservation): string {
  const name = normalizePlayerToken(observation.gameDisplayName || "");
  const team = normalizeTeamId(observation.team ?? null) ?? "noteam";
  const pos = normalizePosition(observation.position) ?? "nopos";
  const year = observation.year ?? "noyear";
  const uni = parseUniform(observation.uniformNumber);
  return `unknown:${name}:${team}:${pos}:${year}:${uni ?? "nouni"}`;
}

export function createUnknownPlayerRef(
  observation: OcrPlayerObservation,
): Extract<PlayerRef, { status: "UNKNOWN" }> {
  return {
    status: UNKNOWN_PLAYER_STATUS,
    unknownKey: buildUnknownKey(observation),
    observation,
  };
}

export function isUnknownPlayerRef(
  ref: PlayerRef | null | undefined,
): ref is Extract<PlayerRef, { status: "UNKNOWN" }> {
  return !!ref && ref.status === UNKNOWN_PLAYER_STATUS;
}

function affiliationFor(
  playerId: string,
  year: number | null | undefined,
): PlayerSeasonAffiliation | null {
  if (year == null) return null;
  return getPlayerAffiliation(playerId, year);
}

function playerMatchesNameExact(player: PlayerMaster, display: string): boolean {
  if (normalizePlayerToken(player.gameDisplayName) === display) return true;
  return player.aliases.some((a) => normalizePlayerToken(a) === display);
}

function playerMatchesNameFuzzy(player: PlayerMaster, display: string): boolean {
  if (isFuzzyNameCandidate(display, player.gameDisplayName)) return true;
  return player.aliases.some((a) => isFuzzyNameCandidate(display, a));
}

function teamMatches(
  playerId: string,
  teamId: ReturnType<typeof normalizeTeamId>,
  year: number | null,
  affiliation: PlayerSeasonAffiliation | null,
): boolean {
  if (!teamId) return false;
  if (affiliation?.teamId === teamId) return true;
  if (year != null && affiliation && affiliation.teamId !== teamId) return false;
  return listPlayerAffiliations().some(
    (a) => a.playerId === playerId && a.teamId === teamId,
  );
}

function scoreExactCandidate(
  player: PlayerMaster,
  query: PlayerMatchQuery,
): PlayerMatchCandidate | null {
  const display = normalizePlayerToken(query.gameDisplayName);
  if (!display || !playerMatchesNameExact(player, display)) return null;

  const year = query.year ?? null;
  const affiliation = affiliationFor(player.playerId, year);
  const teamId = normalizeTeamId(query.team ?? null);
  const position = normalizePosition(query.position);
  const uniform = parseUniform(query.uniformNumber);
  const matchedOn: PlayerMatchCandidate["matchedOn"] = [];

  if (normalizePlayerToken(player.gameDisplayName) === display) {
    matchedOn.push("gameDisplayName");
  } else {
    matchedOn.push("alias");
  }

  if (!teamId || !position) return null;
  if (!teamMatches(player.playerId, teamId, year, affiliation)) return null;
  matchedOn.push("team");

  const pos = affiliation?.position ?? player.position;
  if (!positionsCompatible(pos, position)) return null;
  matchedOn.push("position");

  if (year != null && affiliation) matchedOn.push("year");

  if (uniform != null) {
    const num = affiliation?.uniformNumber ?? player.uniformNumber;
    if (num != null && num !== uniform) return null;
    if (num === uniform) matchedOn.push("uniformNumber");
  }

  return {
    player,
    affiliation,
    confidence: "high",
    matchKind: "exact",
    matchedOn,
  };
}

function scoreFuzzyCandidate(
  player: PlayerMaster,
  query: PlayerMatchQuery,
): PlayerMatchCandidate | null {
  const display = normalizePlayerToken(query.gameDisplayName);
  if (!display || playerMatchesNameExact(player, display)) return null;
  if (!playerMatchesNameFuzzy(player, display)) return null;

  const year = query.year ?? null;
  const affiliation = affiliationFor(player.playerId, year);
  const teamId = normalizeTeamId(query.team ?? null);
  const position = normalizePosition(query.position);
  const matchedOn: PlayerMatchCandidate["matchedOn"] = ["alias"];

  if (teamId) {
    if (!teamMatches(player.playerId, teamId, year, affiliation)) return null;
    matchedOn.push("team");
  }

  if (position) {
    const pos = affiliation?.position ?? player.position;
    if (positionsCompatible(pos, position)) matchedOn.push("position");
  }

  return {
    player,
    affiliation,
    confidence: "low",
    matchKind: "fuzzy",
    matchedOn,
  };
}

/**
 * OCR観測から選手を照合する。
 * 高確信度（名字/alias完全一致 ＋ 球団 ＋ ポジションで1人）のみ自動確定。
 * 似ているだけの候補は unknown/ambiguous に載せ、自動確定しない。
 */
export function matchPlayerFromGameDisplay(
  query: PlayerMatchQuery,
): PlayerMatchResult {
  const observation: OcrPlayerObservation = { ...query };
  const display = normalizePlayerToken(query.gameDisplayName || "");
  const unknownRef = createUnknownPlayerRef(observation);

  if (!display) {
    return {
      status: "unknown",
      observation,
      fuzzyCandidates: [],
      needsUserSelection: true,
      playerRef: unknownRef,
    };
  }

  const highConfidence = listPlayerMasters()
    .map((p) => scoreExactCandidate(p, query))
    .filter((c): c is PlayerMatchCandidate => c != null);

  if (highConfidence.length === 1) {
    const only = highConfidence[0];
    return {
      status: "matched",
      confidence: "high",
      player: only.player,
      affiliation: only.affiliation,
      displayName: only.player.fullName,
      playerRef: { status: "resolved", playerId: only.player.playerId },
    };
  }

  if (highConfidence.length > 1) {
    const uniform = parseUniform(query.uniformNumber);
    let narrowed = highConfidence;
    if (uniform != null) {
      const byUni = highConfidence.filter((c) => {
        const num = c.affiliation?.uniformNumber ?? c.player.uniformNumber;
        return num === uniform;
      });
      if (byUni.length > 0) narrowed = byUni;
    }
    if (narrowed.length === 1) {
      const only = narrowed[0];
      return {
        status: "matched",
        confidence: "high",
        player: only.player,
        affiliation: only.affiliation,
        displayName: only.player.fullName,
        playerRef: { status: "resolved", playerId: only.player.playerId },
      };
    }
    return {
      status: "ambiguous",
      confidence: "medium",
      candidates: narrowed,
      observation,
      needsUserSelection: true,
      playerRef: unknownRef,
    };
  }

  // 名字/alias は一致するが球団・守備が足りず自動確定できない → 候補提示（確定しない）
  const nameHits = listPlayerMasters()
    .filter((p) => playerMatchesNameExact(p, display))
    .map((player) => {
      const year = query.year ?? null;
      const affiliation = affiliationFor(player.playerId, year);
      return {
        player,
        affiliation,
        confidence: "medium" as const,
        matchKind: "exact" as const,
        matchedOn: (normalizePlayerToken(player.gameDisplayName) === display
          ? ["gameDisplayName"]
          : ["alias"]) as PlayerMatchCandidate["matchedOn"],
      };
    });

  if (nameHits.length > 0) {
    return {
      status: "ambiguous",
      confidence: "medium",
      candidates: nameHits,
      observation,
      needsUserSelection: true,
      playerRef: unknownRef,
    };
  }

  const fuzzy = listPlayerMasters()
    .map((p) => scoreFuzzyCandidate(p, query))
    .filter((c): c is PlayerMatchCandidate => c != null)
    .slice(0, 8);

  return {
    status: "unknown",
    observation,
    fuzzyCandidates: fuzzy,
    needsUserSelection: true,
    playerRef: unknownRef,
  };
}

export function resolveDisplayNameFromMatch(
  result: PlayerMatchResult,
  fallback: string,
): string {
  if (result.status === "matched") return result.displayName;
  return fallback;
}

export function resolveMuseumPlayerName(
  playerId: string | null | undefined,
  fallback: string,
): string {
  if (!playerId || playerId === UNKNOWN_PLAYER_STATUS) return fallback;
  return getPlayerMaster(playerId)?.fullName ?? fallback;
}

export function resolveNameFromPlayerRef(
  ref: PlayerRef | null | undefined,
  fallback = "未登録選手",
): string {
  if (!ref) return fallback;
  if (ref.status === UNKNOWN_PLAYER_STATUS) {
    return ref.observation.gameDisplayName || fallback;
  }
  return resolveMuseumPlayerName(ref.playerId, fallback);
}
