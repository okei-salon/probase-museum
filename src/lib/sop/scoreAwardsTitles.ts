import {
  ANNUAL_AWARD_POINTS,
  TITLE_RANK_POINTS,
  titleRankLabel,
  type AnnualAwardKind,
} from "./rules";
import type { SopAwardInput, SopTitlePlacement } from "./input";
import type { SopLineItem } from "./types";

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

export function scoreAwards(awards: SopAwardInput[]): SopLineItem[] {
  const items: SopLineItem[] = [];
  for (const a of awards) {
    const unit = ANNUAL_AWARD_POINTS[a.kind];
    const count = a.kind === "monthlyMvp" ? Math.max(1, a.count ?? 1) : 1;
    const points = unit * count;
    const baseLabel = a.label ?? AWARD_LABELS[a.kind];
    const label =
      a.kind === "monthlyMvp" && count > 1
        ? `${baseLabel} ${count}回`
        : baseLabel;
    items.push({
      id: `award:${a.kind}${a.kind === "monthlyMvp" ? `:${count}` : ""}`,
      category: "annual_awards",
      label,
      points,
      detail: a.kind === "monthlyMvp" ? `${unit}点×${count}回` : undefined,
    });
  }
  return items;
}

export function scoreTitles(titles: SopTitlePlacement[]): SopLineItem[] {
  return titles.map((t) => ({
    id: `title:${t.titleId}:${t.rank}`,
    category: "titles" as const,
    label: titleRankLabel(t.titleLabel, t.rank),
    points: TITLE_RANK_POINTS[t.rank],
  }));
}
