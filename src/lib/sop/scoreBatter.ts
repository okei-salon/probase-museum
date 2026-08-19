import {
  BATTER_BASIC,
  BATTER_COMBOS,
  BATTER_COMBO_COVERS,
  BATTER_FEATS,
  BATTER_HISTORIC,
  CONSECUTIVE_YEAR_BONUS,
  HR_SB_COMBO_TIERS,
  HR_SB_MIN_EACH,
} from "./rules";
import { bestSumTierPoints, bestTierPoints } from "./helpers";
import {
  meetsNpbRecord,
  NPB_BATTER_SEASON_RECORDS,
  NPB_FEAT_RECORDS,
  NPB_RECORD_BONUS_POINTS,
} from "./npbRecords";
import type { SopBatterStats, SopFeatsInput, SopPriorYearFlags } from "./input";
import type { SopLineItem } from "./types";

type BasicHit = { id: string; label: string; points: number };

function collectBatterBasics(s: SopBatterStats): BasicHit[] {
  const hits: BasicHit[] = [];
  const add = (id: keyof typeof BATTER_BASIC, ok: boolean) => {
    if (!ok) return;
    const def = BATTER_BASIC[id];
    hits.push({ id, label: def.label, points: def.points });
  };

  if (s.avg != null) add("avg300", s.avg >= 0.3);
  if (s.hr != null) add("hr30", s.hr >= 30);
  if (s.sb != null) add("sb30", s.sb >= 30);
  if (s.sac != null) add("sac30", s.sac >= 30);
  if (s.rispAvg != null) add("risp300", s.rispAvg >= 0.3);
  if (s.r != null) add("r100", s.r >= 100);
  if (s.rbi != null) add("rbi100", s.rbi >= 100);
  if (s.bb != null) add("bb100", s.bb >= 100);
  if (s.csRate != null) add("csRate400", s.csRate >= 0.4);
  if (s.obp != null) add("obp400", s.obp >= 0.4);
  if (s.ops != null) add("ops1000", s.ops >= 1.0);
  if (s.h != null) add("h200", s.h >= 200);
  return hits;
}

function collectBatterCombos(
  s: SopBatterStats,
): { id: string; label: string; points: number; detail?: string }[] {
  const out: { id: string; label: string; points: number; detail?: string }[] =
    [];
  const avg = s.avg;
  const hr = s.hr;
  const sb = s.sb;
  const rbi = s.rbi;

  if (hr != null && sb != null && hr >= HR_SB_MIN_EACH && sb >= HR_SB_MIN_EACH) {
    const sum = hr + sb;
    const tier = bestSumTierPoints(sum, HR_SB_COMBO_TIERS);
    if (tier) {
      out.push({
        id: "hrSbCombo",
        label: `本塁打×盗塁複合（合計${sum}）`,
        points: tier.points,
        detail: `${hr}本＋${sb}盗塁＝${sum}`,
      });
    }
  }

  const hasTriple =
    avg != null &&
    hr != null &&
    sb != null &&
    avg >= 0.3 &&
    hr >= 30 &&
    sb >= 30;
  const hasRbi100 = rbi != null && rbi >= 100;
  const has300Hr30Rbi100 =
    avg != null &&
    hr != null &&
    hasRbi100 &&
    avg >= 0.3 &&
    hr >= 30;

  if (hasTriple && hasRbi100) {
    out.push({
      id: "tripleThreeRbi100",
      label: BATTER_COMBOS.tripleThreeRbi100.label,
      points: BATTER_COMBOS.tripleThreeRbi100.points,
    });
  } else if (hasTriple) {
    out.push({
      id: "tripleThree",
      label: BATTER_COMBOS.tripleThree.label,
      points: BATTER_COMBOS.tripleThree.points,
    });
  } else if (has300Hr30Rbi100) {
    out.push({
      id: "avg300Hr30Rbi100",
      label: BATTER_COMBOS.avg300Hr30Rbi100.label,
      points: BATTER_COMBOS.avg300Hr30Rbi100.points,
    });
  }

  return out;
}

function applyHistoricBatter(
  s: SopBatterStats,
  coveredBasics: Set<string>,
): SopLineItem[] {
  const items: SopLineItem[] = [];
  const tryAdd = (
    id: keyof typeof BATTER_HISTORIC,
    ok: boolean,
  ) => {
    if (!ok) return;
    const def = BATTER_HISTORIC[id];
    items.push({
      id: `historic:${id}`,
      category: "historic",
      label: def.label,
      points: def.points,
    });
    for (const c of def.covers) coveredBasics.add(c);
  };

  if (s.avg != null) tryAdd("avg400", s.avg >= 0.4);
  if (s.rispAvg != null) tryAdd("risp400", s.rispAvg >= 0.4);
  if (s.ops != null) tryAdd("ops1100", s.ops >= 1.1);
  if (s.csRate != null) tryAdd("csRate800", s.csRate >= 0.8);
  return items;
}

function scoreBatterFeats(feats: SopFeatsInput): SopLineItem[] {
  const items: SopLineItem[] = [];
  if (feats.cycle) {
    items.push({
      id: "feat:cycle",
      category: "feats_streaks",
      label: BATTER_FEATS.cycle.label,
      points: BATTER_FEATS.cycle.points,
    });
  }
  const hs = bestTierPoints(feats.hitStreak ?? null, BATTER_FEATS.hitStreak);
  if (hs) {
    items.push({
      id: "feat:hitStreak",
      category: "feats_streaks",
      label: `連続試合安打 ${feats.hitStreak}試合`,
      points: hs.points,
    });
  }
  const obs = bestTierPoints(
    feats.onBaseStreak ?? null,
    BATTER_FEATS.onBaseStreak,
  );
  if (obs) {
    items.push({
      id: "feat:onBaseStreak",
      category: "feats_streaks",
      label: `連続試合出塁 ${feats.onBaseStreak}試合`,
      points: obs.points,
    });
  }
  const hrs = bestTierPoints(feats.hrStreak ?? null, BATTER_FEATS.hrStreak);
  if (hrs) {
    items.push({
      id: "feat:hrStreak",
      category: "feats_streaks",
      label: `連続試合本塁打 ${feats.hrStreak}試合`,
      points: hrs.points,
    });
  }
  return items;
}

function scoreBatterNpb(
  s: SopBatterStats,
  feats: SopFeatsInput,
): SopLineItem[] {
  const items: SopLineItem[] = [];
  const fieldMap: Record<string, number | null | undefined> = {
    avg: s.avg,
    h: s.h,
    hr: s.hr,
    rbi: s.rbi,
    r: s.r,
    doubles: s.doubles,
    triples: s.triples,
    sb: s.sb,
    sac: s.sac,
    bb: s.bb,
    obp: s.obp,
  };
  for (const def of NPB_BATTER_SEASON_RECORDS) {
    if (meetsNpbRecord(fieldMap[def.field], def)) {
      items.push({
        id: `npb:${def.id}`,
        category: "npb_record",
        label: `NPB記録 ${def.label}`,
        points: NPB_RECORD_BONUS_POINTS,
        detail: `基準 ${def.threshold}`,
      });
    }
  }
  for (const def of NPB_FEAT_RECORDS) {
    const v =
      def.field === "hitStreak"
        ? feats.hitStreak
        : def.field === "onBaseStreak"
          ? feats.onBaseStreak
          : def.field === "hrStreak"
            ? feats.hrStreak
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
    const priorHad =
      id === "hrSbCombo"
        ? priorCombo.has("hrSbCombo")
        : priorCombo.has(id);
    if (priorHad) {
      items.push({
        id: `consec:combo:${id}`,
        category: "consecutive_year",
        label: "連続年（複合達成）",
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
        label: "連続年（基本達成）",
        points: CONSECUTIVE_YEAR_BONUS.basic,
        detail: id,
      });
    }
  }
  return items;
}

/**
 * 野手のシーズン達成・複合・大記録・特殊・連続年・史実を集計。
 * 重複排除ルールを適用した items と、連続年判定用の達成IDを返す。
 */
export function scoreBatterSeason(
  s: SopBatterStats | null | undefined,
  feats: SopFeatsInput,
  prior: SopPriorYearFlags | null | undefined,
): {
  items: SopLineItem[];
  basicIds: string[];
  comboIds: string[];
} {
  if (!s) {
    return { items: [], basicIds: [], comboIds: [] };
  }

  const coveredBasics = new Set<string>();
  const historicItems = applyHistoricBatter(s, coveredBasics);
  const combos = collectBatterCombos(s);

  for (const c of combos) {
    for (const cover of BATTER_COMBO_COVERS[c.id] ?? []) {
      coveredBasics.add(cover);
    }
  }

  const basics = collectBatterBasics(s).filter((b) => !coveredBasics.has(b.id));
  const basicIds = basics.map((b) => b.id);
  const comboIds = combos.map((c) => c.id);

  const items: SopLineItem[] = [
    ...combos.map((c) => ({
      id: `combo:${c.id}`,
      category: "combo" as const,
      label: c.label,
      points: c.points,
      detail: c.detail,
    })),
    ...basics.map((b) => ({
      id: `basic:${b.id}`,
      category: "season_basic" as const,
      label: b.label,
      points: b.points,
    })),
    ...historicItems,
    ...scoreBatterFeats(feats),
    ...scoreBatterNpb(s, feats),
    ...consecutiveBonus(basicIds, comboIds, prior),
  ];

  return {
    items,
    basicIds,
    comboIds,
  };
}
