/**
 * シーズンハイライト（YEAR × WORLD 単位の長文）
 */

import type { SeasonWorld } from "@/data/seasons";

export type SeasonHighlightSource = "manual" | "partner" | "imported";

export type SeasonHighlightRecord = {
  year: number;
  world?: SeasonWorld | null;
  seasonKey?: string;
  /** ハイライト本文（改行保持） */
  text: string;
  source: SeasonHighlightSource;
  createdAt: string;
  updatedAt: string;
};
