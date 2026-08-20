import type { SeasonWorld } from "@/data/seasons";
import type { TeamId } from "@/data/teams";

export type PennantLeague = "central" | "pacific";

/**
 * リーグ内対戦カード（正規化済み）。
 * teamAId < teamBId（辞書順）を常に満たし、wins/losses は teamA 視点。
 */
export type PennantMatchupCard = {
  teamAId: TeamId;
  teamBId: TeamId;
  teamA: string;
  teamB: string;
  wins: number;
  losses: number;
  draws: number;
};

export type PennantMatchupsSource =
  | "manual"
  | "ocr"
  | "import"
  | "partner";

/**
 * YEAR × WORLD × LEAGUE 単位の対戦表ドキュメント。
 * id 例: BLUE:2026:central / 2000:pacific
 */
export type PennantMatchupsRecord = {
  id: string;
  year: number;
  world?: SeasonWorld | null;
  league: PennantLeague;
  cards: PennantMatchupCard[];
  source: PennantMatchupsSource;
  createdAt: string;
  updatedAt: string;
};

/** 入力ドラフト（向き未正規化可） */
export type PennantMatchupDraft = {
  teamA: string;
  teamB: string;
  teamAId?: TeamId;
  teamBId?: TeamId;
  wins: number;
  losses: number;
  draws: number;
};
