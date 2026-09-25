/**
 * 野手一括登録: 数値要確認はブロックしない / local upsert 新規・上書き
 * npx tsx src/components/manualEntry/seasonBatchSave.smoke.ts
 */

import {
  getSeasonLine,
  seasonLineKey,
  upsertBatterSeasonLine,
  type BatterSeasonLine,
} from "@/data/playerSeasonLines";
import type { SeasonBatchPlayerRow } from "@/data/import/seasonBatchTypes";
import {
  rowToBatterCounting,
  validateBatchRow,
} from "@/lib/import/seasonBatchConvert";
import { finalizeBatchRow } from "@/lib/import/seasonBatchRateCheck";
import { rowHasStatWarnings } from "@/lib/import/seasonBatchMerge";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

/** minimal localStorage for Node smoke */
function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
    get length() {
      return map.size;
    },
  };
  (globalThis as { localStorage?: Storage; window?: { localStorage: Storage } }).localStorage =
    storage as Storage;
  (globalThis as { window?: { localStorage: Storage } }).window = {
    localStorage: storage as Storage,
  };
}

installMemoryStorage();

function makeRow(partial: {
  playerId: string;
  playerName: string;
  teamShort?: string;
  avgMismatch?: boolean;
}): SeasonBatchPlayerRow {
  const ab = 100;
  const h = 40;
  const avgDisplay = partial.avgMismatch ? ".500" : ".400";
  const avgValue = partial.avgMismatch ? 0.5 : 0.4;
  return {
    rowId: `row-${partial.playerId}`,
    rowIndex: 0,
    year: 2027,
    playerId: partial.playerId,
    playerName: partial.playerName,
    teamShort: partial.teamShort ?? "阪神",
    teamId: "tigers",
    teamName: "阪神",
    teamStatus: "ok",
    nameStatus: "ok",
    pendingNewPlayer: false,
    fields: {
      ab: { value: ab, display: String(ab), status: "ok", sources: [] },
      h: { value: h, display: String(h), status: "ok", sources: [] },
      doubles: { value: 5, display: "5", status: "ok", sources: [] },
      triples: { value: 0, display: "0", status: "ok", sources: [] },
      hr: { value: 10, display: "10", status: "ok", sources: [] },
      rbi: { value: 30, display: "30", status: "ok", sources: [] },
      bb: { value: 20, display: "20", status: "ok", sources: [] },
      avg: {
        value: avgValue,
        display: avgDisplay,
        status: "ok",
        sources: [],
      },
    },
  };
}

// --- 数値要確認があっても validateBatchRow はエラーにしない ---
const mismatchRow = finalizeBatchRow(
  makeRow({
    playerId: "p_smoke_1",
    playerName: "検証打者",
    avgMismatch: true,
  }),
  "batter",
);
assert(rowHasStatWarnings(mismatchRow), "should flag rate mismatch");
const validated = validateBatchRow(mismatchRow, "batter");
assert(validated.errors.length === 0, `rate mismatch must not block save: ${validated.errors.join(",")}`);

// --- 新規登録 ---
const row1 = finalizeBatchRow(
  makeRow({ playerId: "p_smoke_new", playerName: "新規打者" }),
  "batter",
);
const counting1 = rowToBatterCounting(row1);
const derived1 = {
  avg: 0.4,
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
const now = new Date().toISOString();
const world = "BLUE" as const;
const id1 = seasonLineKey("p_smoke_new", 2027, "batter", "pennant", world);
const line1: BatterSeasonLine = {
  id: id1,
  playerId: "p_smoke_new",
  playerName: "新規打者",
  year: 2027,
  world,
  teamId: "tigers",
  teamName: "阪神",
  scope: "pennant",
  role: "batter",
  source: "ocr",
  counting: counting1,
  derived: derived1,
  createdAt: now,
  updatedAt: now,
};
upsertBatterSeasonLine(line1);
const saved1 = getSeasonLine("p_smoke_new", 2027, "batter", "pennant", world);
assert(saved1?.playerName === "新規打者", "new save");
assert((saved1 as BatterSeasonLine)?.counting.h === 40, "new counting h");

// --- 上書き登録（数値要確認付き） ---
const row2 = finalizeBatchRow(
  makeRow({
    playerId: "p_smoke_new",
    playerName: "新規打者",
    avgMismatch: true,
  }),
  "batter",
);
const counting2 = rowToBatterCounting(row2);
counting2.h = 45;
const line2: BatterSeasonLine = {
  ...line1,
  counting: counting2,
  updatedAt: new Date().toISOString(),
};
upsertBatterSeasonLine(line2);
const saved2 = getSeasonLine("p_smoke_new", 2027, "batter", "pennant", world);
assert((saved2 as BatterSeasonLine)?.counting.h === 45, "overwrite counting");
assert(saved2?.id === id1, "same id after overwrite");

// --- 別 WORLD は独立 ---
const idRed = seasonLineKey("p_smoke_new", 2027, "batter", "pennant", "RED");
upsertBatterSeasonLine({
  ...line1,
  id: idRed,
  world: "RED",
  counting: { ...counting1, h: 10 },
  updatedAt: new Date().toISOString(),
});
const blueStill = getSeasonLine("p_smoke_new", 2027, "batter", "pennant", "BLUE");
const redLine = getSeasonLine("p_smoke_new", 2027, "batter", "pennant", "RED");
assert((blueStill as BatterSeasonLine)?.counting.h === 45, "BLUE untouched");
assert((redLine as BatterSeasonLine)?.counting.h === 10, "RED independent");

console.log("seasonBatchSave.smoke: ok");
