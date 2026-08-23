import { npbTeams, type TeamId } from "@/data/teams";
import type {
  JapanSeriesMvpAward,
  LeagueCsRecord,
  PostseasonSeason,
  SeriesResult,
} from "./types";
import type { SeasonWorld } from "@/data/seasons";

export function series(
  a: { name: string; id: TeamId | null },
  b: { name: string; id: TeamId | null },
  winsA: number,
  winsB: number,
  winner: { name: string; id: TeamId | null },
  extras?: Partial<
    Pick<
      SeriesResult,
      | "games"
      | "advantageTeam"
      | "advantageTeamId"
      | "advantageWins"
    >
  >,
): SeriesResult {
  return {
    teamA: a.name,
    teamB: b.name,
    teamAId: a.id,
    teamBId: b.id,
    winsA,
    winsB,
    winner: winner.name,
    winnerId: winner.id,
    games: extras?.games,
    advantageTeam: extras?.advantageTeam,
    advantageTeamId: extras?.advantageTeamId ?? null,
    advantageWins: extras?.advantageWins,
  };
}

const byShort = Object.fromEntries(
  npbTeams.map((t) => [t.short, t.id as TeamId]),
) as Record<string, TeamId>;

const fullName = (short: string) =>
  npbTeams.find((t) => t.short === short)?.name ?? short;

/** ダミー：公式結果の転記ではない。UI確認用（world 無しレガシー） */
export const postseasonByYear: Record<string, PostseasonSeason> = {
  "2023": {
    year: "2023",
    world: null,
    source: "static",
    central: {
      league: "central",
      leagueLabel: "セ・リーグ",
      first: series(
        { name: "広島", id: byShort["広島"] },
        { name: "DeNA", id: byShort["DeNA"] },
        2,
        1,
        { name: "広島", id: byShort["広島"] },
      ),
      final: series(
        { name: "阪神", id: byShort["阪神"] },
        { name: "広島", id: byShort["広島"] },
        3,
        0,
        { name: "阪神", id: byShort["阪神"] },
      ),
      representative: "阪神",
      representativeId: byShort["阪神"],
    },
    pacific: {
      league: "pacific",
      leagueLabel: "パ・リーグ",
      first: series(
        { name: "ソフトバンク", id: byShort["ソフトバンク"] },
        { name: "ロッテ", id: byShort["ロッテ"] },
        2,
        0,
        { name: "ソフトバンク", id: byShort["ソフトバンク"] },
      ),
      final: series(
        { name: "オリックス", id: byShort["オリックス"] },
        { name: "ソフトバンク", id: byShort["ソフトバンク"] },
        3,
        1,
        { name: "オリックス", id: byShort["オリックス"] },
      ),
      representative: "オリックス",
      representativeId: byShort["オリックス"],
    },
    japanSeries: {
      year: "2023",
      world: null,
      teamLeft: "阪神",
      teamRight: "オリックス",
      teamLeftId: byShort["阪神"],
      teamRightId: byShort["オリックス"],
      winsLeft: 4,
      winsRight: 2,
      gameMarks: ["W", "L", "W", "L", "W", "W"],
      champion: "阪神",
      championId: byShort["阪神"],
      mvp: {
        award: "japan-series-mvp",
        year: "2023",
        world: null,
        playerId: null,
        playerName: "サンプル シリーズMVP",
        teamId: byShort["阪神"],
        teamName: fullName("阪神"),
      },
    },
  },
};

export function emptySeries(): SeriesResult {
  return series(
    { name: "登録待ち", id: null },
    { name: "登録待ち", id: null },
    0,
    0,
    { name: "登録待ち", id: null },
  );
}

function emptyLeague(league: "central" | "pacific"): LeagueCsRecord {
  return {
    league,
    leagueLabel: league === "central" ? "セ・リーグ" : "パ・リーグ",
    first: emptySeries(),
    final: emptySeries(),
    representative: "登録待ち",
    representativeId: null,
  };
}

export function placeholderMvp(
  year: string,
  world?: SeasonWorld | null,
): JapanSeriesMvpAward {
  return {
    award: "japan-series-mvp",
    year,
    world: world ?? null,
    playerId: null,
    playerName: "登録待ち",
    teamId: null,
    teamName: "登録待ち",
    avg: null,
    hr: null,
    rbi: null,
    note: null,
  };
}

export function placeholderSeason(
  year: string,
  world?: SeasonWorld | null,
): PostseasonSeason {
  const y = String(year);
  const w = world ?? null;
  return {
    year: y,
    world: w,
    source: "static",
    central: emptyLeague("central"),
    pacific: emptyLeague("pacific"),
    japanSeries: {
      year: y,
      world: w,
      teamLeft: "登録待ち",
      teamRight: "登録待ち",
      teamLeftId: null,
      teamRightId: null,
      winsLeft: 0,
      winsRight: 0,
      gameMarks: [],
      games: [],
      champion: "登録待ち",
      championId: null,
      mvp: placeholderMvp(y, w),
    },
  };
}
