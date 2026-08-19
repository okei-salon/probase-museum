import {
  getPlayerAffiliation,
  listPlayerAffiliations,
  listPlayerMasters,
} from "@/data/playerMaster";
import { surnamesFromReading } from "@/data/playerMaster/surnameReadings";
import type {
  PlayerMaster,
  PlayerSeasonAffiliation,
} from "@/data/playerMaster/types";
import { normalizePlayerToken } from "@/lib/playerMaster/similarity";

export type PlayerSearchHit = {
  player: PlayerMaster;
  affiliation: PlayerSeasonAffiliation | null;
  /** 表示用: 佐藤輝明（阪神） */
  label: string;
  teamShort: string;
};

function shortTeamName(name: string | undefined | null): string {
  if (!name) return "—";
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

function affiliationForYear(
  playerId: string,
  year: number,
): PlayerSeasonAffiliation | null {
  return (
    getPlayerAffiliation(playerId, year) ??
    listPlayerAffiliations()
      .filter((a) => a.playerId === playerId)
      .sort((a, b) => b.year - a.year)[0] ??
    null
  );
}

function matchesKanji(query: string, player: PlayerMaster): boolean {
  const q = normalizePlayerToken(query);
  if (!q) return false;
  const targets = [
    player.fullName,
    player.gameDisplayName,
    ...player.aliases,
  ].map(normalizePlayerToken);
  return targets.some((t) => t.includes(q) || q.includes(t));
}

function isKanaQuery(query: string): boolean {
  const t = query.trim();
  return /^[\u3040-\u309f\u30a0-\u30ffー]+$/.test(t);
}

/**
 * 選手マスターから部分一致候補を返す。
 * 漢字・かな（主要名字辞書）に対応。同姓は「氏名＋球団」で区別。
 */
export function searchPlayerMasterCandidates(
  query: string,
  year: number,
  limit = 12,
): PlayerSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const masters = listPlayerMasters();
  let matched: PlayerMaster[] = [];

  if (isKanaQuery(q)) {
    const surnames = surnamesFromReading(q);
    if (surnames.length === 0) return [];
    matched = masters.filter((p) =>
      surnames.some(
        (s) =>
          p.gameDisplayName === s ||
          p.fullName.startsWith(s) ||
          p.aliases.some((a) => a.includes(s)),
      ),
    );
  } else {
    matched = masters.filter((p) => matchesKanji(q, p));
  }

  // 名字完全一致を優先、次いでフルネーム前方一致
  const qNorm = normalizePlayerToken(q);
  matched.sort((a, b) => {
    const score = (p: PlayerMaster) => {
      let s = 0;
      if (p.gameDisplayName === qNorm) s += 100;
      if (p.fullName.startsWith(qNorm)) s += 50;
      if (p.fullName.includes(qNorm)) s += 20;
      if (p.gameDisplayName.includes(qNorm)) s += 10;
      return s;
    };
    return score(b) - score(a) || a.fullName.localeCompare(b.fullName, "ja");
  });

  return matched.slice(0, limit).map((player) => {
    const affiliation = affiliationForYear(player.playerId, year);
    const teamShort = shortTeamName(affiliation?.teamName);
    return {
      player,
      affiliation,
      teamShort,
      label: `${player.fullName}（${teamShort}）`,
    };
  });
}
