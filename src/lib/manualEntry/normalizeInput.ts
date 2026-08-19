/**
 * 手入力向け数値正規化。
 * 全角→半角、単位除去、打率・防御率の複数形式を吸収する。
 */

export type NormalizeConfidence = "high" | "needs_confirm" | "invalid";

export type NormalizedNumber = {
  raw: string;
  text: string;
  value: number | null;
  confidence: NormalizeConfidence;
  note?: string;
};

const FULLWIDTH_DIGITS = "０１２３４５６７８９．";
const HALFWIDTH_DIGITS = "0123456789.";

/** 全角数字・句点を半角へ。空白除去。 */
export function toHalfwidthDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const idx = FULLWIDTH_DIGITS.indexOf(ch);
    out += idx >= 0 ? HALFWIDTH_DIGITS[idx]! : ch;
  }
  return out.replace(/[OoＯｏ]/g, "0").replace(/\s+/g, "");
}

/** 「本」「点」「勝」などの単位・記号を除き数字と小数点だけ残す */
export function stripStatUnits(input: string): string {
  return toHalfwidthDigits(input).replace(/[^\d.]/g, "");
}

export function normalizeIntegerInput(raw: string): NormalizedNumber {
  const cleaned = toHalfwidthDigits(raw).trim();
  if (!cleaned) {
    return { raw, text: "", value: null, confidence: "invalid" };
  }
  const m = cleaned.match(/(\d{1,4})/);
  if (!m) {
    return {
      raw,
      text: cleaned,
      value: null,
      confidence: "invalid",
      note: "整数として読み取れません",
    };
  }
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value < 0 || value > 9999) {
    return {
      raw,
      text: cleaned,
      value: null,
      confidence: "invalid",
      note: "範囲外の数値です",
    };
  }
  return { raw, text: String(value), value, confidence: "high" };
}

/**
 * 打率: 310 / .310 / 0.310 / ０．３１０ → value 0.310, display .310
 * 曖昧（2桁など）は needs_confirm
 */
export function normalizeAvgInput(raw: string): NormalizedNumber {
  const d = stripStatUnits(raw);
  if (!d) {
    return { raw, text: "", value: null, confidence: "invalid" };
  }

  if (d.includes(".")) {
    const n = Number(d.startsWith(".") ? `0${d}` : d);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      return {
        raw,
        text: d,
        value: null,
        confidence: "invalid",
        note: "打率の範囲外です",
      };
    }
    const rounded = Math.round(n * 1000) / 1000;
    return {
      raw,
      text: formatAvgDisplay(rounded),
      value: rounded,
      confidence: "high",
    };
  }

  // 整数3桁: 310 → .310
  if (/^\d{3}$/.test(d)) {
    const n = Number(d) / 1000;
    return {
      raw,
      text: formatAvgDisplay(n),
      value: n,
      confidence: "high",
    };
  }

  // 1〜2桁は誤補正の恐れがあるため確定しない
  if (/^\d{1,2}$/.test(d)) {
    const guess = Number(d.padEnd(3, "0")) / 1000;
    return {
      raw,
      text: formatAvgDisplay(guess),
      value: guess,
      confidence: "needs_confirm",
      note: `${d} を ${formatAvgDisplay(guess)} と解釈しました。確認してください`,
    };
  }

  return {
    raw,
    text: d,
    value: null,
    confidence: "invalid",
    note: "打率として読み取れません",
  };
}

/**
 * 防御率: 122 → 1.22 / 1.22 → 1.22
 * 2桁整数は needs_confirm（12 → 1.20 か 12.00 か曖昧）
 */
export function normalizeEraInput(raw: string): NormalizedNumber {
  const d = stripStatUnits(raw);
  if (!d) {
    return { raw, text: "", value: null, confidence: "invalid" };
  }

  if (d.includes(".")) {
    const n = Number(d);
    if (!Number.isFinite(n) || n < 0 || n >= 100) {
      return {
        raw,
        text: d,
        value: null,
        confidence: "invalid",
        note: "防御率の範囲外です",
      };
    }
    const rounded = Math.round(n * 100) / 100;
    return {
      raw,
      text: rounded.toFixed(2),
      value: rounded,
      confidence: "high",
    };
  }

  if (/^\d{3}$/.test(d)) {
    const n = Number(d) / 100;
    return {
      raw,
      text: n.toFixed(2),
      value: n,
      confidence: "high",
    };
  }

  if (/^\d{1,2}$/.test(d)) {
    const asTenths = Number(d) / 10;
    return {
      raw,
      text: asTenths.toFixed(2),
      value: asTenths,
      confidence: "needs_confirm",
      note: `${d} を ${asTenths.toFixed(2)} と解釈しました。確認してください`,
    };
  }

  return {
    raw,
    text: d,
    value: null,
    confidence: "invalid",
    note: "防御率として読み取れません",
  };
}

/**
 * 投球回: 120.1 / 120.2（.1=1/3, .2=2/3）
 * 内部は outs（1回=3アウト）で保持しやすいよう convertIpToOuts を別途用意。
 */
export function normalizeIpInput(raw: string): NormalizedNumber {
  const d = stripStatUnits(raw);
  if (!d) {
    return { raw, text: "", value: null, confidence: "invalid" };
  }
  const m = d.match(/^(\d+)(?:\.([012]))?$/);
  if (!m) {
    // 120.3 など不正な端数
    if (/^\d+\.\d+$/.test(d)) {
      return {
        raw,
        text: d,
        value: null,
        confidence: "invalid",
        note: "投球回の端数は .0 / .1 / .2 のみです",
      };
    }
    const n = Number(d);
    if (Number.isFinite(n) && n >= 0 && Number.isInteger(n)) {
      return { raw, text: String(n), value: n, confidence: "high" };
    }
    return {
      raw,
      text: d,
      value: null,
      confidence: "invalid",
      note: "投球回として読み取れません",
    };
  }
  const whole = Number(m[1]);
  const frac = m[2] ? Number(m[2]) : 0;
  const display = frac === 0 ? String(whole) : `${whole}.${frac}`;
  // 表示用の仮値（整数部 + 端数/10）。計算は outs を使う
  const value = whole + frac / 10;
  return { raw, text: display, value, confidence: "high" };
}

export function ipDisplayToOuts(display: string): number | null {
  const n = normalizeIpInput(display);
  if (n.value == null || n.confidence === "invalid") return null;
  const m = n.text.match(/^(\d+)(?:\.([012]))?$/);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = m[2] ? Number(m[2]) : 0;
  return whole * 3 + frac;
}

export function outsToIpDisplay(outs: number): string {
  const whole = Math.floor(outs / 3);
  const rem = outs % 3;
  return rem === 0 ? String(whole) : `${whole}.${rem}`;
}

export function formatAvgDisplay(avg: number): string {
  if (!Number.isFinite(avg)) return "—";
  const s = avg.toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}

export function formatRate3(value: number): string {
  return formatAvgDisplay(value);
}

export function formatEraDisplay(era: number): string {
  if (!Number.isFinite(era)) return "—";
  return era.toFixed(2);
}

export function formatWinPctDisplay(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return formatAvgDisplay(pct);
}
