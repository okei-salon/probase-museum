import {
  formatAvgDisplay,
  formatEraDisplay,
  formatWinPctDisplay,
  outsToIpDisplay,
} from "@/lib/manualEntry/normalizeInput";
import type {
  TeamBattingCounting,
  TeamBattingDerived,
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

/** 打者率・指標をカウントから再計算（通算でも同一関数） */
export function computeTeamBattingDerived(
  input: TeamBattingCounting,
): TeamBattingDerived {
  const ab = input.ab;
  const h = input.h;
  const pa = input.pa;
  const tb = resolveTb(input);
  const bb = input.bb;
  const hbp = input.hbp;
  const sf = input.sf;

  const avg = ab > 0 ? round3(h / ab) : null;
  const hrRate = ab > 0 ? round3(input.hr / ab) : null;
  const slg = ab > 0 ? round3(tb / ab) : null;
  const soRate = pa > 0 ? round3(input.so / pa) : null;
  const gdpRate = ab > 0 ? round3(input.gdp / ab) : null;
  const sbRate =
    input.sba > 0 ? round3(input.sb / input.sba) : null;
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0 ? round3((h + bb + hbp) / obpDenom) : null;
  const ops = obp != null && slg != null ? round3(obp + slg) : null;

  return { avg, hrRate, slg, soRate, gdpRate, sbRate, obp, ops };
}

export function totalEr(c: TeamPitchingCounting): number {
  return (c.starterEr ?? 0) + (c.reliefEr ?? 0);
}

/** 投手率をカウントから再計算（通算でも同一関数） */
export function computeTeamPitchingDerived(
  input: TeamPitchingCounting,
): TeamPitchingDerived {
  const ipInnings = input.ipOuts / 3;
  const er = totalEr(input);

  const era =
    ipInnings > 0 ? round2((er * 9) / ipInnings) : null;

  const starterEra =
    input.starterIpOuts != null &&
    input.starterIpOuts > 0 &&
    input.starterEr >= 0
      ? round2((input.starterEr * 9) / (input.starterIpOuts / 3))
      : null;

  const reliefEra =
    input.reliefIpOuts != null &&
    input.reliefIpOuts > 0 &&
    input.reliefEr >= 0
      ? round2((input.reliefEr * 9) / (input.reliefIpOuts / 3))
      : null;

  const decisions = input.w + input.l;
  const winPct =
    decisions > 0 ? round3(input.w / decisions) : null;

  const soRate =
    ipInnings > 0 ? round2((input.so * 9) / ipInnings) : null;
  const bbRate =
    ipInnings > 0 ? round2((input.bb * 9) / ipInnings) : null;

  return { era, starterEra, reliefEra, winPct, soRate, bbRate };
}

export function buildTeamSeasonBatting(
  counting: TeamBattingCounting,
  screenRates?: TeamSeasonBatting["screenRates"],
): TeamSeasonBatting {
  const normalized: TeamBattingCounting = {
    ...counting,
    singles: resolveSingles(counting),
    tb: resolveTb(counting),
  };
  return {
    counting: normalized,
    derived: computeTeamBattingDerived(normalized),
    screenRates,
  };
}

export function buildTeamSeasonPitching(
  counting: TeamPitchingCounting,
  screenRates?: TeamSeasonPitching["screenRates"],
): TeamSeasonPitching {
  return {
    counting,
    derived: computeTeamPitchingDerived(counting),
    screenRates,
  };
}

/** 複数年度の打撃カウント合算 → 通算率は再計算 */
export function aggregateTeamBattingCounting(
  rows: TeamBattingCounting[],
): TeamBattingCounting {
  const sum: TeamBattingCounting = {
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
    sac: 0,
    sf: 0,
    gdp: 0,
    sba: 0,
    sb: 0,
    multiHit: 0,
  };
  for (const r of rows) {
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
  }
  return sum;
}

/** 複数年度の投手カウント合算（投球回は outs 加算） */
export function aggregateTeamPitchingCounting(
  rows: TeamPitchingCounting[],
): TeamPitchingCounting {
  const sum: TeamPitchingCounting = {
    ipOuts: 0,
    w: 0,
    l: 0,
    sv: 0,
    hp: 0,
    hld: 0,
    g: 0,
    sho: 0,
    cg: 0,
    so: 0,
    bb: 0,
    starterEr: 0,
    reliefEr: 0,
    starterIpOuts: 0,
    reliefIpOuts: 0,
  };
  let hasStarterIp = false;
  let hasReliefIp = false;
  for (const r of rows) {
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
): string {
  switch (key) {
    case "avg":
      return derived.avg != null ? formatAvgDisplay(derived.avg) : "---";
    case "hrRate":
      return derived.hrRate != null ? formatAvgDisplay(derived.hrRate) : "---";
    case "slg":
      return derived.slg != null ? formatAvgDisplay(derived.slg) : "---";
    case "soRate":
      return derived.soRate != null ? formatAvgDisplay(derived.soRate) : "---";
    case "gdpRate":
      return derived.gdpRate != null ? formatAvgDisplay(derived.gdpRate) : "---";
    case "sbRate":
      return derived.sbRate != null ? formatAvgDisplay(derived.sbRate) : "---";
    case "obp":
      return derived.obp != null ? formatAvgDisplay(derived.obp) : "---";
    case "ops":
      return derived.ops != null ? formatAvgDisplay(derived.ops) : "---";
    case "singles":
      return String(resolveSingles(counting));
    case "tb":
      return String(resolveTb(counting));
    default: {
      const v = (counting as Record<string, number>)[key];
      return v == null ? "---" : String(Math.round(v));
    }
  }
}

export function formatTeamPitchingField(
  key: string,
  counting: TeamPitchingCounting,
  derived: TeamPitchingDerived,
  screenRates?: TeamSeasonPitching["screenRates"],
): string {
  switch (key) {
    case "era":
      return derived.era != null
        ? formatEraDisplay(derived.era)
        : screenRates?.era != null
          ? formatEraDisplay(screenRates.era)
          : "---";
    case "starterEra":
      return derived.starterEra != null
        ? formatEraDisplay(derived.starterEra)
        : screenRates?.starterEra != null
          ? formatEraDisplay(screenRates.starterEra)
          : "---";
    case "reliefEra":
      return derived.reliefEra != null
        ? formatEraDisplay(derived.reliefEra)
        : screenRates?.reliefEra != null
          ? formatEraDisplay(screenRates.reliefEra)
          : "---";
    case "winPct":
      return derived.winPct != null
        ? formatWinPctDisplay(derived.winPct)
        : "---";
    case "soRate":
      return derived.soRate != null ? formatEraDisplay(derived.soRate) : "---";
    case "bbRate":
      return derived.bbRate != null ? formatEraDisplay(derived.bbRate) : "---";
    case "ip":
      return outsToIpDisplay(counting.ipOuts);
    case "starterEr":
      return String(counting.starterEr);
    case "reliefEr":
      return String(counting.reliefEr);
    default: {
      const v = (counting as Record<string, number | null>)[key];
      return v == null ? "---" : String(Math.round(v));
    }
  }
}

export { outsToIpDisplay };
