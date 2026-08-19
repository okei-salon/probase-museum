import type { ImportDraft, ImportScreenType } from "@/data/import/types";
import type { FieldOcrDebug } from "@/lib/import/layouts/types";
import type { ImportPipelineDebug } from "@/lib/import/pipelineDebug";
import { processMonthlyMvpByTemplate } from "@/lib/import/processMonthlyMvpTemplate";

export type ProcessImageResult = {
  screenType: ImportScreenType;
  rawText: string;
  ocrConfidence: number;
  draft: ImportDraft;
  unsupported: boolean;
  message?: string;
  processedPreviewUrl?: string;
  debug: ImportPipelineDebug;
  fieldDebug?: FieldOcrDebug[];
};

/**
 * 取込エントリ。
 * 月間MVPは「正規化＋固定レイアウト項目別OCR」を主処理とする。
 * 画面全体OCRパースは使わない。
 */
export async function processImportImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ProcessImageResult> {
  const result = await processMonthlyMvpByTemplate(file, onProgress);
  return {
    screenType: "monthly_mvp",
    rawText: result.draft.rawText,
    ocrConfidence:
      result.fieldDebug && result.fieldDebug.length
        ? result.fieldDebug.reduce((s, f) => s + f.confidence, 0) /
          result.fieldDebug.length
        : 0,
    draft: result.draft,
    unsupported: false,
    message: result.message,
    processedPreviewUrl: result.normalizedPreviewUrl || undefined,
    debug: result.debug,
    fieldDebug: result.fieldDebug,
  };
}
