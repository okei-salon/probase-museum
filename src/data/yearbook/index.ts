import type { LinkListItemData } from "@/components/category/LinkList";
import type { SelectGridItem } from "@/components/category/SelectGrid";
import {
  formatSeasonLineLabel,
  listEntrySeasonIdentities,
  seasonDisplayTitle,
} from "@/data/seasons";

export type {
  YearbookReviewSource,
  YearbookSeasonContext,
  YearbookSeasonReview,
} from "./types";

export {
  clearYearbookReview,
  getYearbookReview,
  hydrateYearbookReviewsFromCloud,
  listYearbookReviews,
  upsertYearbookReview,
} from "./store";

export { buildYearbookSeasonContext } from "./context";

/** YEARBOOK ハブ: BLUE / RED / 旧年度 / DEMO を別カードで列挙 */
export function getYearbookYearItems(): SelectGridItem[] {
  return listEntrySeasonIdentities().map((identity) => ({
    id: identity.seasonKey,
    href: `/yearbook/${identity.seasonKey}`,
    title: formatSeasonLineLabel(identity),
    subtitle:
      identity.kind === "demo"
        ? "DEMO YEARBOOK"
        : identity.world
          ? `${identity.world} YEARBOOK`
          : "YEARBOOK",
    featured:
      identity.year === 2023 ||
      identity.kind === "demo" ||
      identity.world === "BLUE",
  }));
}

/** YEARBOOK 年度内はシーズン総評のみ */
export const yearbookSections = [
  {
    id: "overview",
    title: "シーズン総評",
    description: "その年の流れを文章で振り返る年鑑記事",
    icon: "book" as const,
  },
] as const;

/** 廃止セクション → シーズン総評へ誘導 */
export const yearbookSectionAliases: Record<string, string> = {
  news: "overview",
  "pennant-story": "overview",
  "interleague-story": "overview",
  "postseason-story": "overview",
  "title-race": "overview",
  "rookie-race": "overview",
  feats: "overview",
  spotlight: "overview",
  symbol: "overview",
};

export function resolveYearbookSection(section: string): string {
  return yearbookSectionAliases[section] ?? section;
}

export function getYearbookSectionLinks(seasonKey: string): LinkListItemData[] {
  return yearbookSections.map((section) => ({
    id: section.id,
    href: `/yearbook/${seasonKey}/${section.id}`,
    title: section.title,
    description: section.description,
    icon: section.icon,
  }));
}

export function getYearbookSection(id: string) {
  const resolved = resolveYearbookSection(id);
  return yearbookSections.find((s) => s.id === resolved);
}

export { seasonDisplayTitle };
