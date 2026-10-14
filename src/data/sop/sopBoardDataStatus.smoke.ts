/**
 * SOP四天王／通算ボード: hydrate前後の表示状態 + 内訳再計算トリガ前提
 * node --import tsx src/data/sop/sopBoardDataStatus.smoke.ts
 */
import assert from "node:assert/strict";
import { resolveSopBoardDataStatus } from "./sopBoardDataStatus";
import { aggregateSopBreakdown } from "./careerBoard";
import type { SopSeasonResult } from "@/lib/sop";

// —— hydrate 前後の空状態区別 ——
assert.equal(
  resolveSopBoardDataStatus({
    mounted: false,
    cloudHydrated: false,
    hasRows: false,
  }),
  "loading",
);
assert.equal(
  resolveSopBoardDataStatus({
    mounted: true,
    cloudHydrated: false,
    hasRows: false,
  }),
  "loading",
  "hydrate前の空は「読み込み中」（本当の空ではない）",
);
assert.equal(
  resolveSopBoardDataStatus({
    mounted: true,
    cloudHydrated: true,
    hasRows: false,
  }),
  "empty",
  "hydrate後も行なし → 本当にデータなし",
);
assert.equal(
  resolveSopBoardDataStatus({
    mounted: true,
    cloudHydrated: false,
    hasRows: true,
  }),
  "ready",
  "local に行があれば hydrate前でも表示可",
);
assert.equal(
  resolveSopBoardDataStatus({
    mounted: true,
    cloudHydrated: true,
    hasRows: true,
  }),
  "ready",
);

// —— hydrate完了後に再計算される前提: tick相当で内訳が更新される ——
// （UIは subscribeImportDemoMode → setTick → buildSopFourKings 再実行）
function mk(
  year: number,
  world: "BLUE" | "RED",
  id: string,
  label: string,
  points: number,
): SopSeasonResult {
  return {
    playerId: "sato",
    playerName: "佐藤輝明",
    year,
    world,
    role: "batter",
    teamShort: "阪神",
    total: points,
    items: [{ id, category: "titles", label, points }],
  };
}

// 初回（outbox空想定）: 行なし → loading
assert.equal(
  resolveSopBoardDataStatus({
    mounted: true,
    cloudHydrated: false,
    hasRows: false,
  }),
  "loading",
);

// hydrate後に3季分が載った想定で四天王内訳を再計算
const afterHydrateSeasons = [
  mk(2026, "BLUE", "title:hr:1", "本塁打1位", 10),
  mk(2027, "BLUE", "title:hr:1", "本塁打1位", 10),
  mk(2026, "RED", "title:hr:2", "本塁打2位", 5),
];
const afterHydrateStatus = resolveSopBoardDataStatus({
  mounted: true,
  cloudHydrated: true,
  hasRows: afterHydrateSeasons.length > 0,
});
assert.equal(afterHydrateStatus, "ready");

const breakdown = aggregateSopBreakdown(afterHydrateSeasons);
assert.deepEqual(
  breakdown.map((r) => r.display).sort(),
  ["本塁打1位 ×2 → 20pt", "本塁打2位 ×1 → 5pt"].sort(),
);
assert.equal(breakdown.reduce((s, r) => s + r.points, 0), 25);

console.log(
  JSON.stringify(
    {
      ok: true,
      statusTransitions: ["loading→ready after hydrate"],
      satoBreakdown: breakdown.map((r) => r.display),
    },
    null,
    2,
  ),
);
