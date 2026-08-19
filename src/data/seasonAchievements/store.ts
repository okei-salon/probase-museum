/**
 * 記録・偉業の手動／登録ストア。
 * 自動判定分は別途 detect で合成し、二重保存しない。
 */

import type { SeasonAchievement } from "./types";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";

const STORAGE_KEY = "probase-museum.season-achievements.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeAchievement(a: SeasonAchievement): SeasonAchievement {
  return {
    ...a,
    world: normalizeSeasonWorld(a.world),
  };
}

export function listStoredAchievements(): SeasonAchievement[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SeasonAchievement[];
    return excludeDemoRecords(
      Array.isArray(parsed)
        ? parsed
            .filter((a) => a.source !== "demo")
            .map(normalizeAchievement)
        : [],
    );
  } catch {
    return [];
  }
}

export function listStoredAchievementsForSeason(
  season: number,
): SeasonAchievement[] {
  return listStoredAchievements().filter((a) => a.season === season);
}

/** WORLD + year で厳密フィルタ（season フィールドを year として照合） */
export function listStoredAchievementsForSeasonIdentity(
  identity: SeasonIdentity,
): SeasonAchievement[] {
  return listStoredAchievements().filter((a) =>
    matchSeason({ year: a.season, season: a.season, world: a.world }, identity),
  );
}

export function upsertStoredAchievement(
  record: SeasonAchievement,
): SeasonAchievement {
  const world = normalizeSeasonWorld(record.world);
  const list = listStoredAchievements();
  const next = {
    ...record,
    world,
    updatedAt: new Date().toISOString(),
  };
  const idx = list.findIndex((a) => a.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return next;
}

export function removeStoredAchievement(id: string): void {
  const list = listStoredAchievements().filter((a) => a.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 正式 WORLD 付き手動登録向け ID（既存レガシー ID は再生成しない） */
export function seasonAchievementId(params: {
  season: number;
  world?: SeasonWorld | null;
  playerId: string;
  recordType: string;
}): string {
  const w = normalizeSeasonWorld(params.world);
  const base = `${params.season}:${params.playerId}:${params.recordType}`;
  if (w) return `${w}:${base}`;
  return base;
}
