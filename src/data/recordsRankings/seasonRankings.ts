/**
 * シーズン記録ランキング（正式個人成績のみ。サンプルは使わない）
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLines,
  type PlayerSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import {
  formatSeasonLineLabel,
  type SeasonWorld,
} from "@/data/seasons";
import { getTeam } from "@/data/teams";
import { classifyPitcherWorkload } from "@/lib/sop/helpers";
import {
  formatRecordsValue,
  SEASON_CS_ATTEMPTED_MIN,
  SEASON_RELIEF_IP_MIN,
  SEASON_RISP_AB_MIN,
  statsForRole,
  type RecordsRole,
  type RecordsStatDef,
} from "./defs";

export type RecordsRankEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  year: number;
  /** 正式 WORLD。レガシーは null */
  world?: SeasonWorld | null;
  /** 表示用（例: 2026 BLUE）。歴代では BLUE/RED を区別する */
  seasonLabel: string;
  teamShort: string;
  value: number;
  valueText: string;
};

export type RecordsBoard = {
  def: RecordsStatDef;
  entries: RecordsRankEntry[];
  emptyReason?: string;
};

function fullName(playerId: string, fallback: string) {
  return getPlayerMaster(playerId)?.fullName ?? fallback;
}

function teamShort(line: PlayerSeasonLine) {
  return getTeam(line.teamId)?.short ?? line.teamName;
}

function batterValue(
  line: Extract<PlayerSeasonLine, { role: "batter" }>,
  def: RecordsStatDef,
): number | null {
  const c = line.counting;
  const d = line.derived;
  switch (def.id) {
    case "avg":
      return d.avg;
    case "h":
      return c.h;
    case "hr":
      return c.hr;
    case "rbi":
      return c.rbi;
    case "r":
      return c.r ?? null;
    case "sb":
      return c.sb ?? null;
    case "doubles":
      return c.doubles;
    case "triples":
      return c.triples;
    case "bb":
      return c.bb;
    case "obp":
      return d.obp;
    case "slg":
      return d.slg;
    case "ops":
      return d.ops;
    case "risp":
      return d.rispAvg;
    case "sac":
      return c.sac ?? null;
    case "csRate":
      return d.csRate;
    default:
      return null;
  }
}

function pitcherValue(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
  def: RecordsStatDef,
): number | null {
  const c = line.counting;
  const d = line.derived;
  const ip = c.ipOuts / 3;
  const hp = c.hld ?? c.hp ?? null;
  const reliefIp =
    c.reliefIpOuts != null && c.reliefIpOuts >= 0 ? c.reliefIpOuts / 3 : null;
  const reliefEra =
    reliefIp != null && reliefIp > 0 && c.reliefEr != null
      ? (c.reliefEr * 9) / reliefIp
      : null;
  const reliefSoRate =
    reliefIp != null && reliefIp > 0 && c.reliefSo != null
      ? (c.reliefSo * 9) / reliefIp
      : null;

  switch (def.id) {
    case "era":
      return d.era;
    case "w":
      return c.w;
    case "winPct":
      return d.winPct;
    case "ip":
      return ip;
    case "so":
      return c.so;
    case "soRate":
      return d.soRate;
    case "whip":
      return d.whip;
    case "sv":
      return c.sv ?? null;
    case "hp":
      return hp;
    case "g":
      return c.g;
    case "cg":
      return c.cg ?? null;
    case "sho":
      return c.sho ?? null;
    case "qs":
      return c.qs ?? null;
    case "qsRate":
      return d.qsRate;
    case "reliefEra":
      return reliefEra;
    case "reliefSoRate":
      return reliefSoRate;
    default:
      return null;
  }
}

function eligibleSeason(
  line: PlayerSeasonLine,
  def: RecordsStatDef,
): { ok: boolean; unknown: boolean } {
  switch (def.eligibility) {
    case "none":
      return { ok: true, unknown: false };
    case "pa_qualified": {
      if (line.role !== "batter") return { ok: false, unknown: false };
      const q = line.counting.paQualified;
      if (q === true) return { ok: true, unknown: false };
      if (q === false) return { ok: false, unknown: false };
      return { ok: false, unknown: true };
    }
    case "ip_qualified": {
      if (line.role !== "pitcher") return { ok: false, unknown: false };
      const q = line.counting.ipQualified;
      if (q === true) return { ok: true, unknown: false };
      if (q === false) return { ok: false, unknown: false };
      return { ok: false, unknown: true };
    }
    case "risp_50": {
      if (line.role !== "batter") return { ok: false, unknown: false };
      const ab = line.counting.rispAb;
      if (ab == null) return { ok: false, unknown: true };
      return { ok: ab >= SEASON_RISP_AB_MIN, unknown: false };
    }
    case "cs_30": {
      if (line.role !== "batter") return { ok: false, unknown: false };
      const att = line.counting.csAttempted;
      if (att == null) return { ok: false, unknown: true };
      return { ok: att >= SEASON_CS_ATTEMPTED_MIN, unknown: false };
    }
    case "relief_30": {
      if (line.role !== "pitcher") return { ok: false, unknown: false };
      const { class: pClass } = classifyPitcherWorkload(
        line.counting.g,
        line.counting.gs ?? null,
      );
      if (pClass === "unknown") return { ok: false, unknown: true };
      if (pClass !== "reliever") return { ok: false, unknown: false };
      const rip =
        line.counting.reliefIpOuts != null
          ? line.counting.reliefIpOuts / 3
          : null;
      if (rip == null) return { ok: false, unknown: true };
      return { ok: rip >= SEASON_RELIEF_IP_MIN, unknown: false };
    }
    default:
      return { ok: false, unknown: true };
  }
}

/** 同値は同順位。10位タイは全員含める */
function rankTop10(
  rows: {
    playerId: string;
    playerName: string;
    year: number;
    world?: SeasonWorld | null;
    seasonLabel: string;
    teamShort: string;
    value: number;
  }[],
  def: RecordsStatDef,
): RecordsRankEntry[] {
  const sorted = [...rows].sort((a, b) => {
    if (def.lowerIsBetter) return a.value - b.value;
    return b.value - a.value;
  });

  const out: RecordsRankEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.value;
    let j = i;
    while (j < sorted.length && sorted[j]!.value === score) j += 1;
    const rank = i + 1;
    if (rank > 10) break;
    for (let k = i; k < j; k += 1) {
      const row = sorted[k]!;
      out.push({
        rank,
        playerId: row.playerId,
        playerName: row.playerName,
        year: row.year,
        world: row.world ?? null,
        seasonLabel: row.seasonLabel,
        teamShort: row.teamShort,
        value: row.value,
        valueText: formatRecordsValue(def.format, row.value),
      });
    }
    i = j;
  }
  return out;
}

export function buildSeasonRecordsBoard(
  def: RecordsStatDef,
  scope: SeasonLineScope = "pennant",
): RecordsBoard {
  const lines = listSeasonLines().filter(
    (l) => l.role === def.role && l.scope === scope,
  );

  if (lines.length === 0) {
    return {
      def,
      entries: [],
      emptyReason:
        scope === "interleague"
          ? "正式な交流戦個人成績がまだありません。"
          : "正式な年度個人成績がまだありません。サンプル成績は歴代記録に使いません。",
    };
  }

  const pool: {
    playerId: string;
    playerName: string;
    year: number;
    world?: SeasonWorld | null;
    seasonLabel: string;
    teamShort: string;
    value: number;
  }[] = [];

  let unknownCount = 0;
  for (const line of lines) {
    const el = eligibleSeason(line, def);
    if (el.unknown) {
      unknownCount += 1;
      continue;
    }
    if (!el.ok) continue;
    const value =
      line.role === "batter"
        ? batterValue(line, def)
        : pitcherValue(line, def);
    if (value == null || !Number.isFinite(value)) continue;
    // QS率は先発がある場合のみ
    if (def.id === "qsRate" && line.role === "pitcher") {
      if ((line.counting.gs ?? 0) <= 0) continue;
    }
    pool.push({
      playerId: line.playerId,
      playerName: fullName(line.playerId, line.playerName),
      year: line.year,
      world: line.world ?? null,
      seasonLabel: formatSeasonLineLabel({
        year: line.year,
        world: line.world,
      }),
      teamShort: teamShort(line),
      value,
    });
  }

  const entries = rankTop10(pool, def);
  let emptyReason: string | undefined;
  if (entries.length === 0) {
    emptyReason =
      unknownCount > 0
        ? "規定判定に必要なデータが不足しているため、表示できる記録がありません。"
        : "該当する正式記録がありません。";
  }

  return { def, entries, emptyReason };
}

export function buildSeasonRecordsForRole(
  role: RecordsRole,
  scope: SeasonLineScope = "pennant",
): RecordsBoard[] {
  return statsForRole(role).map((def) => buildSeasonRecordsBoard(def, scope));
}
