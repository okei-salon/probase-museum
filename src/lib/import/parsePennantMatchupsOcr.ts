/**
 * プロスピ「対戦表」画面OCRテキスト → リーグ内対戦カード。
 *
 * 行球団視点の「相手 勝-敗-分」を読み取り、正規化前ドラフトとして返す。
 * 同一カードの上下/左右二重出現は呼び出し側の normalize で畳む。
 */

import { npbTeams, type TeamId } from "@/data/teams";
import { normalizeOcrText } from "@/lib/import/ocr";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import type {
  PennantLeague,
  PennantMatchupDraft,
} from "@/data/pennantMatchups/types";

const TEAM_SHORTS = npbTeams.map((t) => t.short);

function teamsForLeague(
  league?: PennantLeague | null,
): Array<(typeof npbTeams)[number]> {
  if (league === "central") return npbTeams.filter((t) => t.league === "セ");
  if (league === "pacific") return npbTeams.filter((t) => t.league === "パ");
  return [...npbTeams];
}

function findTeamsInText(text: string): string[] {
  const hits: { short: string; idx: number }[] = [];
  for (const short of TEAM_SHORTS) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(short, from);
      if (idx < 0) break;
      hits.push({ short, idx });
      from = idx + short.length;
    }
  }
  hits.sort((a, b) => a.idx - b.idx || b.short.length - a.short.length);
  const out: string[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.idx < lastEnd) continue;
    out.push(h.short);
    lastEnd = h.idx + h.short.length;
  }
  return out;
}

function parseScoreToken(raw: string): {
  wins: number;
  losses: number;
  draws: number;
} | null {
  const s = raw.replace(/\s+/g, "");
  const jp = s.match(/(\d+)勝(\d+)敗(?:(\d+)分)?/);
  if (jp) {
    return {
      wins: Number(jp[1]),
      losses: Number(jp[2]),
      draws: Number(jp[3] ?? 0),
    };
  }
  const dash = s.match(
    /(\d+)\s*[-－—–―~〜]\s*(\d+)(?:\s*[-－—–―~〜]\s*(\d+))?/,
  );
  if (dash) {
    return {
      wins: Number(dash[1]),
      losses: Number(dash[2]),
      draws: Number(dash[3] ?? 0),
    };
  }
  return null;
}

function resolveId(short: string): TeamId | undefined {
  return npbTeams.find((t) => t.short === normalizeTeamShort(short))?.id;
}

function pushDraft(
  out: PennantMatchupDraft[],
  subject: string,
  opponent: string,
  score: { wins: number; losses: number; draws: number },
  allowed: Set<string>,
) {
  const a = normalizeTeamShort(subject);
  const b = normalizeTeamShort(opponent);
  if (!a || !b || a === b) return;
  if (allowed.size && (!allowed.has(a) || !allowed.has(b))) return;
  out.push({
    teamA: a,
    teamB: b,
    teamAId: resolveId(a),
    teamBId: resolveId(b),
    wins: score.wins,
    losses: score.losses,
    draws: score.draws,
  });
}

/**
 * OCRテキストから対戦カード候補を抽出。
 * subject（行球団）視点の勝敗として解釈する。
 */
export function parsePennantMatchupsOcrText(
  rawText: string,
  league?: PennantLeague | null,
): PennantMatchupDraft[] {
  const text = normalizeOcrText(rawText);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const pool = teamsForLeague(league);
  const allowed = new Set<string>(pool.map((t) => t.short));
  const drafts: PennantMatchupDraft[] = [];
  let subject: string | null = null;

  for (const line of lines) {
    // 相棒互換: 阪神|中日=14-11-0 / 阪神|中日=14-11
    const pipeEq = line.match(
      /^(.+?)\s*[|｜]\s*(.+?)\s*=\s*(.+)$/,
    );
    if (pipeEq) {
      const score = parseScoreToken(pipeEq[3]!);
      if (score) {
        pushDraft(drafts, pipeEq[1]!, pipeEq[2]!, score, allowed);
        continue;
      }
    }

    // 阪神 vs 中日 14-11-0 / 阪神対中日 14勝11敗0分
    const vs = line.match(
      /^(.+?)\s*(?:vs|VS|対)\s*(.+?)(?:\s+|[:：]|[|｜])(.+)$/,
    );
    if (vs) {
      const score = parseScoreToken(vs[3]!);
      if (score) {
        pushDraft(drafts, vs[1]!, vs[2]!, score, allowed);
        continue;
      }
    }

    const teams = findTeamsInText(line).filter((t) => allowed.has(t));
    const score = parseScoreToken(line);

    // 球団名だけの行 → 行視点の主体
    if (teams.length === 1 && !score) {
      subject = teams[0]!;
      continue;
    }

    // 主体行に埋め込み: 阪神 中日 14-11-0
    if (teams.length >= 2 && score) {
      pushDraft(drafts, teams[0]!, teams[1]!, score, allowed);
      subject = teams[0]!;
      continue;
    }

    // 相手 + スコア（主体は直前のヘッダ）
    if (subject && teams.length >= 1 && score) {
      const opp = teams.find((t) => t !== subject) ?? teams[0]!;
      if (opp !== subject) {
        pushDraft(drafts, subject, opp, score, allowed);
      }
      continue;
    }

    // スコアのみ行はスキップ（主体不明）
  }

  return drafts;
}
