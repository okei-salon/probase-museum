import type {
  FieldCellStatus,
  SeasonBatchFieldKey,
  SeasonBatchPartialRow,
} from "@/data/import/seasonBatchTypes";

/** フィールド別の現実的レンジ（シーズン途中〜通年想定）。外れたら捨てる */
const PLAUSIBLE_RANGE: Partial<
  Record<SeasonBatchFieldKey, { min: number; max: number }>
> = {
  avg: { min: 0, max: 1 },
  obp: { min: 0, max: 1 },
  slg: { min: 0, max: 4 },
  ops: { min: 0, max: 5 },
  g: { min: 0, max: 162 },
  pa: { min: 0, max: 750 },
  ab: { min: 0, max: 700 },
  h: { min: 0, max: 300 },
  singles: { min: 0, max: 250 },
  doubles: { min: 0, max: 80 },
  triples: { min: 0, max: 40 },
  hr: { min: 0, max: 70 },
  rbi: { min: 0, max: 200 },
  r: { min: 0, max: 200 },
  sb: { min: 0, max: 100 },
  so: { min: 0, max: 300 },
  bb: { min: 0, max: 200 },
  hbp: { min: 0, max: 80 },
  sf: { min: 0, max: 40 },
  sac: { min: 0, max: 60 },
  tb: { min: 0, max: 500 },
  era: { min: 0, max: 99 },
  w: { min: 0, max: 30 },
  l: { min: 0, max: 30 },
  sv: { min: 0, max: 60 },
  hld: { min: 0, max: 60 },
};

/**
 * 値がフィールドとして現実的か。OCRゴミ（777 等）を弾く。
 */
export function isPlausibleStat(
  field: SeasonBatchFieldKey,
  value: number | string | null,
): boolean {
  if (value == null) return false;
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < 0) return false;

  // 同一数字の3桁繰り返しはほぼ誤認（111 安打などは稀なので要確認扱いへ）
  const asInt = Math.round(value);
  if (
    Number.isInteger(value) &&
    asInt >= 100 &&
    asInt <= 999 &&
    /^(\d)\1\1$/.test(String(asInt))
  ) {
    return false;
  }

  const range = PLAUSIBLE_RANGE[field];
  if (!range) return value <= 999;
  return value >= range.min && value <= range.max;
}

/**
 * 野手カウントの整合性チェック。矛盾・レンジ外は値を捨てて要確認にする。
 */
export function applyBatterConsistency(
  fields: SeasonBatchPartialRow["fields"],
): SeasonBatchPartialRow["fields"] {
  const next = { ...fields };

  const clear = (k: SeasonBatchFieldKey, note: string) => {
    const cell = next[k];
    if (!cell) return;
    next[k] = {
      ...cell,
      value: null,
      raw: "",
      status: "needs_confirm",
      note: cell.note ? `${cell.note} / ${note}` : note,
    };
  };

  const mark = (k: SeasonBatchFieldKey, note: string) => {
    const cell = next[k];
    if (!cell || cell.value == null) return;
    next[k] = {
      ...cell,
      status: "needs_confirm",
      note: cell.note ? `${cell.note} / ${note}` : note,
    };
  };

  // レンジ外は確定値として残さない
  for (const [fk, cell] of Object.entries(next)) {
    if (!cell || cell.value == null) continue;
    const key = fk as SeasonBatchFieldKey;
    if (!isPlausibleStat(key, cell.value)) {
      clear(key, "レンジ外のため未確定");
    }
  }

  const num = (k: SeasonBatchFieldKey): number | null => {
    const v = next[k]?.value;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const ab = num("ab");
  const h = num("h");
  const pa = num("pa");
  const singles = num("singles");
  const doubles = num("doubles");
  const triples = num("triples");
  const hr = num("hr");
  const avg = num("avg");
  const g = num("g");

  if (g != null && g > 162) clear("g", "試合数が非現実的です");

  if (ab != null && h != null && h > ab) {
    clear("h", "安打が打数を超えています");
    mark("ab", "安打が打数を超えています");
  }
  if (pa != null && ab != null && pa < ab) {
    clear("pa", "打席が打数より小さいです");
    mark("ab", "打席が打数より小さいです");
  }
  if (h != null && singles != null && singles > h) {
    clear("singles", "単打が安打を超えています");
  }
  if (h != null && hr != null && hr > h) {
    clear("hr", "本塁打が安打を超えています");
  }
  if (h != null && doubles != null && doubles > h) {
    clear("doubles", "二塁打が安打を超えています");
  }
  if (h != null && triples != null && triples > h) {
    clear("triples", "三塁打が安打を超えています");
  }
  // 安打 ≒ 単打+二塁打+三塁打+本塁打（揃っている項目だけで検証）
  if (h != null && singles != null && doubles != null) {
    const parts =
      singles +
      doubles +
      (triples ?? 0) +
      (hr ?? 0);
    const knownExtra =
      (triples != null ? 1 : 0) + (hr != null ? 1 : 0);
    // 単打・二塁打は揃っている。三塁打/本塁打が無い画面（横スクロール1枚目）では
    // singles+doubles ≦ h を最低限チェック
    if (knownExtra === 0) {
      if (singles + doubles > h + 1) {
        mark("singles", "単打+二塁打が安打を超えています");
        mark("doubles", "単打+二塁打が安打を超えています");
      }
    } else if (Math.abs(parts - h) > 1) {
      mark("singles", `安打内訳合計(${parts})≠安打(${h})`);
      mark("doubles", `安打内訳合計(${parts})≠安打(${h})`);
      mark("h", `安打内訳合計(${parts})≠安打(${h})`);
    }
  }

  // 打率 ≒ 安打÷打数 — 大きくズレたら打率を捨てる（数値を無理に残さない）
  if (ab != null && ab > 0 && h != null && avg != null) {
    const expected = Math.round((h / ab) * 1000) / 1000;
    if (Math.abs(expected - avg) > 0.015) {
      clear("avg", `打率と安打÷打数（${expected.toFixed(3)}）が不一致`);
    } else if (next.avg && next.avg.status === "needs_confirm") {
      next.avg = {
        ...next.avg,
        status: "ok",
        note: next.avg.note
          ? `${next.avg.note}（安打÷打数で妥当）`
          : "安打÷打数で妥当",
      };
    }
  }

  return next;
}

export function confidenceToStatus(
  conf: number,
  hasValue: boolean,
): FieldCellStatus {
  if (!hasValue) return "empty";
  if (conf < 0.55) return "needs_confirm";
  return "ok";
}

/**
 * OCR結果をセル用に正規化。低信頼・レンジ外は値なしの要確認。
 */
export function sanitizeOcrStatCell(
  field: SeasonBatchFieldKey,
  rawText: string,
  value: number | string | null,
  confidence: number,
  parsedStatus: FieldCellStatus,
  note?: string,
): {
  raw: string;
  value: number | string | null;
  status: FieldCellStatus;
  note?: string;
} {
  if (value == null || value === "") {
    return {
      raw: "",
      value: null,
      status: "empty",
      note: note || undefined,
    };
  }

  if (typeof value === "number" && !isPlausibleStat(field, value)) {
    return {
      raw: "",
      value: null,
      status: "needs_confirm",
      note: note || `「${rawText}」はレンジ外のため未確定`,
    };
  }

  // 自信がない数値は無理に確定せず空欄＋要確認
  if (confidence < 0.45) {
    return {
      raw: "",
      value: null,
      status: "needs_confirm",
      note: note || "OCR信頼度が低いため未確定",
    };
  }

  if (confidence < 0.55 || parsedStatus === "needs_confirm") {
    return {
      raw: String(rawText || value),
      value,
      status: "needs_confirm",
      note: note || "要確認",
    };
  }

  if (parsedStatus === "invalid") {
    return {
      raw: "",
      value: null,
      status: "needs_confirm",
      note: note || "無効な数値",
    };
  }

  return {
    raw: String(rawText || value),
    value,
    status: "ok",
    note,
  };
}
