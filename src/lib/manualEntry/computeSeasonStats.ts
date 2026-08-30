import {
  formatAvgDisplay,
  formatEraDisplay,
  formatWinPctDisplay,
  outsToIpDisplay,
} from "@/lib/manualEntry/normalizeInput";

/**
 * 野手カウント（率は derived で再計算）
 * 旧フィールドは optional のまま残し互換を保つ。
 */
export type BatterCountingInput = {
  g?: number | null;
  pa?: number | null;
  ab: number;
  h: number;
  /** 単打（未入力時は h-2b-3b-hr） */
  singles?: number | null;
  doubles: number;
  triples: number;
  hr: number;
  /** 塁打（未入力時は内訳から算出） */
  tb?: number | null;
  rbi: number;
  r?: number | null;
  so?: number | null;
  bb: number;
  hbp?: number | null;
  sf?: number | null;
  sac?: number | null;
  /** 盗塁 */
  sb?: number | null;
  /** 盗塁企図（互換。正式は盗塁＋盗塁死から再計算可） */
  sba?: number | null;
  /** 盗塁死（走者として。捕手の盗塁刺とは別） */
  cs?: number | null;
  /** 得点圏打数 */
  rispAb?: number | null;
  /** 得点圏安打 */
  rispH?: number | null;
  /** 満塁打席数 */
  basesLoadedPa?: number | null;
  /** 満塁安打 */
  basesLoadedH?: number | null;
  /** 連続安打 */
  hitStreak?: number | null;
  /** 連続出塁（連試出） */
  onBaseStreak?: number | null;
  /** 猛打賞 */
  multiHit?: number | null;
  // —— 捕手（盗塁阻止）——
  /** 被盗塁企図 */
  csAttempted?: number | null;
  /** 許盗塁 */
  csAllowed?: number | null;
  /** 盗塁刺 */
  csCaught?: number | null;
  /**
   * 規定打席到達（ゲーム画面の白文字相当）。
   * null/未設定 = 判定不可（率系タイトルから推測で含めない）
   */
  paQualified?: boolean | null;
};

export type BatterDerived = {
  avg: number | null;
  /** 本打率 = HR/AB */
  hrRate: number | null;
  slg: number | null;
  obp: number | null;
  ops: number | null;
  tb: number | null;
  singles: number | null;
  /** 三振率 = SO/PA */
  soRate: number | null;
  /** 盗塁率 = SB/SBA */
  sbRate: number | null;
  /** 圏打率 */
  rispAvg: number | null;
  /** 満塁率 */
  basesLoadedAvg: number | null;
  /** 盗塁阻止率 = 刺/被盗企 */
  csRate: number | null;
};

/**
 * 投手カウント
 * hp は旧HP互換。正式なホールドは hld。
 */
export type PitcherCountingInput = {
  g: number;
  w: number;
  l: number;
  sv?: number | null;
  /** ホールド */
  hld?: number | null;
  /** @deprecated 旧HP。読み込み時は残す */
  hp?: number | null;
  cg?: number | null;
  sho?: number | null;
  /** アウト数（1回=3） */
  ipOuts: number;
  er: number;
  /** 失点 */
  r?: number | null;
  so: number;
  /** 被安打 */
  h?: number | null;
  /** 被本塁打 */
  hr?: number | null;
  /** 与四球 */
  bb?: number | null;
  /** 与死球 */
  hbp?: number | null;
  qs?: number | null;
  hqs?: number | null;
  /** 先発数 */
  gs?: number | null;
  /** 暴投 */
  wp?: number | null;
  /** 被盗塁企図 */
  sbAtt?: number | null;
  /** 許盗塁 */
  sbAllowed?: number | null;
  /**
   * 規定投球回到達。null/未設定 = 判定不可
   */
  ipQualified?: boolean | null;
  /** 救援投球回（アウト数） */
  reliefIpOuts?: number | null;
  /** 救援自責点 */
  reliefEr?: number | null;
  /** 救援奪三振 */
  reliefSo?: number | null;
};

export type PitcherDerived = {
  era: number | null;
  winPct: number | null;
  whip: number | null;
  soRate: number | null;
  bbRate: number | null;
  /** K/BB */
  kbb: number | null;
  qsRate: number | null;
  hqsRate: number | null;
  ipDisplay: string | null;
};

export type AutoCalcItem = {
  label: string;
  text: string;
  ready: boolean;
};

/** 盗塁阻止率ランキング規定：被盗企 30 以上 */
export const CATCHER_CS_ATTEMPTS_QUALIFIER = 30;

export function isCatcherCsRateQualified(
  csAttempted: number | null | undefined,
): boolean {
  return (csAttempted ?? 0) >= CATCHER_CS_ATTEMPTS_QUALIFIER;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function resolveBatterSingles(input: {
  h?: number | null;
  doubles?: number | null;
  triples?: number | null;
  hr?: number | null;
  singles?: number | null;
}): number {
  const h = input.h ?? 0;
  const doubles = input.doubles ?? 0;
  const triples = input.triples ?? 0;
  const hr = input.hr ?? 0;
  if (input.singles != null && input.singles > 0) return input.singles;
  return Math.max(0, h - doubles - triples - hr);
}

export function resolveBatterTb(input: {
  h?: number | null;
  doubles?: number | null;
  triples?: number | null;
  hr?: number | null;
  singles?: number | null;
  tb?: number | null;
}): number {
  const singles = resolveBatterSingles(input);
  const doubles = input.doubles ?? 0;
  const triples = input.triples ?? 0;
  const hr = input.hr ?? 0;
  const computed = singles + 2 * doubles + 3 * triples + 4 * hr;
  if (input.tb != null && input.tb > 0) return input.tb;
  return computed;
}

/** 野手率をカウントから再計算（通算でも同一） */
export function computeBatterDerived(input: {
  ab?: number | null;
  h?: number | null;
  doubles?: number | null;
  triples?: number | null;
  hr?: number | null;
  singles?: number | null;
  tb?: number | null;
  bb?: number | null;
  hbp?: number | null;
  sf?: number | null;
  sac?: number | null;
  pa?: number | null;
  so?: number | null;
  sb?: number | null;
  sba?: number | null;
  /** 走者としての盗塁死（盗塁率の分母推定に使用） */
  cs?: number | null;
  rispAb?: number | null;
  rispH?: number | null;
  basesLoadedPa?: number | null;
  basesLoadedH?: number | null;
  csAttempted?: number | null;
  csCaught?: number | null;
}): BatterDerived {
  const ab = input.ab;
  const h = input.h;
  const empty: BatterDerived = {
    avg: null,
    hrRate: null,
    slg: null,
    obp: null,
    ops: null,
    tb: null,
    singles: null,
    soRate: null,
    sbRate: null,
    rispAvg: null,
    basesLoadedAvg: null,
    csRate: null,
  };

  if (ab == null || h == null || ab < 0 || h < 0) {
    return empty;
  }

  const doubles = input.doubles ?? 0;
  const triples = input.triples ?? 0;
  const hr = input.hr ?? 0;
  const bb = input.bb ?? 0;
  const hbp = input.hbp ?? 0;
  const sf = input.sf ?? 0;
  const sac = input.sac ?? 0;
  const singles = resolveBatterSingles(input);
  const tb = resolveBatterTb(input);
  const pa =
    input.pa != null && input.pa > 0
      ? input.pa
      : ab + bb + hbp + sf + sac;

  const avg = ab > 0 ? round3(h / ab) : null;
  const hrRate = ab > 0 ? round3(hr / ab) : null;
  const slg = ab > 0 ? round3(tb / ab) : null;
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0 ? round3((h + bb + hbp) / obpDenom) : null;
  const ops = obp != null && slg != null ? round3(obp + slg) : null;

  const soRate =
    pa > 0 && input.so != null ? round3(input.so / pa) : null;
  const sba =
    input.sba != null && input.sba > 0
      ? input.sba
      : input.sb != null && input.cs != null
        ? input.sb + input.cs
        : null;
  const sbRate =
    sba != null && sba > 0 && input.sb != null
      ? round3(input.sb / sba)
      : null;

  const rispAb = input.rispAb ?? null;
  const rispH = input.rispH ?? null;
  const rispAvg =
    rispAb != null && rispAb > 0 && rispH != null
      ? round3(rispH / rispAb)
      : null;

  const blPa = input.basesLoadedPa ?? null;
  const blH = input.basesLoadedH ?? null;
  const basesLoadedAvg =
    blPa != null && blPa > 0 && blH != null ? round3(blH / blPa) : null;

  const csAtt = input.csAttempted ?? null;
  const csCaught = input.csCaught ?? null;
  const csRate =
    csAtt != null && csAtt > 0 && csCaught != null
      ? round3(csCaught / csAtt)
      : null;

  return {
    avg,
    hrRate,
    slg,
    obp,
    ops,
    tb,
    singles,
    soRate,
    sbRate,
    rispAvg,
    basesLoadedAvg,
    csRate,
  };
}

/** 投手率をカウントから再計算（通算でも同一） */
export function computePitcherDerived(input: {
  w?: number | null;
  l?: number | null;
  ipOuts?: number | null;
  er?: number | null;
  so?: number | null;
  h?: number | null;
  bb?: number | null;
  qs?: number | null;
  hqs?: number | null;
  gs?: number | null;
}): PitcherDerived {
  const ipOuts = input.ipOuts;
  const ipInnings =
    ipOuts != null && ipOuts >= 0 ? ipOuts / 3 : null;

  const era =
    ipInnings != null &&
    ipInnings > 0 &&
    input.er != null &&
    input.er >= 0
      ? round2((input.er * 9) / ipInnings)
      : null;

  const w = input.w;
  const l = input.l;
  const decisions =
    w != null && l != null && w >= 0 && l >= 0 ? w + l : null;
  const winPct =
    decisions != null && decisions > 0 && w != null
      ? round3(w / decisions)
      : null;

  const whip =
    ipInnings != null &&
    ipInnings > 0 &&
    input.h != null &&
    input.bb != null &&
    input.h >= 0 &&
    input.bb >= 0
      ? round2((input.h + input.bb) / ipInnings)
      : null;

  const soRate =
    ipInnings != null &&
    ipInnings > 0 &&
    input.so != null &&
    input.so >= 0
      ? round2((input.so * 9) / ipInnings)
      : null;

  const bbRate =
    ipInnings != null &&
    ipInnings > 0 &&
    input.bb != null &&
    input.bb >= 0
      ? round2((input.bb * 9) / ipInnings)
      : null;

  const kbb =
    input.bb != null &&
    input.bb > 0 &&
    input.so != null &&
    input.so >= 0
      ? round2(input.so / input.bb)
      : null;

  const gs = input.gs ?? null;
  const qsRate =
    gs != null && gs > 0 && input.qs != null ? round3(input.qs / gs) : null;
  const hqsRate =
    gs != null && gs > 0 && input.hqs != null ? round3(input.hqs / gs) : null;

  return {
    era,
    winPct,
    whip,
    soRate,
    bbRate,
    kbb,
    qsRate,
    hqsRate,
    ipDisplay: ipOuts != null && ipOuts >= 0 ? outsToIpDisplay(ipOuts) : null,
  };
}

/** 旧レコードを現行 counting 形へ寄せる（削除しない） */
export function normalizeBatterCounting(
  raw: BatterCountingInput,
): BatterCountingInput {
  const singles = resolveBatterSingles(raw);
  const tb = resolveBatterTb(raw);
  return {
    ...raw,
    singles,
    tb,
    so: raw.so ?? null,
    sba: raw.sba ?? null,
    cs: raw.cs ?? null,
    rispAb: raw.rispAb ?? null,
    rispH: raw.rispH ?? null,
    basesLoadedPa: raw.basesLoadedPa ?? null,
    basesLoadedH: raw.basesLoadedH ?? null,
    hitStreak: raw.hitStreak ?? null,
    onBaseStreak: raw.onBaseStreak ?? null,
    multiHit: raw.multiHit ?? null,
    csAttempted: raw.csAttempted ?? null,
    csAllowed: raw.csAllowed ?? null,
    csCaught: raw.csCaught ?? null,
    paQualified: raw.paQualified ?? null,
  };
}

export function normalizePitcherCounting(
  raw: PitcherCountingInput,
): PitcherCountingInput {
  return {
    ...raw,
    hld: raw.hld ?? null,
    hp: raw.hp ?? null,
    r: raw.r ?? null,
    hr: raw.hr ?? null,
    hbp: raw.hbp ?? null,
    h: raw.h ?? null,
    bb: raw.bb ?? null,
    qs: raw.qs ?? null,
    hqs: raw.hqs ?? null,
    gs: raw.gs ?? null,
    wp: raw.wp ?? null,
    sbAtt: raw.sbAtt ?? null,
    sbAllowed: raw.sbAllowed ?? null,
    ipQualified: raw.ipQualified ?? null,
    reliefIpOuts: raw.reliefIpOuts ?? null,
    reliefEr: raw.reliefEr ?? null,
    reliefSo: raw.reliefSo ?? null,
  };
}

export function batterAutoCalcItems(derived: BatterDerived): AutoCalcItem[] {
  return [
    rateItem("打率", derived.avg, formatAvgDisplay),
    rateItem("出塁率", derived.obp, formatAvgDisplay),
    rateItem("長打率", derived.slg, formatAvgDisplay),
    rateItem("OPS", derived.ops, formatAvgDisplay),
    rateItem("得点圏打率", derived.rispAvg, formatAvgDisplay),
    rateItem("盗塁成功率", derived.sbRate, formatAvgDisplay),
    rateItem("盗塁阻止率", derived.csRate, formatAvgDisplay),
  ];
}

export function pitcherAutoCalcItems(derived: PitcherDerived): AutoCalcItem[] {
  return [
    rateItem("防御率", derived.era, formatEraDisplay),
    rateItem("勝率", derived.winPct, formatWinPctDisplay),
    rateItem("WHIP", derived.whip, formatWhipDisplay),
    rateItem("奪三振率", derived.soRate, formatEraDisplay),
    rateItem("四球率", derived.bbRate, formatEraDisplay),
    rateItem("K/BB", derived.kbb, formatEraDisplay),
    rateItem("QS率", derived.qsRate, formatWinPctDisplay),
    rateItem("HQS率", derived.hqsRate, formatWinPctDisplay),
  ];
}

export function formatWhipDisplay(whip: number): string {
  if (!Number.isFinite(whip)) return "---";
  return whip.toFixed(2);
}

function rateItem(
  label: string,
  value: number | null,
  format: (n: number) => string,
): AutoCalcItem {
  if (value == null) {
    return { label, text: "---", ready: false };
  }
  return { label, text: format(value), ready: true };
}

export function validateBatterCounting(input: BatterCountingInput): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.ab) || input.ab < 0) errors.push("打数が不正です");
  if (!Number.isFinite(input.h) || input.h < 0) errors.push("安打が不正です");
  if (input.h > input.ab) errors.push("安打が打数を超えています");
  if (input.doubles + input.triples + input.hr > input.h) {
    errors.push("二塁打・三塁打・本塁打の合計が安打を超えています");
  }
  if (input.ab === 0 && input.h === 0) {
    warnings.push("打数・安打が 0 です。意図した入力か確認してください");
  }
  if (input.hr > 80) warnings.push("本塁打が非常に多い値です");
  if (input.ab > 700) warnings.push("打数が非常に多い値です");

  const derived = computeBatterDerived(input);
  if (derived.avg != null && derived.avg > 0.45) {
    warnings.push("打率が非常に高い値です");
  }
  if (derived.avg != null && derived.avg > 0 && derived.avg < 0.15) {
    warnings.push("打率が非常に低い値です");
  }

  return { errors, warnings };
}

export function validatePitcherCounting(input: PitcherCountingInput): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.ipOuts) || input.ipOuts < 0) {
    errors.push("投球回が不正です");
  }
  if (!Number.isFinite(input.er) || input.er < 0) {
    errors.push("自責点が不正です");
  }
  if (input.w < 0 || input.l < 0) errors.push("勝敗が不正です");
  if (input.ipOuts === 0) {
    warnings.push("投球回が 0 です。意図した入力か確認してください");
  }

  const derived = computePitcherDerived(input);
  if (
    derived.era != null &&
    derived.era > 0 &&
    derived.era < 0.5 &&
    input.ipOuts >= 27
  ) {
    warnings.push("防御率が非常に低い値です");
  }
  if (derived.era != null && derived.era > 8) {
    warnings.push("防御率が非常に高い値です");
  }
  if (input.w > 25) warnings.push("勝利数が非常に多い値です");

  return { errors, warnings };
}

export function formatBatterSummary(
  input: BatterCountingInput,
  derived: BatterDerived,
): string {
  return [
    derived.avg != null ? `打率 ${formatAvgDisplay(derived.avg)}` : null,
    `本塁打 ${input.hr}`,
    `打点 ${input.rbi}`,
    input.sb != null ? `盗塁 ${input.sb}` : null,
    derived.ops != null ? `OPS ${formatAvgDisplay(derived.ops)}` : null,
  ]
    .filter(Boolean)
    .join("　");
}

export function formatPitcherSummary(
  input: PitcherCountingInput,
  derived: PitcherDerived,
): string {
  return [
    derived.era != null ? `防御率 ${formatEraDisplay(derived.era)}` : null,
    `${input.w}勝`,
    `${input.l}敗`,
    input.sv != null ? `セーブ ${input.sv}` : null,
    derived.ipDisplay != null ? `投球回 ${derived.ipDisplay}` : null,
    derived.winPct != null
      ? `勝率 ${formatWinPctDisplay(derived.winPct)}`
      : null,
    derived.whip != null ? `WHIP ${formatWhipDisplay(derived.whip)}` : null,
  ]
    .filter(Boolean)
    .join("　");
}

/** 複数年度の野手カウント合算（率は呼び出し側で再計算） */
export function aggregateBatterCounting(
  rows: BatterCountingInput[],
): BatterCountingInput {
  const sum: BatterCountingInput = {
    g: 0,
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    tb: 0,
    rbi: 0,
    r: 0,
    so: 0,
    bb: 0,
    hbp: 0,
    sf: 0,
    sac: 0,
    sb: 0,
    sba: null,
    cs: null,
    rispAb: null,
    rispH: null,
    basesLoadedPa: null,
    basesLoadedH: null,
    multiHit: 0,
    csAttempted: null,
    csAllowed: null,
    csCaught: null,
    hitStreak: null,
    onBaseStreak: null,
  };

  for (const raw of rows) {
    const r = normalizeBatterCounting(raw);
    sum.g = (sum.g ?? 0) + (r.g ?? 0);
    sum.pa = (sum.pa ?? 0) + (r.pa ?? 0);
    sum.ab += r.ab;
    sum.h += r.h;
    sum.singles = (sum.singles ?? 0) + resolveBatterSingles(r);
    sum.doubles += r.doubles;
    sum.triples += r.triples;
    sum.hr += r.hr;
    sum.tb = (sum.tb ?? 0) + resolveBatterTb(r);
    sum.rbi += r.rbi;
    sum.r = (sum.r ?? 0) + (r.r ?? 0);
    sum.so = (sum.so ?? 0) + (r.so ?? 0);
    sum.bb += r.bb;
    sum.hbp = (sum.hbp ?? 0) + (r.hbp ?? 0);
    sum.sf = (sum.sf ?? 0) + (r.sf ?? 0);
    sum.sac = (sum.sac ?? 0) + (r.sac ?? 0);
    sum.sb = (sum.sb ?? 0) + (r.sb ?? 0);
    sum.multiHit = (sum.multiHit ?? 0) + (r.multiHit ?? 0);
    // 欠損は 0 に落とさず、記録がある年度だけ合算（0 と データなしを区別）
    sum.sba = addNullable(sum.sba, r.sba);
    sum.cs = addNullable(sum.cs, r.cs);
    sum.rispAb = addNullable(sum.rispAb, r.rispAb);
    sum.rispH = addNullable(sum.rispH, r.rispH);
    sum.basesLoadedPa = addNullable(sum.basesLoadedPa, r.basesLoadedPa);
    sum.basesLoadedH = addNullable(sum.basesLoadedH, r.basesLoadedH);
    sum.csAttempted = addNullable(sum.csAttempted, r.csAttempted);
    sum.csAllowed = addNullable(sum.csAllowed, r.csAllowed);
    sum.csCaught = addNullable(sum.csCaught, r.csCaught);
    // 連続記録は通算では最大値（欠損は無視）
    if (r.hitStreak != null) {
      sum.hitStreak = Math.max(sum.hitStreak ?? 0, r.hitStreak);
    }
    if (r.onBaseStreak != null) {
      sum.onBaseStreak = Math.max(sum.onBaseStreak ?? 0, r.onBaseStreak);
    }
  }

  // 盗塁企図が無い場合は 盗塁＋盗塁死 から復元（通算盗塁成功率用）
  if (
    (sum.sba == null || sum.sba <= 0) &&
    sum.sb != null &&
    sum.cs != null
  ) {
    sum.sba = (sum.sb ?? 0) + sum.cs;
  }

  return sum;
}

/** null（データなし）を保ったまま加算。双方 null なら null */
function addNullable(
  acc: number | null | undefined,
  next: number | null | undefined,
): number | null {
  if (next == null) return acc ?? null;
  return (acc ?? 0) + next;
}

/** 複数年度の投手カウント合算（投球回は outs） */
export function aggregatePitcherCounting(
  rows: PitcherCountingInput[],
): PitcherCountingInput {
  const sum: PitcherCountingInput = {
    g: 0,
    w: 0,
    l: 0,
    sv: 0,
    hld: 0,
    hp: 0,
    cg: 0,
    sho: 0,
    ipOuts: 0,
    er: 0,
    r: 0,
    so: 0,
    h: 0,
    hr: 0,
    bb: 0,
    hbp: 0,
    qs: 0,
    hqs: 0,
    gs: 0,
    wp: null,
    sbAtt: null,
    sbAllowed: null,
    reliefIpOuts: 0,
    reliefEr: 0,
    reliefSo: 0,
  };

  for (const raw of rows) {
    const r = normalizePitcherCounting(raw);
    sum.g += r.g;
    sum.w += r.w;
    sum.l += r.l;
    sum.sv = (sum.sv ?? 0) + (r.sv ?? 0);
    sum.hld = (sum.hld ?? 0) + (r.hld ?? 0);
    sum.hp = (sum.hp ?? 0) + (r.hp ?? 0);
    sum.cg = (sum.cg ?? 0) + (r.cg ?? 0);
    sum.sho = (sum.sho ?? 0) + (r.sho ?? 0);
    sum.ipOuts += r.ipOuts;
    sum.er += r.er;
    sum.r = (sum.r ?? 0) + (r.r ?? 0);
    sum.so += r.so;
    sum.h = (sum.h ?? 0) + (r.h ?? 0);
    sum.hr = (sum.hr ?? 0) + (r.hr ?? 0);
    sum.bb = (sum.bb ?? 0) + (r.bb ?? 0);
    sum.hbp = (sum.hbp ?? 0) + (r.hbp ?? 0);
    sum.qs = (sum.qs ?? 0) + (r.qs ?? 0);
    sum.hqs = (sum.hqs ?? 0) + (r.hqs ?? 0);
    sum.gs = (sum.gs ?? 0) + (r.gs ?? 0);
    sum.wp = addNullable(sum.wp, r.wp);
    sum.sbAtt = addNullable(sum.sbAtt, r.sbAtt);
    sum.sbAllowed = addNullable(sum.sbAllowed, r.sbAllowed);
    sum.reliefIpOuts = (sum.reliefIpOuts ?? 0) + (r.reliefIpOuts ?? 0);
    sum.reliefEr = (sum.reliefEr ?? 0) + (r.reliefEr ?? 0);
    sum.reliefSo = (sum.reliefSo ?? 0) + (r.reliefSo ?? 0);
  }
  return sum;
}
