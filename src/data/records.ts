import type { LinkListItemData } from "@/components/category/LinkList";

export const recordsMenu: LinkListItemData[] = [
  {
    id: "season",
    href: "/records/season",
    title: "シーズン記録",
    description: "1シーズンの個人成績・歴代TOP10",
    icon: "calendar",
  },
  {
    id: "career",
    href: "/records/career",
    title: "通算記録",
    description: "全年度合算の歴代ランキング",
    icon: "book",
  },
  {
    id: "interleague",
    href: "/records/interleague",
    title: "交流戦記録",
    description: "交流戦のみの歴代・通算ランキング",
    icon: "flag",
  },
  {
    id: "streak",
    href: "/records/streak",
    title: "連続記録",
    description: "連続安打・連続無失点など歴代TOP10",
    icon: "chartLine",
  },
  {
    id: "other",
    href: "/records/other",
    title: "その他の偉業",
    description: "特殊記録・歴史的シーズン・NPB史実",
    icon: "building",
  },
];

/** 旧RECORDS入口 → 新4項目へ集約 */
export const recordsSlugAliases: Record<string, string> = {
  "single-game": "other",
  cycle: "other",
  "no-hitter": "other",
  "hit-streak": "streak",
  scoreless: "streak",
};

export function resolveRecordsSlug(slug: string): string {
  return recordsSlugAliases[slug] ?? slug;
}

export function getRecordItem(id: string) {
  const resolved = resolveRecordsSlug(id);
  return recordsMenu.find((item) => item.id === resolved);
}
