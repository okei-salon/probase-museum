/**
 * Museum 共通：個人成績の規定到達判定・率系分類・ランキングソート。
 * シーズン／交流戦／今後の画面で同じルールを使う。
 */

import type { PlayerRole } from "@/data/playerStats";
import { CATCHER_CS_ATTEMPTS_QUALIFIER } from "@/lib/manualEntry/computeSeasonStats";

/** 規定打席係数（NPB: チーム試合数 × 3.1、端数切捨て） */
export const PA_PER_TEAM_GAME = 3.1;

/** 規定投球回係数（チーム試合数 × 1.0 回） */
export const IP_PER_TEAM_GAME = 1.0;

/**
 * 規定打席 = floor(チーム試合数 × 3.1)
 * 例: 143 → 443、18 → 55
 */
export function requiredPlateAppearances(teamGames: number): number {
  if (!Number.isFinite(teamGames) || teamGames <= 0) return 0;
  return Math.floor(teamGames * PA_PER_TEAM_GAME);
}

/**
 * 規定投球回（アウト数）。1回 = 3アウト。
 * 例: 143試合 → 429 outs（143.0回）、18試合 → 54 outs（18.0回）
 */
export function requiredIpOuts(teamGames: number): number {
  if (!Number.isFinite(teamGames) || teamGames <= 0) return 0;
  return Math.round(teamGames * IP_PER_TEAM_GAME * 3);
}

/** 規定投球回の表示用（野球表記文字列） */
export function requiredIpDisplay(teamGames: number): string {
  const outs = requiredIpOuts(teamGames);
  const whole = Math.floor(outs / 3);
  const rem = outs % 3;
  return rem === 0 ? String(whole) : `${whole}.${rem}`;
}

export type QualifyStatus = {
  /** 規定到達として扱うか（ランキング優先・正式順位） */
  qualified: boolean;
  /** チーム試合数などから判定できたか（false = フラグも無く不明） */
  known: boolean;
  /** 使用したチーム試合数（不明時 null） */
  teamGames: number | null;
  /** 閾値（打席 or 投球回 outs）。不明時 null */
  threshold: number | null;
};

/**
 * 野手：規定打席到達。
 * チーム試合数が取れるときは計算を優先。なければ保存フラグを使う。
 */
export function evaluatePaQualified(input: {
  pa: number | null | undefined;
  teamGames: number | null | undefined;
  flag?: boolean | null;
}): QualifyStatus {
  const teamGames =
    input.teamGames != null &&
    Number.isFinite(input.teamGames) &&
    input.teamGames > 0
      ? input.teamGames
      : null;
  if (teamGames != null && input.pa != null && Number.isFinite(input.pa)) {
    const threshold = requiredPlateAppearances(teamGames);
    return {
      qualified: input.pa >= threshold,
      known: true,
      teamGames,
      threshold,
    };
  }
  if (input.flag === true) {
    return { qualified: true, known: true, teamGames, threshold: null };
  }
  if (input.flag === false) {
    return { qualified: false, known: true, teamGames, threshold: null };
  }
  return { qualified: false, known: false, teamGames, threshold: null };
}

/**
 * 投手：規定投球回到達。
 * 投球回は必ず outs で比較（.1/.2 は 1/3・2/3）。
 */
export function evaluateIpQualified(input: {
  ipOuts: number | null | undefined;
  teamGames: number | null | undefined;
  flag?: boolean | null;
}): QualifyStatus {
  const teamGames =
    input.teamGames != null &&
    Number.isFinite(input.teamGames) &&
    input.teamGames > 0
      ? input.teamGames
      : null;
  if (
    teamGames != null &&
    input.ipOuts != null &&
    Number.isFinite(input.ipOuts)
  ) {
    const threshold = requiredIpOuts(teamGames);
    return {
      qualified: input.ipOuts >= threshold,
      known: true,
      teamGames,
      threshold,
    };
  }
  if (input.flag === true) {
    return { qualified: true, known: true, teamGames, threshold: null };
  }
  if (input.flag === false) {
    return { qualified: false, known: true, teamGames, threshold: null };
  }
  return { qualified: false, known: false, teamGames, threshold: null };
}

/**
 * 率・平均・効率系（規定到達をランキングで優先する項目）。
 * 累計系はここに含めない。
 */
const BATTER_RATE_KEYS = new Set([
  "avg",
  "obp",
  "slg",
  "ops",
  "rispAvg",
  "risp",
  "basesLoadedAvg",
  "hrRate",
  "soRate",
  "sbRate",
  "vsRhbAvg",
  "vsLhbAvg",
  "csRate",
]);

const PITCHER_RATE_KEYS = new Set([
  "era",
  "winPct",
  "qsRate",
  "hqsRate",
  "soRate",
  "bbRate",
  "hbpRate",
  "kbb",
  "whip",
  "avgAgainst",
  "hrRateAllowed",
  "sbRateAgainst",
  "vsRhbAvg",
  "vsLhbAvg",
  "reliefEra",
  "reliefSoRate",
]);

/** 率系ランキングで規定到達を優先するか */
export function isRateStatKey(role: PlayerRole, key: string): boolean {
  return role === "batter"
    ? BATTER_RATE_KEYS.has(key)
    : PITCHER_RATE_KEYS.has(key);
}

/**
 * 捕手・盗塁阻止率は規定打席ではなく被盗企図数。
 * 率系ソート時の「到達」判定に使う。
 */
export function evaluateCsRateQualified(
  csAttempted: number | null | undefined,
): boolean {
  return (
    csAttempted != null &&
    Number.isFinite(csAttempted) &&
    csAttempted >= CATCHER_CS_ATTEMPTS_QUALIFIER
  );
}

export type RankableStatRow = {
  id: string;
  values: Record<string, number | null>;
  /** 規定到達（率系ソート時に使用） */
  qualified: boolean;
};

/**
 * ランキング用ソート。
 * 率系: 規定到達者 → 未到達者の順。各グループ内は選択指標でソート。
 * 累計系: 規定を無視して数値順のみ。
 */
export function compareStatRowsForRanking(
  a: RankableStatRow,
  b: RankableStatRow,
  opts: {
    sortKey: string;
    dir: "asc" | "desc";
    rateStat: boolean;
  },
): number {
  if (opts.rateStat) {
    if (a.qualified !== b.qualified) {
      return a.qualified ? -1 : 1;
    }
  }
  const av = a.values[opts.sortKey];
  const bv = b.values[opts.sortKey];
  const aNull = av == null || !Number.isFinite(av);
  const bNull = bv == null || !Number.isFinite(bv);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return opts.dir === "asc" ? av - bv : bv - av;
}

/**
 * 率系ランキングの表示順位。
 * 規定到達者のみ 1,2,3…。未到達は null（UI で ―）。
 * 累計系は通し番号（1-based index）。
 */
export function rankingDisplayRank(
  indexInSorted: number,
  row: RankableStatRow,
  sorted: RankableStatRow[],
  rateStat: boolean,
): number | null {
  if (!rateStat) return indexInSorted + 1;
  if (!row.qualified) return null;
  let rank = 0;
  for (let i = 0; i <= indexInSorted; i += 1) {
    if (sorted[i]?.qualified) rank += 1;
  }
  return rank;
}
