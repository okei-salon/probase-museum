/**
 * SOP評価基準の表示用カタログ（rules.ts / npbRecords.ts と同一内容）
 * 点数の追加・変更はしない。
 */

import {
  ANNUAL_AWARD_POINTS,
  BATTER_BASIC,
  BATTER_COMBOS,
  BATTER_FEATS,
  BATTER_HISTORIC,
  CONSECUTIVE_YEAR_BONUS,
  HR_SB_COMBO_TIERS,
  HR_SB_MIN_EACH,
  INTERLEAGUE_SOP_RANK_POINTS,
  INTERLEAGUE_SOP_TITLES,
  PITCHER_BASIC,
  PITCHER_COMBOS,
  PITCHER_FEATS,
  PITCHER_HISTORIC,
  TITLE_RANK_POINTS,
  TWO_WAY_BATTER_TIERS,
  TWO_WAY_PITCHER_TIERS,
} from "@/lib/sop/rules";
import { NPB_RECORD_BONUS_POINTS } from "@/lib/sop/npbRecords";

export type SopRuleRow = {
  label: string;
  pointsText: string;
};

export type SopRuleSection = {
  id: string;
  title: string;
  rows: SopRuleRow[];
};

function tierLines(
  name: string,
  tiers: readonly { min: number; points: number }[],
  unit: string,
): SopRuleRow[] {
  return tiers.map((t) => ({
    label: `${name} ${t.min}${unit}以上`,
    pointsText: `${t.points}点`,
  }));
}

export function buildSopRulesCatalog(): SopRuleSection[] {
  return [
    {
      id: "awards",
      title: "年間表彰",
      rows: [
        { label: "MVP", pointsText: `${ANNUAL_AWARD_POINTS.mvp}点` },
        { label: "沢村賞", pointsText: `${ANNUAL_AWARD_POINTS.sawamura}点` },
        { label: "新人王", pointsText: `${ANNUAL_AWARD_POINTS.rookie}点` },
        {
          label: "日本シリーズMVP",
          pointsText: `${ANNUAL_AWARD_POINTS.japanSeriesMvp}点`,
        },
        {
          label: "ベストナイン",
          pointsText: `${ANNUAL_AWARD_POINTS.bestNine}点`,
        },
        {
          label: "ゴールデングラブ",
          pointsText: `${ANNUAL_AWARD_POINTS.goldenGlove}点`,
        },
        {
          label: "月間MVP（1回あたり）",
          pointsText: `${ANNUAL_AWARD_POINTS.monthlyMvp}点`,
        },
        {
          label: "交流戦MVP",
          pointsText: `${ANNUAL_AWARD_POINTS.interleagueMvp}点`,
        },
      ],
    },
    {
      id: "titles",
      title: "個人タイトル（順位）",
      rows: (
        [1, 2, 3, 4, 5] as const
      ).map((rank) => ({
        label: `${rank}位`,
        pointsText: `${TITLE_RANK_POINTS[rank]}点`,
      })),
    },
    {
      id: "interleague_sop",
      title: "交流戦SOP（10部門）",
      rows: [
        {
          label: INTERLEAGUE_SOP_TITLES.map((t) => t.label).join("・"),
          pointsText: "対象",
        },
        ...([1, 2, 3, 4, 5] as const).map((rank) => ({
          label: `${rank}位`,
          pointsText: `${INTERLEAGUE_SOP_RANK_POINTS[rank]}点`,
        })),
        {
          label: "最終SOP",
          pointsText: "通常部分SOP ＋ 交流戦SOP",
        },
      ],
    },
    {
      id: "batter-basic",
      title: "野手・シーズン達成",
      rows: Object.values(BATTER_BASIC).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "hr-sb",
      title: `野手・本塁打×盗塁（各${HR_SB_MIN_EACH}以上・最高到達のみ）`,
      rows: HR_SB_COMBO_TIERS.map((t) => ({
        label: `合計${t.minSum}以上`,
        pointsText: `${t.points}点`,
      })),
    },
    {
      id: "batter-combo",
      title: "野手・複合達成",
      rows: Object.values(BATTER_COMBOS).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "batter-historic",
      title: "野手・大記録",
      rows: Object.values(BATTER_HISTORIC).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "batter-feats",
      title: "野手・特殊／連続記録（最高到達のみ）",
      rows: [
        {
          label: BATTER_FEATS.cycle.label,
          pointsText: `${BATTER_FEATS.cycle.points}点`,
        },
        ...tierLines("連続試合安打", BATTER_FEATS.hitStreak, "試合"),
        ...tierLines("連続試合出塁", BATTER_FEATS.onBaseStreak, "試合"),
        ...tierLines("連続試合本塁打", BATTER_FEATS.hrStreak, "試合"),
      ],
    },
    {
      id: "pitcher-basic",
      title: "投手・シーズン達成",
      rows: Object.values(PITCHER_BASIC).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "pitcher-combo",
      title: "投手・複合達成",
      rows: Object.values(PITCHER_COMBOS).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "pitcher-historic",
      title: "投手・大記録",
      rows: Object.values(PITCHER_HISTORIC).map((v) => ({
        label: v.label,
        pointsText: `${v.points}点`,
      })),
    },
    {
      id: "pitcher-feats",
      title: "投手・特殊／連続記録（最高到達のみ）",
      rows: [
        {
          label: PITCHER_FEATS.perfectGame.label,
          pointsText: `${PITCHER_FEATS.perfectGame.points}点`,
        },
        {
          label: PITCHER_FEATS.noHitter.label,
          pointsText: `${PITCHER_FEATS.noHitter.points}点`,
        },
        {
          label: PITCHER_FEATS.undefeated10.label,
          pointsText: `${PITCHER_FEATS.undefeated10.points}点`,
        },
        ...tierLines("連続無失点イニング", PITCHER_FEATS.scorelessIp, "回"),
        ...tierLines("1試合奪三振", PITCHER_FEATS.gameSo, "奪三振"),
        ...tierLines("連勝", PITCHER_FEATS.winStreak, "連勝"),
      ],
    },
    {
      id: "consecutive",
      title: "連続年ボーナス",
      rows: [
        {
          label: "基本達成の連続年",
          pointsText: `${CONSECUTIVE_YEAR_BONUS.basic}点`,
        },
        {
          label: "複合達成の連続年",
          pointsText: `${CONSECUTIVE_YEAR_BONUS.combo}点`,
        },
      ],
    },
    {
      id: "npb",
      title: "NPB史実記録ボーナス",
      rows: [
        {
          label: "歴代シーズン記録への到達または更新（カテゴリ1回）",
          pointsText: `+${NPB_RECORD_BONUS_POINTS}点`,
        },
      ],
    },
    {
      id: "two-way",
      title: "二刀流SOP（野手側・投手側とも1点以上で成立／各項目は最高到達のみ／最大60点）",
      rows: [
        ...Object.values(TWO_WAY_BATTER_TIERS).flatMap((tiers) =>
          tiers.map((t) => ({
            label: `野手・${t.label}`,
            pointsText: `${t.points}点`,
          })),
        ),
        ...Object.values(TWO_WAY_PITCHER_TIERS).flatMap((tiers) =>
          tiers.map((t) => ({
            label: `投手・${t.label}`,
            pointsText: `${t.points}点`,
          })),
        ),
      ],
    },
  ];
}
