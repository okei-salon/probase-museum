/** 画面別固定レイアウト（正規化キャンバス上の相対座標） */

export type NormRect = {
  /** 0〜1。正規化キャンバス左上基準 */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FieldOcrMode =
  | "digits"
  | "digits_decimal"
  | "year"
  | "month"
  | "japanese_name"
  | "japanese_team"
  | "label";

export type LayoutFieldDef = {
  id: string;
  label: string;
  rect: NormRect;
  mode: FieldOcrMode;
  /** 切り出し後の追加拡大倍率 */
  scale?: number;
};

export type ScreenLayoutTemplate = {
  id: string;
  screenType: string;
  label: string;
  /** 正規化キャンバス基準サイズ */
  canvasWidth: number;
  canvasHeight: number;
  fields: LayoutFieldDef[];
};

export type FieldOcrDebug = {
  fieldId: string;
  label: string;
  /** 切り出しプレビュー object URL */
  cropPreviewUrl: string;
  rawText: string;
  correctedText: string;
  correctedValue: string | number | null;
  /** 最終採用値（確認フォームへ渡す値） */
  finalValue: string | number | null;
  confidence: number;
  candidates: Array<{ label: string; score: number }>;
  mode: FieldOcrMode;
  preprocess?: string;
};
