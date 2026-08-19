/**
 * 選手の主要タイトル／表彰サマリー（既存レジストリ・タイトル履歴から）
 * Step14: BLUE / RED 同一年の受賞は別カウント（SeasonIdentity 単位）。
 */

import { listRegisteredAwards } from "@/data/sop/awardsRegistry";
import {
  BATTER_TITLES,
  PITCHER_TITLES,
  listTitleWinHistory,
} from "@/data/titleRankings";
import type { AnnualAwardKind } from "@/lib/sop/rules";
import {
  formatSeasonLineLabel,
  identityFromWorldYear,
  type SeasonWorld,
} from "@/data/seasons";

export type AwardSummaryItem = {
  key: string;
  label: string;
  count: number;
  years: number[];
  /** 表示例: MVP　2回（2026 BLUE・2026 RED） */
  display: string;
};

const AWARD_LABELS: Record<AnnualAwardKind, string> = {
  mvp: "MVP",
  sawamura: "沢村賞",
  rookie: "新人王",
  japanSeriesMvp: "日本シリーズMVP",
  bestNine: "ベストナイン",
  goldenGlove: "ゴールデングラブ",
  monthlyMvp: "月間MVP",
  interleagueMvp: "交流戦MVP",
};

function titleKingLabel(titleId: string, baseLabel: string): string {
  if (titleId === "era") return "最優秀防御率";
  if (titleId === "w") return "最多勝";
  if (titleId === "so") return "最多奪三振";
  if (titleId === "h") return "最多安打";
  if (titleId === "sv") return "最多セーブ";
  if (titleId === "hp") return "最多HP";
  return `${baseLabel}王`;
}

type AwardWin = {
  year: number;
  world?: SeasonWorld | null;
};

function seasonKeyOf(w: AwardWin): string {
  return identityFromWorldYear(w.year, w.world).seasonKey;
}

function formatSummary(label: string, wins: AwardWin[]): AwardSummaryItem {
  const byKey = new Map<string, AwardWin>();
  for (const w of wins) {
    byKey.set(seasonKeyOf(w), w);
  }
  const uniq = [...byKey.values()].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.world ?? "").localeCompare(b.world ?? "");
  });
  const count = uniq.length;
  const years = uniq.map((w) => w.year);
  const labelText = uniq
    .map((w) => formatSeasonLineLabel(identityFromWorldYear(w.year, w.world)))
    .join("・");
  if (count === 1) {
    return {
      key: label,
      label,
      count,
      years,
      display: `${label}　${labelText}`,
    };
  }
  return {
    key: label,
    label,
    count,
    years,
    display: `${label}　${count}回（${labelText}）`,
  };
}

/** プロフィール用：主要タイトル／表彰の集計（正式登録のみ） */
export function buildPlayerAwardSummary(
  playerId: string,
): AwardSummaryItem[] {
  const buckets = new Map<string, AwardWin[]>();

  const push = (
    label: string,
    year: number,
    world?: SeasonWorld | null,
  ) => {
    const list = buckets.get(label) ?? [];
    list.push({ year, world: world ?? null });
    buckets.set(label, list);
  };

  for (const a of listRegisteredAwards()) {
    if (a.playerId !== playerId) continue;
    if (a.kind === "monthlyMvp") {
      push(AWARD_LABELS.monthlyMvp, a.year, a.world);
      continue;
    }
    push(AWARD_LABELS[a.kind], a.year, a.world);
  }

  const titleDefs = [...BATTER_TITLES, ...PITCHER_TITLES];
  for (const t of listTitleWinHistory()) {
    if (t.playerId !== playerId) continue;
    const def = titleDefs.find((d) => d.id === t.titleId);
    const label = titleKingLabel(t.titleId, def?.label ?? t.titleId);
    push(label, t.year, t.world);
  }

  const items: AwardSummaryItem[] = [];
  for (const [label, wins] of buckets) {
    if (label === "月間MVP") {
      const count = wins.length;
      const uniqYears = [...new Set(wins.map((w) => w.year))].sort(
        (a, b) => a - b,
      );
      items.push({
        key: label,
        label,
        count,
        years: uniqYears,
        display: `${label}　${count}回`,
      });
      continue;
    }
    items.push(formatSummary(label, wins));
  }

  const order = [
    "MVP",
    "沢村賞",
    "新人王",
    "日本シリーズMVP",
    "打率王",
    "本塁打王",
    "打点王",
    "盗塁王",
    "最多安打",
    "最優秀防御率",
    "最多勝",
    "最多奪三振",
    "ベストナイン",
    "ゴールデングラブ",
    "月間MVP",
    "交流戦MVP",
  ];
  items.sort((a, b) => {
    const ia = order.indexOf(a.label);
    const ib = order.indexOf(b.label);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return b.count - a.count;
  });

  return items;
}
