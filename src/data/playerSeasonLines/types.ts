import type { SeasonWorld } from "@/data/seasons";
import { normalizeSeasonWorld } from "@/data/seasons";
import type { TeamId } from "@/data/teams";
import type {
  BatterCountingInput,
  BatterDerived,
  PitcherCountingInput,
  PitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";

/** 成績の取得経路。保存モデルは同一。 */
export type SeasonLineSource = "manual" | "ocr";

export type SeasonLineScope = "pennant" | "interleague";

export type SeasonLineRole = "batter" | "pitcher";

type SeasonLineBase = {
  /**
   * 正式 WORLD: `${playerId}:${world}:${year}:${role}:${scope}`
   * レガシー／DEMO（world 無し）: `${playerId}:${year}:${role}:${scope}`（既存IDを変更しない）
   */
  id: string;
  playerId: string;
  playerName: string;
  year: number;
  /**
   * 正式 WORLD。未設定／null は既存レガシー・2000 DEMO（自動移行しない）。
   */
  world?: SeasonWorld | null;
  teamId: TeamId;
  teamName: string;
  scope: SeasonLineScope;
  source: SeasonLineSource;
  createdAt: string;
  updatedAt: string;
};

export type BatterSeasonLine = SeasonLineBase & {
  role: "batter";
  counting: BatterCountingInput;
  derived: BatterDerived;
};

export type PitcherSeasonLine = SeasonLineBase & {
  role: "pitcher";
  counting: PitcherCountingInput;
  derived: PitcherDerived;
};

export type PlayerSeasonLine = BatterSeasonLine | PitcherSeasonLine;

/**
 * 個人成績の upsert / 取得用 ID。
 * world がある正式データのみ ID に WORLD を含める。既存 world 無し ID 形式は維持する。
 */
export function seasonLineKey(
  playerId: string,
  year: number,
  role: SeasonLineRole,
  scope: SeasonLineScope = "pennant",
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  if (w) {
    return `${playerId}:${w}:${year}:${role}:${scope}`;
  }
  return `${playerId}:${year}:${role}:${scope}`;
}
