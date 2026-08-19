import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import type { StandingEntry } from "@/data/teamStandings";
import type {
  StandingsCheckpoint,
  StandingsHistoryRecord,
} from "./types";
import { isStandingsCheckpoint } from "./types";

const STORAGE_KEY = "probase-museum.standings-history.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function standingsHistoryKey(
  year: number,
  checkpoint: StandingsCheckpoint,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  if (w) return `${w}:${year}:${checkpoint}`;
  return `${year}:${checkpoint}`;
}

function normalizeRecord(
  r: StandingsHistoryRecord,
): StandingsHistoryRecord | null {
  if (!isStandingsCheckpoint(r.checkpoint)) return null;
  const world = normalizeSeasonWorld(r.world);
  return {
    ...r,
    world,
    central: Array.isArray(r.central) ? r.central : [],
    pacific: Array.isArray(r.pacific) ? r.pacific : [],
  };
}

export function listStandingsHistory(): StandingsHistoryRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StandingsHistoryRecord[];
    if (!Array.isArray(parsed)) return [];
    return excludeDemoRecords(
      parsed
        .map(normalizeRecord)
        .filter((r): r is StandingsHistoryRecord => r != null),
    );
  } catch {
    return [];
  }
}

export function getStandingsHistoryCheckpoint(
  year: number,
  checkpoint: StandingsCheckpoint,
  world?: SeasonWorld | null,
): StandingsHistoryRecord | null {
  const key = standingsHistoryKey(year, checkpoint, world);
  const list = listStandingsHistory();
  return (
    list.find((r) => r.id === key) ??
    list.find(
      (r) =>
        r.year === year &&
        r.checkpoint === checkpoint &&
        normalizeSeasonWorld(r.world) === normalizeSeasonWorld(world),
    ) ??
    null
  );
}

/** シーズン identity に一致する全時点（時系列順） */
export function listStandingsHistoryForSeason(
  identity: SeasonIdentity,
): StandingsHistoryRecord[] {
  const order = new Map(
    (
      [
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "final",
      ] as StandingsCheckpoint[]
    ).map((c, i) => [c, i]),
  );
  return listStandingsHistory()
    .filter((r) => matchSeason(r, identity))
    .sort(
      (a, b) =>
        (order.get(a.checkpoint) ?? 99) - (order.get(b.checkpoint) ?? 99),
    );
}

export function upsertStandingsHistory(
  input: {
    year: number;
    world?: SeasonWorld | null;
    checkpoint: StandingsCheckpoint;
    central: StandingEntry[];
    pacific: StandingEntry[];
    source?: StandingsHistoryRecord["source"];
    createdAt?: string;
  },
): StandingsHistoryRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = standingsHistoryKey(input.year, input.checkpoint, world);
  const list = listStandingsHistory();
  const existing = list.find((r) => r.id === id) ?? null;
  const record: StandingsHistoryRecord = {
    id,
    year: input.year,
    world,
    checkpoint: input.checkpoint,
    central: input.central,
    pacific: input.pacific,
    source: input.source ?? existing?.source ?? "manual",
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return record;
}

export const STANDINGS_HISTORY_STORAGE_KEY = STORAGE_KEY;
