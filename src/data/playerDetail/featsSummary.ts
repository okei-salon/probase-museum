/**
 * 選手のその他の記録（seasonAchievements 横断。デモ除外）
 */

import { RECORDS_HR_SB_MIN_SUM } from "@/data/recordsRankings/otherFeats";
import { listCrossYearAchievements } from "@/data/recordsRankings/streakRankings";
import type { SeasonAchievement } from "@/data/seasonAchievements";

export type PlayerFeatItem = {
  key: string;
  label: string;
  /** 主表示（34試合 / 2回 など） */
  valueLabel: string;
  detail?: string;
  years: number[];
};

const STREAK_TYPES: Record<string, string> = {
  hit_streak: "連続試合安打",
  on_base_streak: "連続試合出塁",
  hr_streak: "連続試合本塁打",
  scoreless_ip: "連続無失点イニング",
  win_streak: "連勝",
};

const COUNT_TYPES: Record<string, string> = {
  perfect_game: "完全試合",
  no_hitter: "ノーヒットノーラン",
  cycle: "サイクルヒット",
  triple_three: "トリプルスリー",
  triple_three_rbi100: "トリプルスリー＋100打点",
  avg400: "打率.400以上",
  undefeated: "シーズン無敗",
};

function formatStreakValue(a: SeasonAchievement): string {
  if (a.valueLabel) return a.valueLabel;
  if (a.value == null) return "達成";
  const unit = a.unit ?? "";
  return `${a.value}${unit}`;
}

export function buildPlayerFeatsSummary(
  playerId: string,
): PlayerFeatItem[] {
  const feats = listCrossYearAchievements().filter(
    (a) => a.playerId === playerId,
  );
  if (feats.length === 0) return [];

  const items: PlayerFeatItem[] = [];

  // 連続記録：最大値を表示
  for (const [type, label] of Object.entries(STREAK_TYPES)) {
    const rows = feats.filter((a) => a.recordType === type);
    if (rows.length === 0) continue;
    const best = rows.reduce((acc, cur) => {
      const av = acc.value ?? 0;
      const cv = cur.value ?? 0;
      return cv >= av ? cur : acc;
    });
    items.push({
      key: type,
      label,
      valueLabel: formatStreakValue(best),
      years: [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b),
      detail:
        rows.length > 1
          ? `ベスト ${formatStreakValue(best)}（${best.season}年）`
          : `${best.season}年`,
    });
  }

  // 回数系
  for (const [type, label] of Object.entries(COUNT_TYPES)) {
    const rows = feats.filter((a) => a.recordType === type);
    if (rows.length === 0) continue;
    const years = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
    items.push({
      key: type,
      label,
      valueLabel: `${rows.length}回`,
      years,
      detail: years.map((y) => `${y}年`).join("・"),
    });
  }

  // HR×SB（合計60以上）→ 30-30達成として集計
  const hrSb = feats.filter((a) => {
    if (a.recordType !== "hr_sb_combo") return false;
    const sum =
      a.tertiaryValue ??
      (a.value != null && a.secondaryValue != null
        ? a.value + a.secondaryValue
        : null);
    return sum != null && sum >= RECORDS_HR_SB_MIN_SUM;
  });
  if (hrSb.length > 0) {
    const years = [...new Set(hrSb.map((r) => r.season))].sort((a, b) => a - b);
    items.push({
      key: "hr_sb_60",
      label: "30-30達成",
      valueLabel: `${hrSb.length}回`,
      years,
      detail: hrSb
        .map((a) => a.valueLabel ?? `${a.season}年`)
        .join(" / "),
    });
  }

  // NPB史実
  const npb = feats.filter(
    (a) =>
      a.category === "npb_record" || a.isNpbRecord || a.isNpbUpdate,
  );
  for (const a of npb) {
    items.push({
      key: a.id,
      label: a.recordName,
      valueLabel: a.valueLabel ?? (a.isNpbUpdate ? "NPB記録更新" : "NPB記録到達"),
      years: [a.season],
      detail: `${a.season}年`,
    });
  }

  // その他（上記に含まれない special / season）
  const covered = new Set([
    ...Object.keys(STREAK_TYPES),
    ...Object.keys(COUNT_TYPES),
    "hr_sb_combo",
  ]);
  for (const a of feats) {
    if (covered.has(a.recordType)) continue;
    if (a.category === "npb_record" || a.isNpbRecord || a.isNpbUpdate) continue;
    if (a.category === "single_game") {
      items.push({
        key: a.id,
        label: a.recordName,
        valueLabel: formatStreakValue(a),
        years: [a.season],
        detail: `${a.season}年`,
      });
      continue;
    }
    if (a.category === "special" || a.category === "season") {
      items.push({
        key: a.id,
        label: a.recordName,
        valueLabel: formatStreakValue(a),
        years: [a.season],
        detail: `${a.season}年`,
      });
    }
  }

  return items;
}
