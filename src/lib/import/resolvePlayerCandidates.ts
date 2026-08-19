import {
  getPlayerAffiliationsByPlayer,
  listPlayerMasters,
  normalizeTeamId,
} from "@/data/playerMaster";
import {
  isFuzzyNameCandidate,
  nameSimilarity,
  normalizePlayerToken,
} from "@/lib/playerMaster/similarity";
import {
  createUnknownPlayerRef,
  matchPlayerFromGameDisplay,
} from "@/lib/playerMaster/match";
import type { PlayerMaster, PlayerRef } from "@/data/playerMaster/types";
import {
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";

export type PlayerMatchCandidateView = {
  label: string;
  playerId: string;
  score: number;
};

function extractKanji(s: string): string {
  return (s.match(/[\u3400-\u9fff]/g) || []).join("");
}

function affiliationMatchesYearTeam(
  playerId: string,
  year: number,
  teamId: string,
  world?: SeasonWorld | null,
): boolean {
  const w = normalizeSeasonWorld(world);
  return getPlayerAffiliationsByPlayer(playerId).some((a) => {
    if (a.year !== year || a.teamId !== teamId) return false;
    if (w == null) return true;
    const aw = normalizeSeasonWorld(a.world);
    return aw == null || aw === w;
  });
}

/** OCR崩れ向け: 漢字の包含・部分一致スコア */
function kanjiOverlapScore(ocr: string, master: string): number {
  const a = extractKanji(ocr);
  const b = extractKanji(master);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) && a.length >= 2) return 0.94;
  if (a.startsWith(b) && b.length >= 2) return 0.9;
  // 佐藤輝 ↔ 佐藤輝明
  if (b.includes(a) && a.length >= 2) return 0.88 + Math.min(0.08, a.length * 0.01);
  if (a.includes(b) && b.length >= 2) return 0.82;
  // 文字集合の重なり
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const ch of setA) if (setB.has(ch)) inter += 1;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union ? inter / union : 0;
  // 順序付き部分列
  let ai = 0;
  for (let i = 0; i < b.length && ai < a.length; i += 1) {
    if (b[i] === a[ai]) ai += 1;
  }
  const subseq = ai / a.length;
  return Math.max(jaccard * 0.85, subseq * 0.8);
}

function scorePlayer(
  compact: string,
  raw: string,
  p: PlayerMaster,
): number {
  const full = normalizePlayerToken(p.fullName);
  const display = normalizePlayerToken(p.gameDisplayName);
  let score = 0;
  if (compact) {
    if (full === compact || display === compact) score = 1;
    else if (full.startsWith(compact) && compact.length >= 2) score = 0.93;
    else if (compact.startsWith(display) && display.length >= 2) score = 0.9;
    else if (isFuzzyNameCandidate(compact, display)) score = 0.78;
    else if (isFuzzyNameCandidate(compact, full.slice(0, compact.length + 1)))
      score = 0.75;
    else {
      score = Math.max(
        nameSimilarity(compact, display),
        nameSimilarity(compact, full.slice(0, Math.max(compact.length, 2))),
        kanjiOverlapScore(raw || compact, p.fullName),
        kanjiOverlapScore(raw || compact, p.gameDisplayName),
      );
    }
  } else {
    score = Math.max(
      kanjiOverlapScore(raw, p.fullName),
      kanjiOverlapScore(raw, p.gameDisplayName),
    );
  }
  for (const a of p.aliases ?? []) {
    score = Math.max(
      score,
      nameSimilarity(compact, a),
      kanjiOverlapScore(raw || compact, a),
    );
    if (isFuzzyNameCandidate(compact, a)) score = Math.max(score, 0.8);
  }
  return score;
}

/**
 * 項目別OCR向け: 球団＋役割で候補を絞り、OCR崩れでも候補提示。
 * 高確信のみ自動確定。曖昧は UNKNOWN + candidates。
 */
export function resolvePlayerWithCandidates(input: {
  gameDisplayName: string;
  team: string;
  year: number;
  role: "pitcher" | "batter";
  world?: SeasonWorld | null;
}): {
  playerRef: PlayerRef;
  displayName: string;
  status: "matched" | "ambiguous" | "unknown";
  confidence: number;
  candidates: PlayerMatchCandidateView[];
} {
  const raw = input.gameDisplayName.trim();
  const compact = normalizePlayerToken(raw);
  const teamId = normalizeTeamId(input.team);
  const world = normalizeSeasonWorld(input.world);
  const observation = {
    gameDisplayName: compact || raw,
    team: input.team,
    year: input.year,
    world,
    position: input.role === "pitcher" ? "投手" : null,
  };

  // 標準照合（高確信）
  if (compact || raw) {
    const match = matchPlayerFromGameDisplay({
      ...observation,
      position: input.role === "pitcher" ? "投手" : null,
    });
    if (match.status === "matched") {
      return {
        playerRef: match.playerRef,
        displayName: match.displayName,
        status: "matched",
        confidence: 0.95,
        candidates: [
          {
            label: match.displayName,
            playerId: match.player.playerId,
            score: 0.95,
          },
        ],
      };
    }
  }

  const roleFilter = (p: PlayerMaster) =>
    input.role === "pitcher" ? p.position === "投手" : p.position !== "投手";

  const teamPool = listPlayerMasters().filter((p) => {
    if (!roleFilter(p)) return false;
    if (!teamId) return false;
    return affiliationMatchesYearTeam(
      p.playerId,
      input.year,
      teamId,
      world,
    );
  });

  // 球団なし／球団不一致でも漢字が取れている場合は全選手から候補
  const widePool =
    teamPool.length > 0
      ? teamPool
      : listPlayerMasters().filter(roleFilter);

  const scored: PlayerMatchCandidateView[] = widePool
    .map((p) => ({
      label: p.fullName,
      playerId: p.playerId,
      score: scorePlayer(compact, raw, p),
    }))
    .filter((c) => c.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  // 球団付きで弱い場合、広域でもう一度（名字一致の取りこぼし防止）
  if (teamPool.length > 0 && (scored[0]?.score ?? 0) < 0.72 && (compact || raw)) {
    const extra = listPlayerMasters()
      .filter(roleFilter)
      .map((p) => ({
        label: p.fullName,
        playerId: p.playerId,
        score: scorePlayer(compact, raw, p) * (teamId && affiliationMatchesYearTeam(p.playerId, input.year, teamId, world) ? 1 : 0.92),
      }))
      .filter((c) => c.score >= 0.55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    const merged = new Map<string, PlayerMatchCandidateView>();
    for (const c of [...scored, ...extra]) {
      const prev = merged.get(c.playerId);
      if (!prev || c.score > prev.score) merged.set(c.playerId, c);
    }
    scored.length = 0;
    scored.push(
      ...[...merged.values()].sort((a, b) => b.score - a.score).slice(0, 6),
    );
  }

  if (scored.length === 1 && scored[0].score >= 0.72) {
    return {
      playerRef: { status: "resolved", playerId: scored[0].playerId },
      displayName: scored[0].label,
      status: "matched",
      confidence: scored[0].score,
      candidates: scored,
    };
  }

  if (
    scored.length >= 1 &&
    scored[0].score >= 0.88 &&
    (scored[1]?.score ?? 0) < scored[0].score - 0.08
  ) {
    return {
      playerRef: { status: "resolved", playerId: scored[0].playerId },
      displayName: scored[0].label,
      status: "matched",
      confidence: scored[0].score,
      candidates: scored,
    };
  }

  // 名字のみ高一致（村上 / 佐藤）＋球団あり → 候補提示（自動確定は慎重）
  if (scored.length > 0) {
    // 球団あり＆トップが十分高い＆2位と差があるなら確定
    if (
      teamId &&
      scored[0].score >= 0.9 &&
      (scored[1]?.score ?? 0) < 0.86
    ) {
      return {
        playerRef: { status: "resolved", playerId: scored[0].playerId },
        displayName: scored[0].label,
        status: "matched",
        confidence: scored[0].score,
        candidates: scored,
      };
    }
    return {
      playerRef: createUnknownPlayerRef(observation),
      displayName: raw || compact,
      status: "ambiguous",
      confidence: scored[0].score,
      candidates: scored,
    };
  }

  return {
    playerRef: createUnknownPlayerRef(observation),
    displayName: raw || compact || "",
    status: "unknown",
    confidence: 0,
    candidates: [],
  };
}
