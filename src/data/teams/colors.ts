/**
 * NPB 12球団の正式チャート用カラー（teamId 固定）。
 * 順位推移など複数画面で再利用する。
 */

import { npbTeams, type TeamId } from "@/data/teams";

/** 未知球団用フォールバック（表示不能を避ける） */
export const TEAM_COLOR_FALLBACK = "#94a3b8";

export const TEAM_COLORS_BY_ID: Record<TeamId, string> = {
  tigers: "#FFE100",
  giants: "#F77E21",
  dragons: "#0047AB",
  swallows: "#009B48",
  carp: "#E60012",
  baystars: "#00A0E9",
  fighters: "#7EC8E3",
  buffaloes: "#1A1F71",
  hawks: "#F9C400",
  marines: "#4A4A4A",
  lions: "#005BAC",
  eagles: "#7D2231",
};

const SHORT_TO_ID: Record<string, TeamId> = Object.fromEntries(
  npbTeams.map((t) => [t.short, t.id]),
) as Record<string, TeamId>;

export function isTeamId(value: string): value is TeamId {
  return Object.prototype.hasOwnProperty.call(TEAM_COLORS_BY_ID, value);
}

/** teamId を第一キーに色を解決。未知はフォールバック。 */
export function getTeamColorById(teamId: string | null | undefined): string {
  if (!teamId) return TEAM_COLOR_FALLBACK;
  if (isTeamId(teamId)) return TEAM_COLORS_BY_ID[teamId];
  return TEAM_COLOR_FALLBACK;
}

/** short 名から色を解決（teamId 不明時のフォールバック）。 */
export function getTeamColorByShort(short: string | null | undefined): string {
  if (!short) return TEAM_COLOR_FALLBACK;
  const id = SHORT_TO_ID[short.trim()];
  if (id) return TEAM_COLORS_BY_ID[id];
  return TEAM_COLOR_FALLBACK;
}

/**
 * teamId 優先、なければ short で解決。
 * どちらも不明ならフォールバック色。
 */
export function resolveTeamColor(input: {
  teamId?: string | null;
  short?: string | null;
  team?: string | null;
}): string {
  if (input.teamId && isTeamId(input.teamId)) {
    return TEAM_COLORS_BY_ID[input.teamId];
  }
  return getTeamColorByShort(input.short ?? input.team);
}
