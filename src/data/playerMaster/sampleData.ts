import type { PlayerMaster, PlayerSeasonAffiliation } from "./types";

const now = "2026-08-12T00:00:00.000Z";

/**
 * 架空／デモ用の少数シード。
 * 2026実在選手は npb2026Players.json を初期辞書として別途ロードする。
 */
export const samplePlayerMasters: PlayerMaster[] = [
  {
    playerId: "giants_sato_dummy",
    fullName: "佐藤サンプル",
    gameDisplayName: "佐藤",
    aliases: [],
    position: "投手",
    uniformNumber: 18,
    isRealPlayer: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    playerId: "museum_yamada_rookie_2026",
    fullName: "山田ペナント",
    gameDisplayName: "山田",
    aliases: [],
    position: "投手",
    uniformNumber: 41,
    isRealPlayer: false,
    createdAt: now,
    updatedAt: now,
  },
];

export const samplePlayerAffiliations: PlayerSeasonAffiliation[] = [
  {
    playerId: "giants_sato_dummy",
    year: 2026,
    teamId: "giants",
    teamName: "読売ジャイアンツ",
    position: "投手",
    uniformNumber: 18,
  },
  {
    playerId: "museum_yamada_rookie_2026",
    year: 2026,
    teamId: "baystars",
    teamName: "横浜DeNAベイスターズ",
    position: "投手",
    uniformNumber: 41,
  },
];
