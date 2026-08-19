import type { MuseumIconName } from "@/components/ui/MuseumIcon";
import type { LinkListItemData } from "@/components/category/LinkList";
import type { SelectGridItem } from "@/components/category/SelectGrid";
import type { CategoryThemeId } from "@/config/categoryThemes";

/**
 * SEASONS: WORLD（BLUE / RED）× YEAR を seasonKey で識別する。
 *
 * Step3: ストア共通の WORLD 基盤（型・照合ヘルパー）をここに集約する。
 * 各 localStorage ストアへの world フィールド追加は後続 Step で1領域ずつ行う。
 *
 * 設計:
 * - シーズン表示・年度タイトル等 … world + year で分離（matchSeason）
 * - 通算・RECORDS・SOP career … BLUE/RED を別シーズンとして両方合算（includeInCareerTotals）
 * - 既存データ（world 無し）・2000 DEMO … world: null のまま後方互換（自動移行しない）
 */

export type SeasonWorld = "BLUE" | "RED";

export const SEASON_WORLDS: readonly SeasonWorld[] = ["BLUE", "RED"] as const;

/** BLUE / RED 正式運用の開始年度 */
export const FORMAL_SEASON_START_YEAR = 2026;

/**
 * 正式シーズン年度（WORLD ごとにカード表示）。
 * 増やすときはここに年度を追加する。
 */
export const formalSeasonYears = ["2026"] as const;

export type FormalSeasonYear = (typeof formalSeasonYears)[number];

/** デモ専用テスト年度（正式 WORLD とは別。YEAR=2000） */
export const DEMO_SEASON_YEAR = 2000;
export const DEMO_SEASON_KEY = "2000";

/**
 * 互換用：旧年度一覧（2018〜2025 + 2000）。
 * トップの BLUE/RED には出さないが、既存 URL は維持する。
 */
export const seasonYears = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
  "2018",
  "2000",
] as const;

export type SeasonYear = (typeof seasonYears)[number];

export type SeasonIdentity = {
  /** ルート／ストレージ用一意キー。例: BLUE_2026 / RED_2026 / 2000 / 2023 */
  seasonKey: string;
  year: number;
  /** 正式 WORLD。DEMO・レガシーは null（world を付与しない） */
  world: SeasonWorld | null;
  kind: "formal" | "demo" | "legacy";
};

/**
 * 保存レコードが持つシーズン識別フィールド（共通照合用）。
 * - year … 大半のストア
 * - season … season-achievements など
 * - world … 未設定／null はレガシー・DEMO（自動で BLUE/RED に帰属させない）
 */
export type SeasonScopedFields = {
  year?: number;
  season?: number;
  world?: SeasonWorld | null;
};

export function makeSeasonKey(world: SeasonWorld, year: number | string): string {
  return `${world}_${Number(year)}`;
}

/** makeSeasonKey の別名（WORLD + YEAR → seasonKey） */
export const createSeasonKey = makeSeasonKey;

export function isDemoSeasonYear(year: string | number): boolean {
  return Number(year) === DEMO_SEASON_YEAR;
}

export function isFormalSeasonYear(year: number): boolean {
  return (
    year >= FORMAL_SEASON_START_YEAR &&
    (formalSeasonYears as readonly string[]).includes(String(year))
  );
}

export function isSeasonWorld(value: unknown): value is SeasonWorld {
  return value === "BLUE" || value === "RED";
}

/** 未知値を SeasonWorld | null に正規化（不正値は null＝レガシー扱い） */
export function normalizeSeasonWorld(value: unknown): SeasonWorld | null {
  if (isSeasonWorld(value)) return value;
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (isSeasonWorld(upper)) return upper;
  }
  return null;
}

/** @deprecated 年度文字列チェック。ルート検証は parseSeasonKey / isValidSeasonRoute を使う */
export function isSeasonYear(value: string): value is SeasonYear {
  return (seasonYears as readonly string[]).includes(value);
}

/**
 * URL セグメントをシーズン識別子へ解析。
 * - BLUE_2026 / RED_2026 … 正式
 * - 2000 … DEMO（WORLD なし）
 * - 2018〜2025 … レガシー（WORLD なし・一覧非表示）
 * - 裸の 2026+ … レガシー互換（取込リンク用。一覧は WORLD 付きを使う）
 */
export function parseSeasonKey(raw: string): SeasonIdentity | null {
  const key = raw.trim();
  if (!key) return null;

  if (key === DEMO_SEASON_KEY || key === "DEMO_2000") {
    return {
      seasonKey: DEMO_SEASON_KEY,
      year: DEMO_SEASON_YEAR,
      world: null,
      kind: "demo",
    };
  }

  const worldMatch = /^(BLUE|RED)_(\d{4})$/i.exec(key);
  if (worldMatch) {
    const world = worldMatch[1]!.toUpperCase() as SeasonWorld;
    const year = Number(worldMatch[2]);
    if (!Number.isFinite(year)) return null;
    if (year < FORMAL_SEASON_START_YEAR) return null;
    return {
      seasonKey: makeSeasonKey(world, year),
      year,
      world,
      kind: "formal",
    };
  }

  if (/^\d{4}$/.test(key)) {
    const year = Number(key);
    if (year === DEMO_SEASON_YEAR) {
      return {
        seasonKey: DEMO_SEASON_KEY,
        year,
        world: null,
        kind: "demo",
      };
    }
    if (year >= 2018 && year < FORMAL_SEASON_START_YEAR) {
      return { seasonKey: key, year, world: null, kind: "legacy" };
    }
    // 取込などからの裸 YEAR=2026 リンク互換（WORLD 未指定）
    if (year >= FORMAL_SEASON_START_YEAR) {
      return { seasonKey: key, year, world: null, kind: "legacy" };
    }
  }

  return null;
}

export function isValidSeasonRoute(value: string): boolean {
  return parseSeasonKey(value) != null;
}

/** 正式 WORLD × YEAR から SeasonIdentity を構築 */
export function createSeasonIdentity(
  world: SeasonWorld,
  year: number,
): SeasonIdentity {
  return {
    seasonKey: makeSeasonKey(world, year),
    year: Number(year),
    world,
    kind: "formal",
  };
}

/** 2000 DEMO の SeasonIdentity（world なし） */
export function createDemoSeasonIdentity(): SeasonIdentity {
  return {
    seasonKey: DEMO_SEASON_KEY,
    year: DEMO_SEASON_YEAR,
    world: null,
    kind: "demo",
  };
}

/**
 * year + world から SeasonIdentity を構築。
 * world 無しは DEMO / レガシー扱い（正式年度でも BLUE/RED に帰属させない）。
 */
export function identityFromWorldYear(
  year: number,
  world?: SeasonWorld | null,
): SeasonIdentity {
  const y = Number(year);
  const w = normalizeSeasonWorld(world);
  if (w) return createSeasonIdentity(w, y);
  if (y === DEMO_SEASON_YEAR) return createDemoSeasonIdentity();
  return {
    seasonKey: String(y),
    year: y,
    world: null,
    kind: "legacy",
  };
}

/** 同一 WORLD の前年 identity（連続記録用）。WORLD はまたがない。 */
export function priorSeasonIdentity(
  identity: SeasonIdentity,
): SeasonIdentity {
  return identityFromWorldYear(identity.year - 1, identity.world);
}

/**
 * ストレージ／照合用の一意キー。
 * formal → BLUE_2026 / RED_2026、demo・legacy → "2000" / "2023" など。
 * localStorage のキー名自体は変更しない（レコード識別・将来の複合ID用）。
 */
export function seasonStorageKey(identity: SeasonIdentity): string {
  return identity.seasonKey;
}

/** レコードから年度を取得（year 優先、なければ season） */
export function recordSeasonYear(record: SeasonScopedFields): number | null {
  const raw = record.year ?? record.season;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

/**
 * シーズン画面・年度タイトル等用：world + year で厳密一致。
 *
 * - formal（identity.world あり）: year 一致かつ record.world === identity.world
 * - demo / legacy（identity.world === null）: year 一致かつ record.world 未設定
 *
 * 既存の world 無しデータは BLUE/RED に自動帰属しない（レガシー／DEMO 側でのみヒット）。
 */
export function matchSeason(
  record: SeasonScopedFields,
  identity: SeasonIdentity,
): boolean {
  const year = recordSeasonYear(record);
  if (year === null || year !== identity.year) return false;

  const recordWorld = normalizeSeasonWorld(record.world);
  if (identity.world) {
    return recordWorld === identity.world;
  }
  return recordWorld == null;
}

/**
 * カレンダー年のみ一致（WORLD は見ない）。
 * 同一年の BLUE/RED を「重複除外」せず両方残す用途の下準備。
 */
export function matchSeasonYear(
  record: SeasonScopedFields,
  year: number,
): boolean {
  return recordSeasonYear(record) === year;
}

/**
 * 通算成績・RECORDS・SOP career に含めるか。
 * BLUE と RED は別シーズン行として両方合算する（同一カレンダー年でも除外しない）。
 */
export function includeInCareerTotals(_record: SeasonScopedFields): boolean {
  return true;
}

/**
 * 手入力／一括取込用のシーズン選択肢。
 * 正式年度は BLUE / RED を別オプションにし、旧年度・2000 DEMO は year のみ。
 * （ユーザーに world を自由記述させず、選択から identity を引き継ぐ）
 */
export function listEntrySeasonIdentities(): SeasonIdentity[] {
  const formal = SEASON_WORLDS.flatMap((world) =>
    formalSeasonYears.map((y) => createSeasonIdentity(world, Number(y))),
  );
  const legacyOrDemo: SeasonIdentity[] = [];
  for (const y of seasonYears) {
    const n = Number(y);
    if (n >= FORMAL_SEASON_START_YEAR) continue;
    const identity = parseSeasonKey(y);
    if (identity) legacyOrDemo.push(identity);
  }
  return [...formal, ...legacyOrDemo];
}

/** 年度別表示ラベル（同一年の BLUE/RED を区別） */
export function formatSeasonLineLabel(identity: {
  year: number;
  world?: SeasonWorld | null;
}): string {
  const world = normalizeSeasonWorld(identity.world);
  if (world) return `${identity.year} ${world}`;
  return String(identity.year);
}

export function seasonDisplayTitle(identity: SeasonIdentity): string {
  if (identity.kind === "demo") return `${identity.year} DEMO SEASON`;
  if (identity.world) return `${identity.year} ${identity.world}`;
  return `${identity.year} SEASON`;
}

export function seasonDisplaySubtitle(identity: SeasonIdentity): string {
  if (identity.kind === "demo") {
    return "取込〜SOP連携の総合テスト専用年度（本番と同じデータ構造）";
  }
  if (identity.world) {
    return `${identity.year} SEASON · ${identity.world}`;
  }
  return `${identity.year} シーズン`;
}

/** ハブ・詳細の CategoryShell テーマ（WORLD アクセント） */
export function seasonHubThemeId(
  identity: SeasonIdentity,
): CategoryThemeId {
  if (identity.world === "BLUE") return "seasonHubBlue";
  if (identity.world === "RED") return "seasonHubRed";
  return "seasonHub";
}

/** SEASONS トップ：BLUE / RED 列用アイテム */
export function getWorldSeasonItems(world: SeasonWorld): SelectGridItem[] {
  return formalSeasonYears.map((year) => {
    const seasonKey = makeSeasonKey(world, year);
    return {
      id: seasonKey,
      href: `/seasons/${seasonKey}`,
      title: year,
      subtitle: "SEASON",
      featured: year === formalSeasonYears[0],
    };
  });
}

/** DEMO カード（トップ下部） */
export function getDemoSeasonItem(): SelectGridItem {
  return {
    id: DEMO_SEASON_KEY,
    href: `/seasons/${DEMO_SEASON_KEY}`,
    title: String(DEMO_SEASON_YEAR),
    subtitle: "DEMO SEASON",
    featured: true,
  };
}

/** @deprecated 旧トップ一覧。WORLD 対応後は getWorldSeasonItems を使用 */
export function getSeasonYearItems(): SelectGridItem[] {
  return [
    ...SEASON_WORLDS.flatMap((w) => getWorldSeasonItems(w)),
    getDemoSeasonItem(),
  ];
}

export type SeasonSectionId =
  | "summary"
  | "pennant"
  | "interleague"
  | "postseason"
  | "awards"
  | "stats"
  | "sop"
  | "feats";

type SeasonSection = {
  id: SeasonSectionId;
  title: string;
  description: string;
  icon: MuseumIconName;
  iconClassName?: string;
  kind: "detail" | "menu";
};

export const seasonSections: SeasonSection[] = [
  {
    id: "summary",
    title: "サマリー",
    description: "レビュー・王者・主要表彰・最終順位",
    icon: "book",
    kind: "detail",
  },
  {
    id: "pennant",
    title: "ペナントレース",
    description: "レビュー・順位対戦・チーム打撃／投手成績",
    icon: "chartLine",
    kind: "menu",
  },
  {
    id: "interleague",
    title: "交流戦",
    description: "順位対戦・チーム成績・個人成績",
    icon: "globe",
    iconClassName: "text-sky-300",
    kind: "menu",
  },
  {
    id: "postseason",
    title: "ポストシーズン",
    description: "トーナメント表・日本シリーズ結果",
    icon: "trophy",
    kind: "detail",
  },
  {
    id: "awards",
    title: "タイトル・表彰",
    description: "主要タイトル・MVP・B9・GG・月間MVP",
    icon: "crown",
    kind: "menu",
  },
  {
    id: "stats",
    title: "個人成績",
    description: "野手・投手・捕手のシーズン成績・ランキング",
    icon: "baseball",
    kind: "detail",
  },
  {
    id: "sop",
    title: "SOP",
    description: "シーズン個人実績評価（自動計算・内訳付き）",
    icon: "star",
    kind: "detail",
  },
  {
    id: "feats",
    title: "記録・偉業",
    description: "完全試合・連続記録・歴史的シーズン",
    icon: "building",
    kind: "detail",
  },
];

export function getSeasonSectionItems(seasonKey: string): SelectGridItem[] {
  return seasonSections.map((section) => ({
    id: section.id,
    href: `/seasons/${seasonKey}/${section.id}`,
    title: section.title,
    description: section.description,
    icon: section.icon,
    iconClassName: section.iconClassName,
  }));
}

export function getSeasonSection(id: string): SeasonSection | undefined {
  return seasonSections.find((s) => s.id === id);
}

/** 旧ペナントURL → 新ID（互換用） */
export const pennantItemAliases: Record<string, string> = {
  summary: "review",
  trend: "standings",
  matrix: "standings",
};

/** 旧ペナント「個人成績」→ SEASONトップの個人成績へ */
export const PENNANT_PLAYERS_REDIRECT_ITEM = "players";

export const pennantMenu = (seasonKey: string): LinkListItemData[] => [
  {
    id: "review",
    href: `/seasons/${seasonKey}/pennant/review`,
    title: "ペナントレビュー",
    description: "レギュラーシーズンの戦いを振り返る",
    icon: "book",
  },
  {
    id: "standings",
    href: `/seasons/${seasonKey}/pennant/standings`,
    title: "順位・対戦成績",
    description: "最終順位・順位推移・対戦成績",
    icon: "chartLine",
    iconClassName: "text-sky-300",
  },
  {
    id: "team-batting",
    href: `/seasons/${seasonKey}/pennant/team-batting`,
    title: "チーム打撃成績",
    description: "セ・パ / 12球団の一覧比較・ソート",
    icon: "chart",
  },
  {
    id: "team-pitching",
    href: `/seasons/${seasonKey}/pennant/team-pitching`,
    title: "チーム投手成績",
    description: "セ・パ / 12球団の一覧比較・ソート",
    icon: "star",
    iconClassName: "text-sky-300",
  },
];

/** 旧交流戦URL → 新ID（互換用）。MVPは廃止のため順位・対戦成績へ誘導 */
export const interleagueItemAliases: Record<string, string> = {
  matrix: "standings",
  mvp: "standings",
};

export const interleagueMenu = (seasonKey: string): LinkListItemData[] => [
  {
    id: "standings",
    href: `/seasons/${seasonKey}/interleague/standings`,
    title: "順位・対戦成績",
    description: "12球団順位・勝敗・勝率・ゲーム差・対戦成績",
    icon: "chartLine",
    iconClassName: "text-sky-300",
  },
  {
    id: "sop",
    href: `/seasons/${seasonKey}/interleague/sop`,
    title: "交流戦SOP",
    description: "交流戦個人成績から算出するSOP・四天王・ランキング",
    icon: "star",
    iconClassName: "text-sky-300",
  },
  {
    id: "players",
    href: `/seasons/${seasonKey}/interleague/players`,
    title: "個人成績",
    description: "野手・投手（ランキング / チーム別）",
    icon: "baseball",
  },
];

export const awardsMenu = (seasonKey: string): LinkListItemData[] => [
  {
    id: "major",
    href: `/seasons/${seasonKey}/awards/major`,
    title: "年間主要表彰",
    description: "MVP・新人王・沢村賞",
    icon: "crown",
  },
  {
    id: "titles",
    href: `/seasons/${seasonKey}/awards/titles`,
    title: "主要タイトル",
    description: "野手・投手ランキング／セ・パ同時比較",
    icon: "trophy",
  },
  {
    id: "best9",
    href: `/seasons/${seasonKey}/awards/best9`,
    title: "ベストナイン",
    description: "守備位置別・成績・履歴",
    icon: "award",
  },
  {
    id: "gg",
    href: `/seasons/${seasonKey}/awards/gg`,
    title: "ゴールデングラブ賞",
    description: "守備位置別・受賞履歴",
    icon: "glove",
  },
  {
    id: "monthly",
    href: `/seasons/${seasonKey}/awards/monthly`,
    title: "月間MVP",
    description: "セ・パ切替・4〜9月一覧",
    icon: "medal",
  },
];

export const dummyStandings = {
  headers: ["順位", "球団", "勝", "敗", "分", "勝率", "差"],
  rows: [
    ["1", "阪神", "85", "53", "5", ".616", "—"],
    ["2", "広島", "74", "65", "4", ".532", "11.5"],
    ["3", "DeNA", "74", "66", "3", ".529", "12"],
    ["4", "巨人", "71", "70", "2", ".504", "15.5"],
    ["5", "ヤクルト", "57", "83", "3", ".407", "29"],
    ["6", "中日", "56", "82", "5", ".406", "29"],
  ],
};
