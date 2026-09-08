/**
 * 年間主要表彰の結果区分。
 * - winner: 実選手が受賞
 * - none: 「該当なし」確定（正式結果）
 * - pending: 「未定」（まだ確定していない・正式結果にしない）
 */

export const AWARD_NONE_PLAYER_ID = "__AWARD_NONE__" as const;

export type AwardOutcome = "winner" | "none" | "pending";

export function isAwardNoneToken(name: string): boolean {
  const n = name.trim();
  return n === "該当なし";
}

export function isAwardPendingToken(name: string): boolean {
  const n = name.trim();
  return n === "未定";
}

/** ROOKIE / SAWAMURA のみ「該当なし」「未定」を許可 */
export function awardKeyAllowsNoneOrPending(key: string): boolean {
  return (
    key === "ROOKIE_CL" ||
    key === "ROOKIE_PL" ||
    key === "SAWAMURA" ||
    key === "SAWAMURA_CL" ||
    key === "SAWAMURA_PL"
  );
}

export function isRegisteredAwardNone(a: {
  outcome?: AwardOutcome | null;
  playerId?: string | null;
  playerName?: string | null;
}): boolean {
  if (a.outcome === "none") return true;
  if (a.playerId === AWARD_NONE_PLAYER_ID) return true;
  return isAwardNoneToken(a.playerName ?? "");
}
