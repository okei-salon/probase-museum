/**
 * ランキング取込向け選手照合。
 * OCR崩れを許容し、球団＋選手マスタで候補を出す。
 * 誤紐付けを避けるため、曖昧なら自動確定しない。
 */

import {
  getPlayerAffiliationsByPlayer,
  listPlayerMasters,
  normalizeTeamId,
} from "@/data/playerMaster";
import { npbTeams, type TeamId } from "@/data/teams";
import {
  nameSimilarity,
  normalizePlayerToken,
} from "@/lib/playerMaster/similarity";

export type RankingPlayerCandidate = {
  playerId: string;
  fullName: string;
  gameDisplayName: string;
  teamShort: string;
  teamId?: TeamId;
  score: number;
  label: string;
};

export type RankingPlayerResolve = {
  /** 表示用（確定時は正式名、未確定時はOCR名） */
  displayName: string;
  ocrName: string;
  playerId?: string;
  teamShort: string;
  teamId?: TeamId;
  /** matched = 自動確定可 / ambiguous = 要選択 / unknown = 候補なし */
  status: "matched" | "ambiguous" | "unknown";
  confidence: number;
  candidates: RankingPlayerCandidate[];
};

function extractNameChars(s: string): string {
  return (s.match(/[\u3400-\u9fffァ-ヶーぁ-ん]/g) || []).join("");
}

function extractKanji(s: string): string {
  return (s.match(/[\u3400-\u9fff]/g) || []).join("");
}

function extractKana(s: string): string {
  return (s.match(/[ァ-ヶー]+/g) || []).join("");
}

function teamShortFromId(teamId: string | undefined): string {
  if (!teamId) return "";
  return npbTeams.find((t) => t.id === teamId)?.short ?? "";
}

function playerTeamForYear(
  playerId: string,
  year: number,
): { teamId: TeamId; teamShort: string } | null {
  const affs = getPlayerAffiliationsByPlayer(playerId);
  const exact = affs.find((a) => a.year === year);
  if (exact) {
    return {
      teamId: exact.teamId as TeamId,
      teamShort: teamShortFromId(exact.teamId),
    };
  }
  // デモ年度など所属が無い場合は最新所属を使う
  const latest = [...affs].sort((a, b) => b.year - a.year)[0];
  if (latest) {
    return {
      teamId: latest.teamId as TeamId,
      teamShort: teamShortFromId(latest.teamId),
    };
  }
  return null;
}

function onTeam(
  playerId: string,
  teamId: string | null,
  year: number,
): boolean {
  if (!teamId) return false;
  const affs = getPlayerAffiliationsByPlayer(playerId);
  if (affs.some((a) => a.year === year && a.teamId === teamId)) return true;
  // 年度不一致でも同球団所属歴があれば加点対象
  return affs.some((a) => a.teamId === teamId);
}

function scoreName(ocr: string, masterFull: string, masterDisplay: string, aliases: string[]): number {
  const o = normalizePlayerToken(extractNameChars(ocr));
  if (!o) return 0;
  const full = normalizePlayerToken(masterFull);
  const disp = normalizePlayerToken(masterDisplay);
  let score = 0;

  if (o === full || o === disp) return 1;
  // ゲーム表示「佐藤輝」↔ full「佐藤輝明」 / display「佐藤」
  if (full.startsWith(o) && o.length >= 2) score = Math.max(score, 0.96);
  if (o.startsWith(disp) && disp.length >= 2 && o.length <= disp.length + 2) {
    score = Math.max(score, 0.93);
  }
  if (disp && o.startsWith(disp) && o.length > disp.length) {
    // OCR「佐藤輝」 display「佐藤」
    score = Math.max(score, 0.9);
  }
  if (full.includes(o) && o.length >= 2) score = Math.max(score, 0.88);
  if (o.includes(disp) && disp.length >= 2) score = Math.max(score, 0.85);

  const oKanji = extractKanji(o);
  const fKanji = extractKanji(full);
  if (oKanji && fKanji) {
    if (fKanji.startsWith(oKanji) && oKanji.length >= 2) score = Math.max(score, 0.94);
    let inter = 0;
    const setF = new Set(fKanji);
    for (const ch of oKanji) if (setF.has(ch)) inter += 1;
    if (oKanji.length >= 2) {
      score = Math.max(score, (inter / oKanji.length) * 0.82);
    }
  }

  const oKana = extractKana(o);
  const fKana = extractKana(full) || extractKana(disp);
  if (oKana.length >= 2 && fKana) {
    score = Math.max(score, nameSimilarity(oKana, fKana));
    if (fKana.includes(oKana) || oKana.includes(fKana)) {
      score = Math.max(score, 0.92);
    }
  }

  score = Math.max(score, nameSimilarity(o, disp), nameSimilarity(o, full.slice(0, Math.max(o.length, 2))));

  for (const a of aliases) {
    score = Math.max(score, nameSimilarity(o, a));
    if (normalizePlayerToken(a) === o) score = 1;
  }
  return score;
}

/**
 * OCR名＋球団で選手を照合する。
 * year は所属の優先に使い、無い場合は最新所属へフォールバック（デモ2000年対応）。
 */
export function resolveRankingPlayer(input: {
  ocrName: string;
  teamShort: string;
  year: number;
  role: "batter" | "pitcher" | "catcher";
}): RankingPlayerResolve {
  const ocrName = extractNameChars(input.ocrName).replace(/\s+/g, "");
  const teamId = normalizeTeamId(input.teamShort);
  const teamShort =
    input.teamShort ||
    (teamId ? teamShortFromId(teamId) : "") ||
    "";

  const roleOk = (position: string) => {
    if (input.role === "pitcher") return position === "投手";
    if (input.role === "catcher") {
      return position === "捕手" || position !== "投手";
    }
    return position !== "投手";
  };

  const masters = listPlayerMasters().filter((p) => roleOk(p.position));

  const scored: RankingPlayerCandidate[] = [];
  for (const p of masters) {
    let score = scoreName(ocrName, p.fullName, p.gameDisplayName, p.aliases ?? []);
    if (score < 0.45) continue;

    const team = playerTeamForYear(p.playerId, input.year);
    const sameTeam = teamId ? onTeam(p.playerId, teamId, input.year) : false;

    if (teamId && sameTeam) score = Math.min(1, score + 0.12);
    else if (teamId && team && team.teamId !== teamId) score *= 0.72;
    else if (teamId && !team) score *= 0.9;

    // 球団一致かつ名字一致（表示名）は強く
    if (
      sameTeam &&
      (p.gameDisplayName === ocrName ||
        p.fullName.startsWith(ocrName) ||
        ocrName.startsWith(p.gameDisplayName))
    ) {
      score = Math.max(score, 0.92);
    }

    scored.push({
      playerId: p.playerId,
      fullName: p.fullName,
      gameDisplayName: p.gameDisplayName,
      teamShort: team?.teamShort || teamShortFromId(team?.teamId) || "",
      teamId: team?.teamId,
      score,
      label: `${p.fullName}（${team?.teamShort || "所属不明"}）`,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(Boolean(teamId && b.teamId === teamId)) -
        Number(Boolean(teamId && a.teamId === teamId)) ||
      a.fullName.localeCompare(b.fullName, "ja"),
  );
  const top = scored.slice(0, 6);

  if (top.length === 0) {
    return {
      displayName: ocrName || "（不明）",
      ocrName,
      teamShort,
      teamId: teamId as TeamId | undefined,
      status: "unknown",
      confidence: 0,
      candidates: [],
    };
  }

  const best = top[0]!;
  const second = top[1];
  const clearLead = !second || best.score - second.score >= 0.08;
  const strong =
    best.score >= 0.9 &&
    clearLead &&
    (!teamId || best.teamId === teamId || onTeam(best.playerId, teamId, input.year));

  // 球団一致＋十分高い → 確定
  if (
    strong ||
    (best.score >= 0.93 && clearLead) ||
    (teamId &&
      onTeam(best.playerId, teamId, input.year) &&
      best.score >= 0.85 &&
      clearLead)
  ) {
    return {
      displayName: best.fullName,
      ocrName,
      playerId: best.playerId,
      teamShort: best.teamShort || teamShort,
      teamId: best.teamId ?? (teamId as TeamId | undefined),
      status: "matched",
      confidence: best.score,
      candidates: top,
    };
  }

  return {
    displayName: ocrName || best.fullName,
    ocrName,
    teamShort: teamShort || best.teamShort,
    teamId: (teamId as TeamId | undefined) ?? best.teamId,
    status: "ambiguous",
    confidence: best.score,
    candidates: top,
  };
}
