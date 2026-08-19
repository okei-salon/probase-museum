import type { LinkListItemData } from "@/components/category/LinkList";
import type { SelectGridItem } from "@/components/category/SelectGrid";

export const npbTeams = [
  { id: "tigers", name: "阪神タイガース", short: "阪神", league: "セ" },
  { id: "giants", name: "読売ジャイアンツ", short: "巨人", league: "セ" },
  { id: "carp", name: "広島東洋カープ", short: "広島", league: "セ" },
  { id: "baystars", name: "横浜DeNAベイスターズ", short: "DeNA", league: "セ" },
  { id: "swallows", name: "東京ヤクルトスワローズ", short: "ヤクルト", league: "セ" },
  { id: "dragons", name: "中日ドラゴンズ", short: "中日", league: "セ" },
  { id: "buffaloes", name: "オリックス・バファローズ", short: "オリックス", league: "パ" },
  { id: "hawks", name: "福岡ソフトバンクホークス", short: "ソフトバンク", league: "パ" },
  { id: "marines", name: "千葉ロッテマリーンズ", short: "ロッテ", league: "パ" },
  { id: "fighters", name: "北海道日本ハムファイターズ", short: "日本ハム", league: "パ" },
  { id: "lions", name: "埼玉西武ライオンズ", short: "西武", league: "パ" },
  { id: "eagles", name: "東北楽天ゴールデンイーグルス", short: "楽天", league: "パ" },
] as const;

export type TeamId = (typeof npbTeams)[number]["id"];

export function getTeam(id: string) {
  return npbTeams.find((t) => t.id === id);
}

export function getTeamGridItems(): SelectGridItem[] {
  return npbTeams.map((team) => ({
    id: team.id,
    href: `/teams/${team.id}`,
    title: team.short,
    subtitle: team.league === "セ" ? "CENTRAL" : "PACIFIC",
    description: team.name,
  }));
}

/** 球団詳細の正式5項目 */
export const teamSections = [
  {
    id: "profile",
    title: "基本情報",
    description: "通算勝敗・優勝・CSなど球団の実績概要",
    icon: "user" as const,
  },
  {
    id: "yearly",
    title: "年度別成績",
    description: "年ごとの順位・勝敗・得点など",
    icon: "calendar" as const,
  },
  {
    id: "career",
    title: "通算成績",
    description: "通算指標と12球団順位",
    icon: "book" as const,
  },
  {
    id: "batting",
    title: "チーム打撃",
    description: "年度別・通算のチーム打撃成績",
    icon: "baseball" as const,
  },
  {
    id: "pitching",
    title: "チーム投手",
    description: "年度別・通算のチーム投手成績",
    icon: "star" as const,
  },
] as const;

/** 旧セクション → 新5項目 */
export const teamSectionAliases: Record<string, string> = {
  season: "yearly",
  "standings-history": "yearly",
  winpct: "yearly",
  pennants: "profile",
  "japan-series": "profile",
  cs: "profile",
  records: "profile",
};

export function resolveTeamSection(section: string): string {
  return teamSectionAliases[section] ?? section;
}

export function getTeamSectionLinks(teamId: string): LinkListItemData[] {
  return teamSections.map((section) => ({
    id: section.id,
    href: `/teams/${teamId}/${section.id}`,
    title: section.title,
    description: section.description,
    icon: section.icon,
  }));
}
