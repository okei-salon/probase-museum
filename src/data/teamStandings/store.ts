import type { StandingRow } from "@/components/views/StandingsTable";
import type { TeamId } from "@/data/teams";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";

export type LeagueSideStandings = "central" | "pacific";

export type StandingEntry = StandingRow & {
  teamId?: TeamId;
};

export type YearStandingsRecord = {
  /**
   * 正式 WORLD: `${world}:${year}`（例: BLUE:2026）
   * レガシー／DEMO: `${year}`（例: 2000）（既存IDは変更しない）
   */
  id: string;
  year: number;
  /**
   * 正式 WORLD。未設定／null は既存レガシー・2000 DEMO（自動移行しない）。
   */
  world?: SeasonWorld | null;
  /** セ・リーグ最終順位（1レコード内に両リーグを保持する既存構造を維持） */
  central: StandingEntry[];
  /** パ・リーグ最終順位 */
  pacific: StandingEntry[];
  source: "manual" | "ocr" | "import";
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "probase-museum.team-standings.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

/**
 * 最終順位の upsert / 取得用 ID。
 * world がある正式データのみ ID に WORLD を含める。既存 world 無し ID 形式は維持する。
 */
export function yearStandingsKey(
  year: number,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  if (w) return `${w}:${year}`;
  return String(year);
}

function normalizeRecord(r: YearStandingsRecord): YearStandingsRecord {
  const world = normalizeSeasonWorld(r.world);
  // 既存 ID は再生成しない（正式 WORLD 新規のみ正しい id で保存される）
  return {
    ...r,
    world,
    central: Array.isArray(r.central) ? r.central : [],
    pacific: Array.isArray(r.pacific) ? r.pacific : [],
  };
}

export function listYearStandings(): YearStandingsRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as YearStandingsRecord[];
    return excludeDemoRecords(
      Array.isArray(parsed) ? parsed.map(normalizeRecord) : [],
    );
  } catch {
    return [];
  }
}

/**
 * 年度＋任意 WORLD で1件取得。
 * world 未指定時はレガシー（world 無し）のみ（BLUE/RED を誤って拾わない）。
 */
export function getYearStandings(
  year: number,
  world?: SeasonWorld | null,
): YearStandingsRecord | null {
  const w = normalizeSeasonWorld(world);
  const key = yearStandingsKey(year, w);
  const list = listYearStandings();
  const byId = list.find((r) => r.id === key);
  if (byId) return byId;
  return (
    list.find(
      (r) =>
        r.year === year && normalizeSeasonWorld(r.world) === w,
    ) ?? null
  );
}

/** シーズン画面用: identity（world + year）で厳密取得（localStorage） */
export function getStandingsForSeason(
  identity: SeasonIdentity,
): YearStandingsRecord | null {
  return listYearStandings().find((r) => matchSeason(r, identity)) ?? null;
}

/**
 * クラウドの team_standings を取得し、localStorage にマージする（ローカル専用行は削除しない）。
 * 同一 id はクラウド側を優先。
 */
export async function hydrateTeamStandingsFromCloud(): Promise<
  YearStandingsRecord[]
> {
  if (!canUseStorage()) return [];
  try {
    const res = await fetch("/api/museum/team-standings", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return listYearStandings();
    const data = (await res.json()) as {
      ok?: boolean;
      records?: YearStandingsRecord[];
    };
    if (!data.ok || !Array.isArray(data.records)) return listYearStandings();

    const localRaw = window.localStorage.getItem(STORAGE_KEY);
    let localList: YearStandingsRecord[] = [];
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw) as YearStandingsRecord[];
        localList = Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
      } catch {
        localList = [];
      }
    }

    const map = new Map<string, YearStandingsRecord>();
    for (const r of localList) map.set(r.id, r);
    for (const r of data.records) {
      map.set(r.id, normalizeRecord(r));
    }
    const merged = [...map.values()];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return excludeDemoRecords(merged);
  } catch {
    return listYearStandings();
  }
}

export async function getStandingsForSeasonAsync(
  identity: SeasonIdentity,
): Promise<YearStandingsRecord | null> {
  await hydrateTeamStandingsFromCloud();
  return getStandingsForSeason(identity);
}

export async function getYearStandingsAsync(
  year: number,
  world?: SeasonWorld | null,
): Promise<YearStandingsRecord | null> {
  await hydrateTeamStandingsFromCloud();
  return getYearStandings(year, world);
}

async function pushStandingsToCloud(
  record: YearStandingsRecord,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `/api/museum/team-standings/${encodeURIComponent(record.id)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { ok: false, error: data?.error ?? `http_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

function upsertYearStandingsLocal(
  input: Omit<YearStandingsRecord, "id" | "createdAt" | "updatedAt" | "world"> & {
    world?: SeasonWorld | null;
    createdAt?: string;
  },
): YearStandingsRecord {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(input.world);
  const id = yearStandingsKey(input.year, world);
  const list = listYearStandings();
  const existing = list.find((r) => r.id === id) ?? null;
  const record: YearStandingsRecord = {
    id,
    year: input.year,
    world,
    central: input.central,
    pacific: input.pacific,
    source: input.source,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return record;
}

/**
 * localStorage に保存（既存互換）。クラウドへは非同期で送る（失敗してもローカルは残す）。
 */
export function upsertYearStandings(
  input: Omit<YearStandingsRecord, "id" | "createdAt" | "updatedAt" | "world"> & {
    world?: SeasonWorld | null;
    createdAt?: string;
  },
): YearStandingsRecord {
  const record = upsertYearStandingsLocal(input);
  void pushStandingsToCloud(record);
  return record;
}

/** local 保存後にクラウド PUT を待ち、結果を返す */
export async function upsertYearStandingsAsync(
  input: Omit<YearStandingsRecord, "id" | "createdAt" | "updatedAt" | "world"> & {
    world?: SeasonWorld | null;
    createdAt?: string;
  },
): Promise<{ record: YearStandingsRecord; cloud: { ok: boolean; error?: string } }> {
  const record = upsertYearStandingsLocal(input);
  const cloud = await pushStandingsToCloud(record);
  return { record, cloud };
}

/**
 * 端末の localStorage 全件をクラウドへコピー（既存クラウド行は上書きしない）。
 */
export async function migrateLocalTeamStandingsToCloud(): Promise<{
  ok: boolean;
  inserted: string[];
  skipped: string[];
  errors: Array<{ id: string; error: string }>;
  error?: string;
}> {
  const records = listYearStandings();
  try {
    const res = await fetch("/api/museum/team-standings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      inserted?: string[];
      skipped?: string[];
      errors?: Array<{ id: string; error: string }>;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        inserted: [],
        skipped: [],
        errors: data.errors ?? [],
        error: data.error ?? `http_${res.status}`,
      };
    }
    return {
      ok: true,
      inserted: data.inserted ?? [],
      skipped: data.skipped ?? [],
      errors: data.errors ?? [],
    };
  } catch (e) {
    return {
      ok: false,
      inserted: [],
      skipped: [],
      errors: [],
      error: e instanceof Error ? e.message : "network_error",
    };
  }
}

export const TEAM_STANDINGS_STORAGE_KEY = STORAGE_KEY;
