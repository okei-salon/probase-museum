/**
 * 相棒／OCR確認表向け：ゲーム表示値と Museum 再計算値の検算。
 * 表示値は上書きしない。丸め後に一致すれば要確認を外し、
 * 明確に違うときだけ成績セルを needs_confirm にする。
 */

import type {
  SeasonBatchFieldKey,
  SeasonBatchPlayerRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import {
  computeBatterDerived,
  computePitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";
import { ipDisplayToOuts } from "@/lib/manualEntry/normalizeInput";
import {
  rowToBatterCounting,
  rowToPitcherCounting,
  enrichRowDerivedDisplays,
} from "@/lib/import/seasonBatchConvert";

function roundHalfUp(n: number, digits: number): number {
  const p = 10 ** digits;
  return Math.round(n * p + Number.EPSILON) / p;
}

function sameRounded(a: number, b: number, digits: number): boolean {
  return roundHalfUp(a, digits) === roundHalfUp(b, digits);
}

function numCell(
  row: SeasonBatchPlayerRow,
  key: SeasonBatchFieldKey,
): number | null {
  const v = row.fields[key]?.value;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

type CheckSpec = {
  key: SeasonBatchFieldKey;
  label: string;
  digits: number;
  /** 貼り付け値（ゲーム表示）。QS率は % 表示のことがある */
  input: number | null;
  computed: number | null;
};

function pitcherChecks(row: SeasonBatchPlayerRow): CheckSpec[] {
  const counting = rowToPitcherCounting(row);
  if (!counting) return [];
  const derived = computePitcherDerived(counting);
  const ipOuts = counting.ipOuts;
  const ipInnings = ipOuts / 3;
  const hrRate =
    ipInnings > 0 && counting.hr != null
      ? roundHalfUp((counting.hr * 9) / ipInnings, 2)
      : null;

  // QS率: 相棒は 88.9（%）表記。derived は 0〜1
  const qsInput = numCell(row, "qsRate");
  const qsComputed =
    derived.qsRate != null
      ? qsInput != null && qsInput > 1
        ? roundHalfUp(derived.qsRate * 100, 1)
        : derived.qsRate
      : null;
  const hqsInput = numCell(row, "hqsRate");
  const hqsComputed =
    derived.hqsRate != null
      ? hqsInput != null && hqsInput > 1
        ? roundHalfUp(derived.hqsRate * 100, 1)
        : derived.hqsRate
      : null;

  return [
    { key: "era", label: "防御率", digits: 2, input: numCell(row, "era"), computed: derived.era },
    {
      key: "soRate",
      label: "奪三振率",
      digits: 2,
      input: numCell(row, "soRate"),
      computed: derived.soRate,
    },
    {
      key: "bbRate",
      label: "四球率",
      digits: 2,
      input: numCell(row, "bbRate"),
      computed: derived.bbRate,
    },
    {
      key: "hrRate",
      label: "被本塁打率",
      digits: 2,
      input: numCell(row, "hrRate"),
      computed: hrRate,
    },
    {
      key: "whip",
      label: "WHIP",
      digits: 2,
      input: numCell(row, "whip"),
      computed: derived.whip,
    },
    {
      key: "kbb",
      label: "K/BB",
      digits: 2,
      input: numCell(row, "kbb"),
      computed: derived.kbb,
    },
    {
      key: "winPct",
      label: "勝率",
      digits: 3,
      input: numCell(row, "winPct"),
      computed: derived.winPct,
    },
    {
      key: "qsRate",
      label: "QS率",
      digits: qsInput != null && qsInput > 1 ? 1 : 3,
      input: qsInput,
      computed: qsComputed,
    },
    {
      key: "hqsRate",
      label: "HQS率",
      digits: hqsInput != null && hqsInput > 1 ? 1 : 3,
      input: hqsInput,
      computed: hqsComputed,
    },
  ];
}

function batterChecks(row: SeasonBatchPlayerRow): CheckSpec[] {
  const counting = rowToBatterCounting(row);
  const derived = computeBatterDerived(counting);
  return [
    { key: "avg", label: "打率", digits: 3, input: numCell(row, "avg"), computed: derived.avg },
    { key: "obp", label: "出塁率", digits: 3, input: numCell(row, "obp"), computed: derived.obp },
    { key: "slg", label: "長打率", digits: 3, input: numCell(row, "slg"), computed: derived.slg },
    { key: "ops", label: "OPS", digits: 3, input: numCell(row, "ops"), computed: derived.ops },
    {
      key: "rispAvg",
      label: "得点圏打率",
      digits: 3,
      input: numCell(row, "rispAvg"),
      computed: derived.rispAvg,
    },
    {
      key: "soRate",
      label: "三振率",
      digits: 3,
      input: numCell(row, "soRate"),
      computed: derived.soRate,
    },
    {
      key: "hrRate",
      label: "本打率",
      digits: 3,
      input: numCell(row, "hrRate"),
      computed: derived.hrRate,
    },
    {
      key: "sbRate",
      label: "盗塁率",
      digits: 3,
      input: numCell(row, "sbRate"),
      computed: derived.sbRate,
    },
    {
      key: "csRate",
      label: "盗塁阻止率",
      digits: 3,
      input: numCell(row, "csRate"),
      computed: derived.csRate,
    },
  ];
}

/**
 * 入力（ゲーム表示）と再計算を比較し、セル status のみ更新。
 * value / display は相棒データのまま維持する。
 */
export function applyRateConsistencyChecks(
  row: SeasonBatchPlayerRow,
  role: SeasonBatchRole,
): SeasonBatchPlayerRow {
  if (role === "catcher") return row;

  // IP が野球表記として読めない場合は検算しない（誤爆防止）
  if (role === "pitcher") {
    const ipDisp = row.fields.ip?.display || "";
    if (ipDisp && ipDisplayToOuts(ipDisp) == null) return row;
  }

  const specs = role === "pitcher" ? pitcherChecks(row) : batterChecks(row);
  if (specs.length === 0) return row;

  const fields = { ...row.fields };
  let changed = false;

  for (const spec of specs) {
    const cell = fields[spec.key];
    if (!cell) continue;
    if (spec.input == null || spec.computed == null) continue;
    // パース失敗で値が空のまま要確認になっている場合は、再計算では埋めない
    if (cell.value == null && cell.display) continue;

    const match = sameRounded(spec.input, spec.computed, spec.digits);
    if (match) {
      if (
        cell.status === "needs_confirm" ||
        cell.status === "invalid" ||
        cell.status === "conflict"
      ) {
        // 丸め一致 → 数値要確認を解除（入力値は維持）
        fields[spec.key] = {
          ...cell,
          status: "ok",
          note: undefined,
        };
        changed = true;
      }
      continue;
    }

    // 明確な不一致のみ要確認（入力値は置換しない）
    const computedText = roundHalfUp(spec.computed, spec.digits).toFixed(
      spec.digits,
    );
    const note = `数値要確認: ${spec.label} 入力=${cell.display || spec.input} / 計算=${computedText}`;
    if (
      cell.status !== "needs_confirm" ||
      cell.note !== note
    ) {
      fields[spec.key] = {
        ...cell,
        status: "needs_confirm",
        note,
      };
      changed = true;
    }
  }

  return changed ? { ...row, fields } : row;
}

/** 自動補完 → 数値検算（入力値は維持） */
export function finalizeBatchRow(
  row: SeasonBatchPlayerRow,
  role: SeasonBatchRole,
): SeasonBatchPlayerRow {
  return applyRateConsistencyChecks(
    enrichRowDerivedDisplays(row, role),
    role,
  );
}

/** 数値要確認になっている成績ラベル一覧 */
export function listStatWarningLabels(
  row: SeasonBatchPlayerRow,
  role: SeasonBatchRole,
): string[] {
  const checked = applyRateConsistencyChecks(row, role);
  const labels: string[] = [];
  for (const [, cell] of Object.entries(checked.fields)) {
    if (!cell) continue;
    if (
      cell.status !== "needs_confirm" &&
      cell.status !== "conflict" &&
      cell.status !== "invalid"
    ) {
      continue;
    }
    const fromNote = cell.note?.match(/数値要確認:\s*([^\s]+)/)?.[1];
    if (fromNote) {
      labels.push(fromNote);
      continue;
    }
  }
  return labels;
}
