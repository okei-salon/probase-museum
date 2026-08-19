import type { LinkListItemData } from "@/components/category/LinkList";
import {
  getPlayerAffiliation,
  getPlayerAffiliationsByPlayer,
  getPlayerMaster,
} from "@/data/playerMaster";

export const playersTopMenu: LinkListItemData[] = [
  {
    id: "search",
    href: "/players/search",
    title: "選手名検索",
    description: "氏名・読みから選手を検索",
    icon: "search",
  },
  {
    id: "by-team",
    href: "/players/by-team",
    title: "球団から検索",
    description: "12球団ごとの選手一覧",
    icon: "flag",
  },
];

export const samplePlayers = [
  { id: "demo-01", name: "サンプル 太郎", team: "阪神", position: "内野手" },
  { id: "demo-02", name: "サンプル 次郎", team: "巨人", position: "投手" },
  { id: "demo-03", name: "サンプル 三郎", team: "ソフトバンク", position: "外野手" },
] as const;

/** 選手詳細の正式5項目 */
export const playerDetailSections: LinkListItemData[] = [
  {
    id: "profile",
    href: "",
    title: "基本情報",
    description: "所属・タイトル・SOP概要",
    icon: "user",
  },
  {
    id: "yearly",
    href: "",
    title: "年度別成績",
    description: "年ごとの打撃／投手成績",
    icon: "calendar",
  },
  {
    id: "career",
    href: "",
    title: "通算成績",
    description: "通算成績と歴代順位",
    icon: "book",
  },
  {
    id: "sop",
    href: "",
    title: "SOP",
    description: "年度別SOPと通算順位",
    icon: "star",
  },
  {
    id: "other",
    href: "",
    title: "その他の記録",
    description: "連続記録・特殊記録・偉業",
    icon: "trophy",
  },
];

/** 旧セクション → 新セクション */
export const playerSectionAliases: Record<string, string> = {
  awards: "profile",
  records: "other",
  stories: "profile",
  feats: "other",
};

export function resolvePlayerSection(section: string): string {
  return playerSectionAliases[section] ?? section;
}

export type PlayerListItem = {
  id: string;
  name: string;
  team: string;
  position: string;
};

function shortTeamLabel(name: string): string {
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

/** デモ選手 + 選手マスター（NPB辞書）の両方を解決 */
export function getPlayer(id: string): PlayerListItem | undefined {
  const sample = samplePlayers.find((p) => p.id === id);
  if (sample) {
    return {
      id: sample.id,
      name: sample.name,
      team: sample.team,
      position: sample.position,
    };
  }

  const master = getPlayerMaster(id);
  if (!master) return undefined;

  const aff =
    getPlayerAffiliation(id, 2026) ??
    getPlayerAffiliationsByPlayer(id).at(-1) ??
    null;

  return {
    id: master.playerId,
    name: master.fullName,
    team: aff ? shortTeamLabel(aff.teamName) : "—",
    position: aff?.position ?? master.position,
  };
}

export function getPlayerSectionLinks(playerId: string): LinkListItemData[] {
  return playerDetailSections.map((section) => ({
    ...section,
    href: `/players/${playerId}/${section.id}`,
  }));
}
