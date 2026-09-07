/**
 * 選手名鑑向け：最新所属・検索・球団別名簿。
 * サンプル固定選手は使わない。選手マスター＋所属を参照。
 */

import {
  getPlayerAffiliationsByPlayer,
  getPlayerMaster,
  listPlayerMasters,
  type PlayerMaster,
  type PlayerSeasonAffiliation,
} from "@/data/playerMaster";
import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import { getTeam, type TeamId } from "@/data/teams";
import {
  foldKanjiVariantsForSearch,
  searchPlayerMasterCandidates,
} from "@/lib/manualEntry/searchPlayers";
import { normalizePlayerToken } from "@/lib/playerMaster/similarity";

export type PlayerDirectoryRole = "pitcher" | "batter";

export type PlayerDirectoryEntry = {
  playerId: string;
  fullName: string;
  /** 現在所属球団ショート名。無所属は null */
  teamShort: string | null;
  teamId: TeamId | null;
  position: string;
  role: PlayerDirectoryRole;
};

export type PlayerPositionGroup =
  | "pitcher"
  | "catcher"
  | "infield"
  | "outfield"
  | "other";

const POSITION_GROUP_ORDER: PlayerPositionGroup[] = [
  "pitcher",
  "catcher",
  "infield",
  "outfield",
  "other",
];

export const POSITION_GROUP_LABELS: Record<PlayerPositionGroup, string> = {
  pitcher: "投手",
  catcher: "捕手",
  infield: "内野手",
  outfield: "外野手",
  other: "その他",
};

function shortTeamLabel(name: string | undefined | null): string | null {
  if (!name) return null;
  const map: Record<string, string> = {
    阪神タイガース: "阪神",
    読売ジャイアンツ: "巨人",
    広島東洋カープ: "広島",
    横浜DeNAベイスターズ: "DeNA",
    東京ヤクルトスワローズ: "ヤクルト",
    中日ドラゴンズ: "中日",
    "オリックス・バファローズ": "オリックス",
    福岡ソフトバンクホークス: "ソフトバンク",
    千葉ロッテマリーンズ: "ロッテ",
    北海道日本ハムファイターズ: "日本ハム",
    埼玉西武ライオンズ: "西武",
    東北楽天ゴールデンイーグルス: "楽天",
  };
  return map[name] ?? name;
}

export function classifyPosition(position: string): PlayerPositionGroup {
  const p = position.trim();
  if (!p) return "other";
  if (p.includes("投")) return "pitcher";
  if (p.includes("捕")) return "catcher";
  if (p.includes("内")) return "infield";
  if (p.includes("外")) return "outfield";
  return "other";
}

export function roleFromPosition(position: string): PlayerDirectoryRole {
  return classifyPosition(position) === "pitcher" ? "pitcher" : "batter";
}

/**
 * Museum 内の最新年度所属。
 * 同一年に BLUE/RED がある場合は BLUE を優先（表示用の「現時点」）。
 */
export function getLatestPlayerAffiliation(
  playerId: string,
): PlayerSeasonAffiliation | null {
  const list = getPlayerAffiliationsByPlayer(playerId);
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    const aw = a.world === "BLUE" ? 0 : a.world === "RED" ? 1 : 2;
    const bw = b.world === "BLUE" ? 0 : b.world === "RED" ? 1 : 2;
    return aw - bw;
  })[0]!;
}

/**
 * 最新所属。所属が無い場合は最新の個人成績行の球団へフォールバック。
 * どちらも無い場合は無所属。
 */
export function resolveCurrentPlayerDirectoryEntry(
  master: PlayerMaster,
): PlayerDirectoryEntry {
  const aff = getLatestPlayerAffiliation(master.playerId);
  if (aff) {
    const position = aff.position ?? master.position ?? "";
    const team = getTeam(aff.teamId);
    return {
      playerId: master.playerId,
      fullName: master.fullName,
      teamId: aff.teamId,
      teamShort: team?.short ?? shortTeamLabel(aff.teamName),
      position: position || "—",
      role: roleFromPosition(position),
    };
  }

  const lines = listSeasonLinesByPlayer(master.playerId);
  if (lines.length > 0) {
    const latest = [...lines].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const aw = a.world === "BLUE" ? 0 : a.world === "RED" ? 1 : 2;
      const bw = b.world === "BLUE" ? 0 : b.world === "RED" ? 1 : 2;
      return aw - bw;
    })[0]!;
    const team = getTeam(latest.teamId);
    const position =
      latest.role === "pitcher" ? "投手" : master.position || "野手";
    return {
      playerId: master.playerId,
      fullName: master.fullName,
      teamId: latest.teamId,
      teamShort: team?.short ?? latest.teamName,
      position,
      role: latest.role === "pitcher" ? "pitcher" : "batter",
    };
  }

  return {
    playerId: master.playerId,
    fullName: master.fullName,
    teamId: null,
    teamShort: null,
    position: master.position || "—",
    role: roleFromPosition(master.position || ""),
  };
}

/** 現在その球団に所属する選手（無所属は含めない） */
export function listPlayersOnCurrentTeam(
  teamId: TeamId,
): PlayerDirectoryEntry[] {
  const out: PlayerDirectoryEntry[] = [];
  for (const master of listPlayerMasters()) {
    const entry = resolveCurrentPlayerDirectoryEntry(master);
    if (entry.teamId === teamId) out.push(entry);
  }
  out.sort((a, b) => a.fullName.localeCompare(b.fullName, "ja"));
  return out;
}

export function groupPlayersByPosition(
  players: PlayerDirectoryEntry[],
): { group: PlayerPositionGroup; label: string; players: PlayerDirectoryEntry[] }[] {
  const buckets = new Map<PlayerPositionGroup, PlayerDirectoryEntry[]>();
  for (const g of POSITION_GROUP_ORDER) buckets.set(g, []);
  for (const p of players) {
    const g = classifyPosition(p.position);
    buckets.get(g)!.push(p);
  }
  return POSITION_GROUP_ORDER.map((group) => ({
    group,
    label: POSITION_GROUP_LABELS[group],
    players: buckets.get(group) ?? [],
  })).filter((b) => b.players.length > 0);
}

/**
 * 選手名検索。空クエリは空配列。
 * 漢字部分一致・かな（名字辞書）に加え、最新所属でラベル付け。
 */
export function searchPlayerDirectory(
  query: string,
  limit = 40,
): PlayerDirectoryEntry[] {
  const q = query.trim();
  if (!q) return [];

  // 既存のマスター検索（かな／漢字）を再利用し、最新所属で再構成
  const yearHint =
    getLatestPlayerAffiliation(listPlayerMasters()[0]?.playerId ?? "")?.year ??
    2026;
  const hits = searchPlayerMasterCandidates(q, yearHint, limit * 2);

  const seen = new Set<string>();
  const out: PlayerDirectoryEntry[] = [];
  for (const hit of hits) {
    if (seen.has(hit.player.playerId)) continue;
    seen.add(hit.player.playerId);
    out.push(resolveCurrentPlayerDirectoryEntry(hit.player));
    if (out.length >= limit) break;
  }

  // フォールバック：候補が少ないとき全マスターを追加スキャン
  if (out.length < limit) {
    const qNorm = foldKanjiVariantsForSearch(normalizePlayerToken(q));
    for (const master of listPlayerMasters()) {
      if (seen.has(master.playerId)) continue;
      const targets = [
        master.fullName,
        master.gameDisplayName,
        ...master.aliases,
      ].map((t) => foldKanjiVariantsForSearch(normalizePlayerToken(t)));
      if (!targets.some((t) => t.includes(qNorm) || qNorm.includes(t))) continue;
      seen.add(master.playerId);
      out.push(resolveCurrentPlayerDirectoryEntry(master));
      if (out.length >= limit) break;
    }
  }

  return out;
}
