/**
 * localhost 用: 2026サンプル整理の安全確認（モック localStorage）
 * 実行: node --experimental-strip-types scripts/verify-sanitize-2026.ts
 *
 * 本番データ・Git・デプロイには触れない。
 */

import {
  KEEP_BLUE_2026_PACIFIC,
  sanitize2026SampleEntries,
  sanitize2026SampleInLocalStorage,
  verifySanitize2026LocalStorage,
} from "../src/data/sanitize2026Sample.ts";

type Store = Record<string, string>;

function installMockLocalStorage(initial: Store) {
  const store: Store = { ...initial };
  const api = {
    get length() {
      return Object.keys(store).length;
    },
    key(i: number) {
      return Object.keys(store)[i] ?? null;
    },
    getItem(k: string) {
      return store[k] ?? null;
    },
    setItem(k: string, v: string) {
      store[k] = String(v);
    },
    removeItem(k: string) {
      delete store[k];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  (globalThis as { window?: unknown }).window = {
    localStorage: api,
    dispatchEvent() {
      return true;
    },
  };
  return store;
}

function seed(): Store {
  return {
    "probase-museum.team-standings.v1": JSON.stringify([
      {
        id: "BLUE:2026",
        year: 2026,
        world: "BLUE",
        central: [
          {
            rank: 1,
            team: "阪神",
            teamId: "tigers",
            w: 0,
            l: 0,
            d: 0,
            pct: ".000",
            gb: "—",
          },
        ],
        pacific: KEEP_BLUE_2026_PACIFIC.map((t) => ({ ...t })),
        source: "ocr",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "RED:2026",
        year: 2026,
        world: "RED",
        central: [
          {
            rank: 1,
            team: "巨人",
            teamId: "giants",
            w: 10,
            l: 10,
            d: 0,
            pct: ".500",
            gb: "—",
          },
        ],
        pacific: [
          {
            rank: 1,
            team: "ソフトバンク",
            teamId: "hawks",
            w: 10,
            l: 10,
            d: 0,
            pct: ".500",
            gb: "—",
          },
        ],
        source: "manual",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2000",
        year: 2000,
        world: null,
        central: [
          {
            rank: 1,
            team: "巨人",
            teamId: "giants",
            w: 70,
            l: 60,
            d: 0,
            pct: ".538",
            gb: "—",
          },
        ],
        pacific: [],
        source: "manual",
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
      },
    ]),
    "probase-museum.season-lines.v1": JSON.stringify([
      {
        id: "sample-batter",
        year: 2026,
        world: "BLUE",
        role: "batter",
        playerName: "サンプル野手",
      },
      {
        id: "keep-2000",
        year: 2000,
        world: null,
        role: "batter",
        playerName: "正式選手",
      },
    ]),
    "probase-museum.import.monthly-mvp.v1": JSON.stringify([
      { id: "mvp-2026", year: 2026, world: "BLUE", month: 4 },
      { id: "mvp-2000", year: 2000, month: 5 },
    ]),
    "probase-museum.standings-history.v1": JSON.stringify([
      { id: "BLUE:2026:final", year: 2026, world: "BLUE", checkpoint: "final" },
    ]),
    "probase-museum.player-master.v3": JSON.stringify({
      players: [{ playerId: "p1", fullName: "残すべき選手" }],
      affiliations: [{ playerId: "p1", year: 2026, teamId: "fighters" }],
    }),
  };
}

const store = installMockLocalStorage(seed());
console.log("--- before ---");
console.log(
  "standings",
  JSON.parse(store["probase-museum.team-standings.v1"]!).map(
    (r: { id: string }) => r.id,
  ),
);

const result = sanitize2026SampleInLocalStorage();
console.log("--- sanitize result ---");
console.log(result);

const verify = verifySanitize2026LocalStorage();
console.log("--- verify checks ---");
for (const c of verify.checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} | ${c.label} | ${c.detail ?? ""}`);
}
console.log("ok=", verify.ok, "issues=", verify.issues);

// 2000 / master preserved
const standingsAfter = JSON.parse(store["probase-museum.team-standings.v1"]!);
const y2000 = standingsAfter.find((r: { year: number }) => r.year === 2000);
const master = store["probase-museum.player-master.v3"];
if (!y2000) {
  console.error("FAIL: 2000 standings missing");
  process.exit(1);
}
if (!master || !master.includes("残すべき選手")) {
  console.error("FAIL: player master damaged");
  process.exit(1);
}

// entries API also works on backup shape
const { entries } = sanitize2026SampleEntries(seed());
const st = JSON.parse(entries["probase-museum.team-standings.v1"]!);
if (st.length !== 2) {
  // BLUE kept + 2000 kept, RED removed => 2
  console.error("FAIL: expected 2 standings records, got", st.length);
  process.exit(1);
}

if (!verify.ok) {
  process.exit(1);
}
console.log("LOCALHOST_SANITIZE_VERIFY_OK");
