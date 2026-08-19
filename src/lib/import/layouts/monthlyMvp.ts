import type { ScreenLayoutTemplate } from "@/lib/import/layouts/types";

/**
 * プロスピ2026 月間MVP画面テンプレート。
 * 座標は正規化後キャンバス (1920×1080) に対する相対値。
 *
 * 実写基準: IMG_8861（縦表レイアウト）
 * - 左端: 月ラベル列（4〜9月）
 * - 左半分: 投手部門（氏名バー + 球団ロゴ + 防御率/勝/敗）
 * - 右半分: 野手部門（氏名バー + 球団ロゴ + 打率/本/点/盗）
 * - 上部左: 年度
 *
 * ※球団は文字ではなく球団ロゴが表示されるため、
 *   pitcher_team / batter_team はロゴ領域を切り出す。
 */
export const MONTHLY_MVP_CANVAS_W = 1920;
export const MONTHLY_MVP_CANVAS_H = 1080;

export const MonthlyMvpLayoutTemplate: ScreenLayoutTemplate = {
  id: "monthly_mvp_v2_table",
  screenType: "monthly_mvp",
  label: "月間MVP（月別表）",
  canvasWidth: MONTHLY_MVP_CANVAS_W,
  canvasHeight: MONTHLY_MVP_CANVAS_H,
  fields: [
    {
      id: "year",
      label: "年度",
      rect: { x: 0.06, y: 0.035, w: 0.2, h: 0.085 },
      mode: "year",
      scale: 2.4,
    },
    {
      id: "month",
      label: "月",
      rect: { x: 0.005, y: 0.245, w: 0.075, h: 0.09 },
      mode: "month",
      scale: 2.6,
    },
    {
      id: "pitcher_name",
      label: "投手名",
      rect: { x: 0.075, y: 0.23, w: 0.155, h: 0.055 },
      mode: "japanese_name",
      scale: 2.8,
    },
    {
      id: "pitcher_team",
      label: "投手球団",
      rect: { x: 0.225, y: 0.228, w: 0.065, h: 0.06 },
      mode: "japanese_team",
      scale: 2.8,
    },
    {
      id: "pitcher_era",
      label: "防御率",
      rect: { x: 0.155, y: 0.285, w: 0.085, h: 0.055 },
      mode: "digits_decimal",
      scale: 3.0,
    },
    {
      id: "pitcher_wins",
      label: "勝",
      rect: { x: 0.235, y: 0.285, w: 0.065, h: 0.055 },
      mode: "digits",
      scale: 3.0,
    },
    {
      id: "pitcher_losses",
      label: "敗",
      rect: { x: 0.295, y: 0.285, w: 0.065, h: 0.055 },
      mode: "digits",
      scale: 3.0,
    },
    {
      id: "batter_name",
      label: "野手名",
      rect: { x: 0.505, y: 0.2, w: 0.175, h: 0.055 },
      mode: "japanese_name",
      scale: 2.8,
    },
    {
      id: "batter_team",
      label: "野手球団",
      rect: { x: 0.675, y: 0.198, w: 0.065, h: 0.06 },
      mode: "japanese_team",
      scale: 2.8,
    },
    {
      id: "batter_avg",
      label: "打率",
      rect: { x: 0.62, y: 0.25, w: 0.095, h: 0.055 },
      mode: "digits_decimal",
      scale: 3.0,
    },
    {
      id: "batter_hr",
      label: "本塁打",
      rect: { x: 0.715, y: 0.24, w: 0.09, h: 0.055 },
      mode: "digits",
      scale: 3.0,
    },
    {
      id: "batter_rbi",
      label: "打点",
      rect: { x: 0.805, y: 0.233, w: 0.09, h: 0.055 },
      mode: "digits",
      scale: 3.0,
    },
    {
      id: "batter_sb",
      label: "盗塁",
      rect: { x: 0.9, y: 0.226, w: 0.085, h: 0.055 },
      mode: "digits",
      scale: 3.0,
    },
  ],
};

export const layoutTemplates = {
  monthly_mvp: MonthlyMvpLayoutTemplate,
} as const;
