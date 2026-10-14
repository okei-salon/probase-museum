/**
 * SOP通算内訳集約: 順位・条件の誤統合防止 + 合計点不変
 * node --import tsx src/data/sop/aggregateSopBreakdown.smoke.ts
 */
import assert from "node:assert/strict";
import {
  aggregateSopBreakdown,
  buildSopCareerRankings,
  buildSopFourKings,
} from "./careerBoard";
import {
  aggregateCareerSop,
  type SopSeasonResult,
} from "@/lib/sop";

function mkSeason(
  partial: Pick<
    SopSeasonResult,
    "playerId" | "playerName" | "year" | "world" | "role" | "items"
  > &
    Partial<SopSeasonResult>,
): SopSeasonResult {
  const items = partial.items;
  return {
    teamId: partial.teamId ?? "tigers",
    teamShort: partial.teamShort ?? "阪神",
    league: partial.league ?? "central",
    ...partial,
    items,
    total: items.reduce((s, it) => s + it.points, 0),
  };
}

function seasonTotalsFingerprint(seasons: SopSeasonResult[]): string {
  return seasons
    .map(
      (s) =>
        `${s.playerId}|${s.world}|${s.year}|${s.role}|${s.total}|${s.items
          .map((i) => `${i.id}:${i.points}`)
          .join(",")}`,
    )
    .sort()
    .join("\n");
}

function careerFingerprint(seasons: SopSeasonResult[]): string {
  return aggregateCareerSop(seasons)
    .map((c) => `${c.playerId}:${c.total}`)
    .sort()
    .join("|");
}

// —— 佐藤タイプ: 本塁打1位 + 2位×2 ——
const satoSeasons = [
  mkSeason({
    playerId: "sato",
    playerName: "佐藤輝明",
    year: 2026,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "title:hr:1",
        category: "titles",
        label: "本塁打1位",
        points: 10,
      },
    ],
  }),
  mkSeason({
    playerId: "sato",
    playerName: "佐藤輝明",
    year: 2027,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "title:hr:2",
        category: "titles",
        label: "本塁打2位",
        points: 5,
      },
    ],
  }),
  mkSeason({
    playerId: "sato",
    playerName: "佐藤輝明",
    year: 2026,
    world: "RED",
    role: "batter",
    items: [
      {
        id: "title:hr:2",
        category: "titles",
        label: "本塁打2位",
        points: 5,
      },
    ],
  }),
];

const satoBeforeTotals = satoSeasons.reduce((s, x) => s + x.total, 0);
const satoFp = seasonTotalsFingerprint(satoSeasons);
const satoBreakdown = aggregateSopBreakdown(satoSeasons);

// 1位10 + 2位5 + 2位5 = 20（報告の25ptは別構成でも同じ誤統合パターン）
assert.equal(satoBeforeTotals, 20);
assert.equal(
  satoBreakdown.reduce((s, r) => s + r.points, 0),
  20,
  "内訳点合計はシーズン合計と一致",
);
assert.deepEqual(
  satoBreakdown.map((r) => r.display).sort(),
  ["本塁打1位 ×1 → 10pt", "本塁打2位 ×2 → 10pt"].sort(),
);
assert.ok(
  !satoBreakdown.some((r) => r.display.includes("本塁打2位 ×3")),
  "1位と2位を誤統合しない",
);
assert.equal(seasonTotalsFingerprint(satoSeasons), satoFp, "元シーズン不変");

// 報告症状に近い 25pt 構成（1位×2 + 2位×1）でも誤統合しない
const sato25 = aggregateSopBreakdown([
  ...satoSeasons.slice(0, 1),
  mkSeason({
    playerId: "sato",
    playerName: "佐藤輝明",
    year: 2027,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "title:hr:1",
        category: "titles",
        label: "本塁打1位",
        points: 10,
      },
    ],
  }),
  mkSeason({
    playerId: "sato",
    playerName: "佐藤輝明",
    year: 2026,
    world: "RED",
    role: "batter",
    items: [
      {
        id: "title:hr:2",
        category: "titles",
        label: "本塁打2位",
        points: 5,
      },
    ],
  }),
]);
assert.deepEqual(
  sato25.map((r) => r.display).sort(),
  ["本塁打1位 ×2 → 20pt", "本塁打2位 ×1 → 5pt"].sort(),
);
assert.equal(sato25.reduce((s, r) => s + r.points, 0), 25);
// 本番年鑑相当: 2026 BLUE 1位 / 2027 BLUE 1位 / 2026 RED 2位
assert.equal(
  sato25.find((r) => r.label === "本塁打1位")?.count,
  2,
);
assert.equal(
  sato25.find((r) => r.label === "本塁打2位")?.count,
  1,
);
assert.equal(
  sato25.find((r) => r.label === "本塁打1位")?.points,
  20,
);
assert.equal(
  sato25.find((r) => r.label === "本塁打2位")?.points,
  5,
);

// —— タイトル順位 1〜5 位はすべて別行（誤統合しない） ——
const titleRanks = aggregateSopBreakdown(
  ([1, 2, 3, 4, 5] as const).map((rank) =>
    mkSeason({
      playerId: "ranker",
      playerName: "順位選手",
      year: 2025 + rank,
      world: "BLUE",
      role: "batter",
      items: [
        {
          id: `title:hr:${rank}`,
          category: "titles",
          label: `本塁打${rank}位`,
          points: rank === 1 ? 10 : rank === 2 ? 5 : rank === 3 ? 4 : rank === 4 ? 3 : 2,
        },
      ],
    }),
  ),
);
assert.equal(titleRanks.length, 5, "本塁打1〜5位は5行");
assert.deepEqual(
  titleRanks.map((r) => r.label).sort(),
  ["本塁打1位", "本塁打2位", "本塁打3位", "本塁打4位", "本塁打5位"].sort(),
);
assert.equal(
  titleRanks.reduce((s, r) => s + r.points, 0),
  10 + 5 + 4 + 3 + 2,
);

// —— 平良タイプ: 奪三振順位混在（最後が1位でも統合しない） ——
const tairaSeasons = [
  mkSeason({
    playerId: "taira",
    playerName: "平良海馬",
    year: 2026,
    world: "BLUE",
    role: "pitcher",
    teamId: "lions",
    teamShort: "西武",
    league: "pacific",
    items: [
      {
        id: "title:so:2",
        category: "titles",
        label: "奪三振2位",
        points: 5,
      },
    ],
  }),
  mkSeason({
    playerId: "taira",
    playerName: "平良海馬",
    year: 2027,
    world: "BLUE",
    role: "pitcher",
    teamId: "lions",
    teamShort: "西武",
    league: "pacific",
    items: [
      {
        id: "title:so:1",
        category: "titles",
        label: "奪三振1位",
        points: 10,
      },
    ],
  }),
  mkSeason({
    playerId: "taira",
    playerName: "平良海馬",
    year: 2026,
    world: "RED",
    role: "pitcher",
    teamId: "lions",
    teamShort: "西武",
    league: "pacific",
    items: [
      {
        id: "title:so:2",
        category: "titles",
        label: "奪三振2位",
        points: 5,
      },
    ],
  }),
];

const tairaBreakdown = aggregateSopBreakdown(tairaSeasons);
assert.deepEqual(
  tairaBreakdown.map((r) => r.display).sort(),
  ["奪三振1位 ×1 → 10pt", "奪三振2位 ×2 → 10pt"].sort(),
);
assert.ok(!tairaBreakdown.some((r) => /奪三振1位 ×3/.test(r.display)));
assert.equal(
  tairaBreakdown.reduce((s, r) => s + r.points, 0),
  tairaSeasons.reduce((s, x) => s + x.total, 0),
);

// —— ラベル後勝ち上書き防止 ——
const labelSeasons = [
  mkSeason({
    playerId: "x",
    playerName: "X",
    year: 2026,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "award:monthlyMvp:1",
        category: "annual_awards",
        label: "月間MVP",
        points: 5,
      },
    ],
  }),
  mkSeason({
    playerId: "x",
    playerName: "X",
    year: 2027,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "award:monthlyMvp:1",
        category: "annual_awards",
        label: "月間MVP（別名）",
        points: 5,
      },
    ],
  }),
];
const labelRows = aggregateSopBreakdown(labelSeasons);
assert.equal(labelRows.length, 1);
assert.equal(labelRows[0]!.label, "月間MVP", "最初のラベルを維持");
assert.equal(labelRows[0]!.count, 2);
assert.equal(labelRows[0]!.points, 10);

// —— 交流戦・二刀流・連続も id 全体で分離 ——
const misc = aggregateSopBreakdown([
  mkSeason({
    playerId: "m",
    playerName: "M",
    year: 2026,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "interleague:hr:1",
        category: "interleague_titles",
        label: "交流戦本塁打1位",
        points: 5,
      },
      {
        id: "consec:basic:hr30",
        category: "consecutive_year",
        label: "30本塁打・2年連続 +2点",
        points: 2,
      },
      {
        id: "two_way:batter:hr",
        category: "two_way",
        label: "本塁打20以上",
        points: 3,
      },
    ],
  }),
  mkSeason({
    playerId: "m",
    playerName: "M",
    year: 2027,
    world: "BLUE",
    role: "batter",
    items: [
      {
        id: "interleague:hr:5",
        category: "interleague_titles",
        label: "交流戦本塁打5位",
        points: 1,
      },
      {
        id: "consec:basic:avg300",
        category: "consecutive_year",
        label: "打率.300以上・2年連続 +2点",
        points: 2,
      },
      {
        id: "two_way:batter:avg",
        category: "two_way",
        label: "打率.280以上",
        points: 3,
      },
    ],
  }),
]);
assert.equal(misc.length, 6, "異なる id は全て別行");

// —— ランキング／四天王 API は seasons 合計に依存（内訳修正で不変） ——
// collectAllSopSeasonResults は localStorage 依存のため、合成 seasons で
// aggregateCareerSop / ロール別合算の不変を検証する。
const mixed = [...satoSeasons, ...tairaSeasons];
const beforeCareer = careerFingerprint(mixed);
const beforeBatterTotal = mixed
  .filter((s) => s.role === "batter")
  .reduce((s, x) => s + x.total, 0);
const beforePitcherTotal = mixed
  .filter((s) => s.role === "pitcher")
  .reduce((s, x) => s + x.total, 0);

// 内訳を何度呼んでも seasons の total は変わらない
aggregateSopBreakdown(mixed);
aggregateSopBreakdown(satoSeasons);
assert.equal(careerFingerprint(mixed), beforeCareer);
assert.equal(
  mixed.filter((s) => s.role === "batter").reduce((s, x) => s + x.total, 0),
  beforeBatterTotal,
);
assert.equal(
  mixed.filter((s) => s.role === "pitcher").reduce((s, x) => s + x.total, 0),
  beforePitcherTotal,
);

// buildSop* はストレージ空なら空配列（副作用なく呼べること）
assert.ok(Array.isArray(buildSopCareerRankings("batter")));
assert.ok(Array.isArray(buildSopFourKings("batter")));
assert.ok(Array.isArray(buildSopFourKings("pitcher")));

console.log(
  JSON.stringify(
    {
      ok: true,
      sato: satoBreakdown.map((r) => r.display),
      taira: tairaBreakdown.map((r) => r.display),
      totalsUnchanged: true,
      rankingsUnaffectedByBreakdown: true,
    },
    null,
    2,
  ),
);
