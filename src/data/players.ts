import type { LinkListItemData } from "@/components/category/LinkList";
import { getPlayerMaster } from "@/data/playerMaster";
import { getLatestPlayerAffiliation } from "@/data/players/directory";
import { getTeam } from "@/data/teams";

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
    description: "12球団の現在所属選手",
    icon: "flag",
  },
];

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

/** 選手マスターから解決（固定サンプルは使わない） */
export function getPlayer(id: string): PlayerListItem | undefined {
  const master = getPlayerMaster(id);
  if (!master) return undefined;

  const aff = getLatestPlayerAffiliation(id);
  const team = aff
    ? (getTeam(aff.teamId)?.short ?? aff.teamName)
    : "—";

  return {
    id: master.playerId,
    name: master.fullName,
    team,
    position: aff?.position ?? master.position,
  };
}

export function getPlayerSectionLinks(playerId: string): LinkListItemData[] {
  return playerDetailSections.map((section) => ({
    ...section,
    href: `/players/${playerId}/${section.id}`,
  }));
}
