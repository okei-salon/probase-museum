/**
 * シーズンハイライトストア（localStorage）— 読み取り互換専用。
 * 正式な新規保存は SEASON_REVIEW（yearbook-reviews）を使う。
 * 既存データを削除・初期化しない。
 * YEAR × WORLD ごとに1本文。
 * + museum_documents(collection=season_highlights) 同期（id = seasonKey）
 */

import {
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
} from "@/data/seasons";
import {
  hydrateLocalArrayFromCloud,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";
import type {
  SeasonHighlightRecord,
  SeasonHighlightSource,
} from "./types";

const STORAGE_KEY = "probase-museum.season-highlights.v1";
const COLLECTION = "season_highlights";

export type SeasonHighlightSyncRecord = SeasonHighlightRecord & {
  id: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeHighlight(
  r: SeasonHighlightRecord & { id?: string },
): SeasonHighlightSyncRecord {
  const world = normalizeSeasonWorld(r.world);
  const seasonKey =
    r.seasonKey ?? identityFromWorldYear(r.year, world).seasonKey;
  return {
    ...r,
    world,
    seasonKey,
    id: r.id || seasonKey,
  };
}

function readRawSeasonHighlights(): SeasonHighlightSyncRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SeasonHighlightRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeHighlight) : [];
  } catch {
    return [];
  }
}

function writeRawSeasonHighlights(list: SeasonHighlightSyncRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function highlightMatches(
  r: SeasonHighlightRecord,
  identity: SeasonIdentity,
): boolean {
  if (r.seasonKey && r.seasonKey === identity.seasonKey) return true;
  return (
    r.year === identity.year &&
    normalizeSeasonWorld(r.world) === identity.world
  );
}

export function getSeasonHighlight(
  yearOrIdentity: number | SeasonIdentity,
): SeasonHighlightRecord | null {
  const identity =
    typeof yearOrIdentity === "number"
      ? identityFromWorldYear(yearOrIdentity, null)
      : yearOrIdentity;
  return (
    readRawSeasonHighlights().find((r) => highlightMatches(r, identity)) ??
    null
  );
}

export function getSeasonHighlightText(
  yearOrIdentity: number | SeasonIdentity,
): string | null {
  const hit = getSeasonHighlight(yearOrIdentity);
  const text = hit?.text?.trim();
  return text ? hit!.text : null;
}

export function listSeasonHighlights(): SeasonHighlightRecord[] {
  return [...readRawSeasonHighlights()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}

export function upsertSeasonHighlight(input: {
  year: number;
  world?: SeasonIdentity["world"];
  seasonKey?: string;
  text: string;
  source?: SeasonHighlightSource;
}): SeasonHighlightRecord;
export function upsertSeasonHighlight(input: {
  identity: SeasonIdentity;
  text: string;
  source?: SeasonHighlightSource;
}): SeasonHighlightRecord;
export function upsertSeasonHighlight(
  input:
    | {
        year: number;
        world?: SeasonIdentity["world"];
        seasonKey?: string;
        text: string;
        source?: SeasonHighlightSource;
      }
    | {
        identity: SeasonIdentity;
        text: string;
        source?: SeasonHighlightSource;
      },
): SeasonHighlightRecord {
  const identity =
    "identity" in input
      ? input.identity
      : identityFromWorldYear(input.year, input.world ?? null);
  const list = readRawSeasonHighlights();
  const now = new Date().toISOString();
  const idx = list.findIndex((r) => highlightMatches(r, identity));
  const prev = idx >= 0 ? list[idx]! : null;
  const next = normalizeHighlight({
    year: identity.year,
    world: identity.world,
    seasonKey: identity.seasonKey,
    text: input.text,
    source: input.source ?? prev?.source ?? "manual",
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeRawSeasonHighlights(list);
  void putMuseumCollectionRecord(COLLECTION, next);
  return next;
}

export async function hydrateSeasonHighlightsFromCloud(): Promise<
  SeasonHighlightRecord[]
> {
  if (!canUseStorage()) return [];
  return hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawSeasonHighlights,
    writeRaw: writeRawSeasonHighlights,
    normalize: normalizeHighlight,
  });
}
