import {
  formatMonthlyAwardHistory,
  formatSeasonAwardHistory,
  type YearMonth,
} from "@/lib/awardHistory";
import {
  matchPlayerFromGameDisplay,
  resolveDisplayNameFromMatch,
  resolveMuseumPlayerName,
} from "@/lib/playerMaster";
import {
  formatHighlightStats,
  formatMonthlyMvpStats,
  getMonthlyHighlightStats,
  getSeasonHighlightStats,
} from "@/data/playerSeasonStats";

export type LeagueSide = "central" | "pacific";

export type AwardWinnerBase = {
  playerId: string;
  /** フォールバック表示名（マスター未ヒット／UNKNOWN時） */
  playerName: string;
  /** ゲーム画面の名字。あればマスター照合してフルネーム化する */
  gameDisplayName?: string;
  teamName: string;
  /** 照合用（自動確定に必要） */
  position?: string;
  league?: LeagueSide;
  winYears: number[];
};

export type ResolvedAwardCard = {
  playerId: string;
  playerName: string;
  teamName: string;
  historyLabel: string;
  position?: string;
  month?: number;
  role?: "pitcher" | "batter";
  stats: { label: string; value: string }[] | null;
  league?: LeagueSide;
};

const POSITIONS = [
  "投手",
  "捕手",
  "一塁手",
  "二塁手",
  "三塁手",
  "遊撃手",
  "外野手",
  "外野手",
  "外野手",
] as const;

function resolveAwardPlayerName(
  w: AwardWinnerBase & { position?: string },
  year: string,
): string {
  if (w.gameDisplayName) {
    const match = matchPlayerFromGameDisplay({
      gameDisplayName: w.gameDisplayName,
      team: w.teamName,
      year: Number(year),
      position: w.position,
    });
    return resolveDisplayNameFromMatch(match, w.playerName);
  }
  return resolveMuseumPlayerName(w.playerId, w.playerName);
}

function resolveSeasonCard(
  w: AwardWinnerBase & { position?: string },
  year: string,
  withStats: boolean,
): ResolvedAwardCard {
  const y = Number(year);
  const statsRaw = withStats
    ? getSeasonHighlightStats(w.playerId, year)
    : null;
  return {
    playerId: w.playerId,
    playerName: resolveAwardPlayerName(w, year),
    teamName: w.teamName,
    historyLabel: formatSeasonAwardHistory(w.winYears, y),
    position: w.position,
    league: w.league,
    stats: statsRaw ? formatHighlightStats(statsRaw) : null,
  };
}

export function getMvpAwards(year: string): {
  central: ResolvedAwardCard;
  pacific: ResolvedAwardCard;
} {
  const row = {
    central: {
      playerId: "hanshin_41045153_8",
      playerName: "佐藤",
      gameDisplayName: "佐藤",
      teamName: "阪神",
      position: "内野手",
      league: "central" as const,
      winYears: [2021, 2022, 2023],
    },
    pacific: {
      playerId: "p-mvp-p-2023",
      playerName: "サンプル パMVP",
      teamName: "オリックス",
      league: "pacific" as const,
      winYears: [2023],
    },
  };
  return {
    central: resolveSeasonCard(row.central, year, true),
    pacific: resolveSeasonCard(row.pacific, year, true),
  };
}

export function getRookieAwards(year: string): {
  central: ResolvedAwardCard;
  pacific: ResolvedAwardCard;
} {
  const row = {
    central: {
      playerId: "p-rookie-c-2023",
      playerName: "サンプル セ新人",
      teamName: "DeNA",
      league: "central" as const,
      winYears: [2023],
    },
    pacific: {
      playerId: "p-rookie-p-2023",
      playerName: "サンプル パ新人",
      teamName: "日本ハム",
      league: "pacific" as const,
      winYears: [2023],
    },
  };
  return {
    central: resolveSeasonCard(row.central, year, true),
    pacific: resolveSeasonCard(row.pacific, year, true),
  };
}

export function getSawamuraAwards(year: string): {
  central: ResolvedAwardCard | null;
  pacific: ResolvedAwardCard | null;
} {
  /** 沢村賞は原則1名。所属リーグ側に表示し、反対リーグは空。 */
  const winner = resolveSeasonCard(
    {
      playerId: "p-sawamura-2023",
      playerName: "サンプル 沢村",
      teamName: "ヤクルト",
      league: "central",
      winYears: [2020, 2023],
    },
    year,
    true,
  );
  return { central: winner, pacific: null };
}

/** @deprecated use getSawamuraAwards */
export function getSawamuraAward(year: string): ResolvedAwardCard {
  return getSawamuraAwards(year).central!;
}

function buildBestNineLeague(
  year: string,
  league: LeagueSide,
  prefix: "c" | "p",
  teams: string[],
  history: number[][],
): ResolvedAwardCard[] {
  return POSITIONS.map((position, i) => {
    const suffix = i >= 6 ? String(i - 5) : "";
    return resolveSeasonCard(
      {
        playerId: `p-b9-${prefix}-${i}`,
        playerName: `${league === "central" ? "セ" : "パ"}B9 ${position}${suffix}`,
        teamName: teams[i],
        league,
        position,
        winYears: history[i] ?? [Number(year)],
      },
      year,
      true,
    );
  });
}

export function getBestNineAwards(year: string): {
  central: ResolvedAwardCard[];
  pacific: ResolvedAwardCard[];
} {
  return {
    central: buildBestNineLeague(
      year,
      "central",
      "c",
      ["ヤクルト", "阪神", "巨人", "広島", "DeNA", "中日", "阪神", "巨人", "ヤクルト"],
      [
        [2023],
        [2021, 2022, 2023],
        [2023],
        [2020, 2023],
        [2022, 2023],
        [2023],
        [2023],
        [2019, 2023],
        [2021, 2023],
      ],
    ),
    pacific: buildBestNineLeague(
      year,
      "pacific",
      "p",
      [
        "オリックス",
        "ソフトバンク",
        "ロッテ",
        "楽天",
        "西武",
        "日本ハム",
        "オリックス",
        "ソフトバンク",
        "オリックス",
      ],
      [
        [2022, 2023],
        [2023],
        [2023],
        [2021, 2022, 2023],
        [2023],
        [2020, 2023],
        [2023],
        [2023],
        [2023],
      ],
    ),
  };
}

export function getGoldenGloveAwards(year: string): {
  central: ResolvedAwardCard[];
  pacific: ResolvedAwardCard[];
} {
  const mk = (
    league: LeagueSide,
    prefix: string,
    teams: string[],
    history: number[][],
  ) =>
    POSITIONS.map((position, i) => {
      const suffix = i >= 6 ? String(i - 5) : "";
      return resolveSeasonCard(
        {
          playerId: `p-gg-${prefix}-${i}`,
          playerName: `${league === "central" ? "セ" : "パ"}GG ${position}${suffix}`,
          teamName: teams[i],
          league,
          position,
          winYears: history[i] ?? [Number(year)],
        },
        year,
        false,
      );
    });

  return {
    central: mk(
      "central",
      "c",
      ["阪神", "巨人", "広島", "DeNA", "ヤクルト", "中日", "阪神", "巨人", "ヤクルト"],
      [
        [2023],
        [2022, 2023],
        [2023],
        [2021, 2022, 2023],
        [2023],
        [2020, 2023],
        [2023],
        [2023],
        [2023],
      ],
    ),
    pacific: mk(
      "pacific",
      "p",
      [
        "ソフトバンク",
        "オリックス",
        "ロッテ",
        "楽天",
        "西武",
        "日本ハム",
        "ソフトバンク",
        "オリックス",
        "ソフトバンク",
      ],
      [
        [2021, 2022, 2023],
        [2023],
        [2023],
        [2023],
        [2022, 2023],
        [2023],
        [2023],
        [2019, 2023],
        [2023],
      ],
    ),
  };
}

const MONTHS = [4, 5, 6, 7, 8, 9] as const;

function dedupeMonths(list: YearMonth[]): YearMonth[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const k = `${w.year}-${w.month}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export type MonthlyMvpLeagueBoard = {
  months: number[];
  pitchers: ResolvedAwardCard[];
  batters: ResolvedAwardCard[];
};

function buildMonthlyLeagueBoard(
  year: string,
  league: LeagueSide,
): MonthlyMvpLeagueBoard {
  const y = Number(year);
  const prefix = league === "central" ? "c" : "p";
  const label = league === "central" ? "セ" : "パ";
  const pitcherTeams =
    league === "central"
      ? { 4: "巨人", 5: "阪神", 6: "中日", 7: "DeNA", 8: "ヤクルト", 9: "広島" }
      : {
          4: "オリックス",
          5: "ロッテ",
          6: "ソフトバンク",
          7: "日本ハム",
          8: "西武",
          9: "楽天",
        };
  const batterTeams =
    league === "central"
      ? { 4: "阪神", 5: "広島", 6: "巨人", 7: "ヤクルト", 8: "DeNA", 9: "中日" }
      : {
          4: "ソフトバンク",
          5: "楽天",
          6: "オリックス",
          7: "西武",
          8: "ロッテ",
          9: "日本ハム",
        };

  const pitchers = MONTHS.map((month) => {
    const playerId = `p-mm-${prefix}-p-${month}`;
    const stats = getMonthlyHighlightStats(playerId, year, month);
    const unique = dedupeMonths(
      month <= 5
        ? [
            { year: 2022, month: 8 },
            { year: y, month: 4 },
            ...(month >= 5 ? [{ year: y, month: 5 }] : []),
          ]
        : [{ year: y, month }],
    );
    return {
      playerId,
      playerName: `${label} ${month}月投手`,
      teamName: pitcherTeams[month],
      historyLabel: formatMonthlyAwardHistory(unique, { year: y, month }),
      month,
      role: "pitcher" as const,
      league,
      stats: stats ? formatMonthlyMvpStats(stats) : null,
    };
  });

  const batters = MONTHS.map((month) => {
    const playerId = `p-mm-${prefix}-b-${month}`;
    const stats = getMonthlyHighlightStats(playerId, year, month);
    const unique =
      month === 4
        ? [
            { year: 2021, month: 6 },
            { year: y, month: 4 },
          ]
        : month === 6
          ? [
              { year: y, month: 5 },
              { year: y, month: 6 },
            ]
          : [{ year: y, month }];
    return {
      playerId,
      playerName: `${label} ${month}月野手`,
      teamName: batterTeams[month],
      historyLabel: formatMonthlyAwardHistory(unique, { year: y, month }),
      month,
      role: "batter" as const,
      league,
      stats: stats ? formatMonthlyMvpStats(stats) : null,
    };
  });

  return { months: [...MONTHS], pitchers, batters };
}

export function getMonthlyMvpAwards(year: string): {
  central: MonthlyMvpLeagueBoard;
  pacific: MonthlyMvpLeagueBoard;
} {
  return {
    central: buildMonthlyLeagueBoard(year, "central"),
    pacific: buildMonthlyLeagueBoard(year, "pacific"),
  };
}

export type AwardPageId =
  | "major"
  | "titles"
  | "mvp"
  | "rookie"
  | "sawamura"
  | "best9"
  | "gg"
  | "monthly";

export function isAwardPageId(id: string): id is AwardPageId {
  return [
    "major",
    "titles",
    "mvp",
    "rookie",
    "sawamura",
    "best9",
    "gg",
    "monthly",
  ].includes(id);
}
