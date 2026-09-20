/**
 * 通算記録ランキング（年度成績を合算して率を再計算）
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLines,
  type BatterSeasonLine,
  type PitcherSeasonLine,
  type PlayerSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import { normalizeSeasonWorld } from "@/data/seasons";
import { getTeam } from "@/data/teams";
import {
  aggregateBatterCounting,
  aggregatePitcherCounting,
  computeBatterDerived,
  computePitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";
import { classifyPitcherWorkload } from "@/lib/sop/helpers";
import {
  careerQualifiersForScope,
  formatCareerHqsRateValueText,
  formatCareerQsRateValueText,
  formatCareerRispValueText,
  formatCareerWinPctValueText,
  formatRecordsValue,
  RECORDS_CAREER_RANK_LIMIT,
  statsForRoleCareer,
  type CareerQualifiers,
  type RecordsRole,
  type RecordsStatDef,
} from "./defs";
import type { RecordsBoard, RecordsRankEntry } from "./seasonRankings";

type CareerBatterBundle = {
  playerId: string;
  playerName: string;
  teamShort: string;
  seasonCount: number;
  years: number[];
  counting: ReturnType<typeof aggregateBatterCounting>;
  derived: ReturnType<typeof computeBatterDerived>;
  /** 全シーズンで得点圏打席が未入力 */
  rispUnknown: boolean;
  /** 全シーズンで被盗企が未入力 */
  csUnknown: boolean;
};

type CareerPitcherBundle = {
  playerId: string;
  playerName: string;
  teamShort: string;
  seasonCount: number;
  years: number[];
  counting: ReturnType<typeof aggregatePitcherCounting>;
  derived: ReturnType<typeof computePitcherDerived>;
  /** いずれかのシーズンで先発登板数が未入力（救援型判定・QS率に必要） */
  gsUnknown: boolean;
};

function fullName(playerId: string, fallback: string) {
  return getPlayerMaster(playerId)?.fullName ?? fallback;
}

function latestTeamShort(lines: PlayerSeasonLine[]) {
  const sorted = [...lines].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  if (!latest) return "—";
  return getTeam(latest.teamId)?.short ?? latest.teamName;
}

/** BLUE/RED 同一年を別シーズンとして数える（通算合算は全行対象） */
function distinctSeasonKeys(lines: PlayerSeasonLine[]): string[] {
  const keys = new Set<string>();
  for (const line of lines) {
    const w = normalizeSeasonWorld(line.world);
    keys.add(w ? `${w}_${line.year}` : String(line.year));
  }
  return [...keys].sort();
}

function groupBatterCareers(
  lines: BatterSeasonLine[],
): CareerBatterBundle[] {
  const byPlayer = new Map<string, BatterSeasonLine[]>();
  for (const line of lines) {
    const list = byPlayer.get(line.playerId) ?? [];
    list.push(line);
    byPlayer.set(line.playerId, list);
  }

  const out: CareerBatterBundle[] = [];
  for (const [playerId, playerLines] of byPlayer) {
    const years = [...new Set(playerLines.map((l) => l.year))].sort(
      (a, b) => a - b,
    );
    const counting = aggregateBatterCounting(
      playerLines.map((l) => l.counting),
    );
    const rispUnknown = playerLines.every((l) => l.counting.rispAb == null);
    const csUnknown = playerLines.every((l) => l.counting.csAttempted == null);
    out.push({
      playerId,
      playerName: fullName(playerId, playerLines[0]!.playerName),
      teamShort: latestTeamShort(playerLines),
      seasonCount: distinctSeasonKeys(playerLines).length,
      years,
      counting,
      derived: computeBatterDerived(counting),
      rispUnknown,
      csUnknown,
    });
  }
  return out;
}

function groupPitcherCareers(
  lines: PitcherSeasonLine[],
): CareerPitcherBundle[] {
  const byPlayer = new Map<string, PitcherSeasonLine[]>();
  for (const line of lines) {
    const list = byPlayer.get(line.playerId) ?? [];
    list.push(line);
    byPlayer.set(line.playerId, list);
  }

  const out: CareerPitcherBundle[] = [];
  for (const [playerId, playerLines] of byPlayer) {
    const years = [...new Set(playerLines.map((l) => l.year))].sort(
      (a, b) => a - b,
    );
    const counting = aggregatePitcherCounting(
      playerLines.map((l) => l.counting),
    );
    const gsUnknown = playerLines.some((l) => l.counting.gs == null);
    out.push({
      playerId,
      playerName: fullName(playerId, playerLines[0]!.playerName),
      teamShort: latestTeamShort(playerLines),
      seasonCount: distinctSeasonKeys(playerLines).length,
      years,
      counting,
      derived: computePitcherDerived(counting),
      gsUnknown,
    });
  }
  return out;
}

function careerBatterValue(
  bundle: CareerBatterBundle,
  def: RecordsStatDef,
): number | null {
  const c = bundle.counting;
  const d = bundle.derived;
  switch (def.id) {
    case "avg":
      return d.avg;
    case "h":
      return c.h;
    case "hr":
      return c.hr;
    case "rbi":
      return c.rbi;
    case "r":
      return c.r ?? null;
    case "sb":
      return c.sb ?? null;
    case "doubles":
      return c.doubles;
    case "triples":
      return c.triples;
    case "bb":
      return c.bb;
    case "obp":
      return d.obp;
    case "slg":
      return d.slg;
    case "ops":
      return d.ops;
    case "risp": {
      // 順位は未丸めの通算 rispH÷rispAb（シーズン率の平均・round3は使わない）
      const ab = c.rispAb;
      const h = c.rispH;
      if (ab == null || ab <= 0 || h == null) return null;
      return h / ab;
    }
    case "sac":
      return c.sac ?? null;
    case "csRate":
      return d.csRate;
    default:
      return null;
  }
}

function careerPitcherValue(
  bundle: CareerPitcherBundle,
  def: RecordsStatDef,
): number | null {
  const c = bundle.counting;
  const d = bundle.derived;
  const ip = c.ipOuts / 3;
  const hpValue = c.hld ?? c.hp ?? null;
  /**
   * 救援防御率／救援奪三振率は「救援型投手の通算防御率／奪三振率」。
   * 救援専用カウントは使わず、通算自責点・奪三振・投球アウトから再計算する。
   * ERA = ER×27÷ipOuts / K9 = SO×27÷ipOuts（シーズン率の平均ではない）
   */
  const reliefEra =
    c.ipOuts > 0 && c.er != null && Number.isFinite(c.er)
      ? (c.er * 27) / c.ipOuts
      : null;
  const reliefSoRate =
    c.ipOuts > 0 && c.so != null && Number.isFinite(c.so)
      ? (c.so * 27) / c.ipOuts
      : null;

  switch (def.id) {
    case "era":
      return d.era;
    case "w":
      return c.w;
    case "winPct":
      return d.winPct;
    case "ip":
      return ip;
    case "so":
      return c.so;
    case "soRate":
      return d.soRate;
    case "whip":
      return d.whip;
    case "sv":
      return c.sv ?? null;
    case "hp":
      return hpValue;
    case "g":
      return c.g;
    case "cg":
      return c.cg ?? null;
    case "sho":
      return c.sho ?? null;
    case "qs":
      return c.qs ?? null;
    case "qsRate": {
      // 順位は未丸めの通算QS÷通算先発（シーズン率の平均・round3は使わない）
      if (bundle.gsUnknown) return null;
      const gs = c.gs ?? 0;
      if (gs <= 0) return null;
      return (c.qs ?? 0) / gs;
    }
    case "hqsRate": {
      if (bundle.gsUnknown) return null;
      const gs = c.gs ?? 0;
      if (gs <= 0) return null;
      return (c.hqs ?? 0) / gs;
    }
    case "reliefEra":
      return reliefEra;
    case "reliefSoRate":
      return reliefSoRate;
    default:
      return null;
  }
}

/** 通算打席: 保存 PA を優先。0/欠損時は構成要素から復元（0 をデータなし扱いしない） */
function careerPlateAppearances(
  c: CareerBatterBundle["counting"],
): number {
  const fromParts =
    c.ab + c.bb + (c.hbp ?? 0) + (c.sf ?? 0) + (c.sac ?? 0);
  const stored = c.pa;
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return fromParts;
}

function eligibleCareerBatter(
  bundle: CareerBatterBundle,
  def: RecordsStatDef,
  q: CareerQualifiers,
): { ok: boolean; unknown: boolean } {
  const n = bundle.seasonCount;
  const c = bundle.counting;
  switch (def.eligibility) {
    case "none":
      return { ok: true, unknown: false };
    case "pa_qualified": {
      const pa = careerPlateAppearances(c);
      return { ok: pa >= q.paPerSeason * n, unknown: false };
    }
    case "risp_50": {
      if (bundle.rispUnknown) return { ok: false, unknown: true };
      if (c.rispAb == null) return { ok: false, unknown: true };
      if (c.rispAb <= 0) return { ok: false, unknown: false };
      return {
        ok: c.rispAb >= q.rispAbPerSeason * n,
        unknown: false,
      };
    }
    case "cs_30": {
      if (bundle.csUnknown) return { ok: false, unknown: true };
      if (c.csAttempted == null) return { ok: false, unknown: true };
      return {
        ok: c.csAttempted >= q.csAttemptedPerSeason * n,
        unknown: false,
      };
    }
    default:
      return { ok: false, unknown: true };
  }
}

function eligibleCareerPitcher(
  bundle: CareerPitcherBundle,
  def: RecordsStatDef,
  q: CareerQualifiers,
): { ok: boolean; unknown: boolean } {
  const n = bundle.seasonCount;
  const c = bundle.counting;
  switch (def.eligibility) {
    case "none":
      return { ok: true, unknown: false };
    case "ip_qualified":
      // アウト数で比較（投球回の .1/.2 を通常小数と誤算しない）
      return {
        ok: c.ipOuts >= q.ipOutsPerSeason * n,
        unknown: false,
      };
    case "wins_13":
      // 通算では使わない（定義上はシーズン用）。互換のため ip_100 相当へ寄せる。
      return eligibleCareerPitcher(
        bundle,
        { ...def, eligibility: "ip_100" },
        q,
      );
    case "ip_100": {
      const decisions = (c.w ?? 0) + (c.l ?? 0);
      if (def.id === "winPct" && decisions <= 0) {
        return { ok: false, unknown: false };
      }
      if (def.id === "qsRate" || def.id === "hqsRate") {
        if (bundle.gsUnknown) return { ok: false, unknown: true };
        if ((c.gs ?? 0) <= 0) return { ok: false, unknown: false };
      }
      return {
        ok: c.ipOuts >= q.ip100OutsPerSeason * n,
        unknown: false,
      };
    }
    case "relief_30": {
      // 年度成績と同じ：救援型（先発率≤20%）かつ 登板・投球回が 30×シーズン数以上。
      // 値は通算防御率／奪三振率（救援登板時の分離成績ではない）。
      if (bundle.gsUnknown) {
        return { ok: false, unknown: true };
      }
      const { class: pClass } = classifyPitcherWorkload(c.g, c.gs ?? null);
      if (pClass === "unknown") return { ok: false, unknown: true };
      if (pClass !== "reliever") return { ok: false, unknown: false };
      return {
        ok:
          c.g >= q.reliefGPerSeason * n &&
          c.ipOuts >= q.reliefIpOutsPerSeason * n,
        unknown: false,
      };
    }
    default:
      return { ok: false, unknown: true };
  }
}

/** 同値は同順位。上位枠内の同順位は全員含める */
function rankTopTied(
  rows: {
    playerId: string;
    playerName: string;
    teamShort: string;
    year: number;
    value: number;
    valueText?: string;
  }[],
  def: RecordsStatDef,
  limit: number = RECORDS_CAREER_RANK_LIMIT,
): RecordsRankEntry[] {
  const sorted = [...rows].sort((a, b) => {
    if (def.lowerIsBetter) return a.value - b.value;
    return b.value - a.value;
  });

  const out: RecordsRankEntry[] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i]!.value;
    let j = i;
    while (j < sorted.length && sorted[j]!.value === score) j += 1;
    const rank = i + 1;
    if (rank > limit) break;
    for (let k = i; k < j; k += 1) {
      const row = sorted[k]!;
      out.push({
        rank,
        playerId: row.playerId,
        playerName: row.playerName,
        year: row.year,
        world: null,
        seasonLabel: String(row.year),
        teamShort: row.teamShort,
        value: row.value,
        valueText:
          row.valueText ?? formatRecordsValue(def.format, row.value),
      });
    }
    i = j;
  }
  return out;
}

type CareerPoolRow = {
  playerId: string;
  playerName: string;
  teamShort: string;
  year: number;
  value: number;
  valueText?: string;
};

function buildCareerPool(
  def: RecordsStatDef,
  scope: SeasonLineScope = "pennant",
): {
  pool: CareerPoolRow[];
  unknownCount: number;
  empty: boolean;
  qsOverGsCount: number;
} {
  const lines = listSeasonLines().filter(
    (l) => l.role === def.role && l.scope === scope,
  );
  const q = careerQualifiersForScope(scope);

  if (lines.length === 0) {
    return { pool: [], unknownCount: 0, empty: true, qsOverGsCount: 0 };
  }

  const pool: CareerPoolRow[] = [];
  let unknownCount = 0;
  let qsOverGsCount = 0;

  if (def.role === "batter") {
    const bundles = groupBatterCareers(
      lines.filter((l): l is BatterSeasonLine => l.role === "batter"),
    );
    for (const bundle of bundles) {
      const el = eligibleCareerBatter(bundle, def, q);
      if (el.unknown) {
        unknownCount += 1;
        continue;
      }
      if (!el.ok) continue;
      const value = careerBatterValue(bundle, def);
      // 0 / .000 は正式値。null・非有限のみ除外
      if (value == null || !Number.isFinite(value)) continue;
      let valueText: string | undefined;
      if (def.id === "risp") {
        valueText = formatCareerRispValueText(
          value,
          bundle.counting.rispAb ?? 0,
          bundle.counting.rispH ?? 0,
        );
      }
      pool.push({
        playerId: bundle.playerId,
        playerName: bundle.playerName,
        teamShort: bundle.teamShort,
        year: bundle.seasonCount,
        value,
        valueText,
      });
    }
  } else {
    const bundles = groupPitcherCareers(
      lines.filter((l): l is PitcherSeasonLine => l.role === "pitcher"),
    );
    for (const bundle of bundles) {
      const el = eligibleCareerPitcher(bundle, def, q);
      if (el.unknown) {
        unknownCount += 1;
        continue;
      }
      if (!el.ok) continue;
      const value = careerPitcherValue(bundle, def);
      if (value == null || !Number.isFinite(value)) continue;

      const c = bundle.counting;
      let valueText: string | undefined;
      if (def.id === "winPct") {
        valueText = formatCareerWinPctValueText(
          value,
          c.w ?? 0,
          c.l ?? 0,
        );
      } else if (def.id === "qsRate") {
        const qs = c.qs ?? 0;
        const gs = c.gs ?? 0;
        if (gs > 0 && qs > gs) {
          qsOverGsCount += 1;
        }
        // 矛盾があっても数値は補正せずそのまま表示
        valueText = formatCareerQsRateValueText(value, qs, gs);
      } else if (def.id === "hqsRate") {
        const hqs = c.hqs ?? 0;
        const gs = c.gs ?? 0;
        if (gs > 0 && hqs > gs) {
          qsOverGsCount += 1;
        }
        valueText = formatCareerHqsRateValueText(value, hqs, gs);
      }

      pool.push({
        playerId: bundle.playerId,
        playerName: bundle.playerName,
        teamShort: bundle.teamShort,
        year: bundle.seasonCount,
        value,
        valueText,
      });
    }
  }

  return { pool, unknownCount, empty: false, qsOverGsCount };
}

export function buildCareerRecordsBoard(
  def: RecordsStatDef,
  scope: SeasonLineScope = "pennant",
): RecordsBoard {
  // 通算のみ勝率・QS率・HQS率を投球回規定へ（シーズン記録の定義を壊さない）
  const careerDef: RecordsStatDef =
    def.id === "winPct" || def.id === "qsRate" || def.id === "hqsRate"
      ? { ...def, eligibility: "ip_100" }
      : def;
  const { pool, unknownCount, empty, qsOverGsCount } = buildCareerPool(
    careerDef,
    scope,
  );

  if (empty) {
    return {
      def: careerDef,
      entries: [],
      emptyReason:
        scope === "interleague"
          ? "正式な交流戦個人成績がまだありません。"
          : "正式な年度個人成績がまだありません。サンプル成績は歴代記録に使いません。",
    };
  }

  const entries = rankTopTied(pool, careerDef);
  let emptyReason: string | undefined;
  if (entries.length === 0) {
    if (unknownCount > 0 && careerDef.eligibility === "relief_30") {
      emptyReason =
        "先発登板数が未入力のため、救援型（先発率）の判定できる投手がいません。";
    } else if (unknownCount > 0) {
      emptyReason =
        "規定判定に必要なデータが不足しているため、表示できる記録がありません。";
    } else {
      emptyReason = "該当する正式記録がありません。";
    }
  }

  // qsOverGsCount > 0 の場合も数値は補正せずそのまま返す（報告用にカウントのみ保持）
  void qsOverGsCount;

  return { def: careerDef, entries, emptyReason };
}

export type PlayerCareerStatCard = {
  def: RecordsStatDef;
  value: number | null;
  valueText: string;
  /** 歴代順位（規定未達・データなしは null） */
  rank: number | null;
  ranked: boolean;
  note?: string;
};

/** 選手の通算各項目＋歴代順位（表示枠外も含む） */
export function getPlayerCareerStatCards(
  playerId: string,
  role: RecordsRole,
  scope: SeasonLineScope = "pennant",
): PlayerCareerStatCard[] {
  return statsForRoleCareer(role).map((def) => {
    const { pool } = buildCareerPool(def, scope);
    const mine = pool.find((p) => p.playerId === playerId);

    // 規定外でも本人の通算値は表示したいので再計算
    const lines = listSeasonLines().filter(
      (l) =>
        l.playerId === playerId &&
        l.role === role &&
        l.scope === scope,
    );
    let rawValue: number | null = null;
    if (role === "batter") {
      const batters = lines.filter(
        (l): l is BatterSeasonLine => l.role === "batter",
      );
      if (batters.length > 0) {
        const bundle = groupBatterCareers(batters).find(
          (b) => b.playerId === playerId,
        );
        if (bundle) rawValue = careerBatterValue(bundle, def);
      }
    } else {
      const pitchers = lines.filter(
        (l): l is PitcherSeasonLine => l.role === "pitcher",
      );
      if (pitchers.length > 0) {
        const bundle = groupPitcherCareers(pitchers).find(
          (b) => b.playerId === playerId,
        );
        if (bundle) rawValue = careerPitcherValue(bundle, def);
      }
    }

    if (rawValue == null || !Number.isFinite(rawValue)) {
      return {
        def,
        value: null,
        valueText: "—",
        rank: null,
        ranked: false,
        note: "データなし",
      };
    }

    let valueText = formatRecordsValue(def.format, rawValue);
    if (mine?.valueText) {
      valueText = mine.valueText;
    } else if (role === "pitcher") {
      const pitchers = lines.filter(
        (l): l is PitcherSeasonLine => l.role === "pitcher",
      );
      const bundle = groupPitcherCareers(pitchers).find(
        (b) => b.playerId === playerId,
      );
      if (bundle) {
        if (def.id === "winPct") {
          valueText = formatCareerWinPctValueText(
            rawValue,
            bundle.counting.w ?? 0,
            bundle.counting.l ?? 0,
          );
        } else if (def.id === "qsRate") {
          valueText = formatCareerQsRateValueText(
            rawValue,
            bundle.counting.qs ?? 0,
            bundle.counting.gs ?? 0,
          );
        } else if (def.id === "hqsRate") {
          valueText = formatCareerHqsRateValueText(
            rawValue,
            bundle.counting.hqs ?? 0,
            bundle.counting.gs ?? 0,
          );
        }
      }
    } else if (role === "batter" && def.id === "risp") {
      const batters = lines.filter(
        (l): l is BatterSeasonLine => l.role === "batter",
      );
      const bundle = groupBatterCareers(batters).find(
        (b) => b.playerId === playerId,
      );
      if (bundle) {
        valueText = formatCareerRispValueText(
          rawValue,
          bundle.counting.rispAb ?? 0,
          bundle.counting.rispH ?? 0,
        );
      }
    }

    if (!mine) {
      return {
        def,
        value: rawValue,
        valueText,
        rank: null,
        ranked: false,
        note:
          def.eligibility === "none"
            ? undefined
            : "規定未到達のため順位対象外",
      };
    }

    const sorted = [...pool].sort((a, b) => {
      if (def.lowerIsBetter) return a.value - b.value;
      return b.value - a.value;
    });
    let rank = 1;
    for (let i = 0; i < sorted.length; i += 1) {
      if (i > 0 && sorted[i]!.value !== sorted[i - 1]!.value) {
        rank = i + 1;
      }
      if (sorted[i]!.playerId === playerId) {
        return {
          def,
          value: rawValue,
          valueText: mine.valueText ?? valueText,
          rank,
          ranked: true,
        };
      }
    }

    return {
      def,
      value: rawValue,
      valueText: mine.valueText ?? valueText,
      rank: null,
      ranked: false,
    };
  });
}

export function buildCareerRecordsForRole(
  role: RecordsRole,
  scope: SeasonLineScope = "pennant",
): RecordsBoard[] {
  return statsForRoleCareer(role).map((def) =>
    buildCareerRecordsBoard(def, scope),
  );
}
