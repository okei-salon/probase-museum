/**
 * シーズン総評ストア（localStorage）
 * キー名は変更しない。正式は seasonKey / world で分離、レガシーは year のみ。
 */

import {
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
} from "@/data/seasons";
import type { YearbookSeasonReview, YearbookReviewSource } from "./types";

const STORAGE_KEY = "probase-museum.yearbook-reviews.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeReview(r: YearbookSeasonReview): YearbookSeasonReview {
  const world = normalizeSeasonWorld(r.world);
  const seasonKey =
    r.seasonKey ?? identityFromWorldYear(r.year, world).seasonKey;
  return { ...r, world, seasonKey };
}

function readAll(): YearbookSeasonReview[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as YearbookSeasonReview[];
    return Array.isArray(parsed) ? parsed.map(normalizeReview) : [];
  } catch {
    return [];
  }
}

function writeAll(list: YearbookSeasonReview[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function reviewMatches(
  r: YearbookSeasonReview,
  identity: SeasonIdentity,
): boolean {
  if (r.seasonKey && r.seasonKey === identity.seasonKey) return true;
  // レガシー: seasonKey 無し・world 無しの同一 year のみ
  if (
    identity.world == null &&
    r.year === identity.year &&
    normalizeSeasonWorld(r.world) == null &&
    (!r.seasonKey || r.seasonKey === String(r.year) || r.seasonKey === "2000")
  ) {
    return true;
  }
  return (
    r.year === identity.year &&
    normalizeSeasonWorld(r.world) === identity.world
  );
}

export function getYearbookReview(
  yearOrIdentity: number | SeasonIdentity,
): YearbookSeasonReview | null {
  const identity =
    typeof yearOrIdentity === "number"
      ? identityFromWorldYear(yearOrIdentity, null)
      : yearOrIdentity;
  return readAll().find((r) => reviewMatches(r, identity)) ?? null;
}

export function listYearbookReviews(): YearbookSeasonReview[] {
  return [...readAll()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

export function upsertYearbookReview(input: {
  year: number;
  world?: SeasonIdentity["world"];
  seasonKey?: string;
  body: string;
  source?: YearbookReviewSource;
  confirmed?: boolean;
}): YearbookSeasonReview;
export function upsertYearbookReview(input: {
  identity: SeasonIdentity;
  body: string;
  source?: YearbookReviewSource;
  confirmed?: boolean;
}): YearbookSeasonReview;
export function upsertYearbookReview(
  input:
    | {
        year: number;
        world?: SeasonIdentity["world"];
        seasonKey?: string;
        body: string;
        source?: YearbookReviewSource;
        confirmed?: boolean;
      }
    | {
        identity: SeasonIdentity;
        body: string;
        source?: YearbookReviewSource;
        confirmed?: boolean;
      },
): YearbookSeasonReview {
  const identity =
    "identity" in input
      ? input.identity
      : identityFromWorldYear(input.year, input.world ?? null);
  const list = readAll();
  const now = new Date().toISOString();
  const idx = list.findIndex((r) => reviewMatches(r, identity));
  const prev = idx >= 0 ? list[idx]! : null;
  const next: YearbookSeasonReview = {
    year: identity.year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    body: input.body,
    source: input.source ?? prev?.source ?? "manual",
    confirmed: input.confirmed ?? prev?.confirmed ?? true,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeAll(list);
  return next;
}

export function clearYearbookReview(
  yearOrIdentity: number | SeasonIdentity,
): void {
  const identity =
    typeof yearOrIdentity === "number"
      ? identityFromWorldYear(yearOrIdentity, null)
      : yearOrIdentity;
  writeAll(readAll().filter((r) => !reviewMatches(r, identity)));
}
