/**
 * 年度別・月別の選手成績（表彰画面が参照するソース）
 * 表彰レコード側に成績を重複保存せず、playerId + year (+ month) で取得する。
 */

export type BatterHighlightStats = {
  kind: "batter";
  avg: number;
  hr: number;
  rbi: number;
  h: number;
  sb: number;
  ops: number;
};

export type PitcherHighlightStats = {
  kind: "pitcher";
  era: number;
  g: number;
  winPct: number;
  w: number;
  l: number;
  so: number;
  sho: number;
  cg: number;
  /** リリーフ時 */
  isReliever?: boolean;
  hp?: number;
  sv?: number;
};

export type PlayerHighlightStats = BatterHighlightStats | PitcherHighlightStats;

type SeasonEntry = {
  playerId: string;
  year: string;
  name: string;
  team: string;
  stats: PlayerHighlightStats;
};

type MonthlyEntry = SeasonEntry & { month: number };

const seasonStats: SeasonEntry[] = [
  {
    playerId: "p-mvp-c-2023",
    year: "2023",
    name: "サンプル セMVP",
    team: "阪神",
    stats: {
      kind: "batter",
      avg: 0.312,
      hr: 28,
      rbi: 90,
      h: 156,
      sb: 12,
      ops: 0.912,
    },
  },
  {
    playerId: "hanshin_41045153_8",
    year: "2023",
    name: "佐藤輝明",
    team: "阪神",
    stats: {
      kind: "batter",
      avg: 0.312,
      hr: 28,
      rbi: 90,
      h: 156,
      sb: 12,
      ops: 0.912,
    },
  },
  {
    playerId: "hanshin_41045153_8",
    year: "2026",
    name: "佐藤輝明",
    team: "阪神",
    stats: {
      kind: "batter",
      avg: 0.312,
      hr: 28,
      rbi: 90,
      h: 156,
      sb: 12,
      ops: 0.912,
    },
  },
  {
    playerId: "p-mvp-p-2023",
    year: "2023",
    name: "サンプル パMVP",
    team: "オリックス",
    stats: {
      kind: "pitcher",
      era: 1.98,
      g: 24,
      winPct: 0.75,
      w: 15,
      l: 5,
      so: 178,
      sho: 2,
      cg: 3,
    },
  },
  {
    playerId: "p-rookie-c-2023",
    year: "2023",
    name: "サンプル セ新人",
    team: "DeNA",
    stats: {
      kind: "batter",
      avg: 0.278,
      hr: 18,
      rbi: 62,
      h: 132,
      sb: 8,
      ops: 0.801,
    },
  },
  {
    playerId: "p-rookie-p-2023",
    year: "2023",
    name: "サンプル パ新人",
    team: "日本ハム",
    stats: {
      kind: "pitcher",
      era: 2.45,
      g: 22,
      winPct: 0.632,
      w: 12,
      l: 7,
      so: 141,
      sho: 1,
      cg: 1,
    },
  },
  {
    playerId: "p-sawamura-2023",
    year: "2023",
    name: "サンプル 沢村",
    team: "ヤクルト",
    stats: {
      kind: "pitcher",
      era: 1.75,
      g: 25,
      winPct: 0.8,
      w: 16,
      l: 4,
      so: 192,
      sho: 3,
      cg: 4,
    },
  },
  // ベストナイン用（守備位置順: 投捕一二三遊外外外）
  ...(["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "外野手", "外野手"] as const).map(
    (pos, i) => {
      const ofSuffix = i >= 6 ? String(i - 5) : "";
      return {
        playerId: `p-b9-c-${i}`,
        year: "2023",
        name: `セB9 ${pos}${ofSuffix}`,
        team: ["ヤクルト", "阪神", "巨人", "広島", "DeNA", "中日", "阪神", "巨人", "ヤクルト"][i],
        stats:
          pos === "投手"
            ? {
                kind: "pitcher" as const,
                era: 2.1,
                g: 26,
                winPct: 0.7,
                w: 14,
                l: 6,
                so: 160,
                sho: 1,
                cg: 2,
              }
            : {
                kind: "batter" as const,
                avg: 0.28 + i * 0.004,
                hr: 10 + i * 2,
                rbi: 50 + i * 5,
                h: 120 + i * 3,
                sb: 3 + (i % 4),
                ops: 0.78 + i * 0.015,
              },
      };
    },
  ),
  ...(["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "外野手", "外野手"] as const).map(
    (pos, i) => {
      const ofSuffix = i >= 6 ? String(i - 5) : "";
      return {
        playerId: `p-b9-p-${i}`,
        year: "2023",
        name: `パB9 ${pos}${ofSuffix}`,
        team: [
          "オリックス",
          "ソフトバンク",
          "ロッテ",
          "楽天",
          "西武",
          "日本ハム",
          "オリックス",
          "ソフトバンク",
          "オリックス",
        ][i],
        stats:
          pos === "投手"
            ? {
                kind: "pitcher" as const,
                era: 2.05,
                g: 25,
                winPct: 0.72,
                w: 13,
                l: 5,
                so: 170,
                sho: 2,
                cg: 2,
              }
            : {
                kind: "batter" as const,
                avg: 0.275 + i * 0.005,
                hr: 12 + i * 2,
                rbi: 55 + i * 4,
                h: 118 + i * 4,
                sb: 5 + (i % 5),
                ops: 0.79 + i * 0.012,
              },
      };
    },
  ),
];

function buildMonthlySample(
  league: "c" | "p",
  role: "p" | "b",
  month: number,
): MonthlyEntry {
  const label = league === "c" ? "セ" : "パ";
  const isReliever = role === "p" && (month === 5 || month === 8);
  if (role === "p") {
    return {
      playerId: `p-mm-${league}-p-${month}`,
      year: "2023",
      month,
      name: `${label} ${month}月投手`,
      team: "—",
      stats: isReliever
        ? {
            kind: "pitcher",
            era: 0.9 + month * 0.05,
            g: 10 + month,
            winPct: 0,
            w: month === 8 ? 1 : 0,
            l: 0,
            so: 14 + month,
            sho: 0,
            cg: 0,
            isReliever: true,
            hp: 6 + (month % 3),
            sv: 5 + (month % 4),
          }
        : {
            kind: "pitcher",
            era: 1.1 + month * 0.08,
            g: 4 + (month % 2),
            winPct: 0.75,
            w: 3 + (month % 2),
            l: 1,
            so: 30 + month * 2,
            sho: month % 2,
            cg: 1,
          },
    };
  }
  return {
    playerId: `p-mm-${league}-b-${month}`,
    year: "2023",
    month,
    name: `${label} ${month}月野手`,
    team: "—",
    stats: {
      kind: "batter",
      avg: 0.32 + month * 0.008,
      hr: 4 + month,
      rbi: 15 + month * 2,
      h: 24 + month,
      sb: 1 + (month % 4),
      ops: 0.9 + month * 0.03,
    },
  };
}

const monthlyStats: MonthlyEntry[] = [4, 5, 6, 7, 8, 9].flatMap((month) => [
  buildMonthlySample("c", "p", month),
  buildMonthlySample("c", "b", month),
  buildMonthlySample("p", "p", month),
  buildMonthlySample("p", "b", month),
]);

export function getSeasonHighlightStats(
  playerId: string,
  year: string,
): PlayerHighlightStats | null {
  return (
    seasonStats.find((e) => e.playerId === playerId && e.year === year)
      ?.stats ?? null
  );
}

export function getMonthlyHighlightStats(
  playerId: string,
  year: string,
  month: number,
): PlayerHighlightStats | null {
  return (
    monthlyStats.find(
      (e) => e.playerId === playerId && e.year === year && e.month === month,
    )?.stats ?? null
  );
}

export function formatHighlightStats(
  stats: PlayerHighlightStats,
): { label: string; value: string }[] {
  if (stats.kind === "batter") {
    return [
      { label: "打率", value: stats.avg.toFixed(3).replace(/^0/, "") },
      { label: "本塁打", value: String(stats.hr) },
      { label: "打点", value: String(stats.rbi) },
      { label: "安打", value: String(stats.h) },
      { label: "盗塁", value: String(stats.sb) },
      { label: "OPS", value: stats.ops.toFixed(3).replace(/^0/, "") },
    ];
  }

  const rows: { label: string; value: string }[] = [
    { label: "防御率", value: stats.era.toFixed(2) },
    { label: "登板", value: String(stats.g) },
    { label: "勝率", value: stats.winPct.toFixed(3).replace(/^0/, "") },
    { label: "勝敗", value: `${stats.w}勝${stats.l}敗` },
    { label: "奪三振", value: String(stats.so) },
    { label: "完封", value: String(stats.sho) },
    { label: "完投", value: String(stats.cg) },
  ];
  if (stats.isReliever) {
    rows.push(
      { label: "HP", value: String(stats.hp ?? 0) },
      { label: "S", value: String(stats.sv ?? 0) },
    );
  }
  return rows;
}

/** 月間MVP：プロスピ画面に合わせた項目のみ（年間成績項目は含めない） */
export function formatMonthlyMvpStats(
  stats: PlayerHighlightStats,
): { label: string; value: string }[] {
  if (stats.kind === "batter") {
    return [
      { label: "打率", value: stats.avg.toFixed(3).replace(/^0/, "") },
      { label: "", value: `${stats.hr}本` },
      { label: "", value: `${stats.rbi}打点` },
      { label: "", value: `${stats.sb}盗` },
    ];
  }
  return [
    { label: "防御率", value: stats.era.toFixed(2) },
    { label: "", value: `${stats.w}勝${stats.l}敗` },
  ];
}
