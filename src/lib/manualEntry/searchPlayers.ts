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

/**
 * 検索時のみ異体字を同一視（保存名は変換しない）。
 * 崎/﨑・高/髙 など主要ペア。
 */
export function foldKanjiVariantsForSearch(input: string): string {
  return input
    .replace(/﨑/g, "崎")
    .replace(/髙/g, "高")
    .replace(/濵/g, "浜")
    .replace(/邉/g, "辺")
    .replace(/齋/g, "斎");
}

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
  const q = foldKanjiVariantsForSearch(normalizePlayerToken(query));
  if (!q) return false;
  const targets = [
    player.fullName,
    player.gameDisplayName,
    ...player.aliases,
  ].map((t) => foldKanjiVariantsForSearch(normalizePlayerToken(t)));
  return targets.some((t) => t.includes(q) || q.includes(t));
}

function isKanaQuery(query: string): boolean {
  const t = query.trim();
  return /^[\u3040-\u309f\u30a0-\u30ffー]+$/.test(t);
}

/**
 * 選手マスターから部分一致候補を返す。
 * 漢字・かな（主要名字辞書）に対応。同姓は「氏名＋球団」で区別。
 * 検索時のみ 崎/﨑・高/髙 等を同一視。正式名はそのまま返す。
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
    if (surnames.length > 0) {
      matched = masters.filter((p) =>
        surnames.some((s) => {
          const folded = foldKanjiVariantsForSearch(s);
          return (
            foldKanjiVariantsForSearch(p.gameDisplayName) === folded ||
            foldKanjiVariantsForSearch(p.fullName).startsWith(folded) ||
            p.aliases.some((a) =>
              foldKanjiVariantsForSearch(a).includes(folded),
            )
          );
        }),
      );
    }
    // 名字辞書に無いカタカナ（レイ等）は氏名部分一致へフォールバック
    if (matched.length === 0) {
      matched = masters.filter((p) => matchesKanji(q, p));
    }
  } else {
    matched = masters.filter((p) => matchesKanji(q, p));
  }

  // 該当年所属を優先、名字完全一致 → フルネーム前方一致
  const qNorm = foldKanjiVariantsForSearch(normalizePlayerToken(q));
  matched.sort((a, b) => {
    const score = (p: PlayerMaster) => {
      const full = foldKanjiVariantsForSearch(normalizePlayerToken(p.fullName));
      const game = foldKanjiVariantsForSearch(
        normalizePlayerToken(p.gameDisplayName),
      );
      let s = 0;
      if (getPlayerAffiliation(p.playerId, year)) s += 80;
      if (game === qNorm) s += 100;
      if (full.startsWith(qNorm)) s += 50;
      if (full.includes(qNorm)) s += 20;
      if (game.includes(qNorm)) s += 10;
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
