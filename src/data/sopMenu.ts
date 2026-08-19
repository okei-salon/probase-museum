import type { LinkListItemData } from "@/components/category/LinkList";

/** SOPトップの正式項目 */
export const sopMenu: LinkListItemData[] = [
  {
    id: "season",
    href: "/sop/season",
    title: "シーズンSOP",
    description: "年度ごとの総合／野手／投手ランキング（最終SOP）",
    icon: "calendar",
    iconClassName: "text-sky-300",
  },
  {
    id: "career",
    href: "/sop/career",
    title: "通算SOP",
    description: "全年度合算の総合／野手／投手ランキング",
    icon: "book",
    iconClassName: "text-sky-200",
  },
  {
    id: "four-kings",
    href: "/sop/four-kings",
    title: "SOP四天王",
    description: "野手・投手それぞれの通算SOP上位4名",
    icon: "crown",
    iconClassName: "text-museum-gold",
  },
  {
    id: "interleague",
    href: "/sop/interleague",
    title: "交流戦SOP",
    description: "交流戦10部門SOP・四天王（シーズン）",
    icon: "flag",
    iconClassName: "text-sky-300",
  },
  {
    id: "interleague-career",
    href: "/sop/interleague-career",
    title: "交流戦通算SOP",
    description: "交流戦だけで獲得したSOPの通算ランキング",
    icon: "globe",
    iconClassName: "text-sky-200",
  },
  {
    id: "rules",
    href: "/sop/rules",
    title: "SOP評価基準",
    description: "採点ルールの一覧（既存ロジックと同一）",
    icon: "file",
    iconClassName: "text-sky-200",
  },
];

/** 旧URL → 新4項目 */
export const sopSlugAliases: Record<string, string> = {
  "all-time": "career",
  batters: "career",
  pitchers: "career",
  categories: "career",
  metrics: "rules",
  "batter-four": "four-kings",
  "pitcher-four": "four-kings",
};

export function resolveSopSlug(slug: string): string {
  return sopSlugAliases[slug] ?? slug;
}

export function getSopItem(id: string) {
  const resolved = resolveSopSlug(id);
  return sopMenu.find((item) => item.id === resolved);
}
