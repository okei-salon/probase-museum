import type { TeamId } from "@/data/teams";
import type { SeasonWorld } from "@/data/seasons";

export type SeriesResult = {
  teamA: string;
  teamB: string;
  teamAId: TeamId | null;
  teamBId: TeamId | null;
  winsA: number;
  winsB: number;
  winner: string;
  winnerId: TeamId | null;
};

export type LeagueCsRecord = {
  league: "central" | "pacific";
  leagueLabel: string;
  /** CS 1st */
  first: SeriesResult;
  /** CS Final */
  final: SeriesResult;
  /** 日本シリーズ進出球団 */
  representative: string;
  representativeId: TeamId | null;
};

/** 日本シリーズMVP（選手履歴・SOP反映用） */
export type JapanSeriesMvpAward = {
  award: "japan-series-mvp";
  year: string;
  /** 正式 WORLD。既存・DEMO は null / 未設定 */
  world?: SeasonWorld | null;
  playerId: string | null;
  playerName: string;
  teamId: TeamId | null;
  teamName: string;
};

/** ○＝勝利 / ●＝敗戦（teamLeft 視点） */
export type JapanSeriesGameMark = "W" | "L";

export type JapanSeriesResult = {
  year: string;
  world?: SeasonWorld | null;
  teamLeft: string;
  teamRight: string;
  teamLeftId: TeamId | null;
  teamRightId: TeamId | null;
  winsLeft: number;
  winsRight: number;
  gameMarks: JapanSeriesGameMark[];
  champion: string;
  championId: TeamId | null;
  mvp: JapanSeriesMvpAward;
};

export type PostseasonSeason = {
  /**
   * 正式 WORLD: `${world}:${year}`（例: BLUE:2026）
   * レガシー／DEMO: `${year}`（例: 2023）（既存キーは変更しない）
   */
  id?: string;
  year: string;
  /** 正式 WORLD。未設定／null は既存レガシー・2000 DEMO */
  world?: SeasonWorld | null;
  central: LeagueCsRecord;
  pacific: LeagueCsRecord;
  japanSeries: JapanSeriesResult;
  source?: "manual" | "ocr" | "import" | "static";
  createdAt?: string;
  updatedAt?: string;
};

/** 歴代チーム集計用：年度ごとのチーム単位ポストシーズン実績 */
export type TeamPostseasonYearRecord = {
  year: string;
  world?: SeasonWorld | null;
  teamId: TeamId;
  reachedCs: boolean;
  reachedCsFinal: boolean;
  reachedJapanSeries: boolean;
  japanSeriesChampion: boolean;
  /** 試合単位の勝敗 */
  wins: number;
  losses: number;
};

export type TeamPostseasonCareer = {
  teamId: TeamId;
  csAppearances: number;
  csAppearanceRate: number | null;
  japanSeriesAppearances: number;
  japanSeriesAppearanceRate: number | null;
  japanSeriesTitles: number;
  wins: number;
  losses: number;
  winPct: number | null;
  seasonsTracked: number;
};
