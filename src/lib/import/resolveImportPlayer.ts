import {
  getPlayerAffiliationsByPlayer,
  getPlayerMaster,
  listPlayerMasters,
  normalizeTeamId,
} from "@/data/playerMaster";
import type { PlayerRef } from "@/data/playerMaster/types";
import { UNKNOWN_PLAYER_STATUS } from "@/data/playerMaster/types";
import {
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";
import {
  createUnknownPlayerRef,
  matchPlayerFromGameDisplay,
} from "@/lib/playerMaster/match";

function stripSpaces(name: string): string {
  return name.replace(/\s+/g, "").replace(/　/g, "");
}

function affiliationMatchesYearTeam(
  playerId: string,
  year: number,
  teamId: string,
  world?: SeasonWorld | null,
): boolean {
  const w = normalizeSeasonWorld(world);
  return getPlayerAffiliationsByPlayer(playerId).some((a) => {
    if (a.year !== year || a.teamId !== teamId) return false;
    if (w == null) return true;
    const aw = normalizeSeasonWorld(a.world);
    return aw == null || aw === w;
  });
}

/**
 * 取込用の選手照合。
 * 月間MVP画面には守備位置が無いことが多いので、
 * 投手部門→投手 / 野手部門→球団＋名字（必要ならフルネーム部分一致）で照合する。
 */
export function resolveImportPlayer(input: {
  gameDisplayName: string;
  team: string;
  year: number;
  role: "pitcher" | "batter";
  /** 正式 WORLD。所属学習・unknown観測へ伝播 */
  world?: SeasonWorld | null;
}): {
  playerRef: PlayerRef;
  displayName: string;
  status: "matched" | "ambiguous" | "unknown";
} {
  const raw = input.gameDisplayName.trim();
  const compact = stripSpaces(raw);
  const teamId = normalizeTeamId(input.team);
  const world = normalizeSeasonWorld(input.world);
  const observation = {
    gameDisplayName: compact || raw,
    team: input.team,
    year: input.year,
    world,
    position: input.role === "pitcher" ? "投手" : null,
  };

  // 1) 標準照合（投手はポジション付きで高確信度が出やすい）
  if (input.role === "pitcher") {
    const match = matchPlayerFromGameDisplay({
      ...observation,
      position: "投手",
    });
    if (match.status === "matched") {
      return {
        playerRef: match.playerRef,
        displayName: match.displayName,
        status: "matched",
      };
    }
  }

  // 2) フルネーム／部分一致（「佐藤輝」→ 佐藤輝明）
  if (compact && teamId) {
    const candidates = listPlayerMasters().filter((p) => {
      if (!p.isRealPlayer && p.playerId.startsWith("museum_")) {
        /* allow fictional too */
      }
      const affOk = affiliationMatchesYearTeam(
        p.playerId,
        input.year,
        teamId,
        world,
      );
      if (!affOk) return false;
      const full = stripSpaces(p.fullName);
      if (full === compact) return true;
      if (full.startsWith(compact) && compact.length >= 2) return true;
      if (compact.startsWith(stripSpaces(p.gameDisplayName)) && compact.length >= 2) {
        // 佐藤輝 starts with 佐藤
        if (input.role === "pitcher" && p.position !== "投手") return false;
        return true;
      }
      return false;
    });

    // 野手は投手を除外
    const filtered =
      input.role === "batter"
        ? candidates.filter((p) => p.position !== "投手")
        : candidates.filter((p) => p.position === "投手");

    if (filtered.length === 1) {
      return {
        playerRef: { status: "resolved", playerId: filtered[0].playerId },
        displayName: filtered[0].fullName,
        status: "matched",
      };
    }
    if (filtered.length > 1) {
      // 名字完全一致を優先
      const surname = stripSpaces(
        raw.split(/\s+/)[0] || compact.slice(0, 2),
      );
      const bySurname = filtered.filter(
        (p) => stripSpaces(p.gameDisplayName) === surname,
      );
      if (bySurname.length === 1) {
        return {
          playerRef: { status: "resolved", playerId: bySurname[0].playerId },
          displayName: bySurname[0].fullName,
          status: "matched",
        };
      }
      return {
        playerRef: createUnknownPlayerRef(observation),
        displayName: raw || compact,
        status: "ambiguous",
      };
    }
  }

  // 3) 名字＋球団＋（野手はポジション無し）
  const surname = compact.slice(0, 2) || compact;
  const nameMatch = matchPlayerFromGameDisplay({
    gameDisplayName: surname.length >= 1 ? surname : compact,
    team: input.team,
    year: input.year,
    position: input.role === "pitcher" ? "投手" : undefined,
  });

  if (nameMatch.status === "matched") {
    const player = getPlayerMaster(nameMatch.player.playerId);
    if (input.role === "batter" && player?.position === "投手") {
      // skip
    } else {
      return {
        playerRef: nameMatch.playerRef,
        displayName: nameMatch.displayName,
        status: "matched",
      };
    }
  }

  // 野手: 名字＋球団だけで1人に絞れるか
  if (input.role === "batter" && teamId && surname) {
    const same = listPlayerMasters().filter((p) => {
      if (stripSpaces(p.gameDisplayName) !== surname) return false;
      if (p.position === "投手") return false;
      return affiliationMatchesYearTeam(
        p.playerId,
        input.year,
        teamId,
        world,
      );
    });
    if (same.length === 1) {
      return {
        playerRef: { status: "resolved", playerId: same[0].playerId },
        displayName: same[0].fullName,
        status: "matched",
      };
    }
    if (same.length > 1) {
      return {
        playerRef: createUnknownPlayerRef(observation),
        displayName: raw || compact,
        status: "ambiguous",
      };
    }
  }

  if (nameMatch.status === "ambiguous") {
    return {
      playerRef: nameMatch.playerRef,
      displayName: raw || compact,
      status: "ambiguous",
    };
  }

  return {
    playerRef: createUnknownPlayerRef(observation),
    displayName: raw || compact || "未登録選手",
    status: "unknown",
  };
}

export function displayNameFromRef(ref: PlayerRef, fallback: string): string {
  if (ref.status === UNKNOWN_PLAYER_STATUS) {
    return fallback || ref.observation.gameDisplayName || "未登録選手";
  }
  return getPlayerMaster(ref.playerId)?.fullName ?? fallback;
}
