/**
 * season-lines localStorage: derived 省略・バッチ1回書き込み・quota 判別
 * npx tsx src/data/playerSeasonLines/seasonLinesQuota.smoke.ts
 */

import {
  compactSeasonLinesLocalStorage,
  getSeasonLine,
  seasonLineKey,
  upsertSeasonLinesLocalBatch,
  type BatterSeasonLine,
} from "@/data/playerSeasonLines";
import {
  isQuotaExceededError,
  LocalStorageQuotaError,
  setLocalStorageJson,
} from "@/lib/museumStorage/localJson";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const map = new Map<string, string>();
let setItemCalls = 0;
const storage = {
  getItem(k: string) {
    return map.has(k) ? map.get(k)! : null;
  },
  setItem(k: string, v: string) {
    setItemCalls += 1;
    // 擬似容量: 80KB 超で Safari 風メッセージ
    if (v.length > 80_000) {
      const err = new Error("The quota has been exceeded.");
      (err as { name: string }).name = "QuotaExceededError";
      throw err;
    }
    map.set(k, String(v));
  },
  removeItem(k: string) {
    map.delete(k);
  },
  clear() {
    map.clear();
  },
  key() {
    return null;
  },
  get length() {
    return map.size;
  },
};

(globalThis as { localStorage?: Storage; window?: { localStorage: Storage } }).localStorage =
  storage as unknown as Storage;
(globalThis as { window?: { localStorage: Storage } }).window = {
  localStorage: storage as unknown as Storage,
};

assert(isQuotaExceededError({ name: "QuotaExceededError", message: "x" }), "name");
assert(
  isQuotaExceededError(new Error("The quota has been exceeded.")),
  "safari message",
);

function line(i: number, h: number): BatterSeasonLine {
  const playerId = `p_q_${i}`;
  const world = "BLUE" as const;
  const id = seasonLineKey(playerId, 2027, "batter", "pennant", world);
  const counting = {
    ab: 100,
    h,
    doubles: 5,
    triples: 0,
    hr: 10,
    rbi: 30,
    bb: 20,
  };
  return {
    id,
    playerId,
    playerName: `選手${i}`,
    year: 2027,
    world,
    teamId: "tigers",
    teamName: "阪神",
    scope: "pennant",
    role: "batter",
    source: "ocr",
    counting,
    derived: {
      avg: h / 100,
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
    },
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
  };
}

// --- バッチは setItem 1回 ---
setItemCalls = 0;
upsertSeasonLinesLocalBatch([line(1, 40), line(2, 41), line(3, 42)]);
assert(setItemCalls === 1, `batch should write once, got ${setItemCalls}`);

const raw = map.get("probase-museum.season-lines.v1")!;
assert(!/"derived"\s*:/.test(raw), "persisted JSON must omit derived");
assert(getSeasonLine("p_q_1", 2027, "batter", "pennant", "BLUE")?.counting.h === 40, "read back");

// --- 上書きは件数を増やさない ---
setItemCalls = 0;
upsertSeasonLinesLocalBatch([line(1, 55)]);
const parsed = JSON.parse(map.get("probase-museum.season-lines.v1")!) as unknown[];
assert(parsed.length === 3, `still 3 rows after overwrite, got ${parsed.length}`);
assert(getSeasonLine("p_q_1", 2027, "batter", "pennant", "BLUE")?.counting.h === 55, "overwrite h");

// --- compact は削除せず縮小方向 ---
const before = map.get("probase-museum.season-lines.v1")!.length;
const compact = compactSeasonLinesLocalStorage();
assert(compact.ok, "compact ok");
assert(compact.bytesAfter <= before, "compact should not grow");

// --- quota エラーはキー付き LocalStorageQuotaError ---
try {
  setLocalStorageJson("probase-museum.season-lines.v1", "x".repeat(90_000));
  assert(false, "should throw");
} catch (e) {
  assert(e instanceof LocalStorageQuotaError, "LocalStorageQuotaError");
  assert(
    (e as LocalStorageQuotaError).key === "probase-museum.season-lines.v1",
    "key",
  );
  assert(/localStorage/.test((e as Error).message), "mentions localStorage");
  assert(!/IndexedDB/i.test((e as Error).message) || /ではなく/.test((e as Error).message), "distinguishes");
}

console.log("seasonLinesQuota.smoke: ok");
