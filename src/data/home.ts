import { media, type NavMediaKey } from "@/config/media";

export type NavCardItem = {
  id: NavMediaKey;
  href: string;
  titleEn: string;
  titleJa: string;
  description: string;
  mediaKey: NavMediaKey;
  tone: "warm" | "cool" | "gold" | "deep" | "ember" | "slate";
  icon: "calendar" | "trophy" | "user" | "flag" | "star" | "book";
};

/** /news ページ用（ホーム表示からは外す） */
export type NewsItem = {
  id: string;
  date: string;
  title: string;
};

export const siteMeta = {
  name: "PROBASE MUSEUM",
  tagline: "プロ野球データ博物館 / 数字が語る、感動の軌跡。",
  heroCaption: "— あなただけのプロ野球博物館 —",
  copyrightYear: 2025,
  dataUpdatedAt: "2025.05.24",
  dataCoverage: "2023年シーズンまで",
} as const;

export const navCards: NavCardItem[] = [
  {
    id: "seasons",
    href: "/seasons",
    titleEn: "SEASONS",
    titleJa: "シーズン年鑑",
    description: "年度ごとの成績や出来事を一冊の年鑑として振り返る。",
    mediaKey: "seasons",
    tone: "warm",
    icon: "calendar",
  },
  {
    id: "records",
    href: "/records",
    titleEn: "RECORDS",
    titleJa: "記録室",
    description: "シーズン・通算の記録をランキング形式で閲覧。",
    mediaKey: "records",
    tone: "gold",
    icon: "trophy",
  },
  {
    id: "players",
    href: "/players",
    titleEn: "PLAYERS",
    titleJa: "選手名鑑",
    description: "選手を検索して年度別・通算の成績やタイトル歴を確認。",
    mediaKey: "players",
    tone: "ember",
    icon: "user",
  },
  {
    id: "teams",
    href: "/teams",
    titleEn: "TEAMS",
    titleJa: "球団データ",
    description: "12球団の年度別成績や歴史・記録を振り返る。",
    mediaKey: "teams",
    tone: "cool",
    icon: "flag",
  },
  {
    id: "sop",
    href: "/sop",
    titleEn: "SOP",
    titleJa: "独自評価ランキング",
    description: "SOPランキングや各種評価で選手・チームを分析。",
    mediaKey: "sop",
    tone: "gold",
    icon: "star",
  },
  {
    id: "yearbook",
    href: "/yearbook",
    titleEn: "YEARBOOK",
    titleJa: "年鑑・総評",
    description: "その年の総評や出来事を文章とデータで振り返る。",
    mediaKey: "yearbook",
    tone: "slate",
    icon: "book",
  },
];

export const newsItems: NewsItem[] = [
  {
    id: "n1",
    date: "2025.05.24",
    title: "2023年シーズンのデータ登録が完了しました。",
  },
  {
    id: "n2",
    date: "2025.05.20",
    title: "SOPランキングを更新しました。",
  },
  {
    id: "n3",
    date: "2025.05.10",
    title: "記録室に新しいランキングを追加しました。",
  },
  {
    id: "n4",
    date: "2025.04.28",
    title: "選手名鑑に検索フィルターを追加しました。",
  },
];

export { media };
