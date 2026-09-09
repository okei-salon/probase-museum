/**
 * YEARBOOK セクション定義と SEASON_REVIEW 公開 API。
 */

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

export {
  getSeasonReviewBody,
  getSeasonReviewRecord,
  hasSeasonReview,
  hydrateSeasonReviewSources,
  upsertSeasonReview,
} from "@/data/seasonReview";

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

/**
 * YEARBOOK 年度内セクション。
 * サマリー / 年表 / シーズン総評は同じ YEAR×WORLD に紐付く。
 */
export const yearbookSections = [
  {
    id: "summary",
    title: "サマリー",
    description: "優勝・表彰・最終順位を俯瞰する入口",
    icon: "trophy" as const,
  },
  {
    id: "timeline",
    title: "年表",
    description: "その年の主要出来事を時系列で見る入口",
    icon: "calendar" as const,
  },
  {
    id: "overview",
    title: "シーズン総評",
    description: "その年全体を文章で振り返る入口",
    icon: "book" as const,
  },
] as const;

export type YearbookSectionId = (typeof yearbookSections)[number]["id"];

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
  review: "overview",
  highlight: "overview",
};

export function resolveYearbookSection(section: string): string {
  return yearbookSectionAliases[section] ?? section;
}

export function getYearbookSectionLinks(seasonKey: string): LinkListItemData[] {
  return yearbookSections.map((section) => ({
    id: section.id,
    href:
      section.id === "summary"
        ? `/seasons/${seasonKey}/summary`
        : `/yearbook/${seasonKey}/${section.id}`,
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
