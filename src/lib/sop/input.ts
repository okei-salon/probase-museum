/**
 * SOP計算への入力スナップショット。
 * 不足フィールドは null/undefined → その項目は判定不可（加点しない）。
 */

import type { PitcherWorkloadClass, SopRole } from "./types";
import type { AnnualAwardKind } from "./rules";
import type { SeasonWorld } from "@/data/seasons";

export type SopTitlePlacement = {
  titleId: string;
  titleLabel: string;
  rank: 1 | 2 | 3 | 4 | 5;
};

export type SopAwardInput = {
  kind: AnnualAwardKind;
  /** 月間MVPなど複数回 */
  count?: number;
  label?: string;
};

export type SopFeatsInput = {
  cycle?: boolean;
  hitStreak?: number | null;
  onBaseStreak?: number | null;
  hrStreak?: number | null;
  perfectGame?: boolean;
  noHitter?: boolean;
  scorelessIp?: number | null;
  gameSo?: number | null;
  winStreak?: number | null;
};

export type SopBatterStats = {
  avg: number | null;
  /** 打席（二刀流評価用）。未入力時は null */
  pa: number | null;
  h: number | null;
  hr: number | null;
  rbi: number | null;
  r: number | null;
  doubles: number | null;
  triples: number | null;
  sb: number | null;
  sac: number | null;
  bb: number | null;
  obp: number | null;
  ops: number | null;
  rispAvg: number | null;
  csRate: number | null;
  csAttempted: number | null;
  paQualified: boolean | null;
};

export type SopPitcherStats = {
  era: number | null;
  w: number | null;
  l: number | null;
  winPct: number | null;
  so: number | null;
  soRate: number | null;
  sho: number | null;
  cg: number | null;
  ip: number | null;
  qsRate: number | null;
  g: number | null;
  gs: number | null;
  hp: number | null;
  hld: number | null;
  sv: number | null;
  reliefEra: number | null;
  reliefSoRate: number | null;
  reliefIp: number | null;
  ipQualified: boolean | null;
  pitcherClass: PitcherWorkloadClass;
  startRate: number | null;
};

/** 前年スナップショット（連続年判定用）。無い場合は連続ボーナスなし */
export type SopPriorYearFlags = {
  /** 基本達成ID集合 */
  basicIds: string[];
  /** 複合達成ID集合（hrSbCombo 含む） */
  comboIds: string[];
};

export type SopPlayerYearInput = {
  playerId: string;
  playerName: string;
  year: number;
  /** 正式 WORLD。レガシー／DEMO は null */
  world?: SeasonWorld | null;
  role: SopRole;
  teamId?: string;
  teamShort: string;
  league?: "central" | "pacific";
  batter?: SopBatterStats | null;
  pitcher?: SopPitcherStats | null;
  awards: SopAwardInput[];
  titles: SopTitlePlacement[];
  feats: SopFeatsInput;
  priorYear?: SopPriorYearFlags | null;
  /**
   * 二刀流SOPをこの結果へ加点するか。
   * 同一年度に野手・投手の双方成績がある場合のみ true。
   */
  applyTwoWay?: boolean;
};
