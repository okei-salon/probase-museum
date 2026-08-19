import {
  centralStandings,
  pacificStandings,
} from "@/data/seasonViews";
import { getJapanSeriesMvp, getPostseason } from "@/data/postseason";
import {
  getInterleagueChampion,
  getInterleagueMvp,
} from "@/data/interleague";
import {
  getStandingsForSeason,
  getYearStandings,
} from "@/data/teamStandings";
import type { SeasonIdentity } from "@/data/seasons";
import { parseSeasonKey } from "@/data/seasons";
import type { StandingRow } from "@/components/views/StandingsTable";

/**
 * シーズンサマリー用データ。
 * 今後のデータ登録機能と差し替えやすいよう、年単位で取得する構造にする。
 * ※実在するNPB公式結果を勝手に記入しない（プレースホルダー／既存ダミーのみ）。
 */

export type SummaryChampion = {
  id: string;
  title: string;
  teamName: string;
  note?: string;
  /** 日本一など特に強調する枠 */
  featured?: boolean;
};

export type SummaryAward = {
  id: string;
  title: string;
  playerName: string;
  teamName: string;
  /** 将来 PLAYERS 詳細へ遷移するためのID（未登録時は null） */
  playerId: string | null;
};

export type SummaryHighlight = {
  id: string;
  kind:
    | "perfect-game"
    | "no-hitter"
    | "cycle"
    | "homerun-50"
    | "triple-three"
    | "streak"
    | "special"
    | "sop-1st"
    | "symbol";
  title: string;
  description: string;
  meta?: string;
};

export type SeasonSummaryData = {
  year: string;
  tagline: string;
  champions: SummaryChampion[];
  awards: SummaryAward[];
  /** その年に該当する記録・出来事のみ */
  highlights: SummaryHighlight[];
  standings: {
    central: StandingRow[];
    pacific: StandingRow[];
  };
};

const placeholderTeam = "登録待ち";
const placeholderPlayer = "登録待ち";

/** 年ごとのサマリー登録テーブル（将来はDB/登録機能へ置換） */
const seasonSummaryRegistry: Record<string, Partial<SeasonSummaryData>> = {
  "2023": {
    tagline: "2023年の記録と栄光を振り返る",
    champions: [
      {
        id: "central",
        title: "セ・リーグ優勝",
        teamName: placeholderTeam,
        note: "データ登録後に表示",
      },
      {
        id: "pacific",
        title: "パ・リーグ優勝",
        teamName: placeholderTeam,
        note: "データ登録後に表示",
      },
      {
        id: "japan",
        title: "日本一",
        teamName: placeholderTeam,
        note: "日本シリーズ優勝",
        featured: true,
      },
      {
        id: "interleague",
        title: "交流戦優勝",
        teamName: placeholderTeam,
        note: "データ登録後に表示",
      },
    ],
    awards: [
      {
        id: "mvp-c",
        title: "セ・リーグ MVP",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "mvp-p",
        title: "パ・リーグ MVP",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "rookie-c",
        title: "セ・リーグ 新人王",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "rookie-p",
        title: "パ・リーグ 新人王",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "sawamura",
        title: "沢村賞",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "js-mvp",
        title: "日本シリーズMVP",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
      {
        id: "il-mvp",
        title: "交流戦MVP",
        playerName: placeholderPlayer,
        teamName: placeholderTeam,
        playerId: null,
      },
    ],
    // 該当する展示のみ（未確定の記録は載せない）
    highlights: [
      {
        id: "symbol-2023",
        kind: "symbol",
        title: "そのシーズンを象徴する出来事",
        description:
          "シーズンを象徴する物語・出来事は、データ登録後にここに展示されます。",
        meta: "展示準備中",
      },
      {
        id: "sop-2023",
        kind: "sop-1st",
        title: "SOP年間1位",
        description: "独自評価SOPのシーズン1位選手を展示します。",
        meta: "登録待ち",
      },
    ],
  },
};

function defaultChampions(): SummaryChampion[] {
  return [
    {
      id: "central",
      title: "セ・リーグ優勝",
      teamName: placeholderTeam,
    },
    {
      id: "pacific",
      title: "パ・リーグ優勝",
      teamName: placeholderTeam,
    },
    {
      id: "japan",
      title: "日本一",
      teamName: placeholderTeam,
      featured: true,
    },
    {
      id: "interleague",
      title: "交流戦優勝",
      teamName: placeholderTeam,
    },
  ];
}

function defaultAwards(): SummaryAward[] {
  return [
    {
      id: "mvp-c",
      title: "セ・リーグ MVP",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "mvp-p",
      title: "パ・リーグ MVP",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "rookie-c",
      title: "セ・リーグ 新人王",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "rookie-p",
      title: "パ・リーグ 新人王",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "sawamura",
      title: "沢村賞",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "js-mvp",
      title: "日本シリーズMVP",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
    {
      id: "il-mvp",
      title: "交流戦MVP",
      playerName: placeholderPlayer,
      teamName: placeholderTeam,
      playerId: null,
    },
  ];
}

export function getSeasonSummary(
  year: string,
  seasonKeyOrIdentity?: string | SeasonIdentity | null,
): SeasonSummaryData {
  const yearNum = Number(year);
  const identity =
    typeof seasonKeyOrIdentity === "string"
      ? parseSeasonKey(seasonKeyOrIdentity)
      : seasonKeyOrIdentity ?? null;
  const postseasonIdentity =
    identity ??
    (Number.isFinite(yearNum)
      ? ({
          seasonKey: String(yearNum),
          year: yearNum,
          world: null,
          kind: "legacy" as const,
        } satisfies SeasonIdentity)
      : null);

  const registered = seasonSummaryRegistry[year] ?? {};
  const jsMvp = postseasonIdentity
    ? getJapanSeriesMvp(postseasonIdentity)
    : getJapanSeriesMvp(year);
  const japanChampion = postseasonIdentity
    ? getPostseason(postseasonIdentity).japanSeries.champion
    : getPostseason(year).japanSeries.champion;
  const ilChampion = postseasonIdentity
    ? getInterleagueChampion(postseasonIdentity)
    : getInterleagueChampion(year);
  const ilMvp = postseasonIdentity
    ? getInterleagueMvp(postseasonIdentity)
    : getInterleagueMvp(year);

  const champions = (registered.champions ?? defaultChampions()).map((c) => {
    if (c.id === "japan" && japanChampion !== "登録待ち") {
      return { ...c, teamName: japanChampion };
    }
    if (c.id === "interleague" && ilChampion !== "登録待ち") {
      return { ...c, teamName: ilChampion };
    }
    return c;
  });

  const awards = (registered.awards ?? defaultAwards()).map((a) => {
    if (a.id === "js-mvp") {
      return {
        ...a,
        playerName: jsMvp.playerName,
        teamName: jsMvp.teamName,
        playerId: jsMvp.playerId,
      };
    }
    if (a.id === "il-mvp") {
      return {
        ...a,
        playerName: ilMvp.playerName,
        teamName: ilMvp.teamName,
        playerId: ilMvp.playerId,
      };
    }
    return a;
  });

  const stored = identity
    ? getStandingsForSeason(identity)
    : Number.isFinite(yearNum)
      ? getYearStandings(yearNum)
      : null;
  const toRows = (entries: { rank: number; team: string; w: number; l: number; d: number; pct: string; gb: string }[]): StandingRow[] =>
    entries.map((e) => ({
      rank: e.rank,
      team: e.team,
      w: e.w,
      l: e.l,
      d: e.d,
      pct: e.pct,
      gb: e.gb,
    }));

  return {
    year,
    tagline: registered.tagline ?? `${year}年の記録と栄光を振り返る`,
    champions,
    awards,
    highlights: registered.highlights ?? [],
    standings: {
      // 取込済み順位があれば優先。なければ既存ダミー（削除しない）
      central: stored?.central?.length
        ? toRows(stored.central)
        : centralStandings,
      pacific: stored?.pacific?.length
        ? toRows(stored.pacific)
        : pacificStandings,
    },
  };
}
