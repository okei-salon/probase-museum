/**
 * SEASON_REVIEW — YEAR × WORLD の正式シーズン総評（4大項目）。
 * 正本は yearbook-reviews（localStorage + museum_documents）。
 * 旧 season-highlights / 既存 body は GENERAL の読み取り互換（削除・初期化しない）。
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
  SeasonReviewKind,
  YearbookReviewSource,
  YearbookSeasonReview,
} from "@/data/yearbook/types";
import {
  SEASON_REVIEW_KIND_LABELS,
} from "@/data/yearbook/types";
import type { SeasonIdentity } from "@/data/seasons";

export type SeasonReviewSource = YearbookReviewSource | "partner";

export type { SeasonReviewKind };
export { SEASON_REVIEW_KIND_LABELS };

export const SEASON_REVIEW_KINDS: SeasonReviewKind[] = [
  "general",
  "central",
  "pacific",
  "teams",
];

function trimBody(body: string): string {
  return body.replace(/\s+$/, "");
}

function sectionFromRecord(
  review: YearbookSeasonReview | null,
  kind: SeasonReviewKind,
): string | null {
  if (!review) return null;
  if (kind === "general") {
    const body = review.body ?? "";
    return body.trim() ? body : null;
  }
  if (kind === "central") {
    const body = review.centralBody ?? "";
    return body.trim() ? body : null;
  }
  if (kind === "pacific") {
    const body = review.pacificBody ?? "";
    return body.trim() ? body : null;
  }
  const body = review.teamsBody ?? "";
  return body.trim() ? body : null;
}

/**
 * 全体総評（GENERAL）。正本 body を優先し、無ければ旧ハイライト。
 * 未登録は null。
 */
export function getSeasonReviewBody(
  identity: SeasonIdentity,
): string | null {
  return getSeasonReviewSection(identity, "general");
}

/**
 * 指定大項目の本文。GENERAL のみ旧 season-highlights にフォールバック。
 * 別 YEAR/WORLD へのフォールバックはしない。
 */
export function getSeasonReviewSection(
  identity: SeasonIdentity,
  kind: SeasonReviewKind,
): string | null {
  const review = getYearbookReview(identity);
  const fromRecord = sectionFromRecord(review, kind);
  if (fromRecord) return fromRecord;

  if (kind === "general") {
    const legacy = getSeasonHighlightText(identity);
    if (legacy?.trim()) return legacy;
  }
  return null;
}

export function getAllSeasonReviewSections(
  identity: SeasonIdentity,
): Record<SeasonReviewKind, string | null> {
  return {
    general: getSeasonReviewSection(identity, "general"),
    central: getSeasonReviewSection(identity, "central"),
    pacific: getSeasonReviewSection(identity, "pacific"),
    teams: getSeasonReviewSection(identity, "teams"),
  };
}

export function hasSeasonReview(identity: SeasonIdentity): boolean {
  return getSeasonReviewBody(identity) != null;
}

export function hasSeasonReviewSection(
  identity: SeasonIdentity,
  kind: SeasonReviewKind,
): boolean {
  return getSeasonReviewSection(identity, kind) != null;
}

export function getSeasonReviewRecord(
  identity: SeasonIdentity,
): YearbookSeasonReview | null {
  const review = getYearbookReview(identity);
  if (!review) return null;
  const hasAny =
    Boolean(review.body?.trim()) ||
    Boolean(review.centralBody?.trim()) ||
    Boolean(review.pacificBody?.trim()) ||
    Boolean(review.teamsBody?.trim());
  return hasAny ? review : null;
}

/** 全体総評（GENERAL）を保存。既存 upsertSeasonReview 互換。 */
export function upsertSeasonReview(input: {
  identity: SeasonIdentity;
  body: string;
  source?: SeasonReviewSource;
}): YearbookSeasonReview {
  return upsertSeasonReviewSection({
    identity: input.identity,
    kind: "general",
    body: input.body,
    source: input.source,
  });
}

/**
 * 大項目単位で保存。他項目は既存値を維持する。
 * 空本文は保存しない（その項目のみエラー）。
 */
export function upsertSeasonReviewSection(input: {
  identity: SeasonIdentity;
  kind: SeasonReviewKind;
  body: string;
  source?: SeasonReviewSource;
}): YearbookSeasonReview {
  const body = trimBody(input.body);
  if (!body.trim()) {
    throw new Error(
      `${SEASON_REVIEW_KIND_LABELS[input.kind]}の本文が空です`,
    );
  }
  const source: YearbookReviewSource =
    input.source === "partner" || input.source === "imported"
      ? "imported"
      : input.source === "ai"
        ? "ai"
        : "manual";

  const prev = getYearbookReview(input.identity);
  const base = {
    identity: input.identity,
    body: prev?.body ?? "",
    centralBody: prev?.centralBody,
    pacificBody: prev?.pacificBody,
    teamsBody: prev?.teamsBody,
    source,
    confirmed: true as const,
  };

  if (input.kind === "general") {
    return upsertYearbookReview({ ...base, body });
  }
  if (input.kind === "central") {
    return upsertYearbookReview({ ...base, centralBody: body });
  }
  if (input.kind === "pacific") {
    return upsertYearbookReview({ ...base, pacificBody: body });
  }
  return upsertYearbookReview({ ...base, teamsBody: body });
}

export async function hydrateSeasonReviewSources(): Promise<void> {
  await Promise.allSettled([
    hydrateYearbookReviewsFromCloud(),
    hydrateSeasonHighlightsFromCloud(),
  ]);
}
