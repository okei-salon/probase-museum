/**
 * 正式な年間表彰レジストリ（playerId 付き）。
 * 既存の awards.ts ハードコードは削除せず、こちらが優先される。
 *
 * Step9: 正式 WORLD のみ world を付与。レガシー／DEMO の既存 ID は再生成しない。
 */

import type { AnnualAwardKind } from "@/lib/sop/rules";
import { excludeDemoRecords } from "@/data/import/demoStore";
import {
  matchSeason,
  normalizeSeasonWorld,
  type SeasonIdentity,
  type SeasonWorld,
} from "@/data/seasons";

const STORAGE_KEY = "probase-museum.sop-awards-registry.v1";

export type RegisteredSeasonAward = {
  id: string;
  year: number;
  /** 正式 WORLD。既存・DEMO は null / 未設定 */
  world?: SeasonWorld | null;
  kind: AnnualAwardKind;
  playerId: string;
  playerName: string;
  teamShort?: string;
  league?: "central" | "pacific";
  /** 月間MVPの月など */
  month?: number;
  count?: number;
  /** ベストナイン／ゴールデングラブの守備位置 */
  position?: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeAward(a: RegisteredSeasonAward): RegisteredSeasonAward {
  return {
    ...a,
    world: normalizeSeasonWorld(a.world),
  };
}

/**
 * 正式 WORLD 用 ID（BLUE / RED が衝突しない）。
 * レガシーは呼び出し側の既存 ID を維持する。
 *
 * 例:
 * - BLUE:mvp:2026:central
 * - RED:sawamura:2026
 * - BLUE:bestNine:2026:pacific:投手:playerId
 */
export function registeredAwardId(params: {
  kind: AnnualAwardKind;
  year: number;
  world?: SeasonWorld | null;
  league?: "central" | "pacific";
  position?: string;
  playerId?: string;
}): string {
  const w = normalizeSeasonWorld(params.world);
  const pid = params.playerId ?? "unknown";
  if (w) {
    if (
      params.kind === "sawamura" ||
      params.kind === "japanSeriesMvp" ||
      params.kind === "interleagueMvp"
    ) {
      return `${w}:${params.kind}:${params.year}`;
    }
    if (params.kind === "bestNine" || params.kind === "goldenGlove") {
      return `${w}:${params.kind}:${params.year}:${params.league}:${params.position ?? ""}:${pid}`;
    }
    return `${w}:${params.kind}:${params.year}:${params.league}`;
  }

  // レガシー形式（既存）
  if (
    params.kind === "sawamura" ||
    params.kind === "japanSeriesMvp" ||
    params.kind === "interleagueMvp"
  ) {
    return `${params.kind}:${params.year}:${pid}`;
  }
  if (params.kind === "bestNine" || params.kind === "goldenGlove") {
    return `${params.kind}:${params.year}:${params.league}:${params.position ?? ""}:${pid}`;
  }
  return `${params.kind}:${params.year}:${params.league}:${pid}`;
}

/** MVP / 新人王 / 沢村 / 日本シリーズMVP / 交流戦MVPの同一スロット判定 */
export function sameMajorAwardSlot(
  a: RegisteredSeasonAward,
  b: Pick<RegisteredSeasonAward, "year" | "world" | "kind" | "league">,
): boolean {
  if (a.kind !== b.kind) return false;
  if (
    !(
      a.kind === "mvp" ||
      a.kind === "rookie" ||
      a.kind === "sawamura" ||
      a.kind === "japanSeriesMvp" ||
      a.kind === "interleagueMvp"
    )
  ) {
    return false;
  }
  if (a.year !== b.year) return false;
  if (normalizeSeasonWorld(a.world) !== normalizeSeasonWorld(b.world)) {
    return false;
  }
  if (
    a.kind === "sawamura" ||
    a.kind === "japanSeriesMvp" ||
    a.kind === "interleagueMvp"
  ) {
    return true;
  }
  return a.league === b.league;
}

export function listRegisteredAwards(): RegisteredSeasonAward[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisteredSeasonAward[];
    return excludeDemoRecords(
      Array.isArray(parsed) ? parsed.map(normalizeAward) : [],
    );
  } catch {
    return [];
  }
}

export function listRegisteredAwardsForYear(
  year: number,
): RegisteredSeasonAward[] {
  return listRegisteredAwards().filter((a) => a.year === year);
}

/** シーズン画面用: world + year で厳密フィルタ */
export function listRegisteredAwardsForSeason(
  identity: SeasonIdentity,
): RegisteredSeasonAward[] {
  return listRegisteredAwards().filter((a) => matchSeason(a, identity));
}

export function upsertRegisteredAward(
  award: RegisteredSeasonAward,
): RegisteredSeasonAward {
  const world = normalizeSeasonWorld(award.world);
  const id =
    award.id ||
    registeredAwardId({
      kind: award.kind,
      year: award.year,
      world,
      league: award.league,
      position: award.position,
      playerId: award.playerId,
    });
  const next: RegisteredSeasonAward = { ...award, id, world };

  let list = listRegisteredAwards();
  if (
    next.kind === "mvp" ||
    next.kind === "rookie" ||
    next.kind === "sawamura" ||
    next.kind === "japanSeriesMvp" ||
    next.kind === "interleagueMvp"
  ) {
    list = list.filter((a) => !sameMajorAwardSlot(a, next));
  } else {
    list = list.filter((a) => a.id !== id);
  }
  list.push(next);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return next;
}

/**
 * 同一 WORLD・年・種別・リーグの B9/GG をポジション単位で merge。
 * 渡された position だけ更新し、未入力の他ポジションは残す。
 */
export function replaceRegisteredAwardsForLeague(params: {
  year: number;
  world?: SeasonWorld | null;
  kind: "bestNine" | "goldenGlove";
  league: "central" | "pacific";
  awards: Omit<RegisteredSeasonAward, "id" | "kind" | "year" | "league">[];
}): RegisteredSeasonAward[] {
  const world = normalizeSeasonWorld(params.world);
  const incomingPositions = new Set(
    params.awards.map((a) => a.position ?? ""),
  );
  // 今回明示されたポジションだけ外し、他ポジションは保持
  const kept = listRegisteredAwards().filter((a) => {
    if (a.year !== params.year) return true;
    if (normalizeSeasonWorld(a.world) !== world) return true;
    if (a.kind !== params.kind) return true;
    if (a.league !== params.league) return true;
    return !incomingPositions.has(a.position ?? "");
  });
  const inserted: RegisteredSeasonAward[] = params.awards.map((award, i) => {
    const pos = award.position ?? "";
    const id = world
      ? registeredAwardId({
          kind: params.kind,
          year: params.year,
          world,
          league: params.league,
          position: pos,
          playerId: award.playerId,
        })
      : `${params.kind}:${params.year}:${params.league}:${pos}:${award.playerId}:${i}`;
    return {
      ...award,
      id,
      year: params.year,
      world,
      kind: params.kind,
      league: params.league,
      position: pos || award.position,
    };
  });
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...kept, ...inserted]),
  );
  return inserted;
}
