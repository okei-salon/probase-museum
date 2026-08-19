import {
  BATTER_FEATS,
  PITCHER_FEATS,
} from "@/lib/sop/rules";

/** 記録タイプからSOP通常点を算出（最高到達ティア） */
export function sopPointsForRecordType(
  recordType: string,
  value?: number | null,
): number {
  const v = value ?? 0;
  switch (recordType) {
    case "perfect_game":
      return PITCHER_FEATS.perfectGame.points;
    case "no_hitter":
      return PITCHER_FEATS.noHitter.points;
    case "cycle":
      return BATTER_FEATS.cycle.points;
    case "hit_streak":
      return tierPoints(BATTER_FEATS.hitStreak, v);
    case "on_base_streak":
      return tierPoints(BATTER_FEATS.onBaseStreak, v);
    case "hr_streak":
      return tierPoints(BATTER_FEATS.hrStreak, v);
    case "scoreless_ip":
      return tierPoints(PITCHER_FEATS.scorelessIp, v);
    case "win_streak":
      return tierPoints(PITCHER_FEATS.winStreak, v);
    case "game_so":
      return tierPoints(PITCHER_FEATS.gameSo, v);
    default:
      return 0;
  }
}

function tierPoints(
  tiers: ReadonlyArray<{ min: number; points: number }>,
  value: number,
): number {
  let best = 0;
  for (const t of tiers) {
    if (value >= t.min) best = Math.max(best, t.points);
  }
  return best;
}

export function roleForRecordType(
  recordType: string,
): "batter" | "pitcher" {
  if (
    recordType === "perfect_game" ||
    recordType === "no_hitter" ||
    recordType === "scoreless_ip" ||
    recordType === "win_streak" ||
    recordType === "game_so"
  ) {
    return "pitcher";
  }
  return "batter";
}

/** 数値入力が必要な記録か */
export function recordNeedsValue(recordType: string): boolean {
  return ![
    "perfect_game",
    "no_hitter",
    "cycle",
  ].includes(recordType);
}
