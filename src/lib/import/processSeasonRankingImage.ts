import type { SeasonBatchRole } from "@/data/import/seasonBatchTypes";
import {
  processSeasonRankingByTable,
  type SeasonRankingTableResult,
} from "@/lib/import/processSeasonRankingTable";

export type ProcessSeasonRankingResult = SeasonRankingTableResult;

/**
 * 年度個人成績ランキング画面の画像をOCRする。
 *
 * 方針: 画像全体OCRからの表再構築は使わない。
 * 「表検出 → 10行分割 → 列固定セル分割 → セル単位OCR」のみ。
 */
export async function processSeasonRankingImage(
  file: File,
  role: SeasonBatchRole,
  year: number,
  onProgress?: (pct: number) => void,
): Promise<ProcessSeasonRankingResult> {
  try {
    const table = await processSeasonRankingByTable(
      file,
      role,
      year,
      onProgress,
    );
    const rows = table.rows.slice(0, 10);
    while (rows.length < 10) {
      const ri = rows.length;
      rows.push({
        rowIndex: ri,
        playerName: `${ri + 1}位：要確認`,
        ocrName: "",
        teamShort: "",
        nameStatus: "needs_confirm",
        teamStatus: "needs_confirm",
        nameCandidates: [],
        fields: {},
      });
    }
    return {
      ...table,
      rows,
      rowCount: 10,
      message:
        table.message ??
        "表構造セルOCR: 10行×固定列で読み取りました（全体OCRは使用していません）",
    };
  } catch (e) {
    // 失敗時も構造は崩さず 10 行の要確認枠を返す（全体OCRで再構築しない）
    const rows = Array.from({ length: 10 }, (_, ri) => ({
      rowIndex: ri,
      playerName: `${ri + 1}位：要確認`,
      ocrName: "",
      teamShort: "",
      nameStatus: "needs_confirm" as const,
      teamStatus: "needs_confirm" as const,
      nameCandidates: [],
      fields: {},
    }));
    return {
      yearHint: year,
      headers: [],
      headerLabels: [],
      rows,
      rawText: "",
      confidence: 10,
      rowCount: 10,
      message:
        e instanceof Error
          ? `表検出に失敗したため空の10行を用意しました: ${e.message}`
          : "表検出に失敗したため空の10行を用意しました",
    };
  }
}
