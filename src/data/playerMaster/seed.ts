import type { TeamId } from "@/data/teams";
import type {
  PlayerMaster,
  PlayerMasterImportRow,
  PlayerSeasonAffiliation,
} from "./types";
import npb2026Bundle from "./npb2026Players.json";
import {
  samplePlayerAffiliations,
  samplePlayerMasters,
} from "./sampleData";

const SEED_NOW = "2026-01-01T00:00:00.000Z";

type Npb2026Bundle = {
  year: number;
  source: string;
  players: PlayerMasterImportRow[];
};

/**
 * NPB公式 2026年度選手一覧を初期辞書へ展開。
 * 自動成長（UNKNOWN / aliases / localStorage）の仕組みはそのまま併用する。
 */
export function buildNpb2026Seed(): {
  masters: PlayerMaster[];
  affiliations: PlayerSeasonAffiliation[];
} {
  const bundle = npb2026Bundle as Npb2026Bundle;
  const masters: PlayerMaster[] = [];
  const affiliations: PlayerSeasonAffiliation[] = [];

  for (const row of bundle.players) {
    const uniform =
      row.uniformNumber == null || row.uniformNumber === ""
        ? null
        : Number(row.uniformNumber);

    const master: PlayerMaster = {
      playerId: row.playerId,
      fullName: row.fullName,
      gameDisplayName: row.gameDisplayName,
      aliases: [],
      position: row.position,
      uniformNumber: Number.isFinite(uniform as number)
        ? (uniform as number)
        : null,
      isRealPlayer: true,
      createdAt: SEED_NOW,
      updatedAt: SEED_NOW,
    };
    masters.push(master);

    affiliations.push({
      playerId: row.playerId,
      year: Number(row.year ?? bundle.year ?? 2026),
      teamId: row.teamId as TeamId,
      teamName: row.teamName,
      position: row.position,
      uniformNumber: master.uniformNumber,
    });
  }

  return { masters, affiliations };
}

/** 初期辞書 = 2026実在NPB + 架空デモ少数 */
export function buildInitialPlayerMasterSeed(): {
  masters: PlayerMaster[];
  affiliations: PlayerSeasonAffiliation[];
} {
  const npb = buildNpb2026Seed();
  const byId = new Map(npb.masters.map((m) => [m.playerId, m]));
  for (const m of samplePlayerMasters) byId.set(m.playerId, m);

  const affKey = (a: PlayerSeasonAffiliation) =>
    `${a.playerId}:${a.year}${a.world ? `:${a.world}` : ""}`;
  const affMap = new Map(npb.affiliations.map((a) => [affKey(a), a]));
  for (const a of samplePlayerAffiliations) affMap.set(affKey(a), a);

  return {
    masters: [...byId.values()],
    affiliations: [...affMap.values()],
  };
}
