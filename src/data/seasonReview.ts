/**
 * SEASON_REVIEW — YEAR × WORLD の正式シーズン総評。
 * 正本は yearbook-reviews（localStorage + museum_documents）。
 * 旧 season-highlights は読み取り互換のみ（削除・初期化しない）。
 */

import {
  getSeasonHighlightText,
  hydrateSeasonHighlightsFromCloud,
} from "@/data/seasonHighlights";
import {
  getYearbookReview,
  hydrateYearbookReviewsFromCloud,
  upsertYearbookReview,
} from "@/data/yearbook/store";
import type {
  YearbookReviewSource,
  YearbookSeasonReview,
} from "@/data/yearbook/types";
import type { SeasonIdentity } from "@/data/seasons";

export type SeasonReviewSource = YearbookReviewSource | "partner";

/**
 * 総評本文を取得。正本（yearbook）を優先し、無ければ旧ハイライトを返す。
 * 未登録は null（空文字は未登録扱い）。
 */
export function getSeasonReviewBody(
  identity: SeasonIdentity,
): string | null {
  const review = getYearbookReview(identity);
  const body = review?.body ?? "";
  if (body.trim()) return body;

  const legacy = getSeasonHighlightText(identity);
  if (legacy?.trim()) return legacy;
  return null;
}

export function hasSeasonReview(identity: SeasonIdentity): boolean {
  return getSeasonReviewBody(identity) != null;
}

export function getSeasonReviewRecord(
  identity: SeasonIdentity,
): YearbookSeasonReview | null {
  const review = getYearbookReview(identity);
  if (review?.body?.trim()) return review;
  return null;
}

/** 空本文は保存しない。正本は yearbook-reviews のみ。 */
export function upsertSeasonReview(input: {
  identity: SeasonIdentity;
  body: string;
  source?: SeasonReviewSource;
}): YearbookSeasonReview {
  const body = input.body.replace(/\s+$/, "");
  if (!body.trim()) {
    throw new Error("シーズン総評の本文が空です");
  }
  const source: YearbookReviewSource =
    input.source === "partner" || input.source === "imported"
      ? "imported"
      : input.source === "ai"
        ? "ai"
        : "manual";
  return upsertYearbookReview({
    identity: input.identity,
    body,
    source,
    confirmed: true,
  });
}

export async function hydrateSeasonReviewSources(): Promise<void> {
  await Promise.allSettled([
    hydrateYearbookReviewsFromCloud(),
    hydrateSeasonHighlightsFromCloud(),
  ]);
}
