/**
 * 連続記録（SEASON 記録・偉業を横断集計。再入力しない）
 * Step11: WORLD × YEAR を独立シーズンとして横断（合算しない）
 */

import { getPlayerMaster } from "@/data/playerMaster";
import { listPennantSeasonIdentities } from "@/data/playerSeasonLines";
import {
  formatSeasonLineLabel,
  type SeasonWorld,
} from "@/data/seasons";
import {
  buildYearFeats,
  type SeasonAchievement,
} from "@/data/seasonAchievements";
import { formatRecordsValue } from "./defs";
import type { RecordsRankEntry } from "./seasonRankings";

export type StreakDeptId =
  | "hit_streak"
  | "on_base_streak"
  | "hr_streak"
  | "scoreless_ip"
  | "win_streak";

export type StreakDeptDef = {
  id: StreakDeptId;
  label: string;
  role: "batter" | "pitcher";
  unit: string;
  format: "int" | "ip";
};

export const STREAK_DEPARTMENTS: StreakDeptDef[] = [
  {
    id: "hit_streak",
    label: "連続試合安打",
    role: "batter",
    unit: "試合",
    format: "int",
  },
  {
    id: "on_base_streak",
    label: "連続試合出塁",
    role: "batter",
    unit: "試合",
    format: "int",
  },
  {
    id: "hr_streak",
    label: "連続試合本塁打",
    role: "batter",
    unit: "試合",
    format: "int",
  },
  {
    id: "scoreless_ip",
    label: "連続無失点イニング",
    role: "pitcher",
    unit: "イニング",
    format: "ip",
  },
  {
    id: "win_streak",
    label: "連勝",
    role: "pitcher",
    unit: "連勝",
    format: "int",
  },
];

export type StreakBoard = {
  def: StreakDeptDef;
  entries: RecordsRankEntry[];
  emptyReason?: string;
};

/** 全シーズンの記録・偉業（WORLD ごと。デモは本番に載せない） */
export function listCrossYearAchievements(): SeasonAchievement[] {
  const items: SeasonAchievement[] = [];
  const seen = new Set<string>();
  for (const identity of listPennantSeasonIdentities()) {
    const built = buildYearFeats(identity);
    for (const item of built.items) {
      if (item.source === "demo") continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

function rankStreakTop10(
  rows: {
    playerId: string;
    playerName: string;
    year: number;
    world?: SeasonWorld | null;
    seasonLabel: string;
    teamShort: string;
    value: number;
  }[],
  format: StreakDeptDef["format"],
): RecordsRankEntry[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const out: RecordsRankEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.value;
    let j = i;
    while (j < sorted.length && sorted[j]!.value === score) j += 1;
    const rank = i + 1;
    if (rank > 10) break;
    for (let k = i; k < j; k += 1) {
      const row = sorted[k]!;
      out.push({
        rank,
        playerId: row.playerId,
        playerName: row.playerName,
        year: row.year,
        world: row.world ?? null,
        seasonLabel: row.seasonLabel,
        teamShort: row.teamShort,
        value: row.value,
        valueText: formatRecordsValue(format, row.value),
      });
    }
    i = j;
  }
  return out;
}

export function buildStreakBoard(def: StreakDeptDef): StreakBoard {
  const feats = listCrossYearAchievements().filter(
    (a) => a.recordType === def.id && a.category === "streak",
  );

  const pool = feats
    .map((a) => {
      const value = a.value;
      if (value == null || !Number.isFinite(value) || value <= 0) return null;
      return {
        playerId: a.playerId,
        playerName:
          getPlayerMaster(a.playerId)?.fullName ?? a.playerName,
        year: a.season,
        world: a.world ?? null,
        seasonLabel: formatSeasonLineLabel({
          year: a.season,
          world: a.world,
        }),
        teamShort: a.teamShort,
        value,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const entries = rankStreakTop10(pool, def.format);
  return {
    def,
    entries,
    emptyReason:
      entries.length === 0
        ? "SEASON「記録・偉業」に登録された連続記録がまだありません。"
        : undefined,
  };
}

export function buildAllStreakBoards(): StreakBoard[] {
  return STREAK_DEPARTMENTS.map((def) => buildStreakBoard(def));
}
