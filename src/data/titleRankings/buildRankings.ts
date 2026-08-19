import type { LeagueSide } from "@/data/playerStats";
import type { SeasonIdentity, SeasonWorld } from "@/data/seasons";
import {
  getTitleHistoryLabel,
  listTitleWinsForSeason,
  upsertTitleWinner,
  type TitleWinRecord,
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

export type TitleRankEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  teamShort: string;
  value: number;
  valueText: string;
  historyLabel?: string;
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
): { ok: boolean; unknown: boolean } {
  switch (def.eligibility as TitleEligibility) {
    case "none":
      return { ok: true, unknown: false };
    case "pa_qualify": {
      // 1=到達, 0=未到達, -1/未設定=判定不可 → タイトル対象外
      const flag = c.values.paQualified;
      if (flag === 1) return { ok: true, unknown: false };
      if (flag === 0) return { ok: false, unknown: false };
      return { ok: false, unknown: true };
    }
    case "ip_qualify": {
      const flag = c.values.ipQualified;
      if (flag === 1) return { ok: true, unknown: false };
      if (flag === 0) return { ok: false, unknown: false };
      return { ok: false, unknown: true };
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
    case "risp":
      return {
        ok: Boolean(c.available[def.valueKey]),
        unknown: !c.available[def.valueKey],
      };
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
  world?: SeasonWorld | null,
): TitleRankEntry[] {
  const pool = candidates.filter((c) => {
    if (c.league !== league) return false;
    if (!c.available[def.valueKey] && def.eligibility !== "none") {
      // 未収録指標は除外
      if (
        def.eligibility === "risp" ||
        def.eligibility === "catcher_cs" ||
        def.eligibility === "relief_ip_30"
      ) {
        return false;
      }
    }
    if (!c.available[def.valueKey] && ["risp", "csRate", "reliefEra", "reliefSoRate"].includes(def.valueKey)) {
      return false;
    }
    const el = passesEligibility(def, c);
    return el.ok;
  });

  const sorted = [...pool].sort((a, b) => {
    const av = a.values[def.valueKey] ?? 0;
    const bv = b.values[def.valueKey] ?? 0;
    return def.lowerIsBetter ? av - bv : bv - av;
  });

  const top = sorted.slice(0, 5);
  return top.map((c, i) => {
    const rank = i + 1;
    const value = c.values[def.valueKey] ?? 0;
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
      historyLabel:
        rank === 1
          ? getTitleHistoryLabel(def.id, league, c.playerId, year, world)
          : undefined,
    };
  });
}

function collectGaps(role: TitleRole, usingSample: boolean): string[] {
  const gaps: string[] = [
    "規定打席：打席数およびチーム試合数（公式の規定打席算出）が年度個人成績に不足しています。",
    "規定投球回：公式の規定投球回閾値判定用のデータが不足しています。",
  ];
  if (role === "batter") {
    gaps.push(
      "得点圏打率：圏打数・圏安打が未登録の選手は対象外です。",
      "盗塁阻止率：被盗塁企図30回以上が規定です（試合数・守備機会は使いません）。",
    );
  } else {
    gaps.push(
      "救援防御率 / 救援奪三振率：救援投球回・救援自責点・救援奪三振が年度個人成績に未収録です。",
    );
  }
  if (usingSample) {
    gaps.unshift(
      "登録済みの年度個人成績が少ないため、選手マスターに基づくサンプル成績で画面を表示しています。",
    );
  }
  return gaps;
}

function entriesFromHistory(
  records: TitleWinRecord[],
  titleId: string,
  league: LeagueSide,
  year: number,
  world?: SeasonWorld | null,
): TitleRankEntry[] {
  return records
    .filter((r) => r.titleId === titleId && r.league === league)
    .sort((a, b) => (a.rank ?? 1) - (b.rank ?? 1))
    .map((r) => ({
      rank: r.rank ?? 1,
      playerId: r.playerId,
      playerName: r.playerName ?? r.playerId,
      teamShort: r.teamShort ?? "—",
      value: 0,
      valueText: r.valueText ?? "—",
      historyLabel:
        (r.rank ?? 1) === 1
          ? getTitleHistoryLabel(titleId, league, r.playerId, year, world)
          : undefined,
    }));
}

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
  const history = identity ? listTitleWinsForSeason(identity) : [];

  const sections: TitleSection[] = defs.map((def) => {
    const hardMissing =
      (def.eligibility === "risp" ||
        def.eligibility === "catcher_cs" ||
        def.eligibility === "relief_ip_30") &&
      !candidates.some((c) => c.available[def.valueKey]);

    if (hardMissing && history.every((h) => h.titleId !== def.id)) {
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
      persistHistory && history.filter((h) => h.titleId === def.id && h.league === "central").length === 0,
      world,
    );
    const computedPacific = top5(
      def,
      candidates,
      "pacific",
      year,
      persistHistory && history.filter((h) => h.titleId === def.id && h.league === "pacific").length === 0,
      world,
    );

    const histCentral = entriesFromHistory(
      history,
      def.id,
      "central",
      year,
      world,
    );
    const histPacific = entriesFromHistory(
      history,
      def.id,
      "pacific",
      year,
      world,
    );

    const board: TitleLeagueBoard = {
      central: histCentral.length > 0 ? histCentral : computedCentral,
      pacific: histPacific.length > 0 ? histPacific : computedPacific,
    };

    return {
      def,
      board,
      unavailable:
        board.central.length === 0 &&
        board.pacific.length === 0 &&
        hardMissing,
      note:
        def.eligibility === "pa_qualify" || def.eligibility === "ip_qualify"
          ? def.eligibilityNote
          : undefined,
    };
  });

  return {
    role,
    year,
    usingSample,
    sections,
    dataGaps: collectGaps(role, usingSample),
  };
}
