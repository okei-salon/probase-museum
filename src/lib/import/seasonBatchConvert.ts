import type {
  SeasonBatchFieldKey,
  SeasonBatchPlayerRow,
  SeasonBatchRole,
} from "@/data/import/seasonBatchTypes";
import {
  computeBatterDerived,
  computePitcherDerived,
  validateBatterCounting,
  validatePitcherCounting,
  type BatterCountingInput,
  type PitcherCountingInput,
} from "@/lib/manualEntry/computeSeasonStats";
import { ipDisplayToOuts } from "@/lib/manualEntry/normalizeInput";

export type BatchColumnDef = {
  key: SeasonBatchFieldKey | "playerName" | "teamShort";
  label: string;
  sticky?: boolean;
  /** 最小幅（px）。横スクロール前提で視認性優先 */
  minWidth: number;
};

/**
 * プロスピ「個人打撃成績／シーズン」正式30項目（ゲーム画面順）。
 * 単打・本打率・満塁系・三振系などは含めない。
 */
export const PROSPI_BATTER_SEASON_COLUMNS: BatchColumnDef[] = [
  { key: "playerName", label: "選手", sticky: true, minWidth: 120 },
  { key: "teamShort", label: "球団", sticky: true, minWidth: 80 },
  { key: "avg", label: "打率", minWidth: 56 },
  { key: "g", label: "試合", minWidth: 48 },
  { key: "pa", label: "打席", minWidth: 52 },
  { key: "ab", label: "打数", minWidth: 52 },
  { key: "h", label: "安打", minWidth: 48 },
  { key: "doubles", label: "二塁打", minWidth: 52 },
  { key: "triples", label: "三塁打", minWidth: 52 },
  { key: "hr", label: "本塁打", minWidth: 52 },
  { key: "tb", label: "塁打", minWidth: 48 },
  { key: "slg", label: "長打率", minWidth: 56 },
  { key: "rbi", label: "打点", minWidth: 48 },
  { key: "rispAvg", label: "得点圏打率", minWidth: 72 },
  { key: "rispAb", label: "得点圏打数", minWidth: 72 },
  { key: "rispH", label: "得点圏安打", minWidth: 72 },
  { key: "r", label: "得点", minWidth: 48 },
  { key: "bb", label: "四球", minWidth: 48 },
  { key: "hbp", label: "死球", minWidth: 48 },
  { key: "sac", label: "犠打", minWidth: 48 },
  { key: "sf", label: "犠飛", minWidth: 48 },
  { key: "sb", label: "盗塁", minWidth: 48 },
  { key: "cs", label: "盗塁死", minWidth: 52 },
  { key: "obp", label: "出塁率", minWidth: 56 },
  { key: "hitStreak", label: "連続安打", minWidth: 64 },
  { key: "onBaseStreak", label: "連続出塁", minWidth: 64 },
  { key: "multiHit", label: "猛打賞", minWidth: 52 },
  { key: "ops", label: "OPS", minWidth: 52 },
  { key: "csAttempted", label: "被盗塁企図数", minWidth: 80 },
  { key: "csAllowed", label: "許盗塁数", minWidth: 64 },
  { key: "csCaught", label: "盗塁刺", minWidth: 56 },
  { key: "csRate", label: "盗塁阻止率", minWidth: 72 },
];

export function batchColumnsForRole(role: SeasonBatchRole): BatchColumnDef[] {
  if (role === "pitcher") {
    return PROSPI_PITCHER_SEASON_COLUMNS;
  }
  if (role === "catcher") {
    return [
      { key: "playerName", label: "選手", sticky: true, minWidth: 112 },
      { key: "teamShort", label: "球団", sticky: true, minWidth: 72 },
      { key: "g", label: "試合", minWidth: 48 },
      { key: "csAttempted", label: "被盗塁企図数", minWidth: 80 },
      { key: "csAllowed", label: "許盗塁数", minWidth: 64 },
      { key: "csCaught", label: "盗塁刺", minWidth: 56 },
      { key: "csRate", label: "盗塁阻止率", minWidth: 72 },
    ];
  }
  return PROSPI_BATTER_SEASON_COLUMNS;
}

/**
 * プロスピ「個人投手成績／シーズン」横スクロール順。
 * 表示順＝ゲーム画面順。保存はキー名で固定マッピング。
 */
export const PROSPI_PITCHER_SEASON_COLUMNS: BatchColumnDef[] = [
  { key: "playerName", label: "選手", sticky: true, minWidth: 112 },
  { key: "teamShort", label: "球団", sticky: true, minWidth: 72 },
  { key: "era", label: "防御率", minWidth: 56 },
  { key: "ip", label: "投球回", minWidth: 56 },
  { key: "winPct", label: "勝率", minWidth: 56 },
  { key: "w", label: "勝", minWidth: 40 },
  { key: "l", label: "敗", minWidth: 40 },
  { key: "sv", label: "セーブ", minWidth: 52 },
  { key: "hp", label: "HP", minWidth: 44 },
  { key: "hld", label: "H", minWidth: 40 },
  { key: "g", label: "登板", minWidth: 48 },
  { key: "gs", label: "先発", minWidth: 48 },
  { key: "sho", label: "完封", minWidth: 48 },
  { key: "cg", label: "完投", minWidth: 48 },
  { key: "qs", label: "QS", minWidth: 40 },
  { key: "qsRate", label: "QS率", minWidth: 52 },
  { key: "hqs", label: "HQS", minWidth: 44 },
  { key: "hqsRate", label: "HQS率", minWidth: 56 },
  { key: "so", label: "奪三振", minWidth: 56 },
  { key: "soRate", label: "奪三振率", minWidth: 64 },
  { key: "bb", label: "与四球", minWidth: 52 },
  { key: "bbRate", label: "四球率", minWidth: 56 },
  { key: "hbp", label: "与死球", minWidth: 52 },
  { key: "hr", label: "被本塁打", minWidth: 64 },
  { key: "hrRate", label: "被本塁打率", minWidth: 72 },
  { key: "kbb", label: "K/BB", minWidth: 52 },
  { key: "whip", label: "WHIP", minWidth: 56 },
  { key: "sbAtt", label: "被盗企", minWidth: 56 },
  { key: "sbAllowed", label: "許盗数", minWidth: 56 },
  { key: "sbAllowedRate", label: "許盗率", minWidth: 56 },
  { key: "wp", label: "暴投", minWidth: 48 },
  { key: "r", label: "失点", minWidth: 48 },
  { key: "er", label: "自責点", minWidth: 52 },
];

function num(
  row: SeasonBatchPlayerRow,
  key: SeasonBatchFieldKey,
  fallback = 0,
): number {
  const v = row.fields[key]?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function optNum(
  row: SeasonBatchPlayerRow,
  key: SeasonBatchFieldKey,
): number | null {
  const v = row.fields[key]?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function rowToBatterCounting(row: SeasonBatchPlayerRow): BatterCountingInput {
  return {
    g: optNum(row, "g"),
    pa: optNum(row, "pa"),
    ab: num(row, "ab"),
    h: num(row, "h"),
    singles: optNum(row, "singles"),
    doubles: num(row, "doubles"),
    triples: num(row, "triples"),
    hr: num(row, "hr"),
    tb: optNum(row, "tb"),
    rbi: num(row, "rbi"),
    r: optNum(row, "r"),
    so: optNum(row, "so"),
    bb: num(row, "bb"),
    hbp: optNum(row, "hbp"),
    sf: optNum(row, "sf"),
    sac: optNum(row, "sac"),
    sb: optNum(row, "sb"),
    sba: optNum(row, "sba"),
    cs: optNum(row, "cs"),
    rispAb: optNum(row, "rispAb"),
    rispH: optNum(row, "rispH"),
    basesLoadedPa: optNum(row, "basesLoadedPa"),
    basesLoadedH: optNum(row, "basesLoadedH"),
    hitStreak: optNum(row, "hitStreak"),
    onBaseStreak: optNum(row, "onBaseStreak"),
    multiHit: optNum(row, "multiHit"),
    csAttempted: optNum(row, "csAttempted"),
    csAllowed: optNum(row, "csAllowed"),
    csCaught: optNum(row, "csCaught"),
  };
}

export function rowToPitcherCounting(
  row: SeasonBatchPlayerRow,
): PitcherCountingInput | null {
  const ipRaw = row.fields.ip?.display || String(row.fields.ip?.value ?? "");
  const outs = ipRaw ? ipDisplayToOuts(ipRaw) : null;
  if (outs == null && !row.fields.ip?.value) {
    // 投球回未入力でも他項目があれば仮に 0
  }
  return {
    g: num(row, "g"),
    w: num(row, "w"),
    l: num(row, "l"),
    sv: optNum(row, "sv"),
    hld: optNum(row, "hld"),
    hp: optNum(row, "hp"),
    cg: optNum(row, "cg"),
    sho: optNum(row, "sho"),
    ipOuts: outs ?? (typeof row.fields.ip?.value === "number" ? Math.round(row.fields.ip.value * 3) : 0),
    er: num(row, "er"),
    r: optNum(row, "r"),
    so: num(row, "so"),
    h: optNum(row, "h"),
    hr: optNum(row, "hr"),
    bb: optNum(row, "bb"),
    hbp: optNum(row, "hbp"),
    qs: optNum(row, "qs"),
    hqs: optNum(row, "hqs"),
    gs: optNum(row, "gs"),
    wp: optNum(row, "wp"),
    sbAtt: optNum(row, "sbAtt"),
    sbAllowed: optNum(row, "sbAllowed"),
  };
}

export function enrichRowDerivedDisplays(
  row: SeasonBatchPlayerRow,
  role: SeasonBatchRole,
): SeasonBatchPlayerRow {
  if (role === "pitcher") {
    const counting = rowToPitcherCounting(row);
    if (!counting) return row;
    const derived = computePitcherDerived(counting);
    const fields = { ...row.fields };
    const setIfEmpty = (
      key: SeasonBatchFieldKey,
      value: number | null,
      display: string,
    ) => {
      if (value == null) return;
      const existing = fields[key];
      if (
        existing &&
        (existing.value != null || (existing.display && existing.display !== ""))
      ) {
        return;
      }
      fields[key] = {
        value,
        display,
        status: "ok",
        sources: [],
        note: "自動補完",
      };
    };
    setIfEmpty("era", derived.era, derived.era != null ? derived.era.toFixed(2) : "");
    setIfEmpty(
      "whip",
      derived.whip,
      derived.whip != null ? derived.whip.toFixed(2) : "",
    );
    setIfEmpty(
      "winPct",
      derived.winPct,
      derived.winPct != null
        ? derived.winPct >= 1
          ? "1.000"
          : `.${Math.round(derived.winPct * 1000)
              .toString()
              .padStart(3, "0")}`
        : "",
    );
    setIfEmpty(
      "soRate",
      derived.soRate,
      derived.soRate != null ? derived.soRate.toFixed(2) : "",
    );
    setIfEmpty(
      "bbRate",
      derived.bbRate,
      derived.bbRate != null ? derived.bbRate.toFixed(2) : "",
    );
    setIfEmpty(
      "kbb",
      derived.kbb,
      derived.kbb != null ? derived.kbb.toFixed(2) : "",
    );
    setIfEmpty(
      "qsRate",
      derived.qsRate != null ? derived.qsRate * 100 : null,
      derived.qsRate != null ? (derived.qsRate * 100).toFixed(1) : "",
    );
    setIfEmpty(
      "hqsRate",
      derived.hqsRate != null ? derived.hqsRate * 100 : null,
      derived.hqsRate != null ? (derived.hqsRate * 100).toFixed(1) : "",
    );
    return { ...row, fields };
  }

  const counting = rowToBatterCounting(row);
  const derived = computeBatterDerived(counting);
  const fields = { ...row.fields };
  /** 貼り付け／OCRで値が入っている項目は自動計算で上書きしない */
  const setIfEmpty = (
    key: SeasonBatchFieldKey,
    value: number | null,
    display: string,
  ) => {
    if (value == null) return;
    const existing = fields[key];
    if (existing && (existing.value != null || (existing.display && existing.display !== ""))) {
      return;
    }
    fields[key] = { value, display, status: "ok", sources: [], note: "自動補完" };
  };
  setIfEmpty("avg", derived.avg, derived.avg != null ? formatAvg(derived.avg) : "");
  setIfEmpty("obp", derived.obp, derived.obp != null ? formatAvg(derived.obp) : "");
  setIfEmpty("slg", derived.slg, derived.slg != null ? formatAvg(derived.slg) : "");
  setIfEmpty("ops", derived.ops, derived.ops != null ? derived.ops.toFixed(3) : "");
  setIfEmpty(
    "rispAvg",
    derived.rispAvg,
    derived.rispAvg != null ? formatAvg(derived.rispAvg) : "",
  );
  setIfEmpty(
    "csRate",
    derived.csRate,
    derived.csRate != null ? formatAvg(derived.csRate) : "",
  );
  if (derived.tb != null) {
    setIfEmpty("tb", derived.tb, String(derived.tb));
  }
  return { ...row, fields };
}

function formatAvg(n: number) {
  if (n >= 1) return n.toFixed(3);
  return `.${Math.round(n * 1000).toString().padStart(3, "0")}`;
}

export function validateBatchRow(
  row: SeasonBatchPlayerRow,
  role: SeasonBatchRole,
): { errors: string[]; warnings: string[] } {
  if (role === "pitcher") {
    const counting = rowToPitcherCounting(row);
    if (!counting) return { errors: ["投球回が不正です"], warnings: [] };
    return validatePitcherCounting(counting);
  }
  if (role === "catcher") {
    const warnings: string[] = [];
    const errors: string[] = [];
    if (!row.playerName.trim()) errors.push("選手名が空です");
    if (!row.teamShort.trim()) warnings.push("球団が未設定です");
    const att = optNum(row, "csAttempted");
    const allowed = optNum(row, "csAllowed");
    const caught = optNum(row, "csCaught");
    if (att == null && allowed == null && caught == null) {
      warnings.push("捕手守備の数値がありません");
    }
    if (att != null && allowed != null && caught != null && att < allowed + caught) {
      errors.push("被盗企が許盗+刺より小さいです");
    }
    return { errors, warnings };
  }
  return validateBatterCounting(rowToBatterCounting(row));
}
