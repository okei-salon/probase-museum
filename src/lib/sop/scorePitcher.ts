import {
  CONSECUTIVE_YEAR_BONUS,
  PITCHER_BASIC,
  PITCHER_COMBOS,
  PITCHER_COMBO_COVERS,
  PITCHER_FEATS,
  PITCHER_HISTORIC,
} from "./rules";
import { bestTierPoints } from "./helpers";
import {
  meetsNpbRecord,
  NPB_FEAT_RECORDS,
  NPB_PITCHER_SEASON_RECORDS,
  NPB_RECORD_BONUS_POINTS,
} from "./npbRecords";
import type { SopFeatsInput, SopPitcherStats, SopPriorYearFlags } from "./input";
import type { SopLineItem } from "./types";

type BasicHit = { id: string; label: string; points: number };

function isEra1x(era: number): boolean {
  return era >= 1.0 && era < 2.0;
}
function isEra0x(era: number): boolean {
  return era >= 0 && era < 1.0;
}
function isEra2x(era: number): boolean {
  return era >= 2.0 && era < 3.0;
}

function collectPitcherBasics(s: SopPitcherStats): BasicHit[] {
  const hits: BasicHit[] = [];
  const add = (id: keyof typeof PITCHER_BASIC, ok: boolean) => {
    if (!ok) return;
    const def = PITCHER_BASIC[id];
    hits.push({ id, label: def.label, points: def.points });
  };

  if (s.cg != null) add("cg10", s.cg >= 10);
  if (s.g != null) add("g50", s.g >= 50);
  if (s.sv != null) add("sv30", s.sv >= 30);
  const hp = s.hp ?? s.hld;
  if (hp != null) add("hp30", hp >= 30);
  if (s.soRate != null) add("soRate9", s.soRate >= 9);
  if (s.qsRate != null) add("qsRate80", s.qsRate >= 0.8);
  if (s.sho != null) add("sho5", s.sho >= 5);
  if (s.era != null && s.pitcherClass === "starter") {
    add("starterEra1", isEra1x(s.era));
  }
  if (s.w != null) add("w15", s.w >= 15);
  if (s.so != null) add("so200", s.so >= 200);
  if (s.ip != null) add("ip200", s.ip >= 200);
  if (s.winPct != null) add("winPct800", s.winPct >= 0.8);
  return hits;
}

function collectPitcherCombos(s: SopPitcherStats): {
  id: string;
  label: string;
  points: number;
}[] {
  const out: { id: string; label: string; points: number }[] = [];
  const era = s.era;
  const w = s.w;
  const so = s.so;
  const ip = s.ip;
  const hp = s.hp ?? s.hld;
  const sv = s.sv;

  const top =
    s.pitcherClass === "starter" &&
    era != null &&
    isEra1x(era) &&
    w != null &&
    w >= 15 &&
    so != null &&
    so >= 200 &&
    ip != null &&
    ip >= 200;

  if (top) {
    out.push({
      id: "starterEra1W15So200Ip200",
      label: PITCHER_COMBOS.starterEra1W15So200Ip200.label,
      points: PITCHER_COMBOS.starterEra1W15So200Ip200.points,
    });
  } else if (
    w != null &&
    w >= 15 &&
    so != null &&
    so >= 200 &&
    ip != null &&
    ip >= 200
  ) {
    out.push({
      id: "w15So200Ip200",
      label: PITCHER_COMBOS.w15So200Ip200.label,
      points: PITCHER_COMBOS.w15So200Ip200.points,
    });
  }

  if (
    era != null &&
    isEra2x(era) &&
    w != null &&
    w >= 13 &&
    so != null &&
    so >= 150
  ) {
    // 上位複合と重複しても別カテゴリ条件だが、仕様上「同じ意味の二重加点しない」
    // 上位に含まれる場合は付けない
    if (!top) {
      out.push({
        id: "era2W13So150",
        label: PITCHER_COMBOS.era2W13So150.label,
        points: PITCHER_COMBOS.era2W13So150.points,
      });
    }
  }

  if (
    s.pitcherClass === "reliever" &&
    era != null &&
    isEra1x(era) &&
    ((sv != null && sv >= 30) || (hp != null && hp >= 30))
  ) {
    out.push({
      id: "relieverEra1SvOrHp30",
      label: PITCHER_COMBOS.relieverEra1SvOrHp30.label,
      points: PITCHER_COMBOS.relieverEra1SvOrHp30.points,
    });
  }

  return out;
}

function applyHistoricPitcher(
  s: SopPitcherStats,
  covered: Set<string>,
): SopLineItem[] {
  const items: SopLineItem[] = [];
  const tryAdd = (id: keyof typeof PITCHER_HISTORIC, ok: boolean) => {
    if (!ok) return;
    const def = PITCHER_HISTORIC[id];
    items.push({
      id: `historic:${id}`,
      category: "historic",
      label: def.label,
      points: def.points,
    });
    for (const c of def.covers) covered.add(c);
  };

  if (s.era != null && s.pitcherClass === "starter") {
    tryAdd("starterEra0", isEra0x(s.era));
  }
  if (s.winPct != null) {
    tryAdd("winPct1000", s.winPct >= 1.0 && (s.w ?? 0) > 0);
  }
  if (s.sho != null) tryAdd("sho10", s.sho >= 10);
  if (s.cg != null) tryAdd("cg20", s.cg >= 20);
  if (s.g != null) tryAdd("g80", s.g >= 80);
  if (s.w != null) tryAdd("w20", s.w >= 20);
  const hp = s.hp ?? s.hld;
  if (hp != null) tryAdd("hp50", hp >= 50);
  return items;
}

function scorePitcherFeats(
  s: SopPitcherStats,
  feats: SopFeatsInput,
): SopLineItem[] {
  const items: SopLineItem[] = [];
  if (feats.perfectGame) {
    items.push({
      id: "feat:perfectGame",
      category: "feats_streaks",
      label: PITCHER_FEATS.perfectGame.label,
      points: PITCHER_FEATS.perfectGame.points,
    });
  }
  if (feats.noHitter) {
    items.push({
      id: "feat:noHitter",
      category: "feats_streaks",
      label: PITCHER_FEATS.noHitter.label,
      points: PITCHER_FEATS.noHitter.points,
    });
  }
  const sc = bestTierPoints(
    feats.scorelessIp ?? null,
    PITCHER_FEATS.scorelessIp,
  );
  if (sc) {
    items.push({
      id: "feat:scorelessIp",
      category: "feats_streaks",
      label: `連続無失点イニング ${feats.scorelessIp}`,
      points: sc.points,
    });
  }
  const gso = bestTierPoints(feats.gameSo ?? null, PITCHER_FEATS.gameSo);
  if (gso) {
    items.push({
      id: "feat:gameSo",
      category: "feats_streaks",
      label: `1試合奪三振 ${feats.gameSo}`,
      points: gso.points,
    });
  }
  const ws = bestTierPoints(feats.winStreak ?? null, PITCHER_FEATS.winStreak);
  if (ws) {
    items.push({
      id: "feat:winStreak",
      category: "feats_streaks",
      label: `連勝 ${feats.winStreak}`,
      points: ws.points,
    });
  }
  if (s.w != null && s.l != null && s.w >= 10 && s.l === 0) {
    items.push({
      id: "feat:undefeated10",
      category: "feats_streaks",
      label: PITCHER_FEATS.undefeated10.label,
      points: PITCHER_FEATS.undefeated10.points,
    });
  }
  return items;
}

function scorePitcherNpb(
  s: SopPitcherStats,
  feats: SopFeatsInput,
): SopLineItem[] {
  const items: SopLineItem[] = [];
  const hp = s.hp ?? s.hld;
  const fieldMap: Record<string, number | null | undefined> = {
    era: s.era,
    w: s.w,
    so: s.so,
    g: s.g,
    cg: s.cg,
    sho: s.sho,
    sv: s.sv,
    hld: s.hld,
    hp,
    ip: s.ip,
    winPct: s.winPct,
  };
  for (const def of NPB_PITCHER_SEASON_RECORDS) {
    if (meetsNpbRecord(fieldMap[def.field], def)) {
      items.push({
        id: `npb:${def.id}`,
        category: "npb_record",
        label: `NPB記録 ${def.label}`,
        points: NPB_RECORD_BONUS_POINTS,
      });
    }
  }
  for (const def of NPB_FEAT_RECORDS) {
    const v =
      def.field === "scorelessIp"
        ? feats.scorelessIp
        : def.field === "gameSo"
          ? feats.gameSo
          : def.field === "winStreak"
            ? feats.winStreak
            : null;
    if (meetsNpbRecord(v, def)) {
      items.push({
        id: `npb:${def.id}`,
        category: "npb_record",
        label: `NPB記録 ${def.label}`,
        points: NPB_RECORD_BONUS_POINTS,
      });
    }
  }
  return items;
}

function consecutiveBonus(
  currentBasicIds: string[],
  currentComboIds: string[],
  prior: SopPriorYearFlags | null | undefined,
): SopLineItem[] {
  if (!prior) return [];
  const items: SopLineItem[] = [];
  const priorBasic = new Set(prior.basicIds);
  const priorCombo = new Set(prior.comboIds);

  for (const id of currentComboIds) {
    if (priorCombo.has(id)) {
      items.push({
        id: `consec:combo:${id}`,
        category: "consecutive_year",
        label: `連続年（複合）`,
        points: CONSECUTIVE_YEAR_BONUS.combo,
        detail: id,
      });
    }
  }
  for (const id of currentBasicIds) {
    if (priorBasic.has(id)) {
      items.push({
        id: `consec:basic:${id}`,
        category: "consecutive_year",
        label: `連続年（基本）`,
        points: CONSECUTIVE_YEAR_BONUS.basic,
        detail: id,
      });
    }
  }
  return items;
}

export function scorePitcherSeason(
  s: SopPitcherStats | null | undefined,
  feats: SopFeatsInput,
  prior: SopPriorYearFlags | null | undefined,
): {
  items: SopLineItem[];
  basicIds: string[];
  comboIds: string[];
} {
  if (!s) return { items: [], basicIds: [], comboIds: [] };

  const covered = new Set<string>();
  const historicItems = applyHistoricPitcher(s, covered);
  const combos = collectPitcherCombos(s);

  for (const c of combos) {
    const covers = PITCHER_COMBO_COVERS[c.id] ?? [];
    for (const cover of covers) covered.add(cover);
    // 救援複合: 達成した方の30S/30HPのみカバー
    if (c.id === "relieverEra1SvOrHp30") {
      if ((s.sv ?? 0) >= 30) covered.add("sv30");
      if ((s.hp ?? s.hld ?? 0) >= 30) covered.add("hp30");
    }
  }

  // 上位複合がある場合、下位の w15So200Ip200 は既に collect で排他
  const basics = collectPitcherBasics(s).filter((b) => !covered.has(b.id));
  const basicIds = basics.map((b) => b.id);
  const comboIds = combos.map((c) => c.id);

  const items: SopLineItem[] = [
    ...combos.map((c) => ({
      id: `combo:${c.id}`,
      category: "combo" as const,
      label: c.label,
      points: c.points,
    })),
    ...basics.map((b) => ({
      id: `basic:${b.id}`,
      category: "season_basic" as const,
      label: b.label,
      points: b.points,
    })),
    ...historicItems,
    ...scorePitcherFeats(s, feats),
    ...scorePitcherNpb(s, feats),
    ...consecutiveBonus(basicIds, comboIds, prior),
  ];

  return { items, basicIds, comboIds };
}
