import {
  getPlayerMaster,
  listPlayerAffiliations,
} from "@/data/playerMaster";
import {
  listSeasonLines,
  listSeasonLinesForSeason,
  type PlayerSeasonLine,
} from "@/data/playerSeasonLines";
import { getTeam, type TeamId } from "@/data/teams";
import type { LeagueSide } from "@/data/playerStats";
import type { SeasonIdentity } from "@/data/seasons";
import {
  isCatcherCsRateQualified,
} from "@/lib/manualEntry/computeSeasonStats";
import { classifyPitcherWorkload } from "@/lib/sop/helpers";
import { outsToIpDisplay } from "@/lib/manualEntry/normalizeInput";

export type TitleCandidate = {
  playerId: string;
  playerName: string;
  teamId: TeamId;
  teamShort: string;
  league: LeagueSide;
  year: number;
  source: "season_line" | "sample";
  /** タイトル集計用の数値マップ */
  values: Record<string, number>;
  /** 項目ごとの有効フラグ（未収録指標は false） */
  available: Record<string, boolean>;
};

function leagueFromTeamId(teamId: TeamId): LeagueSide {
  return getTeam(teamId)?.league === "パ" ? "pacific" : "central";
}

function shortTeam(teamId: TeamId, fallback: string): string {
  return getTeam(teamId)?.short ?? fallback;
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function n(seed: string, min: number, max: number, digits = 0): number {
  const r = (hash(seed) % 10000) / 10000;
  const v = min + r * (max - min);
  if (digits === 0) return Math.round(v);
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

function fromBatterLine(line: Extract<PlayerSeasonLine, { role: "batter" }>): TitleCandidate {
  const c = line.counting;
  const d = line.derived;
  const teamId = line.teamId;
  const pa =
    c.pa ??
    c.ab + c.bb + (c.hbp ?? 0) + (c.sf ?? 0) + (c.sac ?? 0);
  const hasRisp = d.rispAvg != null;
  const hasCs = d.csRate != null;
  const csQualified = isCatcherCsRateQualified(c.csAttempted);
  return {
    playerId: line.playerId,
    playerName:
      getPlayerMaster(line.playerId)?.fullName ?? line.playerName,
    teamId,
    teamShort: shortTeam(teamId, line.teamName),
    league: leagueFromTeamId(teamId),
    year: line.year,
    source: "season_line",
    values: {
      avg: d.avg ?? 0,
      h: c.h,
      hr: c.hr,
      rbi: c.rbi,
      obp: d.obp ?? 0,
      doubles: c.doubles,
      triples: c.triples,
      r: c.r ?? 0,
      sb: c.sb ?? 0,
      bb: c.bb,
      sac: c.sac ?? 0,
      ops: d.ops ?? 0,
      risp: d.rispAvg ?? 0,
      csRate: d.csRate ?? 0,
      csAttempted: c.csAttempted ?? 0,
      ab: c.ab,
      g: c.g ?? 0,
      pa,
      // 1=到達, 0=未到達, 省略=判定不可
      paQualified:
        c.paQualified === true ? 1 : c.paQualified === false ? 0 : -1,
    },
    available: {
      avg: d.avg != null,
      h: true,
      hr: true,
      rbi: true,
      obp: d.obp != null,
      doubles: true,
      triples: true,
      r: c.r != null,
      sb: c.sb != null,
      bb: true,
      sac: c.sac != null,
      ops: d.ops != null,
      risp: hasRisp,
      csRate: hasCs && csQualified,
    },
  };
}

function fromPitcherLine(
  line: Extract<PlayerSeasonLine, { role: "pitcher" }>,
): TitleCandidate {
  const c = line.counting;
  const d = line.derived;
  const teamId = line.teamId;
  const ip = c.ipOuts / 3;
  const { class: pitcherClass } = classifyPitcherWorkload(c.g, c.gs ?? null);
  const reliefIp =
    c.reliefIpOuts != null && c.reliefIpOuts >= 0 ? c.reliefIpOuts / 3 : null;
  const reliefEra =
    reliefIp != null &&
    reliefIp > 0 &&
    c.reliefEr != null
      ? (c.reliefEr * 9) / reliefIp
      : null;
  const reliefSoRate =
    reliefIp != null &&
    reliefIp > 0 &&
    c.reliefSo != null
      ? (c.reliefSo * 9) / reliefIp
      : null;
  const isReliever = pitcherClass === "reliever";
  // 先発限定タイトル（QS/HQS率など）は混合型・救援型を除外
  const starterOk = pitcherClass === "starter";
  return {
    playerId: line.playerId,
    playerName:
      getPlayerMaster(line.playerId)?.fullName ?? line.playerName,
    teamId,
    teamShort: shortTeam(teamId, line.teamName),
    league: leagueFromTeamId(teamId),
    year: line.year,
    source: "season_line",
    values: {
      era: d.era ?? 0,
      w: c.w,
      winPct: d.winPct ?? 0,
      so: c.so,
      soRate: d.soRate ?? 0,
      sho: c.sho ?? 0,
      cg: c.cg ?? 0,
      ip,
      qsRate: d.qsRate ?? 0,
      hqsRate: d.hqsRate ?? 0,
      g: c.g,
      hp: c.hld ?? c.hp ?? 0,
      hld: c.hld ?? c.hp ?? 0,
      sv: c.sv ?? 0,
      reliefEra: reliefEra ?? 0,
      reliefSoRate: reliefSoRate ?? 0,
      reliefIp: reliefIp ?? 0,
      ipQualified:
        c.ipQualified === true ? 1 : c.ipQualified === false ? 0 : -1,
      pitcherClassReliever: isReliever ? 1 : 0,
      pitcherClassStarter: starterOk ? 1 : 0,
    },
    available: {
      era: d.era != null,
      w: true,
      winPct: d.winPct != null,
      so: true,
      soRate: d.soRate != null,
      sho: c.sho != null,
      cg: c.cg != null,
      ip: true,
      qsRate: d.qsRate != null && starterOk,
      hqsRate: d.hqsRate != null && starterOk,
      g: true,
      hp: c.hld != null || c.hp != null,
      hld: c.hld != null || c.hp != null,
      sv: c.sv != null,
      reliefEra: reliefEra != null && isReliever,
      reliefSoRate: reliefSoRate != null && isReliever,
    },
  };
}

/** 登録済み年度個人成績から候補を構築（identity 指定時は WORLD 厳密） */
export function candidatesFromSeasonLines(
  year: number,
  role: "batter" | "pitcher",
  identity?: SeasonIdentity | null,
): TitleCandidate[] {
  const lines = identity
    ? listSeasonLinesForSeason(identity)
    : listSeasonLines().filter(
        (l) => l.year === year && (l.world == null || l.world === undefined),
      );
  return lines
    .filter((l) => l.role === role && l.scope === "pennant")
    .map((l) =>
      l.role === "batter" ? fromBatterLine(l) : fromPitcherLine(l),
    );
}

/**
 * 選手マスター所属＋決定論的サンプル成績（登録データが無いときの表示用）。
 * 正式フルネームを使う。
 */
export function candidatesFromPlayerMasterSample(
  year: number,
  role: "batter" | "pitcher",
): TitleCandidate[] {
  const affs = listPlayerAffiliations().filter((a) => a.year === year);
  // チームごとに数人ピック（表示が埋まる程度）
  const byTeam = new Map<TeamId, typeof affs>();
  for (const a of affs) {
    const list = byTeam.get(a.teamId) ?? [];
    list.push(a);
    byTeam.set(a.teamId, list);
  }

  const out: TitleCandidate[] = [];
  for (const [teamId, list] of byTeam) {
    const masters = list
      .map((a) => ({ a, m: getPlayerMaster(a.playerId) }))
      .filter((x) => x.m != null);

    const filtered =
      role === "batter"
        ? masters.filter((x) => !String(x.m!.position).includes("投手"))
        : masters.filter(
            (x) =>
              String(x.m!.position).includes("投手") ||
              x.m!.position === "投手",
          );

    const pick = (filtered.length > 0 ? filtered : masters).slice(0, 4);
    for (const { a, m } of pick) {
      if (!m) continue;
      const id = m.playerId;
      if (role === "batter") {
        const ab = n(id + year + "ab", 380, 560);
        const h = Math.round(ab * n(id + year + "avg", 0.24, 0.34, 3));
        const hr = n(id + year + "hr", 5, 45);
        const doubles = n(id + year + "2b", 15, 40);
        const triples = n(id + year + "3b", 0, 8);
        const bb = n(id + year + "bb", 25, 90);
        const avg = ab > 0 ? h / ab : 0;
        const obp = Math.min(0.45, avg + n(id + year + "obp", 0.04, 0.1, 3));
        const slg = Math.min(0.7, avg + (hr / Math.max(ab, 1)) * 2.4);
        const csAttempted = n(id + year + "csa", 20, 55);
        out.push({
          playerId: id,
          playerName: m.fullName,
          teamId,
          teamShort: shortTeam(teamId, a.teamName),
          league: leagueFromTeamId(teamId),
          year,
          source: "sample",
          values: {
            avg: Number(avg.toFixed(3)),
            h,
            hr,
            rbi: n(id + year + "rbi", 30, 120),
            obp: Number(obp.toFixed(3)),
            doubles,
            triples,
            r: n(id + year + "r", 40, 110),
            sb: n(id + year + "sb", 0, 40),
            bb,
            sac: n(id + year + "sac", 0, 25),
            ops: Number((obp + slg).toFixed(3)),
            risp: n(id + year + "risp", 0.22, 0.4, 3),
            csRate: n(id + year + "cs", 0.2, 0.42, 3),
            csAttempted,
            ab,
            g: n(id + year + "g", 120, 143),
            pa: ab + bb + 10,
            paQualified: 1,
          },
          available: {
            avg: true,
            h: true,
            hr: true,
            rbi: true,
            obp: true,
            doubles: true,
            triples: true,
            r: true,
            sb: true,
            bb: true,
            sac: true,
            ops: true,
            risp: true,
            csRate: csAttempted >= 30,
          },
        });
      } else {
        const g = n(id + year + "g", 18, 28);
        const w = n(id + year + "w", 4, 16);
        const l = n(id + year + "l", 2, 12);
        const ipOuts = n(id + year + "ipo", 180, 540);
        const ip = ipOuts / 3;
        const er = n(id + year + "er", 20, 70);
        const so = n(id + year + "so", 80, 200);
        const qs = n(id + year + "qs", 8, 22);
        const hqs = Math.round(qs * n(id + year + "hqs", 0.4, 0.75, 2));
        const gs = n(id + year + "gs", 15, 28);
        const reliefIpOuts = n(id + year + "rip", 60, 150);
        const reliefIp = reliefIpOuts / 3;
        const reliefEr = n(id + year + "rer", 5, 25);
        const reliefSo = n(id + year + "rso", 30, 90);
        out.push({
          playerId: id,
          playerName: m.fullName,
          teamId,
          teamShort: shortTeam(teamId, a.teamName),
          league: leagueFromTeamId(teamId),
          year,
          source: "sample",
          values: {
            era: ip > 0 ? Number(((er * 9) / ip).toFixed(2)) : 0,
            w,
            winPct: w + l > 0 ? Number((w / (w + l)).toFixed(3)) : 0,
            so,
            soRate: ip > 0 ? Number(((so * 9) / ip).toFixed(2)) : 0,
            sho: n(id + year + "sho", 0, 3),
            cg: n(id + year + "cg", 0, 4),
            ip: Number(outsToIpDisplay(ipOuts)),
            qsRate: gs > 0 ? Number((qs / gs).toFixed(3)) : 0,
            hqsRate: gs > 0 ? Number((hqs / gs).toFixed(3)) : 0,
            g,
            hp: n(id + year + "hp", 0, 35),
            sv: n(id + year + "sv", 0, 35),
            reliefEra:
              reliefIp > 0
                ? Number(((reliefEr * 9) / reliefIp).toFixed(2))
                : 0,
            reliefSoRate:
              reliefIp > 0
                ? Number(((reliefSo * 9) / reliefIp).toFixed(2))
                : 0,
            reliefIp,
            ipQualified: 1,
            pitcherClassReliever: 0,
            pitcherClassStarter: 1,
          },
          available: {
            era: true,
            w: true,
            winPct: true,
            so: true,
            soRate: true,
            sho: true,
            cg: true,
            ip: true,
            qsRate: true,
            hqsRate: true,
            g: true,
            hp: true,
            sv: true,
            reliefEra: true,
            reliefSoRate: true,
          },
        });
      }
    }
  }
  return out;
}

/** 登録データ優先。正式 WORLD はサンプルを混ぜない。DEMO／レガシーのみ不足時にサンプル。 */
export function loadTitleCandidates(
  year: number,
  role: "batter" | "pitcher",
  identity?: SeasonIdentity | null,
): { candidates: TitleCandidate[]; usingSample: boolean } {
  const fromLines = candidatesFromSeasonLines(year, role, identity);
  // 正式 WORLD: 登録行のみ（件数不足でもサンプルを混ぜない）
  if (identity?.world != null) {
    return { candidates: fromLines, usingSample: false };
  }
  if (fromLines.length >= 8) {
    return { candidates: fromLines, usingSample: false };
  }
  // 登録が少ない場合はサンプルとマージ（同一IDは登録優先）
  const sample = candidatesFromPlayerMasterSample(year, role);
  const map = new Map<string, TitleCandidate>();
  for (const c of sample) map.set(c.playerId, c);
  for (const c of fromLines) map.set(c.playerId, c);
  return {
    candidates: [...map.values()],
    usingSample: fromLines.length === 0,
  };
}
