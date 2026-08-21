/**
 * museum_documents に載せる正式コレクション名（ホワイトリスト）。
 * 未登録 collection への API アクセスは拒否する。
 */

export const MUSEUM_SYNC_COLLECTIONS = [
  "team_standings",
  "pennant_matchups",
  "standings_history",
  "team_season_stats",
  "season_lines",
  "monthly_mvp",
  "interleague",
  "postseason",
  "yearbook_reviews",
  "season_achievements",
  "sop_awards_registry",
  "title_win_history",
  "player_master",
  "sop_feats",
] as const;

export type MuseumSyncCollection = (typeof MUSEUM_SYNC_COLLECTIONS)[number];

export function isMuseumSyncCollection(
  value: string,
): value is MuseumSyncCollection {
  return (MUSEUM_SYNC_COLLECTIONS as readonly string[]).includes(value);
}
