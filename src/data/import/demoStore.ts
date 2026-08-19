/**
 * デモ取込専用ストア。
 * 本番の season-lines / team-stats / awards 等には一切書き込まない。
 */

import type { SavedMonthlyMvpRecord, ImportHistoryEntry } from "@/data/import/types";
import { monthlyMvpRecordKey } from "@/data/import/types";
import type { PlayerSeasonLine } from "@/data/playerSeasonLines/types";
import type { RegisteredSeasonAward } from "@/data/sop/awardsRegistry";
import type { SeasonAchievement } from "@/data/seasonAchievements/types";
import type { TeamSeasonStatsRecord } from "@/data/teamSeasonStats/types";
import type { YearStandingsRecord } from "@/data/teamStandings";
import type { TitleWinRecord } from "@/data/titleRankings/history";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";
import { normalizeSeasonWorld } from "@/data/seasons";

export type DemoMeta = {
  dataMode: "demo";
  isDemo: true;
};

export type DemoSeasonLine = PlayerSeasonLine & DemoMeta;
export type DemoTeamStats = TeamSeasonStatsRecord & DemoMeta;
export type DemoStandings = YearStandingsRecord & DemoMeta;
export type DemoMonthlyMvp = SavedMonthlyMvpRecord & DemoMeta;
export type DemoAward = RegisteredSeasonAward & DemoMeta;
export type DemoTitleWin = TitleWinRecord & DemoMeta;
export type DemoAchievement = SeasonAchievement & DemoMeta;

export type DemoImportStore = {
  seasonLines: DemoSeasonLine[];
  teamStats: DemoTeamStats[];
  standings: DemoStandings | null;
  monthlyMvp: DemoMonthlyMvp[];
  awards: DemoAward[];
  titleWins: DemoTitleWin[];
  achievements: DemoAchievement[];
  history: ImportHistoryEntry[];
};

const STORAGE_KEY = "probase-museum.import-demo-data.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function emptyStore(): DemoImportStore {
  return {
    seasonLines: [],
    teamStats: [],
    standings: null,
    monthlyMvp: [],
    awards: [],
    titleWins: [],
    achievements: [],
    history: [],
  };
}

function readStore(): DemoImportStore {
  if (!canUseStorage()) return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<DemoImportStore>;
    return {
      ...emptyStore(),
      ...parsed,
      seasonLines: Array.isArray(parsed.seasonLines) ? parsed.seasonLines : [],
      teamStats: Array.isArray(parsed.teamStats) ? parsed.teamStats : [],
      monthlyMvp: Array.isArray(parsed.monthlyMvp) ? parsed.monthlyMvp : [],
      awards: Array.isArray(parsed.awards) ? parsed.awards : [],
      titleWins: Array.isArray(parsed.titleWins) ? parsed.titleWins : [],
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements
        : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      standings: parsed.standings ?? null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DemoImportStore): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("probase-demo-data"));
}

function withDemoMeta<T extends object>(record: T): T & DemoMeta {
  return { ...record, dataMode: "demo" as const, isDemo: true as const };
}

export function getDemoImportStore(): DemoImportStore {
  return readStore();
}

export function listDemoSeasonLines(): DemoSeasonLine[] {
  return readStore().seasonLines;
}

export function getDemoSeasonLine(id: string): DemoSeasonLine | null {
  return listDemoSeasonLines().find((r) => r.id === id) ?? null;
}

export function upsertDemoSeasonLine(
  line: PlayerSeasonLine,
): DemoSeasonLine {
  const store = readStore();
  const next = withDemoMeta(line);
  const idx = store.seasonLines.findIndex((r) => r.id === next.id);
  if (idx >= 0) store.seasonLines[idx] = next;
  else store.seasonLines.push(next);
  writeStore(store);
  return next;
}

export function listDemoTeamStats(): DemoTeamStats[] {
  return readStore().teamStats;
}

export function upsertDemoTeamStats(
  record: TeamSeasonStatsRecord,
): DemoTeamStats {
  const store = readStore();
  const next = withDemoMeta(record);
  const idx = store.teamStats.findIndex((r) => r.id === next.id);
  if (idx >= 0) store.teamStats[idx] = next;
  else store.teamStats.push(next);
  writeStore(store);
  return next;
}

export function getDemoStandings(): DemoStandings | null {
  return readStore().standings;
}

export function upsertDemoStandings(
  record: YearStandingsRecord,
): DemoStandings {
  const store = readStore();
  store.standings = withDemoMeta(record);
  writeStore(store);
  return store.standings;
}

export function listDemoMonthlyMvp(): DemoMonthlyMvp[] {
  return readStore().monthlyMvp;
}

export function upsertDemoMonthlyMvp(
  record: SavedMonthlyMvpRecord,
): DemoMonthlyMvp {
  const store = readStore();
  const world = normalizeSeasonWorld(record.world);
  const id = monthlyMvpRecordKey(
    record.year,
    record.month,
    record.league,
    world,
  );
  const next = withDemoMeta({ ...record, id, world });
  const idx = store.monthlyMvp.findIndex(
    (r) =>
      r.id === id ||
      (r.year === next.year &&
        r.month === next.month &&
        r.league === next.league &&
        normalizeSeasonWorld(r.world) === world),
  );
  if (idx >= 0) store.monthlyMvp[idx] = next;
  else store.monthlyMvp.push(next);
  writeStore(store);
  return next;
}

export function listDemoAwards(): DemoAward[] {
  return readStore().awards;
}

export function upsertDemoAward(
  award: RegisteredSeasonAward,
): DemoAward {
  const store = readStore();
  const world = normalizeSeasonWorld(award.world);
  const next = withDemoMeta({ ...award, world });
  // MVP/新人王/沢村は同一スロット置換
  if (
    next.kind === "mvp" ||
    next.kind === "rookie" ||
    next.kind === "sawamura"
  ) {
    store.awards = store.awards.filter(
      (a) =>
        !(
          a.year === next.year &&
          normalizeSeasonWorld(a.world) === world &&
          a.kind === next.kind &&
          (next.kind === "sawamura" || a.league === next.league)
        ),
    );
  } else {
    store.awards = store.awards.filter((r) => r.id !== next.id);
  }
  store.awards.push(next);
  writeStore(store);
  return next;
}

export function listDemoTitleWins(): DemoTitleWin[] {
  return readStore().titleWins;
}

export function upsertDemoTitleWin(record: TitleWinRecord): DemoTitleWin {
  const store = readStore();
  const world = normalizeSeasonWorld(record.world);
  const next = withDemoMeta({ ...record, world, rank: record.rank ?? 1 });
  store.titleWins = store.titleWins.filter(
    (r) =>
      !(
        r.titleId === next.titleId &&
        r.year === next.year &&
        r.league === next.league &&
        normalizeSeasonWorld(r.world) === world &&
        (r.rank ?? 1) === (next.rank ?? 1)
      ),
  );
  store.titleWins.push(next);
  writeStore(store);
  return next;
}

export function listDemoAchievements(): DemoAchievement[] {
  return readStore().achievements;
}

export function upsertDemoAchievement(
  record: SeasonAchievement,
): DemoAchievement {
  const store = readStore();
  const world = normalizeSeasonWorld(record.world);
  const next = withDemoMeta({ ...record, world });
  const idx = store.achievements.findIndex((r) => r.id === next.id);
  if (idx >= 0) store.achievements[idx] = next;
  else store.achievements.push(next);
  writeStore(store);
  return next;
}

export function appendDemoImportHistory(entry: ImportHistoryEntry): void {
  const store = readStore();
  store.history = [
    { ...entry, summary: `[デモ] ${entry.summary}` },
    ...store.history,
  ].slice(0, 100);
  writeStore(store);
}

/**
 * デモデータのみ全削除。
 * isDemo / dataMode が demo のものだけを対象（ストア全体がデモ専用）。
 */
export function clearAllDemoImportData(): {
  removed: number;
} {
  const store = readStore();
  const removed =
    store.seasonLines.length +
    store.teamStats.length +
    (store.standings ? 1 : 0) +
    store.monthlyMvp.length +
    store.awards.length +
    store.titleWins.length +
    store.achievements.length;
  writeStore(emptyStore());
  return { removed };
}

export function countDemoRecords(): number {
  const s = readStore();
  return (
    s.seasonLines.length +
    s.teamStats.length +
    (s.standings ? 1 : 0) +
    s.monthlyMvp.length +
    s.awards.length +
    s.titleWins.length +
    s.achievements.length
  );
}

export function isDemoTagged(record: {
  isDemo?: boolean;
  dataMode?: string;
  year?: number;
  season?: number;
}): boolean {
  if (record.isDemo === true) return true;
  if (record.dataMode === "demo") return true;
  return false;
}

/** 本番リストからデモ混入を除外（安全弁） */
export function excludeDemoRecords<T>(rows: T[]): T[] {
  return rows.filter((r) => !isDemoTagged(r as { isDemo?: boolean; dataMode?: string }));
}

export { DEMO_IMPORT_YEAR };
