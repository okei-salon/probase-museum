"use client";

import Tesseract, { type Worker } from "tesseract.js";
import type { FieldOcrMode, LayoutFieldDef } from "@/lib/import/layouts/types";
import { normalizeOcrText } from "@/lib/import/ocr";
import {
  makeOcrVariants,
  packDarkGlyphs,
  splitDarkGlyphs,
  thickenDarkInk,
  trimNameCanvas,
} from "@/lib/import/fieldPreprocess";
import { correctFieldByMode } from "@/lib/import/correctField";
import { recognizeTeamLogo } from "@/lib/import/teamLogo";
import {
  isolateDigitRegionCanvas,
  readDigitsFromCanvas,
} from "@/lib/import/digitVision";

export type FieldOcrRaw = {
  text: string;
  confidence: number;
  preprocess?: string;
};

function isDigitMode(mode: FieldOcrMode): boolean {
  return (
    mode === "digits" ||
    mode === "digits_decimal" ||
    mode === "year" ||
    mode === "month"
  );
}

type Vote = { value: string | number; weight: number; raw: string; prep: string };

function addVote(
  votes: Vote[],
  value: string | number | null,
  weight: number,
  raw: string,
  prep: string,
) {
  if (value == null || value === "") return;
  if (weight <= 0) return;
  votes.push({ value, weight, raw, prep });
}

function pickVote(
  votes: Vote[],
): { value: string | number; raw: string; prep: string; conf: number } | null {
  if (!votes.length) return null;
  const map = new Map<string, { weight: number; raw: string; prep: string }>();
  for (const v of votes) {
    const key = String(v.value);
    const cur = map.get(key) ?? { weight: 0, raw: v.raw, prep: v.prep };
    cur.weight += v.weight;
    if (v.weight >= cur.weight - v.weight) {
      cur.raw = v.raw;
      cur.prep = v.prep;
    }
    map.set(key, cur);
  }
  const ranked = [...map.entries()].sort((a, b) => b[1].weight - a[1].weight);
  const [bestKey, best] = ranked[0]!;
  const secondW = ranked[1]?.[1].weight ?? 0;
  let conf = Math.min(1, best.weight / Math.max(1.0, votes.length * 0.25));
  // 投票が割れているときは自信を下げ、呼び出し側で空欄化する
  if (secondW > 0 && best.weight < secondW * 1.35) {
    conf = Math.min(conf, 0.35);
  }
  if (/^-?\d+(\.\d+)?$/.test(bestKey)) {
    return { value: Number(bestKey), raw: best.raw, prep: best.prep, conf };
  }
  return { value: bestKey, raw: best.raw, prep: best.prep, conf };
}

function fieldBaseId(fieldId: string): string {
  return fieldId.replace(/_\d+$/, "");
}

function maxDigitsFor(mode: FieldOcrMode, fieldId: string): number {
  if (mode === "year") return 4;
  if (mode === "month") return 2;
  const base = fieldBaseId(fieldId);
  if (mode === "digits_decimal") return 4;
  if (
    base === "g" ||
    base === "doubles" ||
    base === "triples" ||
    base === "hr" ||
    base === "sb" ||
    base === "w" ||
    base === "l" ||
    base === "sv" ||
    base === "hld"
  ) {
    return 2;
  }
  if (
    base === "pa" ||
    base === "ab" ||
    base === "h" ||
    base === "singles" ||
    base === "rbi" ||
    base === "r" ||
    base === "tb" ||
    base === "so" ||
    base === "bb"
  ) {
    return 3;
  }
  if (fieldId === "batter_hr" || fieldId === "batter_rbi") return 2;
  if (
    fieldId === "pitcher_wins" ||
    fieldId === "pitcher_losses" ||
    fieldId === "batter_sb"
  ) {
    return 1;
  }
  return 3;
}

export class FieldOcrSession {
  private eng: Worker | null = null;
  private jpn: Worker | null = null;

  private async engWorker(): Promise<Worker> {
    if (!this.eng) {
      this.eng = await Tesseract.createWorker("eng", 1, { logger: () => {} });
    }
    return this.eng;
  }

  private async jpnWorker(): Promise<Worker> {
    if (!this.jpn) {
      this.jpn = await Tesseract.createWorker("jpn", 1, { logger: () => {} });
    }
    return this.jpn;
  }

  async recognizeField(
    canvas: HTMLCanvasElement,
    mode: FieldOcrMode,
    fieldId: string,
  ): Promise<FieldOcrRaw> {
    if (mode === "japanese_team") {
      const logo = recognizeTeamLogo(canvas);
      return {
        text: logo.teamShort ? `[logo:${logo.teamShort}]` : "[logo:?]",
        confidence: logo.score,
        preprocess: logo.method,
      };
    }
    if (isDigitMode(mode)) {
      return this.recognizeDigits(canvas, mode, fieldId);
    }
    return this.recognizeName(canvas, fieldId);
  }

  private async recognizeDigits(
    canvas: HTMLCanvasElement,
    mode: FieldOcrMode,
    fieldId: string,
  ): Promise<FieldOcrRaw> {
    const votes: Vote[] = [];
    const maxDigits = maxDigitsFor(mode, fieldId);
    const isolated =
      mode === "digits_decimal"
        ? null
        : isolateDigitRegionCanvas(canvas, { maxDigits });
    const variants = makeOcrVariants(canvas, mode);
    const worker = await this.engWorker();
    const wl = mode === "digits_decimal" ? "0123456789." : "0123456789";

    const ocrTargets: Array<{
      prep: string;
      canvas: HTMLCanvasElement;
      boost: number;
    }> = [];

    const unitInt =
      mode === "digits" &&
      [
        "pitcher_wins",
        "pitcher_losses",
        "batter_hr",
        "batter_rbi",
        "batter_sb",
      ].includes(fieldId);

    if (isolated) {
      ocrTargets.push({
        prep: "isolated_bw",
        canvas: isolated,
        boost: unitInt ? 0.95 : 0.55,
      });
      const scaled = document.createElement("canvas");
      scaled.width = Math.max(24, isolated.width * 2);
      scaled.height = Math.max(16, isolated.height * 2);
      const sctx = scaled.getContext("2d")!;
      sctx.imageSmoothingEnabled = false;
      sctx.fillStyle = "#fff";
      sctx.fillRect(0, 0, scaled.width, scaled.height);
      sctx.drawImage(isolated, 0, 0, scaled.width, scaled.height);
      ocrTargets.push({
        prep: "isolated_x2",
        canvas: scaled,
        boost: unitInt ? 0.85 : 0.45,
      });
    }

    // 全体バリアント: 勝は light_ink を除外（5→8誤読が多い）
    for (const v of variants) {
      if (fieldId === "pitcher_wins" && v.kind === "light_ink_bw") continue;
      let boost =
        v.kind === "light_ink_bw" ? 0.5 : v.kind === "invert_bin" ? 0.4 : 0.25;
      if (unitInt && isolated) boost *= 0.45;
      ocrTargets.push({ prep: v.kind, canvas: v.canvas, boost });
    }

    // 単位付き: 左寄りクロップ（数字側）を強めに投票 — 漢字「勝/本/点/盗」を避ける
    if (unitInt) {
      const ratio = maxDigits >= 2 ? 0.58 : 0.4;
      // 勝は light_ink が 5→8 になりやすいので invert/hard 優先
      const kinds =
        fieldId === "pitcher_wins"
          ? (["invert_bin", "hard_bin"] as const)
          : (["light_ink_bw", "invert_bin", "hard_bin"] as const);
      for (const kind of kinds) {
        const base = variants.find((v) => v.kind === kind)?.canvas ?? canvas;
        const left = cropLeftRatio(base, ratio);
        ocrTargets.push({
          prep: `left_${kind}`,
          canvas: left,
          boost: kind === "invert_bin" ? 1.0 : 0.8,
        });
      }
      if (fieldId === "pitcher_wins") {
        const base =
          variants.find((v) => v.kind === "invert_bin")?.canvas ?? canvas;
        ocrTargets.push({
          prep: "left_narrow_inv",
          canvas: cropLeftRatio(base, 0.34),
          boost: 1.15,
        });
      }
      if (fieldId === "pitcher_losses") {
        // 0 は狭いクロップで消えやすい。やや広め＋本体 invert を厚めに
        const base =
          variants.find((v) => v.kind === "invert_bin")?.canvas ?? canvas;
        ocrTargets.push({
          prep: "left_loss_inv",
          canvas: cropLeftRatio(base, 0.48),
          boost: 1.2,
        });
        ocrTargets.push({
          prep: "full_loss_inv",
          canvas: base,
          boost: 0.9,
        });
      }
    }

    for (const v of ocrTargets) {
      for (const psm of ["7", "8"] as const) {
        await worker.setParameters({
          // @ts-expect-error tess
          tessedit_pageseg_mode: psm,
          tessedit_char_whitelist: wl,
        });
        const result = await worker.recognize(v.canvas);
        const text = normalizeOcrText(result.data.text || "");
        const conf = (result.data.confidence ?? 0) / 100;
        const corr = correctFieldByMode(mode, text, fieldId);
        this.pushDigitVote(
          votes,
          mode,
          fieldId,
          corr.value,
          conf + v.boost,
          text,
          `${v.prep}/psm${psm}`,
        );
      }
    }

    // year/month: jpn で「2026年」「4月」
    if (mode === "year" || mode === "month") {
      const jpn = await this.jpnWorker();
      for (const v of variants.filter((x) =>
        ["light_ink_bw", "high_contrast"].includes(x.kind),
      )) {
        await jpn.setParameters({
          // @ts-expect-error tess
          tessedit_pageseg_mode: "7",
          tessedit_char_whitelist: "",
        });
        const result = await jpn.recognize(v.canvas);
        const text = normalizeOcrText(result.data.text || "");
        const conf = (result.data.confidence ?? 0) / 100;
        const corr = correctFieldByMode(mode, text, fieldId);
        // 年/月 文字が含まれる結果を強く優先
        const unitBonus =
          (mode === "year" && /年/.test(text)) ||
          (mode === "month" && /月/.test(text))
            ? 0.7
            : 0.25;
        this.pushDigitVote(
          votes,
          mode,
          fieldId,
          corr.value,
          conf + unitBonus + 0.3,
          text,
          `jpn_${v.kind}`,
        );
      }
    }

    // vision は year/month/decimal の弱い補助のみ（単位付き整数では誤投票が多い）
    if (!unitInt) {
      const vision = readDigitsFromCanvas(canvas, {
        preferLightInk: true,
        maxDigits,
      });
      if (vision.text) {
        const corr = correctFieldByMode(mode, vision.text, fieldId);
        this.pushDigitVote(
          votes,
          mode,
          fieldId,
          corr.value,
          vision.confidence * 0.2,
          vision.text,
          "vision_weak",
        );
      }
    }

    const picked = pickVote(votes);
    if (!picked) {
      return { text: "", confidence: 0, preprocess: "no_valid_vote" };
    }
    return {
      text: String(picked.raw || picked.value),
      confidence: picked.conf,
      preprocess: `vote:${picked.prep}`,
    };
  }

  private pushDigitVote(
    votes: Vote[],
    mode: FieldOcrMode,
    fieldId: string,
    value: string | number | null,
    weight: number,
    raw: string,
    prep: string,
  ) {
    if (value == null) return;
    if (mode === "year") {
      const y = typeof value === "number" ? value : Number(value);
      if (y >= 2020 && y <= 2049) addVote(votes, y, weight, raw, prep);
      return;
    }
    if (mode === "month") {
      const m = typeof value === "number" ? value : Number(value);
      if (m >= 1 && m <= 12) addVote(votes, m, weight, raw, prep);
      return;
    }
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    // 打率・防御率はそのまま
    if (mode === "digits_decimal") {
      if (n > 50) return;
      addVote(votes, value, weight, raw, prep);
      return;
    }
    const base = fieldBaseId(fieldId);
    const maxD = maxDigitsFor(mode, fieldId);
    const digitLen = String(Math.trunc(n)).length;
    if (digitLen > maxD) return;
    // 同一数字3桁（777等）はほぼ誤認
    if (n >= 100 && n <= 999 && /^(\d)\1\1$/.test(String(Math.trunc(n)))) {
      return;
    }
    if (base === "g" && n > 162) return;
    if (
      (base === "doubles" || base === "triples" || base === "hr") &&
      n > 80
    ) {
      return;
    }
    // 整数成績: 打席・打数は3桁まで許容
    if (n > 999) return;
    if (
      (fieldId === "pitcher_wins" ||
        fieldId === "pitcher_losses" ||
        fieldId === "batter_sb") &&
      n > 20
    ) {
      return;
    }
    addVote(votes, value, weight, raw, prep);
  }

  private async recognizeName(
    canvas: HTMLCanvasElement,
    fieldId: string,
  ): Promise<FieldOcrRaw> {
    const trimmed = trimNameCanvas(canvas);
    const variants = makeOcrVariants(trimmed, "japanese_name");
    const packed = packDarkGlyphs(trimmed);
    const thickPacked = packed ? thickenDarkInk(packed) : null;
    const thickDark = thickenDarkInk(
      variants.find((v) => v.kind === "dark_ink_bw")?.canvas ?? trimmed,
    );
    const worker = await this.jpnWorker();
    const kanjiFreq = new Map<string, number>();
    const candidates: Array<{
      text: string;
      conf: number;
      prep: string;
      score: number;
    }> = [];

    const targets = [
      ...variants.map((v) => ({ prep: v.kind, canvas: v.canvas })),
      { prep: "thick_dark", canvas: thickDark },
      ...(packed ? [{ prep: "packed_glyphs", canvas: packed }] : []),
      ...(thickPacked ? [{ prep: "thick_packed", canvas: thickPacked }] : []),
    ];

    // 1文字ずつ OCR（スペースの広い氏名向け）
    const glyphCanvases = splitDarkGlyphs(trimmed);
    if (glyphCanvases.length >= 2 && glyphCanvases.length <= 4) {
      let combined = "";
      let confSum = 0;
      for (let gi = 0; gi < glyphCanvases.length; gi += 1) {
        const g = thickenDarkInk(glyphCanvases[gi]);
        await worker.setParameters({
          // @ts-expect-error tess
          tessedit_pageseg_mode: "10",
          tessedit_char_whitelist: "",
        });
        const result = await worker.recognize(g);
        const text = normalizeOcrText(result.data.text || "");
        const conf = (result.data.confidence ?? 0) / 100;
        const kanji = (text.match(/[\u3400-\u9fff]/g) || []).join("");
        if (kanji.length >= 1) {
          combined += kanji[0];
          confSum += conf;
        }
      }
      if (combined.length >= 2 && combined.length <= 4) {
        kanjiFreq.set(
          combined,
          (kanjiFreq.get(combined) ?? 0) + 2.5 + confSum / combined.length,
        );
        candidates.push({
          text: combined,
          conf: confSum / combined.length,
          prep: "per_glyph",
          score: 0.9 + confSum / combined.length,
        });
      }
    }

    for (const v of targets) {
      for (const psm of ["6", "7", "8"] as const) {
        await worker.setParameters({
          // @ts-expect-error tess
          tessedit_pageseg_mode: psm,
          tessedit_char_whitelist: "",
        });
        const result = await worker.recognize(v.canvas);
        const text = normalizeOcrText(result.data.text || "");
        const conf = (result.data.confidence ?? 0) / 100;
        const corr = correctFieldByMode("japanese_name", text, fieldId);
        const cleaned = String(corr.value ?? text);
        const kanji = (cleaned.match(/[\u3400-\u9fff]/g) || []).join("");
        if (kanji.length >= 2 && kanji.length <= 4) {
          const packBonus =
            v.prep.includes("pack") || v.prep.includes("thick") ? 0.4 : 0;
          kanjiFreq.set(
            kanji,
            (kanjiFreq.get(kanji) ?? 0) + 1 + conf + packBonus,
          );
        }
        // カタカナ氏名（オスナ・キャベッジ等）も候補に残す
        const kanaOnly = (cleaned.match(/[ァ-ヶー]{2,10}/g) || []).join("");
        if (kanaOnly.length >= 2) {
          kanjiFreq.set(
            kanaOnly,
            (kanjiFreq.get(kanaOnly) ?? 0) + 1.2 + conf,
          );
          candidates.push({
            text: kanaOnly,
            conf,
            prep: `${v.prep}/psm${psm}/kana`,
            score: conf * 0.4 + 0.55,
          });
        }
        const mixed = (
          cleaned.match(/[\u3400-\u9fffァ-ヶー]{2,8}/g) || []
        ).join("");
        if (mixed.length >= 2 && mixed !== kanaOnly) {
          candidates.push({
            text: mixed.replace(/\s+/g, ""),
            conf,
            prep: `${v.prep}/psm${psm}/mixed`,
            score: conf * 0.35 + Math.min(mixed.length, 5) * 0.12 + 0.35,
          });
        }

        let score = conf * 0.35 + Math.min(kanji.length, 4) * 0.2;
        if (kanji.length >= 2 && kanji.length <= 4) score += 0.45;
        if (kanji.length > 5) score -= 0.8;
        if (/^[ァ-ヶー]{2,10}$/.test(cleaned.replace(/\s/g, ""))) {
          score += 0.35;
        }
        if (v.prep.includes("pack") || v.prep.includes("thick")) score += 0.2;
        candidates.push({
          text: kanji.length >= 2 ? kanji : cleaned.replace(/\s+/g, ""),
          conf,
          prep: `${v.prep}/psm${psm}`,
          score,
        });
      }
    }

    const kanjiRanked = [...kanjiFreq.entries()].sort(
      (a, b) => b[1] - a[1] || b[0].length - a[0].length,
    );
    if (kanjiRanked[0] && kanjiRanked[0][0].length >= 2) {
      return {
        text: kanjiRanked[0][0],
        confidence: Math.min(0.9, 0.4 + kanjiRanked[0][1] * 0.1),
        preprocess: "kanji_vote",
      };
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best) return { text: "", confidence: 0, preprocess: "empty" };
    const nameChars = (
      best.text.match(/[\u3400-\u9fffァ-ヶー]{2,10}/g) || []
    )
      .join("")
      .replace(/\s+/g, "");
    const k = (best.text.match(/[\u3400-\u9fff]/g) || []).join("");
    const picked =
      nameChars.length >= 2
        ? nameChars
        : k.length >= 2 && k.length <= 4
          ? k
          : best.text.replace(/\s+/g, "");
    return {
      text: picked,
      confidence: picked.length >= 2 ? Math.min(1, Math.max(best.conf, 0.45)) : 0.1,
      preprocess: best.prep,
    };
  }

  async terminate(): Promise<void> {
    if (this.eng) {
      await this.eng.terminate();
      this.eng = null;
    }
    if (this.jpn) {
      await this.jpn.terminate();
      this.jpn = null;
    }
  }
}

function cropLeftRatio(
  source: HTMLCanvasElement,
  ratio: number,
): HTMLCanvasElement {
  const w = Math.max(8, Math.round(source.width * ratio));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, 0, 0, w, source.height, 0, 0, w, source.height);
  return out;
}

export async function recognizeLayoutFields(
  canvas: HTMLCanvasElement,
  fields: LayoutFieldDef[],
  cropFn: (
    canvas: HTMLCanvasElement,
    field: LayoutFieldDef,
  ) => HTMLCanvasElement,
  onProgress?: (done: number, total: number) => void,
): Promise<
  Array<{
    field: LayoutFieldDef;
    crop: HTMLCanvasElement;
    raw: FieldOcrRaw;
  }>
> {
  const session = new FieldOcrSession();
  const ordered = [...fields].sort((a, b) => {
    const rank = (m: FieldOcrMode) =>
      m === "japanese_team" ? 0 : isDigitMode(m) ? 1 : 2;
    return rank(a.mode) - rank(b.mode);
  });

  const out: Array<{
    field: LayoutFieldDef;
    crop: HTMLCanvasElement;
    raw: FieldOcrRaw;
  }> = [];
  try {
    for (let i = 0; i < ordered.length; i += 1) {
      const field = ordered[i];
      const crop = cropFn(canvas, field);
      const raw = await session.recognizeField(crop, field.mode, field.id);
      out.push({ field, crop, raw });
      onProgress?.(i + 1, ordered.length);
    }
  } finally {
    await session.terminate();
  }
  const byId = new Map(out.map((r) => [r.field.id, r]));
  return fields.map((f) => byId.get(f.id)!).filter(Boolean);
}
