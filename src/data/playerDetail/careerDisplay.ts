/**
 * 選手通算成績の「表示用」カタログ。
 * RECORDS ランキング定義とは分離し、保存済みカウントから合算・再計算するだけ。
 */

import { getPlayerMaster } from "@/data/playerMaster";
import {
  listSeasonLinesByPlayer,
  type BatterSeasonLine,
  type PitcherSeasonLine,
  type SeasonLineScope,
} from "@/data/playerSeasonLines";
import {
  getCurrentTeamShort,
  getPlayerDisplayPosition,
} from "./teamTimeline";
import {
  formatRecordsValue,
  type RecordsRole,
  type RecordsStatFormat,
} from "@/data/recordsRankings/defs";
import {
  aggregateBatterCounting,
  aggregatePitcherCounting,
  computeBatterDerived,
  computePitcherDerived,
} from "@/lib/manualEntry/computeSeasonStats";

export type CareerDisplayFormat = RecordsStatFormat;

export type CareerDisplayStatDef = {
  id: string;
  label: string;
  format: CareerDisplayFormat;
};

export type CareerDisplayGroup = {
  id: string;
  title: string;
  stats: CareerDisplayStatDef[];
};

export type CareerDisplayCard = {
  id: string;
  label: string;
  value: number | null;
  valueText: string;
  format: CareerDisplayFormat;
};

export type CareerDisplayGroupResult = {
  id: string;
  title: string;
  cards: CareerDisplayCard[];
};

export type CareerDisplayBundle = {
  playerId: string;
  playerName: string;
  teamShort: string;
  positionLabel: string;
  role: RecordsRole;
  scope: SeasonLineScope;
  seasonCount: number;
  summary: CareerDisplayCard[];
  groups: CareerDisplayGroupResult[];
};

const BATTER_SUMMARY_IDS = [
  "avg",
  "hr",
  "rbi",
  "ops",
  "h",
  "sb",
] as const;

const PITCHER_SUMMARY_IDS = [
  "era",
  "w",
  "l",
  "winPct",
  "ip",
  "so",
  "sv",
  "hp",
] as const;

export const BATTER_CAREER_GROUPS: CareerDisplayGroup[] = [
  {
    id: "headline",
    title: "主要成績",
    stats: [
      { id: "avg", label: "打率", format: "avg" },
      { id: "hr", label: "本塁打", format: "int" },
      { id: "rbi", label: "打点", format: "int" },
      { id: "ops", label: "OPS", format: "avg" },
      { id: "h", label: "安打", format: "int" },
      { id: "sb", label: "盗塁", format: "int" },
    ],
  },
  {
    id: "playing",
    title: "出場・打席",
    stats: [
      { id: "g", label: "試合", format: "int" },
      { id: "pa", label: "打席", format: "int" },
      { id: "ab", label: "打数", format: "int" },
    ],
  },
  {
    id: "hitting",
    title: "打撃詳細",
    stats: [
      { id: "h", label: "安打", format: "int" },
      { id: "doubles", label: "二塁打", format: "int" },
      { id: "triples", label: "三塁打", format: "int" },
      { id: "hr", label: "本塁打", format: "int" },
      { id: "tb", label: "塁打", format: "int" },
      { id: "slg", label: "長打率", format: "avg" },
    ],
  },
  {
    id: "onbase",
    title: "出塁・選球",
    stats: [
      { id: "bb", label: "四球", format: "int" },
      { id: "hbp", label: "死球", format: "int" },
      { id: "so", label: "三振", format: "int" },
      { id: "obp", label: "出塁率", format: "avg" },
      { id: "soRate", label: "三振率", format: "avg" },
      { id: "bbRate", label: "四球率", format: "avg" },
    ],
  },
  {
    id: "clutch",
    title: "チャンス",
    stats: [
      { id: "risp", label: "得点圏打率", format: "avg" },
      { id: "rispH", label: "得点圏安打", format: "int" },
      { id: "rbi", label: "打点", format: "int" },
      { id: "r", label: "得点", format: "int" },
    ],
  },
  {
    id: "splits",
    title: "左右別",
    stats: [
      { id: "vsRhbAvg", label: "右投手打率", format: "avg" },
      { id: "vsRhbH", label: "右投手安打", format: "int" },
      { id: "vsLhbAvg", label: "左投手打率", format: "avg" },
      { id: "vsLhbH", label: "左投手安打", format: "int" },
    ],
  },
  {
    id: "running",
    title: "走塁・小技",
    stats: [
      { id: "sb", label: "盗塁", format: "int" },
      { id: "cs", label: "盗塁死", format: "int" },
      { id: "sbRate", label: "盗塁成功率", format: "avg" },
      { id: "sac", label: "犠打", format: "int" },
      { id: "sf", label: "犠飛", format: "int" },
      { id: "gdp", label: "併殺", format: "int" },
    ],
  },
];

export const PITCHER_CAREER_GROUPS: CareerDisplayGroup[] = [
  {
    id: "basic",
    title: "基本",
    stats: [
      { id: "era", label: "防御率", format: "era" },
      { id: "w", label: "勝", format: "int" },
      { id: "l", label: "敗", format: "int" },
      { id: "winPct", label: "勝率", format: "pct" },
      { id: "ip", label: "投球回", format: "ip" },
      { id: "g", label: "登板", format: "int" },
      { id: "gs", label: "先発", format: "int" },
    ],
  },
  {
    id: "starter",
    title: "先発成績",
    stats: [
      { id: "cg", label: "完投", format: "int" },
      { id: "sho", label: "完封", format: "int" },
      { id: "qs", label: "QS", format: "int" },
      { id: "qsRate", label: "QS率", format: "pct" },
      { id: "hqs", label: "HQS", format: "int" },
      { id: "hqsRate", label: "HQS率", format: "pct" },
    ],
  },
  {
    id: "kcontrol",
    title: "奪三振・制球",
    stats: [
      { id: "so", label: "奪三振", format: "int" },
      { id: "soRate", label: "奪三振率", format: "rate2" },
      { id: "bb", label: "与四球", format: "int" },
      { id: "bbRate", label: "四球率", format: "rate2" },
      { id: "hbp", label: "与死球", format: "int" },
      { id: "kbb", label: "K/BB", format: "rate2" },
    ],
  },
  {
    id: "hit",
    title: "被打撃",
    stats: [
      { id: "h", label: "被安打", format: "int" },
      { id: "avgAgainst", label: "被打率", format: "avg" },
      { id: "hr", label: "被本塁打", format: "int" },
      { id: "hrRate", label: "被本塁打率", format: "rate2" },
      { id: "whip", label: "WHIP", format: "rate2" },
    ],
  },
  {
    id: "runners",
    title: "走者・その他",
    stats: [
      { id: "sbAtt", label: "被盗企", format: "int" },
      { id: "sbAllowed", label: "許盗数", format: "int" },
      { id: "sbRateAgainst", label: "許盗率", format: "avg" },
      { id: "wp", label: "暴投", format: "int" },
      { id: "r", label: "失点", format: "int" },
      { id: "er", label: "自責点", format: "int" },
    ],
  },
  {
    id: "relief",
    title: "救援",
    stats: [
      { id: "sv", label: "セーブ", format: "int" },
      { id: "hp", label: "HP", format: "int" },
      { id: "hld", label: "ホールド", format: "int" },
    ],
  },
];

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function batterValue(
  counting: ReturnType<typeof aggregateBatterCounting>,
  derived: ReturnType<typeof computeBatterDerived>,
  id: string,
): number | null {
  const c = counting;
  const d = derived;
  const pa =
    c.pa != null && c.pa > 0
      ? c.pa
      : c.ab + c.bb + (c.hbp ?? 0) + (c.sf ?? 0) + (c.sac ?? 0);

  switch (id) {
    case "avg":
      return d.avg;
    case "g":
      return c.g ?? null;
    case "pa":
      return c.pa != null && c.pa > 0 ? c.pa : pa > 0 ? pa : null;
    case "ab":
      return c.ab;
    case "h":
      return c.h;
    case "doubles":
      return c.doubles;
    case "triples":
      return c.triples;
    case "hr":
      return c.hr;
    case "tb":
      return d.tb;
    case "slg":
      return d.slg;
    case "ops":
      return d.ops;
    case "r":
      return c.r ?? null;
    case "rbi":
      return c.rbi;
    case "bb":
      return c.bb;
    case "hbp":
      return c.hbp ?? null;
    case "so":
      return c.so ?? null;
    case "obp":
      return d.obp;
    case "soRate":
      return d.soRate;
    case "bbRate":
      return pa > 0 ? round3(c.bb / pa) : null;
    case "risp":
      return d.rispAvg;
    case "rispH":
      return c.rispH ?? null;
    case "sb":
      return c.sb ?? null;
    case "cs":
      return c.cs ?? null;
    case "sbRate":
      return d.sbRate;
    case "sac":
      return c.sac ?? null;
    case "sf":
      return c.sf ?? null;
    // 個人成績ストアに未保存の項目（チーム成績側のみ等）
    case "vsRhbAvg":
    case "vsRhbH":
    case "vsLhbAvg":
    case "vsLhbH":
    case "gdp":
      return null;
    default:
      return null;
  }
}

function pitcherValue(
  counting: ReturnType<typeof aggregatePitcherCounting>,
  derived: ReturnType<typeof computePitcherDerived>,
  id: string,
): number | null {
  const c = counting;
  const d = derived;
  const ip = c.ipOuts >= 0 ? c.ipOuts / 3 : null;
  const hpValue = c.hld ?? c.hp ?? null;
  const hldOnly = c.hld ?? null;

  switch (id) {
    case "era":
      return d.era;
    case "w":
      return c.w;
    case "l":
      return c.l;
    case "winPct":
      return d.winPct;
    case "ip":
      return ip;
    case "g":
      return c.g;
    case "gs":
      return c.gs ?? null;
    case "cg":
      return c.cg ?? null;
    case "sho":
      return c.sho ?? null;
    case "qs":
      return c.qs ?? null;
    case "qsRate":
      return d.qsRate;
    case "hqs":
      return c.hqs ?? null;
    case "hqsRate":
      return d.hqsRate;
    case "so":
      return c.so;
    case "soRate":
      return d.soRate;
    case "bb":
      return c.bb ?? null;
    case "bbRate":
      return d.bbRate;
    case "hbp":
      return c.hbp ?? null;
    case "kbb":
      return d.kbb;
    case "h":
      return c.h ?? null;
    case "avgAgainst":
      // 被打数（AB）が個人成績に無いため再計算不可
      return null;
    case "hr":
      return c.hr ?? null;
    case "hrRate":
      return ip != null && ip > 0 && c.hr != null
        ? round2((c.hr * 9) / ip)
        : null;
    case "whip":
      return d.whip;
    case "sbAtt":
      return c.sbAtt ?? null;
    case "sbAllowed":
      return c.sbAllowed ?? null;
    case "sbRateAgainst":
      return c.sbAtt != null &&
        c.sbAtt > 0 &&
        c.sbAllowed != null
        ? round3(c.sbAllowed / c.sbAtt)
        : null;
    case "wp":
      return c.wp ?? null;
    case "r":
      return c.r ?? null;
    case "er":
      return c.er;
    case "sv":
      return c.sv ?? null;
    case "hp":
      return hpValue;
    case "hld":
      return hldOnly;
    default:
      return null;
  }
}

function toCard(
  def: CareerDisplayStatDef,
  value: number | null,
): CareerDisplayCard {
  if (value == null || !Number.isFinite(value)) {
    return {
      id: def.id,
      label: def.label,
      value: null,
      valueText: "—",
      format: def.format,
    };
  }
  return {
    id: def.id,
    label: def.label,
    value,
    valueText: formatRecordsValue(def.format, value),
    format: def.format,
  };
}

function roleLabel(role: RecordsRole, positionHint: string | null): string {
  if (role === "pitcher") return "投手";
  if (positionHint && positionHint !== "投手") return positionHint;
  return "野手";
}

/**
 * 通算表示用バンドル。保存済み個人成績のみ合算し、率は分子・分母から再計算。
 * データが無い項目は null（UIで —）。ランキング定義・Neonは変更しない。
 */
export function getPlayerCareerDisplay(
  playerId: string,
  role: RecordsRole,
  scope: SeasonLineScope,
): CareerDisplayBundle | null {
  const lines = listSeasonLinesByPlayer(playerId).filter(
    (l) => l.role === role && l.scope === scope,
  );
  if (lines.length === 0) return null;

  const master = getPlayerMaster(playerId);
  const playerName =
    master?.fullName ?? lines[0]!.playerName;
  const teamShort =
    getCurrentTeamShort(playerId) ??
    lines.sort((a, b) => b.year - a.year)[0]!.teamName;
  const positionHint = getPlayerDisplayPosition(playerId);
  const seasonKeys = new Set(
    lines.map((l) => `${l.world ?? ""}_${l.year}`),
  );

  const groupsDef =
    role === "batter" ? BATTER_CAREER_GROUPS : PITCHER_CAREER_GROUPS;
  const summaryIds =
    role === "batter" ? BATTER_SUMMARY_IDS : PITCHER_SUMMARY_IDS;

  let resolve: (id: string) => number | null;

  if (role === "batter") {
    const batters = lines.filter(
      (l): l is BatterSeasonLine => l.role === "batter",
    );
    const counting = aggregateBatterCounting(batters.map((l) => l.counting));
    const derived = computeBatterDerived(counting);
    resolve = (id) => batterValue(counting, derived, id);
  } else {
    const pitchers = lines.filter(
      (l): l is PitcherSeasonLine => l.role === "pitcher",
    );
    const counting = aggregatePitcherCounting(
      pitchers.map((l) => l.counting),
    );
    const derived = computePitcherDerived(counting);
    resolve = (id) => pitcherValue(counting, derived, id);
  }

  const allDefs = groupsDef.flatMap((g) => g.stats);
  const byId = new Map(allDefs.map((d) => [d.id, d]));

  const summary: CareerDisplayCard[] = summaryIds.map((id) => {
    const def = byId.get(id) ?? {
      id,
      label: id,
      format: "int" as CareerDisplayFormat,
    };
    return toCard(def, resolve(id));
  });

  const groups: CareerDisplayGroupResult[] = groupsDef
    .filter((g) => g.id !== "headline")
    .map((g) => ({
      id: g.id,
      title: g.title,
      cards: g.stats.map((def) => toCard(def, resolve(def.id))),
    }));

  return {
    playerId,
    playerName,
    teamShort,
    positionLabel: roleLabel(role, positionHint),
    role,
    scope,
    seasonCount: seasonKeys.size,
    summary,
    groups,
  };
}
