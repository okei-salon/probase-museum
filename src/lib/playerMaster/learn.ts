import {
  addPlayerAlias,
  getPlayerMaster,
  normalizeTeamId,
  resolveTeamName,
  upsertPlayerAffiliation,
  upsertPlayerMasterRecord,
} from "@/data/playerMaster";
import type {
  OcrPlayerObservation,
  PlayerMaster,
  PlayerRef,
  PlayerSeasonAffiliation,
} from "@/data/playerMaster/types";
import { normalizeSeasonWorld } from "@/data/seasons";
import { normalizePlayerToken } from "@/lib/playerMaster/similarity";

export type LearnPlayerResult = {
  player: PlayerMaster;
  affiliation: PlayerSeasonAffiliation | null;
  playerRef: Extract<PlayerRef, { status: "resolved" }>;
  /** OCR表記を alias に追加したか */
  learnedAlias: boolean;
};

function slugifyIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g, "")
    .slice(0, 24);
}

export function suggestPlayerId(
  fullName: string,
  observation: OcrPlayerObservation,
): string {
  const team = normalizeTeamId(observation.team ?? null) ?? "museum";
  const name = slugifyIdPart(fullName) || slugifyIdPart(observation.gameDisplayName);
  const year = observation.year ?? "x";
  return `${team}_${name || "player"}_${year}`;
}

/**
 * 既存選手へ確定し、OCR表記を学習（alias）＋年度所属を更新。
 * 次回同じ読み取りなら自動照合しやすくなる。
 */
export function confirmExistingPlayer(input: {
  playerId: string;
  observation: OcrPlayerObservation;
  learnOcrAsAlias?: boolean;
}): LearnPlayerResult {
  const player = getPlayerMaster(input.playerId);
  if (!player) {
    throw new Error(`Player not found: ${input.playerId}`);
  }

  let learnedAlias = false;
  const ocrName = normalizePlayerToken(input.observation.gameDisplayName);
  if (input.learnOcrAsAlias !== false && ocrName) {
    const before = player.aliases.length;
    const updated = addPlayerAlias(player.playerId, ocrName);
    learnedAlias = !!updated && updated.aliases.length > before;
  }

  const latest = getPlayerMaster(input.playerId)!;
  const affiliation = upsertAffiliationFromObservation(
    latest.playerId,
    input.observation,
    latest,
  );

  return {
    player: latest,
    affiliation,
    playerRef: { status: "resolved", playerId: latest.playerId },
    learnedAlias,
  };
}

/**
 * 未登録選手を新規登録（実在／架空共通）。
 * 一度確定すれば次回から自動照合対象になる。
 */
export function registerNewPlayer(input: {
  fullName: string;
  observation: OcrPlayerObservation;
  playerId?: string;
  isRealPlayer?: boolean;
  uniformNumber?: number | null;
}): LearnPlayerResult {
  const nowIso = new Date().toISOString();
  const ocrName = normalizePlayerToken(input.observation.gameDisplayName);
  const playerId =
    input.playerId || suggestPlayerId(input.fullName, input.observation);

  if (getPlayerMaster(playerId)) {
    return confirmExistingPlayer({
      playerId,
      observation: input.observation,
      learnOcrAsAlias: true,
    });
  }

  const teamId = normalizeTeamId(input.observation.team ?? null);
  const master: PlayerMaster = {
    playerId,
    fullName: input.fullName.trim(),
    gameDisplayName: ocrName || input.fullName.trim(),
    aliases:
      ocrName && ocrName !== normalizePlayerToken(input.fullName)
        ? [ocrName]
        : [],
    position: input.observation.position?.trim() || "不明",
    uniformNumber:
      input.uniformNumber ??
      (input.observation.uniformNumber != null &&
      input.observation.uniformNumber !== ""
        ? Number(input.observation.uniformNumber)
        : null),
    isRealPlayer: input.isRealPlayer ?? true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // gameDisplayName は名字を基本に。フルネームと違うOCR名は aliases へ
  if (ocrName && ocrName !== master.gameDisplayName) {
    master.aliases = Array.from(new Set([...master.aliases, ocrName]));
  }
  // 名字推定: フルネームがOCR名字で始まるなら gameDisplayName は OCR
  if (ocrName) {
    master.gameDisplayName = ocrName;
  }

  const saved = upsertPlayerMasterRecord(master);
  const affiliation = teamId
    ? upsertAffiliationFromObservation(saved.playerId, input.observation, saved)
    : null;

  return {
    player: saved,
    affiliation,
    playerRef: { status: "resolved", playerId: saved.playerId },
    learnedAlias: master.aliases.includes(ocrName),
  };
}

function upsertAffiliationFromObservation(
  playerId: string,
  observation: OcrPlayerObservation,
  player: PlayerMaster,
): PlayerSeasonAffiliation | null {
  const year = observation.year;
  const teamId = normalizeTeamId(observation.team ?? null);
  if (year == null || !teamId) return null;

  return upsertPlayerAffiliation({
    playerId,
    year,
    world: normalizeSeasonWorld(observation.world),
    teamId,
    teamName: resolveTeamName(teamId),
    position: observation.position?.trim() || player.position,
    uniformNumber:
      observation.uniformNumber != null && observation.uniformNumber !== ""
        ? Number(observation.uniformNumber)
        : player.uniformNumber,
  });
}
