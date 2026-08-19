/** 取込パイプラインの段階別デバッグ（実写写真の失敗切り分け用） */

export type PipelineStageStatus = "ok" | "warn" | "fail" | "skip";

export type PipelineStageId =
  | "load_image"
  | "detect_tv"
  | "deskew"
  | "detect_table"
  | "ocr"
  | "ocr_text"
  | "keyword_check"
  | "parse_monthly_mvp"
  | "player_match";

export type PipelineStageLog = {
  id: PipelineStageId;
  label: string;
  status: PipelineStageStatus;
  detail: string;
  /** 補足データ（切り出し寸法・生テキスト抜粋など） */
  data?: Record<string, string | number | boolean | null>;
};

export type FieldCoverage = {
  key: string;
  label: string;
  got: boolean;
  value: string;
};

export type ImportPipelineDebug = {
  stages: PipelineStageLog[];
  /** OCRで拾えたキーワード */
  keywordsFound: string[];
  keywordsMissing: string[];
  /** パーサー後の項目カバレッジ */
  fieldsGot: FieldCoverage[];
  fieldsMissing: FieldCoverage[];
  /** 採用したOCRバリアント */
  bestVariantId: string;
  /** OCR生テキスト（全文） */
  rawText: string;
  /** 失敗とみなす最初の段階（なければ null） */
  firstFailureId: PipelineStageId | null;
};

export function emptyPipelineDebug(): ImportPipelineDebug {
  return {
    stages: [],
    keywordsFound: [],
    keywordsMissing: [],
    fieldsGot: [],
    fieldsMissing: [],
    bestVariantId: "",
    rawText: "",
    firstFailureId: null,
  };
}

export function summarizeFirstFailure(
  debug: ImportPipelineDebug,
): string | null {
  const fail = debug.stages.find((s) => s.status === "fail");
  if (fail) return `${fail.label}: ${fail.detail}`;
  const warn = debug.stages.find((s) => s.status === "warn");
  if (warn && debug.fieldsMissing.length > 0) {
    return `${warn.label}: ${warn.detail}`;
  }
  return null;
}

const MONTHLY_KEYWORDS = [
  "2026",
  "4月",
  "月間",
  "MVP",
  "投手",
  "野手",
  "村上",
  "佐藤",
  "阪神",
  "防御率",
  "打率",
] as const;

export function checkMonthlyKeywords(text: string): {
  found: string[];
  missing: string[];
} {
  const compact = text.replace(/\s+/g, "");
  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of MONTHLY_KEYWORDS) {
    if (compact.includes(kw) || text.includes(kw)) found.push(kw);
    else missing.push(kw);
  }
  // 4月は「4 月」でもOK
  if (!found.includes("4月") && /[4４]\s*月/.test(text)) {
    found.push("4月");
    const i = missing.indexOf("4月");
    if (i >= 0) missing.splice(i, 1);
  }
  return { found, missing };
}
