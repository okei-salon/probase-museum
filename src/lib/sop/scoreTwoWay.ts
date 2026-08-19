/**
 * 二刀流SOP — 野手側＋投手側の加点合計（双方1点以上で成立）
 */

import { bestCeilingTierPoints, bestTierPoints } from "./helpers";
import type { SopBatterStats, SopPitcherStats } from "./input";
import { TWO_WAY_BATTER_TIERS, TWO_WAY_PITCHER_TIERS } from "./rules";
import type { SopLineItem } from "./types";

type SideHit = {
  id: string;
  label: string;
  points: number;
  side: "batter" | "pitcher";
};

function resolvePa(s: SopBatterStats): number | null {
  if (s.pa != null && Number.isFinite(s.pa)) return s.pa;
  // 打席数未入力でも規定到達フラグがあれば最高ティア相当として扱う
  if (s.paQualified === true) return 443;
  return null;
}

function resolveSvHp(p: SopPitcherStats): number | null {
  if (p.sv == null && p.hp == null && p.hld == null) return null;
  return (p.sv ?? 0) + (p.hp ?? p.hld ?? 0);
}

function scoreBatterSide(s: SopBatterStats): SideHit[] {
  const hits: SideHit[] = [];
  const addMin = (
    key: keyof typeof TWO_WAY_BATTER_TIERS,
    value: number | null,
  ) => {
    const tiers = TWO_WAY_BATTER_TIERS[key];
    const hit = bestTierPoints(
      value,
      tiers.map((t) => ({ min: t.min, points: t.points })),
    );
    if (!hit) return;
    const def = tiers.find((t) => t.min === hit.min && t.points === hit.points);
    if (!def) return;
    hits.push({
      id: `two_way:batter:${key}`,
      label: def.label,
      points: hit.points,
      side: "batter",
    });
  };

  addMin("pa", resolvePa(s));
  addMin("avg", s.avg);
  addMin("h", s.h);
  addMin("rbi", s.rbi);
  addMin("hr", s.hr);
  addMin("sb", s.sb);
  return hits;
}

function scorePitcherSide(p: SopPitcherStats): SideHit[] {
  const hits: SideHit[] = [];
  const addMin = (
    key: Exclude<keyof typeof TWO_WAY_PITCHER_TIERS, "era">,
    value: number | null,
  ) => {
    const tiers = TWO_WAY_PITCHER_TIERS[key];
    const hit = bestTierPoints(
      value,
      tiers.map((t) => ({ min: t.min, points: t.points })),
    );
    if (!hit) return;
    const def = tiers.find((t) => t.min === hit.min && t.points === hit.points);
    if (!def) return;
    hits.push({
      id: `two_way:pitcher:${key}`,
      label: def.label,
      points: hit.points,
      side: "pitcher",
    });
  };

  addMin("g", p.g);
  addMin("ip", p.ip);
  addMin("w", p.w);
  addMin("so", p.so);
  addMin("svHp", resolveSvHp(p));

  const eraHit = bestCeilingTierPoints(
    p.era,
    TWO_WAY_PITCHER_TIERS.era.map((t) => ({ max: t.max, points: t.points })),
  );
  if (eraHit) {
    const def = TWO_WAY_PITCHER_TIERS.era.find(
      (t) => t.max === eraHit.max && t.points === eraHit.points,
    );
    if (def) {
      hits.push({
        id: "two_way:pitcher:era",
        label: def.label,
        points: eraHit.points,
        side: "pitcher",
      });
    }
  }

  return hits;
}

/**
 * 野手側・投手側がともに1点以上のときのみ、合計を二刀流SOPとして返す。
 * 片方のみの得点では空配列（加算なし）。
 */
export function scoreTwoWaySop(
  batter: SopBatterStats | null | undefined,
  pitcher: SopPitcherStats | null | undefined,
): SopLineItem[] {
  if (!batter || !pitcher) return [];

  const batterHits = scoreBatterSide(batter);
  const pitcherHits = scorePitcherSide(pitcher);
  const batterPts = batterHits.reduce((s, h) => s + h.points, 0);
  const pitcherPts = pitcherHits.reduce((s, h) => s + h.points, 0);

  if (batterPts < 1 || pitcherPts < 1) return [];

  return [...batterHits, ...pitcherHits].map((h) => ({
    id: h.id,
    category: "two_way" as const,
    label: h.label,
    points: h.points,
    detail: h.side === "batter" ? "野手側" : "投手側",
  }));
}
