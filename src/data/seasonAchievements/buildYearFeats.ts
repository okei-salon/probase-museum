/**
 * 年度の記録・偉業一覧を構築。
 * 手動登録 + 自動判定 + （任意）デモ。同一キーは手動優先。
 *
 * 連続系5種＋1試合奪三振の画面表示はリーグ最高のみ（SOP加点とは別）。
 */

import { listSeasonLines, listSeasonLinesForSeason } from "@/data/playerSeasonLines";
import {
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import { withRepeatLabels } from "./achievementRepeat";
import { annotateNpbAchievements } from "./annotateNpb";
import { getDemoAchievements } from "./demoData";
import { detectAchievementsFromSeasonLines } from "./detectSeason";
import { hrSbAchievementLabel } from "./hrSbLabel";
import { filterStreaksToLeagueLeaders } from "./streakDisplay";
import {
  listStoredAchievements,
  listStoredAchievementsForSeasonIdentity,
} from "./store";
import type { AchievementCategory, SeasonAchievement } from "./types";

export type YearFeatsResult = {
  items: SeasonAchievement[];
  demoCount: number;
  autoCount: number;
  manualCount: number;
};

function resolveIdentity(
  yearOrIdentity: number | SeasonIdentity,
): SeasonIdentity {
  if (typeof yearOrIdentity === "number") {
    return identityFromWorldYear(yearOrIdentity, null);
  }
  return yearOrIdentity;
}

function dedupePreferManual(
  items: SeasonAchievement[],
): SeasonAchievement[] {
  const map = new Map<string, SeasonAchievement>();
  const rank = (s: SeasonAchievement["source"]) =>
    s === "manual" ? 3 : s === "auto" ? 2 : 1;

  for (const item of items) {
    const w = item.world ?? "";
    // 同一年の手動／自動のみ潰す（年をまたぐ連続判定用プールでは年を含める）
    const key = `${w}:${item.season}:${item.playerId}:${item.role}:${item.recordType}`;
    const prev = map.get(key);
    if (!prev || rank(item.source) >= rank(prev.source)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function sortAchievements(items: SeasonAchievement[]): SeasonAchievement[] {
  const order: AchievementCategory[] = [
    "npb_record",
    "special",
    "streak",
    "single_game",
    "season",
  ];
  return [...items].sort((a, b) => {
    const ca = order.indexOf(a.category);
    const cb = order.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.playerName.localeCompare(b.playerName, "ja");
  });
}

/**
 * 保存済み recordName を書き換えず、表示時だけ本塁打・盗塁からラベルを再生成する。
 */
function withDisplayHrSbLabel(item: SeasonAchievement): SeasonAchievement {
  if (item.recordType !== "hr_sb_combo") return item;
  const hr = item.value;
  const sb = item.secondaryValue;
  if (hr == null || sb == null) return item;
  const label = hrSbAchievementLabel(hr, sb);
  if (!label || label === item.recordName) return item;
  return { ...item, recordName: label };
}

/** 同一 WORLD の全年度プール（連続年判定用。既存データは消さない） */
function collectWorldAchievementPool(
  world: SeasonWorld | null | undefined,
): SeasonAchievement[] {
  const w = normalizeSeasonWorld(world);
  const lines = listSeasonLines().filter(
    (l) =>
      l.scope === "pennant" && normalizeSeasonWorld(l.world) === w,
  );
  const auto = detectAchievementsFromSeasonLines(lines);
  const manual = listStoredAchievements().filter(
    (a) => normalizeSeasonWorld(a.world) === w,
  );
  return dedupePreferManual([...auto, ...manual]).map(withDisplayHrSbLabel);
}

/** 生データ（SOP用）。連続系のリーグ絞り込み前。 */
export function collectYearAchievementsRaw(
  yearOrIdentity: number | SeasonIdentity,
): SeasonAchievement[] {
  const identity = resolveIdentity(yearOrIdentity);
  const pennantLines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "pennant",
  );
  const auto = detectAchievementsFromSeasonLines(pennantLines);
  const manual = listStoredAchievementsForSeasonIdentity(identity);
  const demo =
    identity.world == null ? getDemoAchievements(identity.year) : [];
  const merged = dedupePreferManual([...auto, ...manual, ...demo]).map(
    withDisplayHrSbLabel,
  );
  const annotated = annotateNpbAchievements(merged);
  const worldPool = collectWorldAchievementPool(identity.world);
  return withRepeatLabels(annotated, worldPool);
}

export function buildYearFeats(
  yearOrIdentity: number | SeasonIdentity,
): YearFeatsResult {
  const merged = collectYearAchievementsRaw(yearOrIdentity);
  const items = sortAchievements(filterStreaksToLeagueLeaders(merged));

  return {
    items,
    demoCount: items.filter((i) => i.source === "demo").length,
    autoCount: items.filter((i) => i.source === "auto").length,
    manualCount: items.filter((i) => i.source === "manual").length,
  };
}

/** SOP feats 変換用：連続系は絞り込み前の生データを返す */
export function listAchievementsForPlayer(
  yearOrIdentity: number | SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
): SeasonAchievement[] {
  return collectYearAchievementsRaw(yearOrIdentity).filter(
    (a) => a.playerId === playerId && a.role === role,
  );
}
