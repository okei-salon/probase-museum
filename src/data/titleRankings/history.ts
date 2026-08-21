import { formatSeasonAwardHistory } from "@/lib/awardHistory";
import type { LeagueSide } from "@/data/playerStats";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";
import {
  hydrateLocalArrayFromCloud,
  putMuseumCollectionRecord,
} from "@/lib/museumCloud/clientSync";

const STORAGE_KEY = "probase-museum.title-win-history.v1";
const COLLECTION = "title_win_history";

export type TitleWinRecord = {
  titleId: string;
  year: number;
  /** 正式 WORLD。既存シード・レガシーは null / 未設定 */
  world?: SeasonWorld | null;
  league: LeagueSide;
  playerId: string;
  /** 1〜5。未指定は1位扱い */
  rank?: number;
  playerName?: string;
  teamShort?: string;
  valueText?: string;
  /** クラウド同期用（recordKey）。シードには無い */
  id?: string;
  updatedAt?: string;
};

/** クラウド同期用レコード */
type TitleWinSyncRecord = TitleWinRecord & {
  id: string;
  updatedAt: string;
};

/** デモ用の過去受賞（自動判定の種）。実データ集計結果で上書き・追記される。 */
const SEED_HISTORY: TitleWinRecord[] = [
  // 打率
  { titleId: "avg", year: 2024, league: "central", playerId: "hanshin_41045153_8" },
  { titleId: "avg", year: 2025, league: "central", playerId: "hanshin_41045153_8" },
  // 本塁打
  { titleId: "hr", year: 2023, league: "central", playerId: "giants_sample_okamoto" },
  { titleId: "hr", year: 2025, league: "central", playerId: "hanshin_41045153_8" },
  // 防御率
  { titleId: "era", year: 2025, league: "pacific", playerId: "fighters_sample_ace" },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

function recordKey(r: TitleWinRecord): string {
  const w = normalizeSeasonWorld(r.world) ?? "";
  return `${r.titleId}:${r.year}:${w}:${r.league}:${r.playerId}:${r.rank ?? 1}`;
}

function sameTitleSlot(
  a: TitleWinRecord,
  b: Pick<TitleWinRecord, "titleId" | "year" | "world" | "league" | "rank">,
): boolean {
  return (
    a.titleId === b.titleId &&
    a.year === b.year &&
    normalizeSeasonWorld(a.world) === normalizeSeasonWorld(b.world) &&
    a.league === b.league &&
    (a.rank ?? 1) === (b.rank ?? 1)
  );
}

function normalizeRecord(r: TitleWinRecord): TitleWinSyncRecord {
  const world = normalizeSeasonWorld(r.world);
  const withWorld = { ...r, world, rank: r.rank ?? 1 };
  return {
    ...withWorld,
    id: r.id || recordKey(withWorld),
    updatedAt: r.updatedAt || new Date(0).toISOString(),
  };
}

/** localStorage のみ（SEED は含めない）。書き込み・クラウド hydrate 用 */
function readRawTitleWinHistory(): TitleWinSyncRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TitleWinRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord);
  } catch {
    return [];
  }
}

function writeRawTitleWinHistory(list: TitleWinSyncRecord[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** SEED + localStorage（表示用）。純 SEED 行はクラウドへ上げない */
export function listTitleWinHistory(): TitleWinRecord[] {
  const map = new Map(
    SEED_HISTORY.map((r) => {
      const n = normalizeRecord(r);
      return [n.id, n] as const;
    }),
  );
  for (const r of readRawTitleWinHistory()) {
    map.set(r.id, r);
  }
  return [...map.values()];
}

export function listTitleWinsForSeason(
  identity: SeasonIdentity,
): TitleWinRecord[] {
  return listTitleWinHistory().filter((r) => matchSeason(r, identity));
}

/** その年の順位を履歴へ反映（WORLD × 年度・リーグ・タイトル・順位で1件） */
export function upsertTitleWinner(record: TitleWinRecord): void {
  const now = new Date().toISOString();
  const world = normalizeSeasonWorld(record.world);
  const next = normalizeRecord({
    ...record,
    world,
    rank: record.rank ?? 1,
    updatedAt: now,
  });
  const list = readRawTitleWinHistory().filter((r) => !sameTitleSlot(r, next));
  list.push(next);
  writeRawTitleWinHistory(list);
  void putMuseumCollectionRecord(COLLECTION, next);
}

/**
 * 同一タイトル・年度・リーグ・WORLD の順位を merge 登録。
 * 渡された rank だけ更新し、未入力の他順位は残す（全面置換しない）。
 */
export function upsertTitleBoard(entries: TitleWinRecord[]): void {
  if (entries.length === 0) return;
  const now = new Date().toISOString();
  let list = readRawTitleWinHistory();
  const pushed: TitleWinSyncRecord[] = [];
  for (const e of entries) {
    if (!e.playerId) continue;
    const world = normalizeSeasonWorld(e.world);
    const next = normalizeRecord({
      ...e,
      world,
      rank: e.rank ?? 1,
      updatedAt: now,
    });
    list = list.filter((r) => !sameTitleSlot(r, next));
    list.push(next);
    pushed.push(next);
  }
  writeRawTitleWinHistory(list);
  for (const rec of pushed) {
    void putMuseumCollectionRecord(COLLECTION, rec);
  }
}

export async function hydrateTitleWinHistoryFromCloud(): Promise<
  TitleWinRecord[]
> {
  if (!canUseStorage()) return listTitleWinHistory();
  await hydrateLocalArrayFromCloud({
    collection: COLLECTION,
    readRaw: readRawTitleWinHistory,
    writeRaw: writeRawTitleWinHistory,
    normalize: normalizeRecord,
  });
  return listTitleWinHistory();
}

export function getTitleHistoryLabel(
  titleId: string,
  league: LeagueSide,
  playerId: string,
  currentYear: number,
  world?: SeasonWorld | null,
): string {
  const w = normalizeSeasonWorld(world);
  const years = listTitleWinHistory()
    .filter(
      (r) =>
        r.titleId === titleId &&
        r.league === league &&
        r.playerId === playerId &&
        (r.rank ?? 1) === 1 &&
        r.year <= currentYear &&
        normalizeSeasonWorld(r.world) === w,
    )
    .map((r) => r.year);
  // 当年1位を含めて判定
  if (!years.includes(currentYear)) years.push(currentYear);
  return formatSeasonAwardHistory(years, currentYear);
}
