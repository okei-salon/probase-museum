import type { SopPlayerYearInput } from "./input";
import { scoreAwards, scoreTitles } from "./scoreAwardsTitles";
import { scoreBatterSeason } from "./scoreBatter";
import { scorePitcherSeason } from "./scorePitcher";
import { scoreTwoWaySop } from "./scoreTwoWay";
import type { SopCareerTotal, SopRankEntry, SopSeasonResult } from "./types";

/**
 * 1選手・1年度の SOP を計算する。
 * データ不足の項目は加点しない（推測しない）。
 */
export function computeSeasonSop(input: SopPlayerYearInput): SopSeasonResult {
  const awardItems = scoreAwards(input.awards);
  const titleItems = scoreTitles(input.titles);

  const scored =
    input.role === "batter"
      ? scoreBatterSeason(input.batter, input.feats, input.priorYear)
      : scorePitcherSeason(input.pitcher, input.feats, input.priorYear);

  const twoWayItems =
    input.applyTwoWay === true
      ? scoreTwoWaySop(input.batter, input.pitcher)
      : [];

  const items = [...awardItems, ...titleItems, ...scored.items, ...twoWayItems];
  const total = items.reduce((sum, it) => sum + it.points, 0);

  return {
    playerId: input.playerId,
    playerName: input.playerName,
    year: input.year,
    world: input.world ?? null,
    role: input.role,
    teamId: input.teamId,
    teamShort: input.teamShort,
    league: input.league,
    total,
    items,
    achievementIds: {
      basicIds: scored.basicIds,
      comboIds: scored.comboIds,
    },
    meta:
      input.role === "pitcher" && input.pitcher
        ? {
            pitcherClass: input.pitcher.pitcherClass,
            startRate: input.pitcher.startRate,
          }
        : undefined,
  };
}

/**
 * 同点は同順位（denseではなくcompetition風: 1,1,3）。
 * rank フィールドは「表示順位」、同点は同じ数字。
 */
export function rankSopResults(results: SopSeasonResult[]): SopRankEntry[] {
  const sorted = [...results].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.playerName.localeCompare(b.playerName, "ja");
  });

  const out: SopRankEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.total;
    let j = i;
    while (j < sorted.length && sorted[j]!.total === score) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      out.push({ rank, result: sorted[k]! });
    }
    i = j;
  }
  return out;
}

/** 年度別 SOP から通算を合算（playerId キー） */
export function aggregateCareerSop(
  seasons: SopSeasonResult[],
): SopCareerTotal[] {
  const map = new Map<string, SopCareerTotal>();
  /** 同一選手・同一年度の二刀流は野手/投手の双方結果に載るため、通算では1回だけ加算 */
  const twoWayCounted = new Set<string>();

  for (const s of seasons) {
    const cur = map.get(s.playerId) ?? {
      playerId: s.playerId,
      playerName: s.playerName,
      total: 0,
      byYear: [],
    };
    cur.playerName = s.playerName;

    const twoWayPts = s.items
      .filter((it) => it.category === "two_way")
      .reduce((sum, it) => sum + it.points, 0);
    const basePts = s.total - twoWayPts;
    let countedTwoWay = 0;
    if (twoWayPts > 0) {
      // WORLD + YEAR で二刀流二重計上を防ぐ（同一年 BLUE/RED は別シーズン）
      const key = `${s.playerId}:${s.world ?? ""}:${s.year}`;
      if (!twoWayCounted.has(key)) {
        twoWayCounted.add(key);
        countedTwoWay = twoWayPts;
      }
    }
    cur.total += basePts + countedTwoWay;
    cur.byYear.push({
      year: s.year,
      world: s.world ?? null,
      role: s.role,
      total: s.total,
    });
    map.set(s.playerId, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** 内訳をカテゴリ別にまとめる */
export function groupSopItemsByCategory(result: SopSeasonResult) {
  const groups = new Map<string, typeof result.items>();
  for (const item of result.items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return groups;
}
