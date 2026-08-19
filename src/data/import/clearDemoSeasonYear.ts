/**
 * 2000年デモシーズン（正式ストア上）のデータ削除。
 * 分離デモ領域（import-demo-data）とは別。2018〜2026 には触れない。
 */

import { DEMO_SEASON_YEAR } from "@/data/seasons";
import { listTitleWinHistory } from "@/data/titleRankings/history";

export type ClearDemoSeasonResult = {
  year: number;
  removed: Record<string, number>;
  total: number;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function filterYearArray(
  key: string,
  year: number,
  field: "year" | "season",
): number {
  if (!canUseStorage()) return 0;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return 0;
    const kept = parsed.filter((r) => Number(r[field]) !== year);
    const removed = parsed.length - kept.length;
    window.localStorage.setItem(key, JSON.stringify(kept));
    return removed;
  } catch {
    return 0;
  }
}

/**
 * 正式ストアから指定年度（既定: 2000）のデモテストデータのみ削除する。
 */
export function clearFormalDemoSeasonData(
  year: number = DEMO_SEASON_YEAR,
): ClearDemoSeasonResult {
  if (!canUseStorage()) {
    return { year, removed: {}, total: 0 };
  }
  if (year !== DEMO_SEASON_YEAR) {
    throw new Error(
      `安全のため ${DEMO_SEASON_YEAR} 年以外の一括削除はできません`,
    );
  }

  const removed: Record<string, number> = {
    seasonLines: filterYearArray(
      "probase-museum.season-lines.v1",
      year,
      "year",
    ),
    teamStats: filterYearArray(
      "probase-museum.team-season-stats.v1",
      year,
      "year",
    ),
    standings: filterYearArray(
      "probase-museum.team-standings.v1",
      year,
      "year",
    ),
    standingsHistory: filterYearArray(
      "probase-museum.standings-history.v1",
      year,
      "year",
    ),
    monthlyMvp: filterYearArray(
      "probase-museum.import.monthly-mvp.v1",
      year,
      "year",
    ),
    importHistory: filterYearArray(
      "probase-museum.import.history.v1",
      year,
      "year",
    ),
    achievements: filterYearArray(
      "probase-museum.season-achievements.v1",
      year,
      "season",
    ),
    sopFeats: filterYearArray("probase-museum.sop-feats.v1", year, "year"),
    yearbook: filterYearArray(
      "probase-museum.yearbook-reviews.v1",
      year,
      "year",
    ),
    awards: filterYearArray(
      "probase-museum.sop-awards-registry.v1",
      year,
      "year",
    ),
    titleWins: filterYearArray(
      "probase-museum.title-win-history.v1",
      year,
      "year",
    ),
    postseason: filterYearArray(
      "probase-museum.postseason.v1",
      year,
      "year",
    ),
    interleague: filterYearArray(
      "probase-museum.interleague.v1",
      year,
      "year",
    ),
  };

  // title history が未永続でも、マージ結果に残らないよう確認のみ
  void listTitleWinHistory;

  window.dispatchEvent(new Event("probase-demo-season-cleared"));

  const total = Object.values(removed).reduce((s, n) => s + n, 0);
  return { year, removed, total };
}

/** 正式ストア上の 2000年データ件数（削除前確認用） */
export function countFormalDemoSeasonData(
  year: number = DEMO_SEASON_YEAR,
): number {
  if (!canUseStorage()) return 0;
  const keys: Array<{ key: string; field: "year" | "season" }> = [
    { key: "probase-museum.season-lines.v1", field: "year" },
    { key: "probase-museum.team-season-stats.v1", field: "year" },
    { key: "probase-museum.team-standings.v1", field: "year" },
    { key: "probase-museum.standings-history.v1", field: "year" },
    { key: "probase-museum.import.monthly-mvp.v1", field: "year" },
    { key: "probase-museum.season-achievements.v1", field: "season" },
    { key: "probase-museum.sop-feats.v1", field: "year" },
    { key: "probase-museum.sop-awards-registry.v1", field: "year" },
    { key: "probase-museum.title-win-history.v1", field: "year" },
    { key: "probase-museum.yearbook-reviews.v1", field: "year" },
    { key: "probase-museum.postseason.v1", field: "year" },
    { key: "probase-museum.interleague.v1", field: "year" },
  ];
  let n = 0;
  for (const { key, field } of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      if (!Array.isArray(parsed)) continue;
      n += parsed.filter((r) => Number(r[field]) === year).length;
    } catch {
      /* ignore */
    }
  }
  return n;
}
