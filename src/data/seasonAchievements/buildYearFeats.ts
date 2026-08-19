/**
 * 年度の記録・偉業一覧を構築。
 * 手動登録 + 自動判定 + （任意）デモ。同一キーは手動優先。
 *
 * Step10: SeasonIdentity 指定時は WORLD 厳密。数値のみは world 無しのみ。
 */

import { listSeasonLinesForSeason } from "@/data/playerSeasonLines";
import {
  identityFromWorldYear,
  type SeasonIdentity,
} from "@/data/seasons";
import { getDemoAchievements } from "./demoData";
import { detectAchievementsFromSeasonLines } from "./detectSeason";
import { listStoredAchievementsForSeasonIdentity } from "./store";
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
    const key = `${w}:${item.playerId}:${item.role}:${item.recordType}`;
    const prev = map.get(key);
    if (!prev || rank(item.source) >= rank(prev.source)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

export function buildYearFeats(
  yearOrIdentity: number | SeasonIdentity,
): YearFeatsResult {
  const identity = resolveIdentity(yearOrIdentity);
  const pennantLines = listSeasonLinesForSeason(identity).filter(
    (l) => l.scope === "pennant",
  );
  const auto = detectAchievementsFromSeasonLines(pennantLines);
  const manual = listStoredAchievementsForSeasonIdentity(identity);
  // DEMO は world 無し年度のみ従来どおり
  const demo =
    identity.world == null ? getDemoAchievements(identity.year) : [];

  const merged = dedupePreferManual([...auto, ...manual, ...demo]);

  const order: AchievementCategory[] = [
    "npb_record",
    "special",
    "streak",
    "single_game",
    "season",
  ];
  merged.sort((a, b) => {
    const ca = order.indexOf(a.category);
    const cb = order.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.playerName.localeCompare(b.playerName, "ja");
  });

  return {
    items: merged,
    demoCount: merged.filter((i) => i.source === "demo").length,
    autoCount: merged.filter((i) => i.source === "auto").length,
    manualCount: merged.filter((i) => i.source === "manual").length,
  };
}

export function listAchievementsForPlayer(
  yearOrIdentity: number | SeasonIdentity,
  playerId: string,
  role: "batter" | "pitcher",
): SeasonAchievement[] {
  return buildYearFeats(yearOrIdentity).items.filter(
    (a) => a.playerId === playerId && a.role === role,
  );
}
