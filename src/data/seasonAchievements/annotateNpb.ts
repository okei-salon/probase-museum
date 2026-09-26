/**
 * 記録・偉業カードへの NPB 注釈（新記録／タイ）。
 * 既存カテゴリは維持し、isNpbRecord で「NPB記録」フィルターに載せる。
 */

import {
  classifyNpbRecord,
  NPB_BATTER_SEASON_RECORDS,
  NPB_FEAT_RECORDS,
  NPB_RECORD_BONUS_POINTS,
} from "@/lib/sop/npbRecords";
import type { SeasonAchievement } from "./types";

const DOUBLES_DEF = NPB_BATTER_SEASON_RECORDS.find((d) => d.field === "doubles")!;
const HR_STREAK_DEF = NPB_FEAT_RECORDS.find((d) => d.field === "hrStreak")!;
const PINCH_HR_DEF = NPB_FEAT_RECORDS.find((d) => d.field === "pinchHr")!;

function npbCaption(isUpdate: boolean, previous: number, unit: string): string {
  if (isUpdate) return `従来記録：${previous}${unit}`;
  return "歴代1位タイ";
}

function applyNpbFlags(
  item: SeasonAchievement,
  opts: {
    isUpdate: boolean;
    previous: number;
    unit: string;
    bonus?: number;
  },
): SeasonAchievement {
  return {
    ...item,
    isNpbRecord: true,
    isNpbUpdate: opts.isUpdate,
    npbPreviousValue: opts.previous,
    npbBonusPoints: opts.bonus ?? item.npbBonusPoints ?? NPB_RECORD_BONUS_POINTS,
    npbCaption: npbCaption(opts.isUpdate, opts.previous, opts.unit),
  };
}

function isPinchHrAchievement(a: SeasonAchievement): boolean {
  if (a.recordType === "pinch_hr" || a.recordType === "season_pinch_hr") {
    return true;
  }
  return /代打本塁打/.test(a.recordName);
}

function isSeasonDoublesAchievement(a: SeasonAchievement): boolean {
  if (a.recordType === "season_doubles" || a.recordType === "npb_2b") {
    return true;
  }
  return a.recordName === "シーズン二塁打" || a.recordName === "二塁打";
}

/** 既存カードに NPB フラグを付与（データ削除なし） */
export function annotateNpbAchievements(
  items: SeasonAchievement[],
): SeasonAchievement[] {
  return items.map((item) => {
    // 連続試合本塁打
    if (item.recordType === "hr_streak") {
      const cls = classifyNpbRecord(item.value, HR_STREAK_DEF);
      if (!cls) return item;
      return applyNpbFlags(item, {
        isUpdate: cls.isUpdate,
        previous: HR_STREAK_DEF.threshold,
        unit: item.unit ?? "試合",
      });
    }

    // シーズン二塁打
    if (isSeasonDoublesAchievement(item)) {
      const cls = classifyNpbRecord(item.value, DOUBLES_DEF);
      if (!cls) return item;
      return applyNpbFlags(item, {
        isUpdate: cls.isUpdate,
        previous: DOUBLES_DEF.threshold,
        unit: item.unit ?? "二塁打",
      });
    }

    // シーズン代打本塁打
    if (isPinchHrAchievement(item)) {
      const cls = classifyNpbRecord(item.value, PINCH_HR_DEF);
      if (!cls) return item;
      return applyNpbFlags(item, {
        isUpdate: cls.isUpdate,
        previous: PINCH_HR_DEF.threshold,
        unit: item.unit ?? "本",
      });
    }

    // その他: 既に category=npb_record で値がある場合のタイ／更新文言補完
    if (
      item.category === "npb_record" &&
      item.isNpbRecord &&
      item.npbPreviousValue != null &&
      !item.npbCaption
    ) {
      return {
        ...item,
        npbCaption: npbCaption(
          Boolean(item.isNpbUpdate),
          item.npbPreviousValue,
          item.unit ?? "",
        ),
      };
    }

    return item;
  });
}

export function npbBadgeLabel(item: SeasonAchievement): string | null {
  if (!(item.isNpbRecord || item.category === "npb_record")) return null;
  if (item.isNpbUpdate) return "NPB新記録";
  return "NPBタイ記録";
}
