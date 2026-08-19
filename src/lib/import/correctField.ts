import { npbTeams } from "@/data/teams";
import { nameSimilarity } from "@/lib/playerMaster/similarity";
import type { FieldOcrMode } from "@/lib/import/layouts/types";

function digitsOnly(raw: string): string {
  return raw
    .replace(/[OoＯｏ]/g, "0")
    .replace(/[IlＩｌ|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[^\d.]/g, "");
}

export function correctYear(raw: string): {
  text: string;
  value: number | null;
} {
  // 「年」などを除去してから数字抽出
  const stripped = raw.replace(/[年]/g, " ").replace(/\s+/g, "");
  const d = digitsOnly(stripped).replace(/\./g, "");
  const m = d.match(/20[2-4]\d/) ?? d.match(/(20\d{2})/) ?? d.match(/(\d{4})/);
  if (m) {
    const y = Number(m[1] ?? m[0]);
    if (y >= 2020 && y <= 2049) return { text: String(y), value: y };
  }
  // 202 / 026 など欠け
  if (/^202\d?$/.test(d) && d.length >= 3) {
    const y = Number((d + "6").slice(0, 4));
    if (y >= 2020 && y <= 2049) return { text: String(y), value: y };
  }
  // 26 → 2026（短い読み取り）
  if (/^2[0-4]\d?$/.test(d) && d.length >= 2 && d.length <= 3) {
    const y = 2000 + Number(d.length === 2 ? d : d.slice(0, 2));
    if (d.length === 3) {
      const y3 = 2000 + Number(d.slice(0, 2));
      // 226 → 2026 推定はしない。202x のみ
      if (/^20/.test(d)) {
        const full = Number(d.padEnd(4, "0").slice(0, 4));
        if (full >= 2020 && full <= 2049) return { text: String(full), value: full };
      }
    } else if (y >= 2020 && y <= 2049) {
      return { text: String(y), value: y };
    }
  }
  return { text: raw.trim(), value: null };
}

export function correctMonth(raw: string): {
  text: string;
  value: number | null;
} {
  const stripped = raw.replace(/[月]/g, " ");
  const withKanji = stripped.match(/(1[0-2]|[1-9])\s*$/);
  const m =
    stripped.match(/(1[0-2]|[1-9])\s*月?/) ??
    stripped.match(/(1[0-2]|[1-9])/) ??
    withKanji;
  // 連続数字から妥当な月を探す
  const digits = digitsOnly(stripped).replace(/\./g, "");
  let month: number | null = null;
  if (m) month = Number(m[1]);
  else if (/^(1[0-2]|[1-9])$/.test(digits)) month = Number(digits);
  else if (digits.length >= 1) {
    // 先頭1〜2桁
    const two = Number(digits.slice(0, 2));
    const one = Number(digits.slice(0, 1));
    if (two >= 10 && two <= 12) month = two;
    else if (one >= 1 && one <= 9) month = one;
  }
  if (month != null && month >= 1 && month <= 12) {
    return { text: `${month}月`, value: month };
  }
  return { text: raw.trim(), value: null };
}

/** 防御率: 122 → 1.22 / 1.22 → 1.22 */
export function correctEra(raw: string): {
  text: string;
  value: number | null;
} {
  const d = digitsOnly(raw);
  if (!d) return { text: raw.trim(), value: null };
  if (d.includes(".")) {
    const n = Number(d);
    if (Number.isFinite(n) && n >= 0 && n < 50) {
      return { text: n.toFixed(2), value: Number(n.toFixed(2)) };
    }
  }
  const intPart = d.replace(/\./g, "");
  if (/^\d{3}$/.test(intPart)) {
    const n = Number(intPart) / 100;
    return { text: n.toFixed(2), value: n };
  }
  if (/^\d{1,2}$/.test(intPart)) {
    const n = Number(intPart);
    return { text: n.toFixed(2), value: n };
  }
  const n = Number(d);
  return Number.isFinite(n) ? { text: String(n), value: n } : { text: raw.trim(), value: null };
}

/** 打率: 510 → .510 / .510 → .510 */
export function correctAvg(raw: string): {
  text: string;
  value: number | null;
} {
  const d = digitsOnly(raw);
  if (!d) return { text: raw.trim(), value: null };
  if (d.startsWith(".")) {
    const n = Number(d);
    if (n > 0 && n < 1) return { text: d.padEnd(4, "0").slice(0, 4), value: n };
  }
  const intPart = d.replace(/\./g, "");
  if (/^\d{3}$/.test(intPart)) {
    const n = Number(intPart) / 1000;
    return { text: `.${intPart}`, value: n };
  }
  if (/^\d{1,2}$/.test(intPart)) {
    // 51 → .510 は推測しすぎなので候補のみ扱いたいが、ここでは .051 は不自然なので null
    return { text: raw.trim(), value: null };
  }
  const n = Number(d);
  if (n > 1 && n < 10) return { text: String(n / 10), value: n / 10 };
  return Number.isFinite(n) && n < 1
    ? { text: String(n), value: n }
    : { text: raw.trim(), value: null };
}

export function correctIntStat(raw: string): {
  text: string;
  value: number | null;
} {
  // 「5勝」「41点」など単位が混ざっても先頭〜連続数字を採用
  const normalized = raw
    .replace(/[OoＯｏ]/g, "0")
    .replace(/[IlＩｌ|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8");
  const m = normalized.match(/(\d{1,4})/);
  if (!m) return { text: raw.trim(), value: null };
  const n = Number(m[1]);
  // 同一数字3桁（777等）は誤認として捨てる
  if (n >= 100 && n <= 999 && /^(\d)\1\1$/.test(String(n))) {
    return { text: raw.trim(), value: null };
  }
  // 打席・打数は 200 超もあり得る（シーズン途中でも 238 等）
  if (!Number.isFinite(n) || n < 0 || n > 999) {
    return { text: raw.trim(), value: null };
  }
  return { text: String(n), value: n };
}

export function correctJapaneseName(raw: string): {
  text: string;
  value: string | null;
} {
  const cleaned = raw
    .replace(/[0-9]/g, "")
    .replace(/[A-Za-z]/g, "")
    .replace(/[^\u3040-\u30ff\u3400-\u9fff・\s]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return { text: raw.trim(), value: null };
  return { text: cleaned, value: cleaned };
}

export function matchTeamFromOcr(raw: string): {
  text: string;
  value: string | null;
  candidates: Array<{ label: string; score: number }>;
} {
  // ロゴ認識結果タグ
  const logo = raw.match(/\[logo:([^\]]+)\]/);
  if (logo) {
    const name = logo[1];
    if (name && name !== "?") {
      return {
        text: name,
        value: name,
        candidates: [{ label: name, score: 0.8 }],
      };
    }
    return { text: raw, value: null, candidates: [] };
  }

  const compact = raw.replace(/\s+/g, "");
  const candidates = npbTeams
    .map((t) => {
      const scores = [
        nameSimilarity(compact, t.short),
        nameSimilarity(compact, t.name),
        compact.includes(t.short) ? 1 : 0,
        t.short.includes(compact) && compact.length >= 2 ? 0.85 : 0,
      ];
      return {
        label: t.short,
        score: Math.max(...scores),
      };
    })
    .filter((c) => c.score >= 0.4)
    .sort((a, b) => b.score - a.score);

  if (candidates[0] && candidates[0].score >= 0.72) {
    return {
      text: candidates[0].label,
      value: candidates[0].label,
      candidates: candidates.slice(0, 3),
    };
  }
  return {
    text: raw.trim(),
    value: candidates[0]?.score >= 0.5 ? candidates[0].label : null,
    candidates: candidates.slice(0, 3),
  };
}

export function correctFieldByMode(
  mode: FieldOcrMode,
  raw: string,
  fieldId?: string,
): {
  text: string;
  value: string | number | null;
  candidates: Array<{ label: string; score: number }>;
} {
  if (mode === "year") {
    const r = correctYear(raw);
    return { text: r.text, value: r.value, candidates: [] };
  }
  if (mode === "month") {
    const r = correctMonth(raw);
    return { text: r.text, value: r.value, candidates: [] };
  }
  if (mode === "digits") {
    const r = correctIntStat(raw);
    return { text: r.text, value: r.value, candidates: [] };
  }
    if (mode === "digits_decimal") {
    const id = fieldId ?? "";
    if (id === "batter_avg" || id.startsWith("avg")) {
      const r = correctAvg(raw);
      return { text: r.text, value: r.value, candidates: [] };
    }
    if (id === "pitcher_era" || id.startsWith("era")) {
      const r = correctEra(raw);
      return { text: r.text, value: r.value, candidates: [] };
    }
    // 打率っぽい（先頭ドット or 3桁整数）を優先
    if (/^\.\d{2,3}$/.test(digitsOnly(raw)) || /^\d{3}$/.test(digitsOnly(raw).replace(/\./g, ""))) {
      const avg = correctAvg(raw);
      if (avg.value != null) return { text: avg.text, value: avg.value, candidates: [] };
    }
    const era = correctEra(raw);
    if (era.value != null) return { text: era.text, value: era.value, candidates: [] };
    const avg = correctAvg(raw);
    return { text: avg.text, value: avg.value, candidates: [] };
  }
  if (mode === "japanese_team") {
    const r = matchTeamFromOcr(raw);
    return { text: r.text, value: r.value, candidates: r.candidates };
  }
  if (mode === "japanese_name") {
    const r = correctJapaneseName(raw);
    return { text: r.text, value: r.value, candidates: [] };
  }
  return { text: raw.trim(), value: raw.trim() || null, candidates: [] };
}
