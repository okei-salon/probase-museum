/**
 * 相棒データ貼り付け — 選手名解決
 */

import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { resolveImportPlayer } from "@/lib/import/resolveImportPlayer";
import { searchPlayerMasterCandidates } from "@/lib/manualEntry/searchPlayers";
import type { SeasonWorld } from "@/data/seasons";

export type PartnerResolvedPlayer = {
  name: string;
  teamShort: string;
  playerId: string | null;
  displayName: string;
  status: "matched" | "needs_confirm" | "unknown";
};

export function resolvePartnerPlayer(input: {
  name: string;
  teamShort: string;
  year: number;
  role?: "batter" | "pitcher";
  world?: SeasonWorld | null;
}): PartnerResolvedPlayer {
  const teamShort = normalizeTeamShort(input.teamShort);
  const name = input.name.trim();
  if (!name) {
    return {
      name,
      teamShort,
      playerId: null,
      displayName: "",
      status: "unknown",
    };
  }

  const role = input.role ?? "batter";
  const resolved = resolveImportPlayer({
    gameDisplayName: name,
    team: teamShort,
    year: input.year,
    role,
    world: input.world,
  });

  if (resolved.status === "matched") {
    return {
      name,
      teamShort,
      playerId:
        resolved.playerRef.status === "resolved"
          ? resolved.playerRef.playerId
          : null,
      displayName: resolved.displayName,
      status: "matched",
    };
  }

  const hits = searchPlayerMasterCandidates(name, input.year, 5);
  const sameTeam = hits.filter(
    (h) => h.teamShort === teamShort || teamShort === "",
  );
  const pick = sameTeam[0] ?? hits[0];
  if (pick) {
    return {
      name,
      teamShort: teamShort || pick.teamShort,
      playerId: pick.player.playerId,
      displayName: pick.player.fullName,
      status: hits.length === 1 || sameTeam.length === 1 ? "matched" : "needs_confirm",
    };
  }

  return {
    name,
    teamShort,
    playerId: null,
    displayName: name,
    status: "unknown",
  };
}
