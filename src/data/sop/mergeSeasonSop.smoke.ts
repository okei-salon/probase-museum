/**
 * 総合SOP合算：共有カテゴリ（年間表彰・二刀流）は1回だけ。
 * node --import tsx src/data/sop/mergeSeasonSop.smoke.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  aggregateCareerSop,
  buildOverallSeasonSopRankings,
  mergeRoleSeasonSopTotal,
  type SopSeasonResult,
} from "@/lib/sop";

function baseResult(
  partial: Partial<SopSeasonResult> &
    Pick<SopSeasonResult, "playerId" | "playerName" | "role" | "total" | "items">,
): SopSeasonResult {
  return {
    year: 2026,
    world: "BLUE",
    teamShort: "日",
    ...partial,
  };
}

// —— 合成：柴田相当（表彰15＋二刀流20＋投手固有2） ——
const shibataBatter = baseResult({
  playerId: "shibata",
  playerName: "柴田獅子",
  role: "batter",
  total: 35,
  items: [
    { id: "award:rookie", category: "annual_awards", label: "新人王", points: 10 },
    {
      id: "award:monthlyMvp:1",
      category: "annual_awards",
      label: "月間MVP",
      points: 5,
    },
    {
      id: "two_way:batter:pa",
      category: "two_way",
      label: "打席443以上",
      points: 5,
    },
    {
      id: "two_way:pitcher:ip",
      category: "two_way",
      label: "投球回143以上",
      points: 5,
    },
    {
      id: "two_way:rest",
      category: "two_way",
      label: "二刀流その他",
      points: 10,
    },
  ],
});
const shibataPitcher = baseResult({
  playerId: "shibata",
  playerName: "柴田獅子",
  role: "pitcher",
  total: 37,
  items: [
    ...shibataBatter.items,
    { id: "title:w:5", category: "titles", label: "勝利5位", points: 2 },
  ],
});

const shibataMerged = mergeRoleSeasonSopTotal(shibataBatter, shibataPitcher);
assert.equal(shibataMerged.batterUnique, 0);
assert.equal(shibataMerged.pitcherUnique, 2);
assert.equal(shibataMerged.shared, 35);
assert.equal(shibataMerged.total, 37);
assert.equal(shibataMerged.batterTotal, 35);
assert.equal(shibataMerged.pitcherTotal, 37);

// —— 合成：矢澤相当 ——
const yazawaBatter = baseResult({
  playerId: "yazawa",
  playerName: "矢澤宏太",
  role: "batter",
  total: 40,
  items: [
    {
      id: "award:bestNine",
      category: "annual_awards",
      label: "ベストナイン",
      points: 7,
    },
    { id: "title:sb:1", category: "titles", label: "盗塁1位", points: 10 },
    {
      id: "basic:sb30",
      category: "season_basic",
      label: "30盗塁",
      points: 2,
    },
    {
      id: "basic:risp300",
      category: "season_basic",
      label: "得点圏.300",
      points: 2,
    },
    {
      id: "interleague:sb:2",
      category: "interleague_titles",
      label: "交流戦盗塁2位",
      points: 4,
    },
    {
      id: "two_way:pack",
      category: "two_way",
      label: "二刀流",
      points: 15,
    },
  ],
});
const yazawaPitcher = baseResult({
  playerId: "yazawa",
  playerName: "矢澤宏太",
  role: "pitcher",
  total: 22,
  items: [
    {
      id: "award:bestNine",
      category: "annual_awards",
      label: "ベストナイン",
      points: 7,
    },
    {
      id: "two_way:pack",
      category: "two_way",
      label: "二刀流",
      points: 15,
    },
  ],
});
assert.equal(mergeRoleSeasonSopTotal(yazawaBatter, yazawaPitcher).total, 40);

// —— 非二刀流：片ロールは不変 ——
const sato = baseResult({
  playerId: "sato",
  playerName: "佐藤輝明",
  role: "batter",
  total: 143,
  items: [
    { id: "award:mvp", category: "annual_awards", label: "MVP", points: 25 },
    { id: "rest", category: "season_basic", label: "その他", points: 118 },
  ],
});
assert.equal(mergeRoleSeasonSopTotal(sato, null).total, 143);
assert.equal(mergeRoleSeasonSopTotal(null, sato).total, 143);

// —— 総合ランキング ——
const overall = buildOverallSeasonSopRankings([
  shibataBatter,
  shibataPitcher,
  yazawaBatter,
  yazawaPitcher,
  sato,
]);
const byName = Object.fromEntries(overall.map((r) => [r.playerName, r]));
assert.equal(byName["柴田獅子"]?.total, 37);
assert.equal(byName["矢澤宏太"]?.total, 40);
assert.equal(byName["佐藤輝明"]?.total, 143);
assert.equal(byName["柴田獅子"]?.batterTotal, 35);
assert.equal(byName["柴田獅子"]?.pitcherTotal, 37);

// —— 通算：同一シーズン共有は1回、別WORLDは累積 ——
const career = aggregateCareerSop([
  shibataBatter,
  shibataPitcher,
  {
    ...shibataBatter,
    year: 2027,
    total: 23,
    items: shibataBatter.items.filter((i) => i.category === "two_way").map((i) =>
      i.id === "two_way:rest" ? { ...i, points: 13 } : i,
    ),
  },
  {
    ...shibataPitcher,
    year: 2027,
    total: 39,
    items: [
      ...shibataBatter.items
        .filter((i) => i.category === "two_way")
        .map((i) => (i.id === "two_way:rest" ? { ...i, points: 13 } : i)),
      { id: "title:winPct:2", category: "titles", label: "勝率2位", points: 5 },
      { id: "title:w:5", category: "titles", label: "勝利5位", points: 2 },
      { id: "title:so:5", category: "titles", label: "奪三振5位", points: 2 },
      {
        id: "title:soRate:5",
        category: "titles",
        label: "奪三振率5位",
        points: 2,
      },
      {
        id: "basic:winPct800",
        category: "season_basic",
        label: "勝率.800",
        points: 5,
      },
    ],
  },
  {
    ...shibataBatter,
    world: "RED",
    total: 5,
    items: [{ id: "title:sac:2", category: "titles", label: "犠打2位", points: 5 }],
  },
]);
const shibataCareer = career.find((c) => c.playerId === "shibata");
// 2026: 37 / 2027: 0+16+23=39 / RED: 5 → 81
assert.equal(shibataCareer?.total, 81, `got ${shibataCareer?.total}`);

// —— 年鑑フィクスチャ（Downloads にあれば） ——
const yearbookPaths: { label: string; path: string; expect: Record<string, number> }[] =
  [
    {
      label: "2026 BLUE",
      path: "/Users/kaiyasuhiro/Downloads/pro-base-museum-yearbook-2026-blue-2.json",
      expect: { 柴田獅子: 37, 矢澤宏太: 40 },
    },
    {
      label: "2027 BLUE",
      path: "/Users/kaiyasuhiro/Downloads/pro-base-museum-yearbook-2027-blue.json",
      expect: { 柴田獅子: 39 },
    },
  ];

const yearbookChecks: Record<string, unknown> = {};
for (const y of yearbookPaths) {
  if (!fs.existsSync(y.path)) {
    yearbookChecks[y.label] = { skipped: true, reason: "file missing" };
    continue;
  }
  const data = JSON.parse(fs.readFileSync(y.path, "utf8")) as {
    sop: { results: SopSeasonResult[] };
  };
  const meta = data as { world?: string; year?: number };
  const rows = buildOverallSeasonSopRankings(
    data.sop.results.map((r) => ({
      ...r,
      world: (r.world ?? meta.world ?? null) as SopSeasonResult["world"],
      year: r.year ?? meta.year ?? 0,
    })),
  );
  const got: Record<string, number> = {};
  for (const [name, want] of Object.entries(y.expect)) {
    const row = rows.find((r) => r.playerName === name);
    assert.ok(row, `${y.label} missing ${name}`);
    assert.equal(row!.total, want, `${y.label} ${name}: got ${row!.total}`);
    got[name] = row!.total;
  }
  // 非二刀流の単純合算不変サンプル（片ロールのみの上位）
  const singleRole = rows.filter((r) => r.classification !== "two_way").slice(0, 5);
  for (const r of singleRole) {
    const raw = r.batterTotal + r.pitcherTotal;
    assert.equal(
      r.total,
      raw,
      `${y.label} non-two-way ${r.playerName} should equal raw sum`,
    );
  }
  yearbookChecks[y.label] = { ok: true, got };
}

console.log(
  JSON.stringify(
    {
      ok: true,
      synthetic: { shibata: 37, yazawa: 40, sato: 143, careerShibata: 81 },
      yearbook: yearbookChecks,
    },
    null,
    2,
  ),
);
