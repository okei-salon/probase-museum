/**
 * 記録・偉業カードへの NPB 注釈（新記録／タイ）。
 * 既存カテゴリは維持し、isNpbRecord で「NPB記録」フィルターに載せる。
 */

import {
  classifyNpbRecord,
  NPB_BATTER_SEASON_RECORDS,
  NPB_FEAT_RECORDS,
  NPB_PITCHER_SEASON_RECORDS,
  NPB_RECORD_BONUS_POINTS,
} from "@/lib/sop/npbRecords";
import type { SeasonAchievement } from "./types";

const DOUBLES_DEF = NPB_BATTER_SEASON_RECORDS.find((d) => d.field === "doubles")!;
const SAVES_DEF = NPB_PITCHER_SEASON_RECORDS.find((d) => d.field === "sv")!;
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

function resolveNumericValue(a: SeasonAchievement): number | null {
  if (a.value != null && Number.isFinite(a.value)) return a.value;
  const m = a.valueLabel?.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isSeasonDoublesAchievement(a: SeasonAchievement): boolean {
  if (a.recordType === "season_doubles" || a.recordType === "npb_2b") {
    return true;
  }
  return a.recordName === "シーズン二塁打" || a.recordName === "二塁打";
}

function isSeasonSavesAchievement(a: SeasonAchievement): boolean {
  if (
    a.recordType === "season_saves" ||
    a.recordType === "season_sv" ||
    a.recordType === "npb_sv"
  ) {
    return true;
  }
  return a.recordName === "シーズンセーブ" || a.recordName === "セーブ";
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

    // シーズンセーブ
    if (isSeasonSavesAchievement(item)) {
      const value = resolveNumericValue(item);
      const cls = classifyNpbRecord(value, SAVES_DEF);
      if (!cls) return item;
      return applyNpbFlags(
        {
          ...item,
          value: value ?? item.value,
          unit: item.unit ?? "セーブ",
          valueLabel:
            item.valueLabel && item.valueLabel !== "達成"
              ? item.valueLabel
              : value != null
                ? `${value}セーブ`
                : item.valueLabel,
          category:
            item.category === "npb_record" ? item.category : "npb_record",
          recordType: "season_saves",
          recordName: "シーズンセーブ",
        },
        {
          isUpdate: cls.isUpdate,
          previous: SAVES_DEF.threshold,
          unit: "セーブ",
        },
      );
    }

    // シーズン代打本塁打
    if (isPinchHrAchievement(item)) {
      const value = resolveNumericValue(item);
      const cls = classifyNpbRecord(value, PINCH_HR_DEF);
      if (!cls) return item;
      return applyNpbFlags(
        {
          ...item,
          value: value ?? item.value,
          unit: item.unit ?? "本",
          valueLabel:
            item.valueLabel && item.valueLabel !== "達成"
              ? item.valueLabel
              : value != null
                ? `${value}本`
                : item.valueLabel,
          category:
            item.category === "npb_record" ? item.category : "npb_record",
          recordType:
            item.recordType === "pinch_hr" || item.recordType === "season_pinch_hr"
              ? item.recordType
              : "pinch_hr",
          recordName: "シーズン代打本塁打",
        },
        {
          isUpdate: cls.isUpdate,
          previous: PINCH_HR_DEF.threshold,
          unit: "本",
        },
      );
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
