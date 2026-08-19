"use client";

import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
};

/**
 * クライアント側OCR（tesseract.js + 日本語）。
 * 実写向けに複数PSMを試し、月間MVPらしさが高い結果を返す。
 */
export async function runImageOcr(
  source: File | Blob | string,
  onProgress?: (pct: number) => void,
  options?: { psm?: number; tryAltPsm?: boolean },
): Promise<OcrResult> {
  const primaryPsm = options?.psm ?? 6;
  const psms = options?.tryAltPsm === false ? [primaryPsm] : [primaryPsm, 4, 11];

  let best: OcrResult | null = null;
  for (let i = 0; i < psms.length; i += 1) {
    const psm = psms[i];
    try {
      const result = await Tesseract.recognize(source, "jpn+eng", {
        // @ts-expect-error tesseract.js typings omit tessedit_* keys
        tessedit_pageseg_mode: String(psm),
        preserve_interword_spaces: "1",
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            const base = (i / psms.length) * 100;
            onProgress?.(Math.round(base + (m.progress * 100) / psms.length));
          }
        },
      });
      const candidate: OcrResult = {
        text: normalizeOcrText(result.data.text || ""),
        confidence: result.data.confidence ?? 0,
      };
      if (
        !best ||
        scoreMonthlyMvpOcrText(candidate.text) > scoreMonthlyMvpOcrText(best.text) ||
        (scoreMonthlyMvpOcrText(candidate.text) ===
          scoreMonthlyMvpOcrText(best.text) &&
          candidate.confidence > best.confidence)
      ) {
        best = candidate;
      }
      // 十分良ければ打ち切り
      if (scoreMonthlyMvpOcrText(candidate.text) >= 24) break;
    } catch {
      // 次のPSMへ
    }
  }

  return best ?? { text: "", confidence: 0 };
}

/** OCR誤認識の軽い正規化（0/O・全角数字・よくある誤字など） */
export function normalizeOcrText(text: string): string {
  return text
    .replace(/\u3000/g, " ")
    .replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/[Ａ-Ｚａ-ｚ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/[．。]/g, ".")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[／]/g, "/")
    .replace(/[|丨ｌ]/g, "I")
    .replace(/月聞/g, "月間")
    .replace(/月問/g, "月間")
    .replace(/阪神/g, "阪神")
    .replace(/防卸率/g, "防御率")
    .replace(/防街率/g, "防御率")
    .replace(/打準/g, "打率")
    .replace(/盜塁/g, "盗塁")
    .replace(/野于/g, "野手")
    .replace(/投于/g, "投手")
    .replace(/部問/g, "部門")
    .replace(/\r/g, "")
    .trim();
}

/** 月間MVPらしさのスコア（複数OCR結果の採用判定用） */
export function scoreMonthlyMvpOcrText(text: string): number {
  const t = text.replace(/\s+/g, "");
  let score = 0;
  const hits: Array<[RegExp | string, number]> = [
    ["月間", 8],
    ["MVP", 6],
    ["ＭＶＰ", 6],
    ["投手", 5],
    ["野手", 5],
    ["部門", 3],
    ["防御率", 6],
    ["打率", 6],
    ["勝", 2],
    ["敗", 2],
    ["本", 2],
    ["打点", 4],
    ["盗塁", 4],
    ["阪神", 3],
    ["巨人", 2],
    ["2026", 3],
    ["4月", 3],
    ["5月", 2],
    ["村上", 4],
    ["佐藤", 4],
  ];
  for (const [key, w] of hits) {
    if (typeof key === "string") {
      if (t.includes(key)) score += w;
    } else if (key.test(text)) {
      score += w;
    }
  }
  // 数値パターン
  if (/\d\.\d{2}/.test(text)) score += 3;
  if (/\.\d{3}/.test(text)) score += 3;
  if (/\d\s*勝/.test(text)) score += 2;
  return score;
}
