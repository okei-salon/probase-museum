/**
 * 選手詳細向けの集約（既存ストアから導出。二重保存しない）
 * Step14: BLUE / RED を別シーズン行として扱い、WORLD を跨いで連続区間にしない。
 */

import {
  getPlayerAffiliation,
  getPlayerAffiliationsByPlayer,
  getPlayerMaster,
} from "@/data/playerMaster";
import { listSeasonLinesByPlayer } from "@/data/playerSeasonLines";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";
import { getTeam } from "@/data/teams";

export type TeamTenure = {
  teamShort: string;
  teamId: string;
  fromYear: number;
  toYear: number | null; // null = 継続中（最新がこの所属）
  world?: SeasonWorld | null;
  label: string;
};

function shortTeam(teamId: string, teamName: string) {
  return getTeam(teamId)?.short ?? teamName;
}

type YearTeam = {
  year: number;
  world: SeasonWorld | null;
  seasonKey: string;
  teamId: string;
  teamName: string;
};

/**
 * 所属推移：年度成績の球団を優先し、なければマスター所属。
 * 連続同一球団は同一 WORLD 内のみ区間にまとめる。
 */
export function buildTeamTimeline(playerId: string): TeamTenure[] {
  const lines = listSeasonLinesByPlayer(playerId).filter(
    (l) => l.scope === "pennant",
  );
  const byKey = new Map<string, YearTeam>();

  for (const line of lines) {
    const identity = identityFromWorldYear(line.year, line.world);
    const prev = byKey.get(identity.seasonKey);
    // 同一シーズンに野手・投手がある場合は野手側を優先（通常は同球団）
    if (!prev || line.role === "batter") {
      byKey.set(identity.seasonKey, {
        year: identity.year,
        world: identity.world,
        seasonKey: identity.seasonKey,
        teamId: line.teamId,
        teamName: line.teamName,
      });
    }
  }

  const affs = getPlayerAffiliationsByPlayer(playerId);
  for (const a of affs) {
    const identity = identityFromWorldYear(a.year, a.world);
    if (!byKey.has(identity.seasonKey)) {
      byKey.set(identity.seasonKey, {
        year: identity.year,
        world: identity.world,
        seasonKey: identity.seasonKey,
        teamId: a.teamId,
        teamName: a.teamName,
      });
    }
  }

  const entries = [...byKey.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
  if (entries.length === 0) return [];

  const latest = entries[entries.length - 1]!;
  const segments: {
    teamId: string;
    teamName: string;
    world: SeasonWorld | null;
    from: number;
    to: number;
  }[] = [];

  for (const cur of entries) {
    const last = segments[segments.length - 1];
    const sameWorld =
      normalizeSeasonWorld(last?.world) === normalizeSeasonWorld(cur.world);
    if (
      last &&
      last.teamId === cur.teamId &&
      sameWorld &&
      last.to === cur.year - 1
    ) {
      last.to = cur.year;
    } else {
      segments.push({
        teamId: cur.teamId,
        teamName: cur.teamName,
        world: cur.world,
        from: cur.year,
        to: cur.year,
      });
    }
  }

  return segments.map((s) => {
    const ongoing =
      s.to === latest.year &&
      normalizeSeasonWorld(s.world) === normalizeSeasonWorld(latest.world);
    const teamShort = shortTeam(s.teamId, s.teamName);
    const fromLabel = formatSeasonLineLabel(
      identityFromWorldYear(s.from, s.world),
    );
    const toLabel = formatSeasonLineLabel(identityFromWorldYear(s.to, s.world));
    const range =
      s.from === s.to
        ? fromLabel
        : ongoing
          ? `${fromLabel}〜`
          : `${fromLabel}〜${toLabel}`;
    return {
      teamShort,
      teamId: s.teamId,
      fromYear: s.from,
      toYear: ongoing ? null : s.to,
      world: s.world,
      label: `${range}　${teamShort}`,
    };
  });
}

export function getCurrentTeamShort(playerId: string): string | null {
  const timeline = buildTeamTimeline(playerId);
  if (timeline.length > 0) {
    return timeline[timeline.length - 1]!.teamShort;
  }
  const aff =
    getPlayerAffiliation(playerId, 2026) ??
    getPlayerAffiliationsByPlayer(playerId).at(-1) ??
    null;
  if (aff) return shortTeam(aff.teamId, aff.teamName);
  return null;
}

export function getPlayerDisplayPosition(playerId: string): string | null {
  const master = getPlayerMaster(playerId);
  const aff =
    getPlayerAffiliation(playerId, 2026) ??
    getPlayerAffiliationsByPlayer(playerId).at(-1) ??
    null;
  return aff?.position ?? master?.position ?? null;
}
