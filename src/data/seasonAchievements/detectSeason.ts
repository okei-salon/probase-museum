/**
 * 個人成績からシーズン偉業を自動判定。
 * SOP Ver.3 のルール定数を参照し、ポイント計算ロジックは再実装しない。
 * データ不足は推測せずスキップ。
 */

import type { PlayerSeasonLine } from "@/data/playerSeasonLines";
import { getTeam } from "@/data/teams";
import { bestSumTierPoints, classifyPitcherWorkload } from "@/lib/sop/helpers";
import {
  BATTER_COMBOS,
  BATTER_HISTORIC,
  HR_SB_COMBO_TIERS,
  HR_SB_MIN_EACH,
  PITCHER_FEATS,
  PITCHER_HISTORIC,
} from "@/lib/sop/rules";
import { getPlayerMaster } from "@/data/playerMaster";
import type { SeasonAchievement } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function baseMeta(line: PlayerSeasonLine) {
  const name =
    getPlayerMaster(line.playerId)?.fullName ?? line.playerName;
  return {
    season: line.year,
    world: line.world ?? null,
    playerId: line.playerId,
    playerName: name,
    teamShort: getTeam(line.teamId)?.short ?? line.teamName,
    role: line.role as "batter" | "pitcher",
    source: "auto" as const,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function makeId(line: PlayerSeasonLine, recordType: string) {
  const w = line.world ?? null;
  const base = `auto:${line.year}:${line.playerId}:${line.role}:${recordType}`;
  if (w) return `auto:${w}:${line.year}:${line.playerId}:${line.role}:${recordType}`;
  return base;
}

/** 野手のシーズン偉業（成績のみで判定可能） */
function detectBatterSeason(
  line: Extract<PlayerSeasonLine, { role: "batter" }>,
): SeasonAchievement[] {
  const c = line.counting;
  const d = line.derived;
  const meta = baseMeta(line);
  const out: SeasonAchievement[] = [];

  const hr = c.hr;
  const sb = c.sb ?? null;
  const avg = d.avg;
  const rbi = c.rbi;
  const ops = d.ops;
  const risp = d.rispAvg;
  const csRate = d.csRate;

  // HR × SB（最高ティアのみ）
  if (hr >= HR_SB_MIN_EACH && sb != null && sb >= HR_SB_MIN_EACH) {
    const sum = hr + sb;
    const tier = bestSumTierPoints(sum, HR_SB_COMBO_TIERS);
    if (tier) {
      out.push({
        ...meta,
        id: makeId(line, "hr_sb_combo"),
        category: "season",
        recordType: "hr_sb_combo",
        recordName: "HR × SB",
        value: hr,
        secondaryValue: sb,
        tertiaryValue: sum,
        valueLabel: `${hr}本塁打・${sb}盗塁　合計${sum}`,
        sopPoints: tier.points,
      });
    }
  }

  const hasTriple =
    avg != null && avg >= 0.3 && hr >= 30 && sb != null && sb >= 30;
  const hasRbi100 = rbi >= 100;
  const has300HrRbi =
    avg != null && avg >= 0.3 && hr >= 30 && hasRbi100;

  if (hasTriple && hasRbi100) {
    out.push({
      ...meta,
      id: makeId(line, "triple_three_rbi100"),
      category: "season",
      recordType: "triple_three_rbi100",
      recordName: BATTER_COMBOS.tripleThreeRbi100.label,
      valueLabel: "達成",
      sopPoints: BATTER_COMBOS.tripleThreeRbi100.points,
    });
  } else if (hasTriple) {
    out.push({
      ...meta,
      id: makeId(line, "triple_three"),
      category: "season",
      recordType: "triple_three",
      recordName: BATTER_COMBOS.tripleThree.label,
      valueLabel: "達成",
      sopPoints: BATTER_COMBOS.tripleThree.points,
    });
  } else if (has300HrRbi) {
    out.push({
      ...meta,
      id: makeId(line, "avg300_hr30_rbi100"),
      category: "season",
      recordType: "avg300_hr30_rbi100",
      recordName: BATTER_COMBOS.avg300Hr30Rbi100.label,
      valueLabel: "達成",
      sopPoints: BATTER_COMBOS.avg300Hr30Rbi100.points,
    });
  }

  if (avg != null && avg >= 0.4) {
    out.push({
      ...meta,
      id: makeId(line, "avg400"),
      category: "season",
      recordType: "avg400",
      recordName: BATTER_HISTORIC.avg400.label,
      value: avg,
      valueLabel: `打率 ${avg.toFixed(3)}`,
      sopPoints: BATTER_HISTORIC.avg400.points,
    });
  }
  if (risp != null && risp >= 0.4) {
    out.push({
      ...meta,
      id: makeId(line, "risp400"),
      category: "season",
      recordType: "risp400",
      recordName: BATTER_HISTORIC.risp400.label,
      value: risp,
      valueLabel: `圏打率 ${risp.toFixed(3)}`,
      sopPoints: BATTER_HISTORIC.risp400.points,
    });
  }
  if (ops != null && ops >= 1.1) {
    out.push({
      ...meta,
      id: makeId(line, "ops1100"),
      category: "season",
      recordType: "ops1100",
      recordName: BATTER_HISTORIC.ops1100.label,
      value: ops,
      valueLabel: `OPS ${ops.toFixed(3)}`,
      sopPoints: BATTER_HISTORIC.ops1100.points,
    });
  }
  if (csRate != null && csRate >= 0.8) {
    out.push({
      ...meta,
      id: makeId(line, "cs_rate800"),
      category: "season",
      recordType: "cs_rate800",
      recordName: BATTER_HISTORIC.csRate800.label,
      value: csRate,
      valueLabel: `阻止率 ${csRate.toFixed(3)}`,
      sopPoints: BATTER_HISTORIC.csRate800.points,
    });
  }

  return out;
}

function detectPitcherSeason(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
): SeasonAchievement[] {
  const c = line.counting;
  const d = line.derived;
  const meta = baseMeta(line);
  const out: SeasonAchievement[] = [];
  const { class: pClass } = classifyPitcherWorkload(c.g, c.gs ?? null);
  const hp = c.hld ?? c.hp ?? null;

  if (pClass === "starter" && d.era != null && d.era < 1.0 && d.era >= 0) {
    out.push({
      ...meta,
      id: makeId(line, "starter_era0"),
      category: "season",
      recordType: "starter_era0",
      recordName: PITCHER_HISTORIC.starterEra0.label,
      value: d.era,
      valueLabel: `防御率 ${d.era.toFixed(2)}`,
      sopPoints: PITCHER_HISTORIC.starterEra0.points,
    });
  }
  if (d.winPct != null && d.winPct >= 1.0 && c.w > 0) {
    out.push({
      ...meta,
      id: makeId(line, "win_pct_1000"),
      category: "season",
      recordType: "win_pct_1000",
      recordName: PITCHER_HISTORIC.winPct1000.label,
      value: d.winPct,
      valueLabel: "勝率 1.000",
      sopPoints: PITCHER_HISTORIC.winPct1000.points,
    });
  }
  if ((c.sho ?? 0) >= 10) {
    out.push({
      ...meta,
      id: makeId(line, "sho10"),
      category: "season",
      recordType: "sho10",
      recordName: PITCHER_HISTORIC.sho10.label,
      value: c.sho ?? 0,
      unit: "完封",
      valueLabel: `${c.sho}完封`,
      sopPoints: PITCHER_HISTORIC.sho10.points,
    });
  }
  if ((c.cg ?? 0) >= 20) {
    out.push({
      ...meta,
      id: makeId(line, "cg20"),
      category: "season",
      recordType: "cg20",
      recordName: PITCHER_HISTORIC.cg20.label,
      value: c.cg ?? 0,
      unit: "完投",
      valueLabel: `${c.cg}完投`,
      sopPoints: PITCHER_HISTORIC.cg20.points,
    });
  }
  if (c.g >= 80) {
    out.push({
      ...meta,
      id: makeId(line, "g80"),
      category: "season",
      recordType: "g80",
      recordName: PITCHER_HISTORIC.g80.label,
      value: c.g,
      unit: "試合",
      valueLabel: `${c.g}試合登板`,
      sopPoints: PITCHER_HISTORIC.g80.points,
    });
  }
  if (c.w >= 20) {
    out.push({
      ...meta,
      id: makeId(line, "w20"),
      category: "season",
      recordType: "w20",
      recordName: PITCHER_HISTORIC.w20.label,
      value: c.w,
      unit: "勝",
      valueLabel: `${c.w}勝`,
      sopPoints: PITCHER_HISTORIC.w20.points,
    });
  }
  if (hp != null && hp >= 50) {
    out.push({
      ...meta,
      id: makeId(line, "hp50"),
      category: "season",
      recordType: "hp50",
      recordName: PITCHER_HISTORIC.hp50.label,
      value: hp,
      unit: "HP",
      valueLabel: `${hp}HP`,
      sopPoints: PITCHER_HISTORIC.hp50.points,
    });
  }
  if (c.w >= 10 && c.l === 0) {
    out.push({
      ...meta,
      id: makeId(line, "undefeated"),
      category: "season",
      recordType: "undefeated",
      recordName: PITCHER_FEATS.undefeated10.label,
      value: c.w,
      valueLabel: `${c.w}勝0敗`,
      sopPoints: PITCHER_FEATS.undefeated10.points,
    });
  }

  return out;
}

/**
 * 成績ライン上の連続記録（hitStreak等）があれば連続記録カード化。
 * SOP点は Ver.3 ティアを参照。
 */
function detectStreaksFromLine(line: PlayerSeasonLine): SeasonAchievement[] {
  const meta = baseMeta(line);
  const out: SeasonAchievement[] = [];

  if (line.role === "batter") {
    const { hitStreak, onBaseStreak } = line.counting;
    if (hitStreak != null && hitStreak >= 20) {
      const pts =
        hitStreak >= 40 ? 15 : hitStreak >= 30 ? 10 : 5;
      out.push({
        ...meta,
        id: makeId(line, "hit_streak"),
        category: "streak",
        recordType: "hit_streak",
        recordName: "連続試合安打",
        value: hitStreak,
        unit: "試合",
        valueLabel: `${hitStreak}試合`,
        sopPoints: pts,
      });
    }
    if (onBaseStreak != null && onBaseStreak >= 20) {
      const pts =
        onBaseStreak >= 40 ? 15 : onBaseStreak >= 30 ? 10 : 5;
      out.push({
        ...meta,
        id: makeId(line, "on_base_streak"),
        category: "streak",
        recordType: "on_base_streak",
        recordName: "連続試合出塁",
        value: onBaseStreak,
        unit: "試合",
        valueLabel: `${onBaseStreak}試合`,
        sopPoints: pts,
      });
    }
  }
  return out;
}

export function detectAchievementsFromSeasonLines(
  lines: PlayerSeasonLine[],
): SeasonAchievement[] {
  const out: SeasonAchievement[] = [];
  for (const line of lines) {
    if (line.scope !== "pennant") continue;
    if (line.role === "batter") {
      out.push(...detectBatterSeason(line));
      out.push(...detectStreaksFromLine(line));
    } else {
      out.push(...detectPitcherSeason(line));
    }
  }
  return out;
}
