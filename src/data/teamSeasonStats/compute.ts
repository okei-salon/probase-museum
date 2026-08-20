import {
  formatAvgDisplay,
  formatEraDisplay,
  formatWinPctDisplay,
  outsToIpDisplay,
} from "@/lib/manualEntry/normalizeInput";
import type {
  TeamBattingCounting,
  TeamBattingDerived,
  TeamBattingScreenRates,
  TeamPitchingCounting,
  TeamPitchingDerived,
  TeamSeasonBatting,
  TeamSeasonPitching,
} from "./types";

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function resolveSingles(c: TeamBattingCounting): number {
  const computed = Math.max(0, c.h - c.doubles - c.triples - c.hr);
  // 0 は未入力とみなし、安打がある場合は内訳から算出
  if (c.singles > 0) return c.singles;
  return computed;
}

export function resolveTb(c: TeamBattingCounting): number {
  const singles = resolveSingles(c);
  const computed = singles + 2 * c.doubles + 3 * c.triples + 4 * c.hr;
  if (c.tb > 0) return c.tb;
  return computed;
}

/** 旧レコード欠けフィールドを補完 */
export function normalizeTeamBattingCounting(
  raw: Partial<TeamBattingCounting> | null | undefined,
): TeamBattingCounting {
  return {
    g: raw?.g ?? 0,
    pa: raw?.pa ?? 0,
    ab: raw?.ab ?? 0,
    h: raw?.h ?? 0,
    singles: raw?.singles ?? 0,
    doubles: raw?.doubles ?? 0,
    triples: raw?.triples ?? 0,
    hr: raw?.hr ?? 0,
    tb: raw?.tb ?? 0,
    rbi: raw?.rbi ?? 0,
    r: raw?.r ?? 0,
    so: raw?.so ?? 0,
    bb: raw?.bb ?? 0,
    hbp: raw?.hbp ?? 0,
    sac: raw?.sac ?? 0,
    sf: raw?.sf ?? 0,
    gdp: raw?.gdp ?? 0,
    sba: raw?.sba ?? 0,
    sb: raw?.sb ?? 0,
    multiHit: raw?.multiHit ?? 0,
    rispAb: raw?.rispAb ?? null,
    rispH: raw?.rispH ?? null,
    basesLoadedAb: raw?.basesLoadedAb ?? null,
    basesLoadedH: raw?.basesLoadedH ?? null,
    vsRhbAb: raw?.vsRhbAb ?? null,
    vsRhbH: raw?.vsRhbH ?? null,
    vsLhbAb: raw?.vsLhbAb ?? null,
    vsLhbH: raw?.vsLhbH ?? null,
    bip: raw?.bip ?? null,
  };
}

/** 打者率・指標をカウントから再計算（通算でも同一関数） */
export function computeTeamBattingDerived(
  input: TeamBattingCounting,
): TeamBattingDerived {
  const c = normalizeTeamBattingCounting(input);
  const ab = c.ab;
  const h = c.h;
  const pa = c.pa;
  const tb = resolveTb(c);
  const bb = c.bb;
  const hbp = c.hbp;
  const sf = c.sf;

  const avg = ab > 0 ? round3(h / ab) : null;
  const hrRate = ab > 0 ? round3(c.hr / ab) : null;
  const slg = ab > 0 ? round3(tb / ab) : null;
  const soRate = pa > 0 ? round3(c.so / pa) : null;
  const gdpRate = ab > 0 ? round3(c.gdp / ab) : null;
  const sbRate = c.sba > 0 ? round3(c.sb / c.sba) : null;
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0 ? round3((h + bb + hbp) / obpDenom) : null;
  const ops = obp != null && slg != null ? round3(obp + slg) : null;
  const rispAvg =
    c.rispAb != null && c.rispAb > 0 && c.rispH != null
      ? round3(c.rispH / c.rispAb)
      : null;
  const basesLoadedAvg =
    c.basesLoadedAb != null &&
    c.basesLoadedAb > 0 &&
    c.basesLoadedH != null
      ? round3(c.basesLoadedH / c.basesLoadedAb)
      : null;
  const vsRhbAvg =
    c.vsRhbAb != null && c.vsRhbAb > 0 && c.vsRhbH != null
      ? round3(c.vsRhbH / c.vsRhbAb)
      : null;
  const vsLhbAvg =
    c.vsLhbAb != null && c.vsLhbAb > 0 && c.vsLhbH != null
      ? round3(c.vsLhbH / c.vsLhbAb)
      : null;

  return {
    avg,
    hrRate,
    slg,
    soRate,
    gdpRate,
    sbRate,
    obp,
    ops,
    rispAvg,
    basesLoadedAvg,
    vsRhbAvg,
    vsLhbAvg,
  };
}

/** 自責点合計。er 明示時はそれを優先、否则 先発+救援 */
export function totalEr(c: TeamPitchingCounting): number {
  if (c.er != null) return c.er;
  return (c.starterEr ?? 0) + (c.reliefEr ?? 0);
}

/** 旧レコード欠けフィールドを補完 */
export function normalizeTeamPitchingCounting(
  raw: Partial<TeamPitchingCounting> | null | undefined,
): TeamPitchingCounting {
  return {
    ipOuts: raw?.ipOuts ?? 0,
    w: raw?.w ?? 0,
    l: raw?.l ?? 0,
    sv: raw?.sv ?? 0,
    hp: raw?.hp ?? 0,
    hld: raw?.hld ?? 0,
    g: raw?.g ?? 0,
    sho: raw?.sho ?? 0,
    cg: raw?.cg ?? 0,
    so: raw?.so ?? 0,
    bb: raw?.bb ?? 0,
    starterEr: raw?.starterEr ?? 0,
    reliefEr: raw?.reliefEr ?? 0,
    starterIpOuts: raw?.starterIpOuts ?? null,
    reliefIpOuts: raw?.reliefIpOuts ?? null,
    hbp: raw?.hbp ?? null,
    bf: raw?.bf ?? null,
    abAgainst: raw?.abAgainst ?? null,
    hitsAllowed: raw?.hitsAllowed ?? null,
    rispH: raw?.rispH ?? null,
    vsRhbH: raw?.vsRhbH ?? null,
    vsLhbH: raw?.vsLhbH ?? null,
    hrAllowed: raw?.hrAllowed ?? null,
    sbaAgainst: raw?.sbaAgainst ?? null,
    sbAllowed: raw?.sbAllowed ?? null,
    wp: raw?.wp ?? null,
    r: raw?.r ?? null,
    er: raw?.er ?? null,
  };
}

/** 投手率をカウントから再計算（通算でも同一関数） */
export function computeTeamPitchingDerived(
  input: TeamPitchingCounting,
): TeamPitchingDerived {
  const c = normalizeTeamPitchingCounting(input);
  const ipInnings = c.ipOuts / 3;
  const er = totalEr(c);

  const era =
    ipInnings > 0 ? round2((er * 9) / ipInnings) : null;

  const starterEra =
    c.starterIpOuts != null &&
    c.starterIpOuts > 0 &&
    c.starterEr >= 0
      ? round2((c.starterEr * 9) / (c.starterIpOuts / 3))
      : null;

  const reliefEra =
    c.reliefIpOuts != null &&
    c.reliefIpOuts > 0 &&
    c.reliefEr >= 0
      ? round2((c.reliefEr * 9) / (c.reliefIpOuts / 3))
      : null;

  const decisions = c.w + c.l;
  const winPct =
    decisions > 0 ? round3(c.w / decisions) : null;

  const soRate =
    ipInnings > 0 ? round2((c.so * 9) / ipInnings) : null;
  const bbRate =
    ipInnings > 0 ? round2((c.bb * 9) / ipInnings) : null;
  const hbpRate =
    ipInnings > 0 && c.hbp != null
      ? round2((c.hbp * 9) / ipInnings)
      : null;
  const avgAgainst =
    c.abAgainst != null &&
    c.abAgainst > 0 &&
    c.hitsAllowed != null
      ? round3(c.hitsAllowed / c.abAgainst)
      : null;
  const hrRateAllowed =
    ipInnings > 0 && c.hrAllowed != null
      ? round2((c.hrAllowed * 9) / ipInnings)
      : null;
  const sbRateAgainst =
    c.sbaAgainst != null &&
    c.sbaAgainst > 0 &&
    c.sbAllowed != null
      ? round3(c.sbAllowed / c.sbaAgainst)
      : null;

  return {
    era,
    starterEra,
    reliefEra,
    winPct,
    soRate,
    bbRate,
    hbpRate,
    avgAgainst,
    hrRateAllowed,
    sbRateAgainst,
  };
}

export function buildTeamSeasonBatting(
  counting: TeamBattingCounting,
  screenRates?: TeamSeasonBatting["screenRates"],
): TeamSeasonBatting {
  const base = normalizeTeamBattingCounting(counting);
  const withResolved: TeamBattingCounting = {
    ...base,
    singles: resolveSingles(base),
    tb: resolveTb(base),
  };
  return {
    counting: withResolved,
    derived: computeTeamBattingDerived(withResolved),
    screenRates,
  };
}

/**
 * 既存打撃 + 今回入力分を項目単位 merge（未入力は既存維持）。
 */
export function mergeTeamSeasonBatting(
  existing: TeamSeasonBatting | null | undefined,
  countingPatch: Partial<TeamBattingCounting>,
  screenRatesPatch?: TeamBattingScreenRates,
): TeamSeasonBatting {
  const base = normalizeTeamBattingCounting(existing?.counting);
  const mergedCounting: TeamBattingCounting = { ...base };
  for (const [key, value] of Object.entries(countingPatch) as Array<
    [keyof TeamBattingCounting, TeamBattingCounting[keyof TeamBattingCounting]]
  >) {
    if (value !== undefined) {
      (mergedCounting as Record<string, unknown>)[key] = value;
    }
  }
  const mergedScreen: TeamBattingScreenRates = {
    ...(existing?.screenRates ?? {}),
  };
  if (screenRatesPatch) {
    for (const [key, value] of Object.entries(screenRatesPatch)) {
      if (value !== undefined) {
        (mergedScreen as Record<string, unknown>)[key] = value;
      }
    }
  }
  return buildTeamSeasonBatting(mergedCounting, mergedScreen);
}

export function buildTeamSeasonPitching(
  counting: TeamPitchingCounting,
  screenRates?: TeamSeasonPitching["screenRates"],
): TeamSeasonPitching {
  const normalized = normalizeTeamPitchingCounting(counting);
  return {
    counting: normalized,
    derived: computeTeamPitchingDerived(normalized),
    screenRates,
  };
}

/** 複数年度の打撃カウント合算 → 通算率は再計算 */
export function aggregateTeamBattingCounting(
  rows: TeamBattingCounting[],
): TeamBattingCounting {
  const sum = normalizeTeamBattingCounting({});
  for (const raw of rows) {
    const r = normalizeTeamBattingCounting(raw);
    sum.g += r.g;
    sum.pa += r.pa;
    sum.ab += r.ab;
    sum.h += r.h;
    sum.singles += resolveSingles(r);
    sum.doubles += r.doubles;
    sum.triples += r.triples;
    sum.hr += r.hr;
    sum.tb += resolveTb(r);
    sum.rbi += r.rbi;
    sum.r += r.r;
    sum.so += r.so;
    sum.bb += r.bb;
    sum.hbp += r.hbp;
    sum.sac += r.sac;
    sum.sf += r.sf;
    sum.gdp += r.gdp;
    sum.sba += r.sba;
    sum.sb += r.sb;
    sum.multiHit += r.multiHit;
    sum.rispAb = addNullable(sum.rispAb, r.rispAb);
    sum.rispH = addNullable(sum.rispH, r.rispH);
    sum.basesLoadedAb = addNullable(sum.basesLoadedAb, r.basesLoadedAb);
    sum.basesLoadedH = addNullable(sum.basesLoadedH, r.basesLoadedH);
    sum.vsRhbAb = addNullable(sum.vsRhbAb, r.vsRhbAb);
    sum.vsRhbH = addNullable(sum.vsRhbH, r.vsRhbH);
    sum.vsLhbAb = addNullable(sum.vsLhbAb, r.vsLhbAb);
    sum.vsLhbH = addNullable(sum.vsLhbH, r.vsLhbH);
    sum.bip = addNullable(sum.bip, r.bip);
  }
  return sum;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** 複数年度の投手カウント合算（投球回は outs 加算） */
export function aggregateTeamPitchingCounting(
  rows: TeamPitchingCounting[],
): TeamPitchingCounting {
  const sum = normalizeTeamPitchingCounting({});
  let hasStarterIp = false;
  let hasReliefIp = false;
  for (const raw of rows) {
    const r = normalizeTeamPitchingCounting(raw);
    sum.ipOuts += r.ipOuts;
    sum.w += r.w;
    sum.l += r.l;
    sum.sv += r.sv;
    sum.hp += r.hp;
    sum.hld += r.hld;
    sum.g += r.g;
    sum.sho += r.sho;
    sum.cg += r.cg;
    sum.so += r.so;
    sum.bb += r.bb;
    sum.starterEr += r.starterEr;
    sum.reliefEr += r.reliefEr;
    if (r.starterIpOuts != null) {
      hasStarterIp = true;
      sum.starterIpOuts = (sum.starterIpOuts ?? 0) + r.starterIpOuts;
    }
    if (r.reliefIpOuts != null) {
      hasReliefIp = true;
      sum.reliefIpOuts = (sum.reliefIpOuts ?? 0) + r.reliefIpOuts;
    }
    sum.hbp = addNullable(sum.hbp, r.hbp);
    sum.bf = addNullable(sum.bf, r.bf);
    sum.abAgainst = addNullable(sum.abAgainst, r.abAgainst);
    sum.hitsAllowed = addNullable(sum.hitsAllowed, r.hitsAllowed);
    sum.rispH = addNullable(sum.rispH, r.rispH);
    sum.vsRhbH = addNullable(sum.vsRhbH, r.vsRhbH);
    sum.vsLhbH = addNullable(sum.vsLhbH, r.vsLhbH);
    sum.hrAllowed = addNullable(sum.hrAllowed, r.hrAllowed);
    sum.sbaAgainst = addNullable(sum.sbaAgainst, r.sbaAgainst);
    sum.sbAllowed = addNullable(sum.sbAllowed, r.sbAllowed);
    sum.wp = addNullable(sum.wp, r.wp);
    sum.r = addNullable(sum.r, r.r);
    sum.er = addNullable(sum.er, r.er);
  }
  return {
    ...sum,
    starterIpOuts: hasStarterIp ? sum.starterIpOuts : null,
    reliefIpOuts: hasReliefIp ? sum.reliefIpOuts : null,
  };
}

export function formatTeamBattingField(
  key: string,
  counting: TeamBattingCounting,
  derived: TeamBattingDerived,
  screenRates?: TeamSeasonBatting["screenRates"],
): string {
  const c = normalizeTeamBattingCounting(counting);
  switch (key) {
    case "avg":
      return rateOrScreen(derived.avg, screenRates?.avg, "avg");
    case "hrRate":
      return rateOrScreen(derived.hrRate, screenRates?.hrRate, "avg");
    case "slg":
      return rateOrScreen(derived.slg, screenRates?.slg, "avg");
    case "soRate":
      return rateOrScreen(derived.soRate, screenRates?.soRate, "avg");
    case "gdpRate":
      return rateOrScreen(derived.gdpRate, screenRates?.gdpRate, "avg");
    case "sbRate":
      return rateOrScreen(derived.sbRate, screenRates?.sbRate, "avg");
    case "obp":
      return rateOrScreen(derived.obp, screenRates?.obp, "avg");
    case "ops":
      return rateOrScreen(derived.ops, screenRates?.ops, "avg");
    case "rispAvg":
      return rateOrScreen(derived.rispAvg, screenRates?.rispAvg, "avg");
    case "rispAvgDiff":
      return rateOrScreen(null, screenRates?.rispAvgDiff, "avg");
    case "basesLoadedAvg":
      return rateOrScreen(
        derived.basesLoadedAvg,
        screenRates?.basesLoadedAvg,
        "avg",
      );
    case "basesLoadedAvgDiff":
      return rateOrScreen(null, screenRates?.basesLoadedAvgDiff, "avg");
    case "vsRhbAvg":
      return rateOrScreen(derived.vsRhbAvg, screenRates?.vsRhbAvg, "avg");
    case "vsRhbAvgDiff":
      return rateOrScreen(null, screenRates?.vsRhbAvgDiff, "avg");
    case "vsLhbAvg":
      return rateOrScreen(derived.vsLhbAvg, screenRates?.vsLhbAvg, "avg");
    case "vsLhbAvgDiff":
      return rateOrScreen(null, screenRates?.vsLhbAvgDiff, "avg");
    case "singles":
      return String(resolveSingles(c));
    case "tb":
      return String(resolveTb(c));
    default: {
      const v = (c as Record<string, number | null>)[key];
      return v == null ? "---" : String(Math.round(v));
    }
  }
}

function rateOrScreen(
  derived: number | null | undefined,
  screen: number | null | undefined,
  kind: "avg" | "era",
): string {
  const v = derived ?? screen ?? null;
  if (v == null) return "---";
  return kind === "avg" ? formatAvgDisplay(v) : formatEraDisplay(v);
}

export function formatTeamPitchingField(
  key: string,
  counting: TeamPitchingCounting,
  derived: TeamPitchingDerived,
  screenRates?: TeamSeasonPitching["screenRates"],
): string {
  const c = normalizeTeamPitchingCounting(counting);
  switch (key) {
    case "era":
      return rateOrScreen(derived.era, screenRates?.era, "era");
    case "starterEra":
      return rateOrScreen(derived.starterEra, screenRates?.starterEra, "era");
    case "reliefEra":
      return rateOrScreen(derived.reliefEra, screenRates?.reliefEra, "era");
    case "winPct":
      return derived.winPct != null
        ? formatWinPctDisplay(derived.winPct)
        : screenRates?.winPct != null
          ? formatWinPctDisplay(screenRates.winPct)
          : "---";
    case "soRate":
      return rateOrScreen(derived.soRate, screenRates?.soRate, "era");
    case "bbRate":
      return rateOrScreen(derived.bbRate, screenRates?.bbRate, "era");
    case "hbpRate":
      return rateOrScreen(derived.hbpRate, screenRates?.hbpRate, "era");
    case "avgAgainst":
      return rateOrScreen(derived.avgAgainst, screenRates?.avgAgainst, "avg");
    case "rispAvg":
      return rateOrScreen(null, screenRates?.rispAvg, "avg");
    case "rispAvgDiff":
      return rateOrScreen(null, screenRates?.rispAvgDiff, "avg");
    case "vsRhbAvg":
      return rateOrScreen(null, screenRates?.vsRhbAvg, "avg");
    case "vsRhbAvgDiff":
      return rateOrScreen(null, screenRates?.vsRhbAvgDiff, "avg");
    case "vsLhbAvg":
      return rateOrScreen(null, screenRates?.vsLhbAvg, "avg");
    case "vsLhbAvgDiff":
      return rateOrScreen(null, screenRates?.vsLhbAvgDiff, "avg");
    case "hrRateAllowed":
      return rateOrScreen(
        derived.hrRateAllowed,
        screenRates?.hrRateAllowed,
        "era",
      );
    case "sbRateAgainst":
      return rateOrScreen(
        derived.sbRateAgainst,
        screenRates?.sbRateAgainst,
        "avg",
      );
    case "ip":
      return outsToIpDisplay(c.ipOuts);
    case "er":
      return String(totalEr(c));
    default: {
      const v = (c as Record<string, number | null>)[key];
      return v == null ? "---" : String(Math.round(v));
    }
  }
}

export { outsToIpDisplay };
