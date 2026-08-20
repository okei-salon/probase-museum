/**
 * データ取込のメインタブ定義。
 */

export type ImportCategoryId =
  | "player_season"
  | "monthly_mvp"
  | "season"
  | "interleague"
  | "awards"
  | "special";

export type ImportCategory = {
  id: ImportCategoryId;
  label: string;
  description: string;
};

export const IMPORT_CATEGORIES: ImportCategory[] = [
  {
    id: "player_season",
    label: "年度個人成績",
    description: "野手・投手・捕手のランキング画面を約10人単位で一括取込",
  },
  {
    id: "monthly_mvp",
    label: "月間MVP",
    description: "月間MVP画面から野手・投手受賞者を取込",
  },
  {
    id: "season",
    label: "シーズン",
    description: "チーム順位・チーム打撃・チーム投手・対戦表",
  },
  {
    id: "interleague",
    label: "交流戦",
    description: "交流戦順位・対戦表・チーム／個人成績・優勝・MVP",
  },
  {
    id: "awards",
    label: "表彰",
    description: "タイトル・B9・GG・MVP・新人王・沢村賞",
  },
  {
    id: "special",
    label: "特別記録",
    description: "完全試合・連続記録など手動登録が必要な偉業",
  },
];

/** シーズン内サブ種別 */
export type SeasonImportSubId =
  | "standings"
  | "team_batting"
  | "team_pitching"
  | "matchups";

export const SEASON_IMPORT_SUBS: Array<{
  id: SeasonImportSubId;
  label: string;
}> = [
  { id: "standings", label: "チーム順位" },
  { id: "team_batting", label: "チーム打撃成績" },
  { id: "team_pitching", label: "チーム投手成績" },
  { id: "matchups", label: "対戦表" },
];

/** 表彰内サブ種別 */
export type AwardImportSubId =
  | "title"
  | "bestNine"
  | "goldenGlove"
  | "mvp"
  | "rookie"
  | "sawamura";

export const AWARD_IMPORT_SUBS: Array<{
  id: AwardImportSubId;
  label: string;
}> = [
  { id: "title", label: "タイトル" },
  { id: "bestNine", label: "ベストナイン" },
  { id: "goldenGlove", label: "ゴールデングラブ" },
  { id: "mvp", label: "MVP" },
  { id: "rookie", label: "新人王" },
  { id: "sawamura", label: "沢村賞" },
];

/** 交流戦内サブ種別 */
export type InterleagueImportSubId =
  | "standings"
  | "matrix"
  | "team_batting"
  | "team_pitching"
  | "player";

export const INTERLEAGUE_IMPORT_SUBS: Array<{
  id: InterleagueImportSubId;
  label: string;
}> = [
  { id: "standings", label: "交流戦順位" },
  { id: "matrix", label: "交流戦対戦表" },
  { id: "team_batting", label: "交流戦チーム打撃成績" },
  { id: "team_pitching", label: "交流戦チーム投手成績" },
  { id: "player", label: "交流戦個人成績" },
];
