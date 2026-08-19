/**
 * その他の偉業（全年度横断）。SEASON 記録・偉業と同一データを参照。
 */

import { getPlayerMaster } from "@/data/playerMaster";
import type { SeasonAchievement } from "@/data/seasonAchievements";
import { formatSeasonLineLabel } from "@/data/seasons";
import { listCrossYearAchievements } from "./streakRankings";

/** RECORDS「その他の偉業」に載せるシーズン偉業タイプ */
const OTHER_SEASON_TYPES = new Set([
  "triple_three",
  "triple_three_rbi100",
  "avg400",
  "undefeated",
]);

const SPECIAL_TYPES = new Set(["perfect_game", "no_hitter", "cycle"]);

/** HR×SB は合計60以上のみ（SOPの40台は載せない） */
export const RECORDS_HR_SB_MIN_SUM = 60;

export type OtherFeatsSectionId =
  | "special"
  | "hr_sb"
  | "season_historic"
  | "npb";

export type OtherFeatsSection = {
  id: OtherFeatsSectionId;
  label: string;
  items: SeasonAchievement[];
};

function withFullName(item: SeasonAchievement): SeasonAchievement {
  return {
    ...item,
    playerName: getPlayerMaster(item.playerId)?.fullName ?? item.playerName,
  };
}

function isHrSbForRecords(a: SeasonAchievement): boolean {
  if (a.recordType !== "hr_sb_combo") return false;
  const sum =
    a.tertiaryValue ??
    (a.value != null && a.secondaryValue != null
      ? a.value + a.secondaryValue
      : null);
  return sum != null && sum >= RECORDS_HR_SB_MIN_SUM;
}

function sortBySeasonDesc(a: SeasonAchievement, b: SeasonAchievement) {
  if (a.season !== b.season) return b.season - a.season;
  const aw = a.world ?? "";
  const bw = b.world ?? "";
  if (aw !== bw) return aw.localeCompare(bw);
  return a.playerName.localeCompare(b.playerName, "ja");
}

/** 表示用シーズンラベル（BLUE/RED 区別） */
export function achievementSeasonLabel(item: SeasonAchievement): string {
  return formatSeasonLineLabel({ year: item.season, world: item.world });
}

export function buildOtherFeatsSections(): OtherFeatsSection[] {
  const all = listCrossYearAchievements().map(withFullName);

  const isNpbItem = (a: SeasonAchievement) =>
    a.category === "npb_record" ||
    a.isNpbRecord === true ||
    a.isNpbUpdate === true;

  const npb = all.filter(isNpbItem).sort(sortBySeasonDesc);
  const nonNpb = all.filter((a) => !isNpbItem(a));

  const special = nonNpb
    .filter(
      (a) => a.category === "special" && SPECIAL_TYPES.has(a.recordType),
    )
    .sort(sortBySeasonDesc);

  const hrSb = nonNpb.filter(isHrSbForRecords).sort(sortBySeasonDesc);

  const seasonHistoric = nonNpb
    .filter(
      (a) =>
        a.category === "season" && OTHER_SEASON_TYPES.has(a.recordType),
    )
    .sort(sortBySeasonDesc);

  return [
    { id: "special", label: "特殊記録", items: special },
    { id: "hr_sb", label: "本塁打 × 盗塁", items: hrSb },
    {
      id: "season_historic",
      label: "その他のシーズン偉業",
      items: seasonHistoric,
    },
    { id: "npb", label: "NPB史実記録", items: npb },
  ];
}

export function countOtherFeats(): number {
  return buildOtherFeatsSections().reduce((n, s) => n + s.items.length, 0);
}
