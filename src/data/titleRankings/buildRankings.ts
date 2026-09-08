import type { LeagueSide } from "@/data/playerStats";
import type { SeasonIdentity, SeasonWorld } from "@/data/seasons";
import {
  getTitleHistoryLabel,
  upsertTitleWinner,
} from "./history";
import {
  loadTitleCandidates,
  type TitleCandidate,
} from "./candidates";
import {
  titlesForRole,
  type TitleDef,
  type TitleEligibility,
  type TitleRole,
} from "./defs";
import { formatTitleValue } from "./format";
import {
  buildTeamGamesContext,
  evaluateG30Ip30Qualified,
  evaluateIpQualified,
  evaluatePaQualified,
  evaluateWinPctQualified,
  resolveTeamGamesForPlayer,
  type TeamGamesContext,
} from "@/lib/stats";

export type TitleRankEntry = {
  /** 規定到達者のみ正式順位。規定外は null（UI で ―） */
  rank: number | null;
  playerId: string;
  playerName: string;
  teamShort: string;
  value: number;
  valueText: string;
  historyLabel?: string;
  /** 救援系など規定付きタイトル用 */
  qualified?: boolean;
};

export type TitleLeagueBoard = {
  central: TitleRankEntry[];
  pacific: TitleRankEntry[];
};

export type TitleSection = {
  def: TitleDef;
  board: TitleLeagueBoard;
  /** データ不足でランキング不可 */
  unavailable: boolean;
  note?: string;
};

export type TitleRankingsResult = {
  role: TitleRole;
  year: number;
  usingSample: boolean;
  sections: TitleSection[];
  dataGaps: string[];
};

function passesEligibility(
  def: TitleDef,
  c: TitleCandidate,
  teamGamesCtx: TeamGamesContext,
): { ok: boolean; unknown: boolean } {
  switch (def.eligibility as TitleEligibility) {
    case "none":
      return { ok: true, unknown: false };
    case "pa_qualify": {
      const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, c.teamId);
      const flag =
        c.values.paQualified === 1
          ? true
          : c.values.paQualified === 0
            ? false
            : null;
      const status = evaluatePaQualified({
        pa: c.values.pa,
        teamGames,
        flag,
      });
      if (!status.known) return { ok: false, unknown: true };
      return { ok: status.qualified, unknown: false };
    }
    case "ip_qualify": {
      const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, c.teamId);
      const flag =
        c.values.ipQualified === 1
          ? true
          : c.values.ipQualified === 0
            ? false
            : null;
      const ipOuts =
        c.values.ipOuts ??
        (c.values.ip != null && Number.isFinite(c.values.ip)
          ? Math.round(c.values.ip * 3)
          : null);
      const status = evaluateIpQualified({
        ipOuts,
        teamGames,
        flag,
      });
      if (!status.known) return { ok: false, unknown: true };
      return { ok: status.qualified, unknown: false };
    }
    case "wins_13":
      return {
        ok: evaluateWinPctQualified(c.values.w),
        unknown: false,
      };
    case "g30_ip30": {
      if (!c.available[def.valueKey]) {
        return { ok: false, unknown: true };
      }
      const ipOuts =
        c.values.ipOuts ??
        (c.values.ip != null && Number.isFinite(c.values.ip)
          ? Math.round(c.values.ip * 3)
          : null);
      return {
        ok: evaluateG30Ip30Qualified({ g: c.values.g, ipOuts }),
        unknown: false,
      };
    }
    case "relief_ip_30": {
      if (!c.available[def.valueKey]) return { ok: false, unknown: false };
      // 救援型フラグ: values.pitcherClassReliever === 1
      if (c.values.pitcherClassReliever !== 1) {
        return { ok: false, unknown: false };
      }
      const rip = c.values.reliefIp ?? 0;
      return { ok: rip >= 30, unknown: false };
    }
    case "risp": {
      // 得点圏打率: 規定打席到達者のみ。圏成績が無ければ対象外。
      if (!c.available.risp) {
        return { ok: false, unknown: true };
      }
      const teamGames = resolveTeamGamesForPlayer(teamGamesCtx, c.teamId);
      const flag =
        c.values.paQualified === 1
          ? true
          : c.values.paQualified === 0
            ? false
            : null;
      const status = evaluatePaQualified({
        pa: c.values.pa,
        teamGames,
        flag,
      });
      if (!status.known) return { ok: false, unknown: true };
      return { ok: status.qualified, unknown: false };
    }
    case "catcher_cs": {
      // 規定：被盗企 30 以上（available 側で判定済み）
      const attempted = c.values.csAttempted ?? 0;
      const ok =
        Boolean(c.available[def.valueKey]) &&
        attempted >= 30;
      return { ok, unknown: !c.available[def.valueKey] && attempted <= 0 };
    }
    default:
      return { ok: true, unknown: false };
  }
}

function top5(
  def: TitleDef,
  candidates: TitleCandidate[],
  league: LeagueSide,
  year: number,
  persistHistory: boolean,
  world: SeasonWorld | null | undefined,
  teamGamesCtx: TeamGamesContext,
): TitleRankEntry[] {
  const showUnqualifiedBelow = def.eligibility === "g30_ip30";

  const pool = candidates.filter((c) => {
    if (c.league !== league) return false;
    if (!c.available[def.valueKey] && def.eligibility !== "none") {
      if (
        def.eligibility === "risp" ||
        def.eligibility === "catcher_cs" ||
        def.eligibility === "relief_ip_30" ||
        def.eligibility === "g30_ip30"
      ) {
        return false;
      }
    }
    if (
      !c.available[def.valueKey] &&
      ["risp", "csRate", "reliefEra", "reliefSoRate"].includes(def.valueKey)
    ) {
      return false;
    }
    // 累計系（安打・犠打など）も未収録は除外し、0埋め誤判定を防ぐ
    if (def.eligibility === "none" && !c.available[def.valueKey]) {
      return false;
    }
    if (showUnqualifiedBelow) {
      // 救援系: 規定内外を両方プールし、後で到達優先ソート
      return Boolean(c.available[def.valueKey]);
    }
    const el = passesEligibility(def, c, teamGamesCtx);
    return el.ok;
  });

  const sorted = [...pool].sort((a, b) => {
    if (showUnqualifiedBelow) {
      const aq = passesEligibility(def, a, teamGamesCtx).ok;
      const bq = passesEligibility(def, b, teamGamesCtx).ok;
      if (aq !== bq) return aq ? -1 : 1;
    }
    const av = a.values[def.valueKey] ?? 0;
    const bv = b.values[def.valueKey] ?? 0;
    if (av !== bv) {
      return def.lowerIsBetter ? av - bv : bv - av;
    }
    return a.playerName.localeCompare(b.playerName, "ja");
  });

  const top = sorted.slice(0, showUnqualifiedBelow ? 10 : 5);
  let qualifiedRank = 0;
  return top.map((c) => {
    const value = c.values[def.valueKey] ?? 0;
    const qualified = showUnqualifiedBelow
      ? passesEligibility(def, c, teamGamesCtx).ok
      : true;
    const rank = qualified ? (qualifiedRank += 1) : null;
    if (rank === 1 && persistHistory) {
      upsertTitleWinner({
        titleId: def.id,
        year,
        world: world ?? null,
        league,
        playerId: c.playerId,
        playerName: c.playerName,
        teamShort: c.teamShort,
        valueText: formatTitleValue(def.format, value),
      });
    }
    return {
      rank,
      playerId: c.playerId,
      playerName: c.playerName,
      teamShort: c.teamShort,
      value,
      valueText: formatTitleValue(def.format, value),
      qualified,
      historyLabel:
        rank === 1
          ? getTitleHistoryLabel(def.id, league, c.playerId, year, world)
          : undefined,
    };
  });
}

function collectGaps(
  role: TitleRole,
  usingSample: boolean,
  hasScheduleGames: boolean,
): string[] {
  const gaps: string[] = [];
  if (!hasScheduleGames) {
    gaps.push(
      "規定打席・規定投球回：順位表またはチーム成績の試合数が未登録の場合、保存フラグが無い選手は率系タイトル対象外になります。",
    );
  } else {
    gaps.push(
      "規定打席 = チーム試合数×3.1（端数切捨て）／規定投球回 = チーム試合数×1.0回（outs比較）。",
    );
  }
  if (role === "batter") {
    gaps.push(
      "得点圏打率：規定打席到達者のうち、圏打数・圏安打が登録されている選手のみ対象です。",
      "盗塁阻止率：被盗塁企図30回以上が規定です（試合数・守備機会は使いません）。",
    );
  } else {
    gaps.push(
      "救援防御率 / 救援奪三振率：登板30以上かつ投球回30以上を規定到達とし、到達者を上位に表示します（年度の防御率／奪三振率を使用）。",
    );
  }
  if (usingSample) {
    gaps.unshift(
      "登録済みの年度個人成績が少ないため、選手マスターに基づくサンプル成績で画面を表示しています。",
    );
  }
  return gaps;
}

/**
 * 個人タイトルは保存済みシーズン成績から毎回算出する。
 * タイトル履歴は受賞回数ラベル用で、受賞者の表示根拠には使わない
 * （誤った手入力履歴がレイエス等を固定表示してしまうのを防ぐ）。
 */
export function buildTitleRankings(
  year: number,
  role: TitleRole,
  options?: {
    persistHistory?: boolean;
    /** 指定時は WORLD 分離した候補・履歴を使う */
    identity?: SeasonIdentity | null;
  },
): TitleRankingsResult {
  const persistHistory = options?.persistHistory ?? false;
  const identity = options?.identity ?? null;
  const world = identity?.world ?? null;
  const { candidates, usingSample } = loadTitleCandidates(
    year,
    role,
    identity,
  );
  const defs = titlesForRole(role);
  const teamGamesCtx = buildTeamGamesContext({
    scope: "pennant",
    identity,
    year,
    world,
  });

  const sections: TitleSection[] = defs.map((def) => {
    const hardMissing =
      (def.eligibility === "risp" ||
        def.eligibility === "catcher_cs" ||
        def.eligibility === "relief_ip_30") &&
      !candidates.some((c) => c.available[def.valueKey]);

    if (hardMissing) {
      return {
        def,
        board: { central: [], pacific: [] },
        unavailable: true,
        note: def.eligibilityNote,
      };
    }

    const computedCentral = top5(
      def,
      candidates,
      "central",
      year,
      persistHistory,
      world,
      teamGamesCtx,
    );
    const computedPacific = top5(
      def,
      candidates,
      "pacific",
      year,
      persistHistory,
      world,
      teamGamesCtx,
    );

    const board: TitleLeagueBoard = {
      central: computedCentral,
      pacific: computedPacific,
    };

    return {
      def,
      board,
      unavailable:
        board.central.length === 0 &&
        board.pacific.length === 0 &&
        hardMissing,
      note:
        def.eligibility === "pa_qualify" ||
        def.eligibility === "ip_qualify" ||
        def.eligibility === "risp" ||
        def.eligibility === "g30_ip30"
          ? def.eligibilityNote
          : undefined,
    };
  });

  return {
    role,
    year,
    usingSample,
    sections,
    dataGaps: collectGaps(
      role,
      usingSample,
      teamGamesCtx.scheduleGames != null,
    ),
  };
}
