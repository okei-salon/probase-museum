import { npbTeams, type TeamId } from "@/data/teams";
import type {
  PennantMatchupCard,
  PennantMatchupDraft,
  PennantLeague,
} from "./types";

function normalizeTeamShortLocal(raw: string): string {
  const t = raw.replace(/\s+/g, "").trim();
  if (!t) return "";
  const aliases: Record<string, string> = {
    阪神: "阪神",
    タイガース: "阪神",
    巨人: "巨人",
    読売: "巨人",
    ジャイアンツ: "巨人",
    広島: "広島",
    カープ: "広島",
    DeNA: "DeNA",
    DNA: "DeNA",
    横浜: "DeNA",
    ベイスターズ: "DeNA",
    ヤクルト: "ヤクルト",
    スワローズ: "ヤクルト",
    中日: "中日",
    ドラゴンズ: "中日",
    オリックス: "オリックス",
    バファローズ: "オリックス",
    ソフトバンク: "ソフトバンク",
    SB: "ソフトバンク",
    ホークス: "ソフトバンク",
    ロッテ: "ロッテ",
    マリーンズ: "ロッテ",
    日本ハム: "日本ハム",
    日ハム: "日本ハム",
    ファイターズ: "日本ハム",
    西武: "西武",
    ライオンズ: "西武",
    楽天: "楽天",
    イーグルス: "楽天",
  };
  if (aliases[t]) return aliases[t]!;
  for (const [k, v] of Object.entries(aliases)) {
    if (t.includes(k)) return v;
  }
  const hit = npbTeams.find(
    (team) =>
      team.short === t || team.name.includes(t) || t.includes(team.short),
  );
  return hit?.short ?? t;
}

function teamIdFromShortLocal(short: string): TeamId | undefined {
  const n = normalizeTeamShortLocal(short);
  return npbTeams.find((t) => t.short === n)?.id;
}

export function shortFromTeamId(id: TeamId): string {
  return npbTeams.find((t) => t.id === id)?.short ?? id;
}

export function leagueOfTeamId(id: TeamId): PennantLeague | null {
  const t = npbTeams.find((x) => x.id === id);
  if (!t) return null;
  return t.league === "セ" ? "central" : "pacific";
}

/** 同一カード判定キー（向き非依存） */
export function matchupPairKey(aId: TeamId, bId: TeamId): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function cardPairKey(
  card: Pick<PennantMatchupCard, "teamAId" | "teamBId">,
): string {
  return matchupPairKey(card.teamAId, card.teamBId);
}

/**
 * teamA 視点の勝敗を、辞書順で小さい teamId が teamA になるよう正規化。
 * A-B と B-A を同一カードに畳む。
 */
export function normalizeMatchupCard(
  draft: PennantMatchupDraft,
): PennantMatchupCard | null {
  const shortA = normalizeTeamShortLocal(draft.teamA);
  const shortB = normalizeTeamShortLocal(draft.teamB);
  const idA = draft.teamAId ?? teamIdFromShortLocal(shortA);
  const idB = draft.teamBId ?? teamIdFromShortLocal(shortB);
  if (!idA || !idB || idA === idB) return null;

  const wins = Math.max(0, Math.floor(Number(draft.wins) || 0));
  const losses = Math.max(0, Math.floor(Number(draft.losses) || 0));
  const draws = Math.max(0, Math.floor(Number(draft.draws) || 0));

  if (idA < idB) {
    return {
      teamAId: idA,
      teamBId: idB,
      teamA: shortFromTeamId(idA),
      teamB: shortFromTeamId(idB),
      wins,
      losses,
      draws,
    };
  }
  return {
    teamAId: idB,
    teamBId: idA,
    teamA: shortFromTeamId(idB),
    teamB: shortFromTeamId(idA),
    wins: losses,
    losses: wins,
    draws,
  };
}

/** 指定球団視点の勝敗へ変換（表示用） */
export function viewMatchupFromTeam(
  card: PennantMatchupCard,
  perspectiveTeamId: TeamId,
): {
  opponentId: TeamId;
  opponent: string;
  wins: number;
  losses: number;
  draws: number;
} | null {
  if (card.teamAId === perspectiveTeamId) {
    return {
      opponentId: card.teamBId,
      opponent: card.teamB,
      wins: card.wins,
      losses: card.losses,
      draws: card.draws,
    };
  }
  if (card.teamBId === perspectiveTeamId) {
    return {
      opponentId: card.teamAId,
      opponent: card.teamA,
      wins: card.losses,
      losses: card.wins,
      draws: card.draws,
    };
  }
  return null;
}

/** 入力カード列を正規化・同一キーは後勝ちで畳み込み */
export function normalizeMatchupDrafts(
  drafts: PennantMatchupDraft[],
): PennantMatchupCard[] {
  const map = new Map<string, PennantMatchupCard>();
  for (const d of drafts) {
    const card = normalizeMatchupCard(d);
    if (!card) continue;
    map.set(cardPairKey(card), card);
  }
  return [...map.values()].sort((a, b) =>
    cardPairKey(a).localeCompare(cardPairKey(b)),
  );
}

/** 既存カード配列へ入力分だけ upsert（未入力は削除しない） */
export function mergeMatchupCards(
  existing: PennantMatchupCard[],
  incoming: PennantMatchupCard[],
): PennantMatchupCard[] {
  const map = new Map<string, PennantMatchupCard>();
  for (const c of existing) {
    map.set(cardPairKey(c), c);
  }
  for (const c of incoming) {
    map.set(cardPairKey(c), c);
  }
  return [...map.values()].sort((a, b) =>
    cardPairKey(a).localeCompare(cardPairKey(b)),
  );
}
