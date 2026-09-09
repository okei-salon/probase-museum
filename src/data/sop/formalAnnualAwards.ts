/**
 * 年間表彰SOP用の正式受賞者インデックス。
 *
 * 画面（resolve*Board）と同じ解決結果だけを正とする。
 * レジストリの余剰行・重複ポジション・推測からは加点しない。
 */

import type { ResolvedAwardCard } from "@/data/awards";
import { listSavedMonthlyMvpForSeason } from "@/data/import/store";
import { getInterleagueMvp } from "@/data/interleague";
import { getJapanSeriesMvp } from "@/data/postseason";
import {
  AWARD_NONE_PLAYER_ID,
  isRegisteredAwardNone,
} from "@/lib/import/partnerPaste/awardOutcome";
import type { AnnualAwardKind } from "@/lib/sop/rules";
import type { SopAwardInput } from "@/lib/sop";
import type { SeasonIdentity } from "@/data/seasons";
import { listRegisteredAwardsForSeason } from "./awardsRegistry";
import {
  resolveBestNineBoard,
  resolveGoldenGloveBoard,
  resolveMvpBoard,
  resolveRookieBoard,
  resolveSawamuraBoard,
} from "./seasonAwardsView";

function isRealAwardPlayerId(
  playerId: string | null | undefined,
): playerId is string {
  if (!playerId) return false;
  if (playerId === AWARD_NONE_PLAYER_ID) return false;
  if (playerId === "unknown") return false;
  return true;
}

function isRealAwardCard(
  card: ResolvedAwardCard | null | undefined,
): card is ResolvedAwardCard {
  if (!card) return false;
  if (!isRealAwardPlayerId(card.playerId)) return false;
  const name = (card.playerName ?? "").trim();
  if (!name || name === "未登録" || name === "該当なし" || name === "登録待ち") {
    return false;
  }
  return true;
}

function addKind(
  kindsByPlayer: Map<string, Set<AnnualAwardKind>>,
  playerId: string,
  kind: AnnualAwardKind,
): void {
  let set = kindsByPlayer.get(playerId);
  if (!set) {
    set = new Set();
    kindsByPlayer.set(playerId, set);
  }
  set.add(kind);
}

function addCard(
  kindsByPlayer: Map<string, Set<AnnualAwardKind>>,
  card: ResolvedAwardCard | null | undefined,
  kind: AnnualAwardKind,
): void {
  if (!isRealAwardCard(card)) return;
  addKind(kindsByPlayer, card.playerId, kind);
}

/**
 * YEAR×WORLD の正式年間表彰 → playerId ごとの SOP 入力。
 * ベストナイン／GG は「枠に採用された受賞者」のみ（余剰レジストリ行は除外）。
 */
export function buildFormalAnnualAwardsByPlayer(
  identity: SeasonIdentity,
): Map<string, SopAwardInput[]> {
  const kindsByPlayer = new Map<string, Set<AnnualAwardKind>>();
  const monthlyCount = new Map<string, number>();

  const mvp = resolveMvpBoard(identity);
  addCard(kindsByPlayer, mvp.central, "mvp");
  addCard(kindsByPlayer, mvp.pacific, "mvp");

  const rookie = resolveRookieBoard(identity);
  addCard(kindsByPlayer, rookie.central, "rookie");
  addCard(kindsByPlayer, rookie.pacific, "rookie");

  const sawamura = resolveSawamuraBoard(identity);
  addCard(kindsByPlayer, sawamura.central, "sawamura");

  const bestNine = resolveBestNineBoard(identity);
  for (const card of [...bestNine.central, ...bestNine.pacific]) {
    addCard(kindsByPlayer, card, "bestNine");
  }

  const goldenGlove = resolveGoldenGloveBoard(identity);
  for (const card of [...goldenGlove.central, ...goldenGlove.pacific]) {
    addCard(kindsByPlayer, card, "goldenGlove");
  }

  try {
    const js = getJapanSeriesMvp(identity);
    if (
      isRealAwardPlayerId(js.playerId) &&
      js.playerName &&
      js.playerName !== "登録待ち" &&
      js.playerName !== "未登録"
    ) {
      addKind(kindsByPlayer, js.playerId, "japanSeriesMvp");
    }
  } catch {
    /* ignore */
  }

  try {
    const il = getInterleagueMvp(identity);
    if (
      isRealAwardPlayerId(il.playerId) &&
      il.playerName &&
      il.playerName !== "登録待ち" &&
      il.playerName !== "未登録"
    ) {
      addKind(kindsByPlayer, il.playerId, "interleagueMvp");
    }
  } catch {
    /* ignore */
  }

  // 月間MVP: レジストリを優先。無ければ月間ストア。
  try {
    const regMonthly = listRegisteredAwardsForSeason(identity).filter(
      (a) => a.kind === "monthlyMvp" && !isRegisteredAwardNone(a),
    );
    if (regMonthly.length > 0) {
      for (const a of regMonthly) {
        if (!isRealAwardPlayerId(a.playerId)) continue;
        monthlyCount.set(
          a.playerId,
          (monthlyCount.get(a.playerId) ?? 0) + 1,
        );
      }
    } else {
      const monthly = listSavedMonthlyMvpForSeason(identity);
      for (const r of monthly) {
        if (isRealAwardPlayerId(r.batter?.playerId)) {
          monthlyCount.set(
            r.batter!.playerId,
            (monthlyCount.get(r.batter!.playerId) ?? 0) + 1,
          );
        }
        if (isRealAwardPlayerId(r.pitcher?.playerId)) {
          monthlyCount.set(
            r.pitcher!.playerId,
            (monthlyCount.get(r.pitcher!.playerId) ?? 0) + 1,
          );
        }
      }
    }
  } catch {
    /* ignore */
  }

  const out = new Map<string, SopAwardInput[]>();
  const playerIds = new Set<string>([
    ...kindsByPlayer.keys(),
    ...monthlyCount.keys(),
  ]);

  for (const playerId of playerIds) {
    const items: SopAwardInput[] = [];
    const kinds = kindsByPlayer.get(playerId);
    if (kinds) {
      for (const kind of kinds) {
        items.push({ kind });
      }
    }
    const m = monthlyCount.get(playerId) ?? 0;
    if (m > 0) items.push({ kind: "monthlyMvp", count: m });
    if (items.length) out.set(playerId, items);
  }

  return out;
}

export type AnnualAwardSopAuditFinding = {
  playerId: string;
  playerName: string;
  kind: AnnualAwardKind;
  issue: "false_positive" | "false_negative";
};

/**
 * 正式受賞一覧 vs SOP年間表彰の不一致を列挙（読み取り専用）。
 * false_positive: SOP対象選手に、正式受賞に無い表彰が付いている
 * false_negative: 正式受賞者で SOP 対象なのに、当該表彰が無い
 *
 * 成績未登録で SOP ランキング自体に出ない受賞者は false_negative にしない
 * （SOP対象外のため）。
 */
export function auditAnnualAwardsSopConsistency(
  identity: SeasonIdentity,
  sopResults: Array<{
    playerId: string;
    playerName: string;
    items: Array<{ category: string; id: string; label: string }>;
  }>,
): AnnualAwardSopAuditFinding[] {
  const formal = buildFormalAnnualAwardsByPlayer(identity);
  const findings: AnnualAwardSopAuditFinding[] = [];

  const sopKindsByPlayer = new Map<string, Set<AnnualAwardKind>>();
  const nameByPlayer = new Map<string, string>();
  const sopPlayerIds = new Set<string>();

  for (const r of sopResults) {
    if (!r.playerId) continue;
    sopPlayerIds.add(r.playerId);
    nameByPlayer.set(r.playerId, r.playerName);
    let set = sopKindsByPlayer.get(r.playerId);
    if (!set) {
      set = new Set();
      sopKindsByPlayer.set(r.playerId, set);
    }
    for (const item of r.items) {
      if (item.category !== "annual_awards") continue;
      const kind = item.id
        .replace(/^award:/, "")
        .split(":")[0] as AnnualAwardKind;
      if (kind) set.add(kind);
    }
  }

  for (const playerId of sopPlayerIds) {
    const formalKinds = new Set(
      (formal.get(playerId) ?? []).map((a) => a.kind),
    );
    const sopKinds = sopKindsByPlayer.get(playerId) ?? new Set();
    const name = nameByPlayer.get(playerId) ?? playerId;

    for (const kind of sopKinds) {
      if (!formalKinds.has(kind)) {
        findings.push({
          playerId,
          playerName: name,
          kind,
          issue: "false_positive",
        });
      }
    }
    for (const kind of formalKinds) {
      if (!sopKinds.has(kind)) {
        findings.push({
          playerId,
          playerName: name,
          kind,
          issue: "false_negative",
        });
      }
    }
  }

  return findings;
}
