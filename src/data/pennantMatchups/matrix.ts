import { npbTeams } from "@/data/teams";
import { viewMatchupFromTeam } from "./normalize";
import type { PennantLeague, PennantMatchupCard } from "./types";

/**
 * 保存カード配列 → MatchMatrix 用の正方行列。
 * セルは行球団視点の "W-L" / "W-L-D"。
 */
export function cardsToSquareMatrix(
  league: PennantLeague,
  cards: PennantMatchupCard[],
): { teams: string[]; cells: string[][] } {
  const teams = npbTeams
    .filter((t) => (league === "central" ? t.league === "セ" : t.league === "パ"))
    .map((t) => t.short);
  const byId = new Map(
    npbTeams.map((t) => [t.short, t.id] as const),
  );

  const cells = teams.map((rowShort, ri) =>
    teams.map((colShort, ci) => {
      if (ri === ci) return "—";
      const rowId = byId.get(rowShort);
      const colId = byId.get(colShort);
      if (!rowId || !colId) return "0-0";
      const card = cards.find(
        (c) =>
          (c.teamAId === rowId && c.teamBId === colId) ||
          (c.teamAId === colId && c.teamBId === rowId),
      );
      if (!card) return "0-0";
      const view = viewMatchupFromTeam(card, rowId);
      if (!view) return "0-0";
      if (view.draws > 0) {
        return `${view.wins}-${view.losses}-${view.draws}`;
      }
      return `${view.wins}-${view.losses}`;
    }),
  );

  return { teams, cells };
}
