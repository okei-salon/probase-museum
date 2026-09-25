/**
 * season-lines: outbox 移行と容量見積もり
 * npx tsx src/data/playerSeasonLines/seasonLinesOutbox.smoke.ts
 */

import {
  estimateSeasonLinesLocalCapacity,
  getSeasonLine,
  getSeasonLinesCacheState,
  hydrateSeasonLinesFromCloud,
  resetSeasonLinesCacheForTests,
  seasonLineKey,
  upsertSeasonLinesLocalBatch,
  type BatterSeasonLine,
} from "@/data/playerSeasonLines";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
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

  const cloudStore = new Map<string, BatterSeasonLine>();
  (globalThis as { fetch?: typeof fetch }).fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "PUT") {
      const body = JSON.parse(String(init?.body)) as BatterSeasonLine;
      cloudStore.set(body.id, body);
      return new Response(JSON.stringify({ ok: true, record: body }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/api/museum/docs/season_lines")) {
      return new Response(
        JSON.stringify({ ok: true, records: [...cloudStore.values()] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  }) as typeof fetch;

  function line(
    i: number,
    h: number,
    updatedAt = "2027-01-01T00:00:00.000Z",
  ): BatterSeasonLine {
    const playerId = `p_ob_${i}`;
    const world = "BLUE" as const;
    const id = seasonLineKey(playerId, 2027, "batter", "pennant", world);
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
      counting: {
        ab: 100,
        h,
        doubles: 5,
        triples: 0,
        hr: 10,
        rbi: 30,
        bb: 20,
      },
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
      updatedAt,
    };
  }

  resetSeasonLinesCacheForTests();
  map.clear();
  cloudStore.clear();

  const est = estimateSeasonLinesLocalCapacity();
  assert(est.maxRowsCompressedAtBudget > 2000, "compressed capacity");
  assert(
    est.projectedRows.total > est.maxRowsCompressedAtBudget,
    "growth exceeds budget",
  );
  assert(/outbox|Neon/.test(est.recommendation), "recommends outbox");

  upsertSeasonLinesLocalBatch([line(1, 40), line(2, 41)]);
  assert(
    JSON.parse(map.get("probase-museum.season-lines.v1")!).length === 2,
    "disk 2",
  );

  cloudStore.set(line(1, 40).id, line(1, 40));
  cloudStore.set(line(3, 99).id, line(3, 99));

  await hydrateSeasonLinesFromCloud();

  const state = getSeasonLinesCacheState();
  assert(state.cloudHydrated === true, "hydrated");
  assert(state.runtimeRows === 3, `runtime 3 got ${state.runtimeRows}`);
  // local-only line2 was uploaded then removed from outbox
  assert(state.diskRows === 0, `outbox empty after upload got ${state.diskRows}`);
  assert(cloudStore.has(line(2, 41).id), "pending uploaded to cloud");
  assert(
    getSeasonLine("p_ob_2", 2027, "batter", "pennant", "BLUE")?.counting.h ===
      41,
    "pending readable from memory",
  );
  assert(
    getSeasonLine("p_ob_3", 2027, "batter", "pennant", "BLUE")?.counting.h ===
      99,
    "cloud in memory",
  );

  // local-newer must stay in outbox until PUT
  upsertSeasonLinesLocalBatch([line(1, 77, "2027-09-01T00:00:00.000Z")]);
  assert(getSeasonLinesCacheState().diskRows === 1, "newer local in outbox");
  assert(
    getSeasonLine("p_ob_1", 2027, "batter", "pennant", "BLUE")?.counting.h ===
      77,
    "local newer wins memory",
  );

  console.log("seasonLinesOutbox.smoke: ok", {
    maxCompressed: est.maxRowsCompressedAtBudget,
    projected10y: est.projectedRows.total,
    yearsUntilFullMirror: est.yearsUntilBudgetIfFullMirror,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
