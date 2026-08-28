"use client";

import type {
  SeasonBatchFieldKey,
  SeasonBatchParseResult,
  SeasonBatchPartialRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import {
  buildRankingTableGeometry,
  cellRect,
  headerCellRect,
} from "@/lib/import/detectRankingTable";
import { FieldOcrSession } from "@/lib/import/fieldOcr";
import {
  DEFAULT_BATTING_STAT_COLUMNS,
  fieldKind,
  matchHeaderLabel,
  SEASON_RANKING_CANVAS_H,
  SEASON_RANKING_CANVAS_W,
} from "@/lib/import/layouts/seasonBattingRanking";
import {
  canvasToPngBlob,
  cropNormalizedField,
  drawLayoutOverlay,
  normalizeGameScreen,
} from "@/lib/import/normalizeGameScreen";
import { parseStatToken } from "@/lib/import/parseSeasonRankingOcr";
import {
  applyBatterConsistency,
  sanitizeOcrStatCell,
} from "@/lib/import/rankingConsistency";
import { recognizeTeamLogo } from "@/lib/import/teamLogo";
import { correctJapaneseName } from "@/lib/import/correctField";
import { normalizeOcrText } from "@/lib/import/ocr";
import type { FieldOcrMode } from "@/lib/import/layouts/types";
import { resolveRankingPlayer } from "@/lib/import/resolveRankingPlayer";
import { DEMO_IMPORT_YEAR } from "@/data/import/demoMode";

export type SeasonRankingTableResult = SeasonBatchParseResult & {
  normalizedPreviewUrl?: string;
  overlayPreviewUrl?: string;
  rowCount: number;
  message?: string;
};

function modeForField(
  field: SeasonBatchFieldKey,
  role: SeasonBatchRole,
): FieldOcrMode {
  const kind = fieldKind(field, role === "catcher" ? "batter" : role);
  if (kind === "avg" || kind === "rate") return "digits_decimal";
  if (kind === "era") return "digits_decimal";
  if (kind === "ip") return "digits_decimal";
  return "digits";
}

function cleanPlayerName(raw: string): string {
  const c = correctJapaneseName(raw);
  const base = (c.value ?? c.text ?? raw)
    .replace(/\s+/g, "")
    .replace(/[０-９0-9]/g, "")
    .trim();
  return base;
}

function lockedFieldsForRole(role: SeasonBatchRole): SeasonBatchFieldKey[] {
  if (role === "pitcher") {
    return ["era", "g", "w", "l", "sv", "ip", "so"];
  }
  if (role === "catcher") {
    return ["csAttempted", "csAllowed", "csCaught", "csRate", "g"];
  }
  return [...DEFAULT_BATTING_STAT_COLUMNS];
}

function placeholderRow(ri: number): SeasonBatchPartialRow {
  return {
    rowIndex: ri,
    playerName: `${ri + 1}位：要確認`,
    ocrName: "",
    teamShort: "",
    nameStatus: "needs_confirm",
    teamStatus: "needs_confirm",
    nameCandidates: [],
    fields: {},
  };
}

/**
 * プロスピ個人成績ランキング画面を「表構造前提」でセル単位OCRする。
 * 必ず1〜10位の10行を生成する。列順はレイアウト固定（ヘッダーOCRで並べ替えない）。
 */
export async function processSeasonRankingByTable(
  file: File,
  role: SeasonBatchRole,
  year: number,
  onProgress?: (pct: number) => void,
): Promise<SeasonRankingTableResult> {
  onProgress?.(5);
  const normalized = await normalizeGameScreen(file, {
    width: SEASON_RANKING_CANVAS_W,
    height: SEASON_RANKING_CANVAS_H,
  });
  onProgress?.(15);

  // 列順は構造優先で固定。ヘッダーOCRは検証・ラベル用のみ
  const fields = lockedFieldsForRole(role);
  const geometry = buildRankingTableGeometry(normalized.canvas, fields);
  const session = new FieldOcrSession();

  try {
    onProgress?.(20);
    const headerLabels: string[] = [];
    for (let i = 0; i < geometry.columns.length; i += 1) {
      const col = geometry.columns[i]!;
      const expected = fields[i]!;
      const rect = headerCellRect(col, geometry.headerY0, geometry.headerY1);
      const crop = cropNormalizedField(normalized.canvas, rect, 2.4, {
        grayscale: false,
        contrast: 1.4,
      });
      const raw = await session.recognizeField(crop, "label", `header_${i}`);
      const text = normalizeOcrText(raw.text || "");
      headerLabels.push(text || String(expected));
      // ヘッダーは検証用。列フィールドは並べ替えない（位置＝フィールド）
      void matchHeaderLabel(text);
    }

    const rows: SeasonBatchPartialRow[] = [];

    for (let ri = 0; ri < 10; ri += 1) {
      const rowBand = geometry.rows[ri] ?? {
        index: ri,
        y0: 0.255 + (ri / 10) * 0.62,
        y1: 0.255 + ((ri + 0.9) / 10) * 0.62,
        yCenter: 0.255 + ((ri + 0.45) / 10) * 0.62,
      };
      onProgress?.(25 + Math.round((ri / 10) * 70));

      const nameCrop = cropNormalizedField(
        normalized.canvas,
        geometry.nameRectForRow(rowBand),
        2.8,
        { grayscale: true, contrast: 1.7 },
      );
      const nameRaw = await session.recognizeField(
        nameCrop,
        "japanese_name",
        `name_${ri}`,
      );
      const ocrName = cleanPlayerName(nameRaw.text || "");

      const teamCrop = cropNormalizedField(
        normalized.canvas,
        geometry.teamRectForRow(rowBand),
        2.5,
        { grayscale: false, contrast: 1.2 },
      );
      const logo = recognizeTeamLogo(teamCrop);
      const teamShort =
        logo.score >= 0.35 && logo.teamShort ? logo.teamShort : "";

      const resolved = resolveRankingPlayer({
        ocrName,
        teamShort,
        year: year === DEMO_IMPORT_YEAR ? 2026 : year,
        role,
      });

      const fieldMap: SeasonBatchPartialRow["fields"] = {};

      for (let ci = 0; ci < geometry.columns.length; ci += 1) {
        const col = geometry.columns[ci]!;
        const field = fields[ci] ?? col.field;
        const rect = cellRect({ ...col, field }, rowBand);
        const crop = cropNormalizedField(normalized.canvas, rect, 3.2, {
          grayscale: true,
          contrast: 1.85,
        });
        const mode = modeForField(field, role);
        const raw = await session.recognizeField(crop, mode, `${field}_${ri}`);
        const token = (raw.text || "").trim();
        const parsed = parseStatToken(token || String(raw.text ?? ""), field, role);
        const sanitized = sanitizeOcrStatCell(
          field,
          parsed.display || token,
          parsed.value,
          raw.confidence,
          parsed.status,
          parsed.note,
        );
        fieldMap[field] = {
          raw: sanitized.raw,
          value: sanitized.value,
          status: sanitized.status,
          note: sanitized.note,
        };
      }

      const withConsistency =
        role === "batter" || role === "catcher"
          ? applyBatterConsistency(fieldMap)
          : fieldMap;

      const nameStatus =
        resolved.status === "matched"
          ? ("ok" as const)
          : ("needs_confirm" as const);
      const teamStatus =
        resolved.teamShort && logo.score >= 0.35
          ? ("ok" as const)
          : ("needs_confirm" as const);

      const displayName =
        resolved.status === "matched"
          ? resolved.displayName
          : ocrName
            ? ocrName
            : `${ri + 1}位：要確認`;

      rows.push({
        rowIndex: ri,
        playerName: displayName,
        ocrName: ocrName || resolved.ocrName,
        teamShort: resolved.teamShort || teamShort,
        playerId: resolved.playerId,
        nameStatus,
        teamStatus,
        nameCandidates: resolved.candidates.map((c) => ({
          playerId: c.playerId,
          label: c.label,
          teamShort: c.teamShort,
          score: c.score,
        })),
        fields: withConsistency,
      });
    }

    // 保険: 必ず10行
    while (rows.length < 10) {
      rows.push(placeholderRow(rows.length));
    }

    onProgress?.(98);
    const overlay = drawLayoutOverlay(
      normalized.canvas,
      geometry.rows.flatMap((row, ri) => [
        {
          id: `name_${ri}`,
          label: `#${ri + 1}`,
          rect: geometry.nameRectForRow(row),
        },
        ...geometry.columns.map((col, ci) => ({
          id: `c_${ri}_${ci}`,
          label: "",
          rect: cellRect(col, row),
        })),
      ]),
    );

    const previewBlob = await canvasToPngBlob(normalized.canvas);
    const overlayBlob = await canvasToPngBlob(overlay);

    const headerNote = geometry.frame.avgHighlightDetected
      ? "打率列ハイライトをアンカーに列固定"
      : "既定レイアウトで列固定";

    return {
      yearHint: year,
      headers: fields,
      headerLabels: headerLabels.length ? headerLabels : fields.map(String),
      rows: rows.slice(0, 10),
      rawText: `[table-cell-ocr] rows=10 cols=${fields.join(",")}`,
      confidence: 85,
      rowCount: 10,
      normalizedPreviewUrl: URL.createObjectURL(previewBlob),
      overlayPreviewUrl: URL.createObjectURL(overlayBlob),
      message: `表検出→10行×セルOCR（${headerNote}）。全体OCRは未使用`,
    };
  } finally {
    await session.terminate?.();
  }
}
