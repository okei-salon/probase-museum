/**
 * 選手の SOP キャリア（buildYearSopRankings を WORLD × YEAR 単位で再利用）
 */

import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import { buildYearSopRankings } from "@/data/sop/buildYearSop";
import { buildInterleagueSopCareerRankings } from "@/data/sop/buildInterleagueSop";
import { collectAllSopSeasonResults } from "@/data/sop/careerBoard";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  type SeasonWorld,
} from "@/data/seasons";
import { aggregateCareerSop } from "@/lib/sop/computeSeasonSop";

export type PlayerSopYearRow = {
  year: number;
  world?: SeasonWorld | null;
  /** 表示用ラベル（例: 2026 BLUE） */
  seasonLabel: string;
  role: "batter" | "pitcher";
  points: number;
  yearRank: number;
  pennantPoints?: number;
  interleaguePoints?: number;
};

export type PlayerSopCareer = {
  years: PlayerSopYearRow[];
  careerTotal: number | null;
  careerRank: number | null;
  interleagueCareerTotal: number | null;
  bestSeason: {
    year: number;
    world?: SeasonWorld | null;
    seasonLabel: string;
    points: number;
    yearRank: number;
  } | null;
};

export function buildPlayerSopCareer(playerId: string): PlayerSopCareer {
  const playerLines = listSeasonLinesByPlayer(playerId);

  const identityKeys = new Map<
    string,
    ReturnType<typeof identityFromWorldYear>
  >();
  for (const l of playerLines) {
    const identity = identityFromWorldYear(l.year, l.world);
    identityKeys.set(identity.seasonKey, identity);
  }
  const playerIdentities = [...identityKeys.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });

  if (playerIdentities.length === 0) {
    return {
      years: [],
      careerTotal: null,
      careerRank: null,
      interleagueCareerTotal: null,
      bestSeason: null,
    };
  }

  const yearRows: PlayerSopYearRow[] = [];
  for (const identity of playerIdentities) {
    const { rankings, results } = buildYearSopRankings(identity);
    const label = formatSeasonLineLabel(identity);
    for (const entry of rankings) {
      if (entry.result.playerId !== playerId) continue;
      const r = entry.result;
      yearRows.push({
        year: identity.year,
        world: identity.world,
        seasonLabel: label,
        role: r.role,
        points: r.total,
        yearRank: entry.rank ?? 0,
        pennantPoints: r.meta?.pennantTotal,
        interleaguePoints: r.meta?.interleagueTotal,
      });
    }
    // rankings に載らない0点は results から拾わない（表示ノイズ回避）
    void results;
  }

  yearRows.sort(
    (a, b) =>
      a.year - b.year ||
      (a.world ?? "").localeCompare(b.world ?? "") ||
      a.role.localeCompare(b.role),
  );

  const allResults = collectAllSopSeasonResults();
  const careers = aggregateCareerSop(allResults);
  const mine = careers.find((c) => c.playerId === playerId);
  const careerTotal = mine?.total ?? null;

  let careerRank: number | null = null;
  if (mine) {
    let rank = 1;
    for (let i = 0; i < careers.length; i += 1) {
      if (i > 0 && careers[i]!.total !== careers[i - 1]!.total) {
        rank = i + 1;
      }
      if (careers[i]!.playerId === playerId) {
        careerRank = rank;
        break;
      }
    }
  }

  const ilCareer = buildInterleagueSopCareerRankings("all").find(
    (c) => c.playerId === playerId,
  );

  let bestSeason: PlayerSopCareer["bestSeason"] = null;
  for (const row of yearRows) {
    if (!bestSeason || row.points > bestSeason.points) {
      bestSeason = {
        year: row.year,
        world: row.world,
        seasonLabel: row.seasonLabel,
        points: row.points,
        yearRank: row.yearRank,
      };
    }
  }

  return {
    years: yearRows,
    careerTotal,
    careerRank,
    interleagueCareerTotal: ilCareer?.total ?? null,
    bestSeason,
  };
}
