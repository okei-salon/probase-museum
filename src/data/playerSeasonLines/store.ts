import {
  computeBatterDerived,
  computePitcherDerived,
  normalizeBatterCounting,
  normalizePitcherCounting,
} from "@/lib/manualEntry/computeSeasonStats";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  identityFromWorldYear,
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import type {
  BatterSeasonLine,
  PitcherSeasonLine,
  PlayerSeasonLine,
  SeasonLineRole,
  SeasonLineScope,
} from "./types";
import { seasonLineKey } from "./types";

const STORAGE_KEY = "probase-museum.season-lines.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeLine(line: PlayerSeasonLine): PlayerSeasonLine {
  const world = normalizeSeasonWorld(line.world);
  const base = { ...line, world };

  if (base.role === "batter") {
    const counting = normalizeBatterCounting(base.counting);
    return {
      ...base,
      counting,
      derived: computeBatterDerived(counting),
    };
  }
  const counting = normalizePitcherCounting(base.counting);
  return {
    ...base,
    counting,
    derived: computePitcherDerived(counting),
  };
}

/** WORLD 表示順: BLUE → RED → レガシー（null） */
function worldSortRank(world: SeasonWorld | null | undefined): number {
  const w = normalizeSeasonWorld(world);
  if (w === "BLUE") return 0;
  if (w === "RED") return 1;
  return 2;
}

function compareSeasonLines(a: PlayerSeasonLine, b: PlayerSeasonLine): number {
  return (
    b.year - a.year ||
    worldSortRank(a.world) - worldSortRank(b.world) ||
    a.role.localeCompare(b.role) ||
    a.scope.localeCompare(b.scope)
  );
}

export function listSeasonLines(): PlayerSeasonLine[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayerSeasonLine[];
    if (!Array.isArray(parsed)) return [];
    return excludeDemoRecords(parsed.map(normalizeLine));
  } catch {
    return [];
  }
}

/**
 * シーズン画面用: identity（world + year）に一致する行のみ。
 * BLUE / RED / レガシー・DEMO を matchSeason で厳密に分離する。
 */
export function listSeasonLinesForSeason(
  identity: SeasonIdentity,
): PlayerSeasonLine[] {
  return listSeasonLines()
    .filter((r) => matchSeason(r, identity))
    .sort(compareSeasonLines);
}

export function getSeasonLine(
  playerId: string,
  year: number,
  role: SeasonLineRole,
  scope: SeasonLineScope = "pennant",
  world?: SeasonWorld | null,
): PlayerSeasonLine | null {
  const key = seasonLineKey(playerId, year, role, scope, world);
  return listSeasonLines().find((r) => r.id === key) ?? null;
}

/**
 * 選手の全シーズン行（通算・年度別用）。
 * BLUE / RED は別行のまま両方返す（同一年でも合算しない／除外しない）。
 */
export function listSeasonLinesByPlayer(
  playerId: string,
): PlayerSeasonLine[] {
  return listSeasonLines()
    .filter((r) => r.playerId === playerId)
    .sort(compareSeasonLines);
}

export function upsertSeasonLine(
  record: PlayerSeasonLine,
): PlayerSeasonLine {
  const normalized = normalizeLine(record);
  const list = listSeasonLines();
  const idx = list.findIndex((r) => r.id === normalized.id);
  if (idx >= 0) list[idx] = normalized;
  else list.push(normalized);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return normalized;
}

export function upsertBatterSeasonLine(
  record: BatterSeasonLine,
): BatterSeasonLine {
  return upsertSeasonLine(record) as BatterSeasonLine;
}

export function upsertPitcherSeasonLine(
  record: PitcherSeasonLine,
): PitcherSeasonLine {
  return upsertSeasonLine(record) as PitcherSeasonLine;
}

/**
 * pennant 行から WORLD × YEAR の SeasonIdentity 一覧を構築。
 * SOP・RECORDS・YEARBOOK など横断集計で再利用する。
 */
export function listPennantSeasonIdentities(): SeasonIdentity[] {
  const map = new Map<string, SeasonIdentity>();
  for (const l of listSeasonLines().filter((x) => x.scope === "pennant")) {
    const identity = identityFromWorldYear(l.year, l.world);
    map.set(identity.seasonKey, identity);
  }
  return [...map.values()].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
}
