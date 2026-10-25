/**
 * 80試合登板（大記録20点）＋ NPB登板記録ボーナス（90試合〜 +10点）
 * npx tsx src/lib/sop/g80NpbBonus.smoke.ts
 */

import assert from "node:assert/strict";
import { scorePitcherSeason } from "./scorePitcher";
import { NPB_RECORD_BONUS_POINTS } from "./npbRecords";
import { PITCHER_HISTORIC } from "./rules";
import type { SopPitcherStats } from "./input";

function basePitcher(g: number): SopPitcherStats {
  return {
    g,
    gs: 0,
    pitcherClass: "reliever",
    startRate: 0,
    era: 2.5,
    reliefEra: 2.5,
    ip: 70,
    reliefIp: 70,
    ipQualified: true,
    w: 3,
    l: 2,
    sv: 0,
    hp: 35,
    hld: 30,
    so: 60,
    soRate: 7.7,
    reliefSoRate: 7.7,
    qsRate: null,
    sho: 0,
    cg: 0,
    winPct: 0.6,
  };
}

function scoreForG(g: number) {
  return scorePitcherSeason(basePitcher(g), {}, null);
}

{
  const r = scoreForG(92);
  const historic = r.items.find((i) => i.id === "historic:g80");
  const npb = r.items.find((i) => i.id === "npb:npb_g");
  const g50 = r.items.find((i) => i.id === "basic:g50");
  assert.ok(historic, "92登板で80試合登板の大記録が付く");
  assert.equal(historic!.points, PITCHER_HISTORIC.g80.points);
  assert.ok(npb, "92登板でNPB登板ボーナスが付く");
  assert.equal(npb!.points, NPB_RECORD_BONUS_POINTS);
  assert.equal(
    historic!.points + npb!.points,
    30,
    "大記録20 + NPB+10 = 30",
  );
  assert.equal(g50, undefined, "g80 が g50 をカバーし二重計上しない");
}

{
  const r = scoreForG(82);
  assert.ok(r.items.find((i) => i.id === "historic:g80"));
  assert.equal(
    r.items.find((i) => i.id === "npb:npb_g"),
    undefined,
    "82登板はNPB閾値90未満のためボーナスなし",
  );
}

{
  const r = scoreForG(90);
  const historic = r.items.find((i) => i.id === "historic:g80")!;
  const npb = r.items.find((i) => i.id === "npb:npb_g")!;
  assert.equal(historic.points + npb.points, 30);
}

console.log("g80NpbBonus.smoke.ts: ok");
