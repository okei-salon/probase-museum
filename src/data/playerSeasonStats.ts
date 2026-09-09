/**
 * 年度別・月別の選手成績（表彰画面が参照するソース）
 * 表彰レコード側に成績を重複保存せず、playerId + year (+ month) で取得する。
 */

import {
  getSeasonLine,
  type PlayerSeasonLine,
  type SeasonLineRole,
} from "@/data/playerSeasonLines";
import { type SeasonWorld } from "@/data/seasons";
import { npbTeams } from "@/data/teams";
import {
  formatAvgDisplay,
  formatWinPctDisplay,
} from "@/lib/manualEntry/normalizeInput";
import { formatWhipDisplay } from "@/lib/manualEntry/computeSeasonStats";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";

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

/**
 * 表彰カード用: 保存済みシーズン個人成績（pennant）から主要成績を参照する。
 * 表彰レコードへ成績を複製しない。該当が無ければ null。
 *
 * 指定 WORLD の正式行のみ参照（他 WORLD / legacy への推測フォールバックなし）。
 * 捕手打撃が空のときは空のまま返し、正しい年度打撃の復元を待つ。
 */
export function getRegisteredSeasonHighlightStats(params: {
  playerId: string;
  year: number;
  world?: SeasonWorld | null;
  /** 守備位置。投手以外は野手成績を参照（ベストナイン用） */
  position?: string | null;
  /**
   * auto: 保存済み pennant 行から野手/投手を判定（MVP・新人王）。
   * batter / pitcher: 強制。省略時は position から判定（従来の B9 互換）。
   */
  roleMode?: "auto" | "batter" | "pitcher";
  /** 受賞時の球団（短縮名）。指定時は同一球団の行のみ採用 */
  teamShort?: string | null;
}): { label: string; value: string }[] | null {
  if (!params.playerId) return null;
  const world = params.world;
  const year = Number(params.year);

  const role = resolveHighlightRole(params);
  if (!role) return null;

  const line = getSeasonLine(params.playerId, year, role, "pennant", world);
  if (!line) return null;
  if (!seasonLineMatchesTeam(line, params.teamShort)) return null;
  return formatSeasonLineHighlightStats(line);
}

function resolveHighlightRole(params: {
  playerId: string;
  year: number;
  world?: SeasonWorld | null;
  position?: string | null;
  roleMode?: "auto" | "batter" | "pitcher";
  teamShort?: string | null;
}): SeasonLineRole | null {
  if (params.roleMode === "batter" || params.roleMode === "pitcher") {
    return params.roleMode;
  }
  if (params.roleMode === "auto") {
    return detectSeasonRoleFromLines(
      params.playerId,
      Number(params.year),
      params.world,
      params.teamShort,
    );
  }
  // 従来: ベストナインは守備位置で判定
  return (params.position ?? "").trim() === "投手" ? "pitcher" : "batter";
}

function seasonLineMatchesTeam(
  line: PlayerSeasonLine,
  teamShort?: string | null,
): boolean {
  const want = normalizeTeamShort((teamShort ?? "").trim());
  if (!want) return true;
  const lineShort =
    npbTeams.find((t) => t.id === line.teamId)?.short ??
    normalizeTeamShort(line.teamName);
  if (lineShort && lineShort === want) return true;
  if (line.teamName === want) return true;
  return false;
}

/** 同一 YEAR×WORLD の pennant 行から野手/投手を判定（名前推測なし） */
function detectSeasonRoleFromLines(
  playerId: string,
  year: number,
  world?: SeasonWorld | null,
  teamShort?: string | null,
): SeasonLineRole | null {
  const batter = getSeasonLine(playerId, year, "batter", "pennant", world);
  const pitcher = getSeasonLine(playerId, year, "pitcher", "pennant", world);
  const batterOk =
    batter &&
    seasonLineMatchesTeam(batter, teamShort) &&
    hasMeaningfulBatterLine(batter)
      ? batter
      : null;
  const pitcherOk =
    pitcher &&
    seasonLineMatchesTeam(pitcher, teamShort) &&
    hasMeaningfulPitcherLine(pitcher)
      ? pitcher
      : null;

  if (pitcherOk && !batterOk) return "pitcher";
  if (batterOk && !pitcherOk) return "batter";
  if (pitcherOk && batterOk) {
    // 両方ある場合は投球回がある方を投手、なければ野手
    const ip = pitcherOk.role === "pitcher" ? pitcherOk.counting.ipOuts ?? 0 : 0;
    return ip > 0 ? "pitcher" : "batter";
  }
  // 意味あるカウントが無くても行自体があれば表示用に返す
  if (pitcher && seasonLineMatchesTeam(pitcher, teamShort)) return "pitcher";
  if (batter && seasonLineMatchesTeam(batter, teamShort)) return "batter";
  return null;
}

function hasMeaningfulBatterLine(line: PlayerSeasonLine): boolean {
  if (line.role !== "batter") return false;
  const c = line.counting;
  return (c.ab ?? 0) > 0 || (c.pa ?? 0) > 0 || (c.h ?? 0) > 0;
}

function hasMeaningfulPitcherLine(line: PlayerSeasonLine): boolean {
  if (line.role !== "pitcher") return false;
  const c = line.counting;
  return (c.ipOuts ?? 0) > 0 || (c.g ?? 0) > 0 || (c.w ?? 0) + (c.l ?? 0) > 0;
}

function formatSeasonLineHighlightStats(
  line: PlayerSeasonLine,
): { label: string; value: string }[] {
  if (line.role === "batter") {
    const c = line.counting;
    const d = line.derived;
    const rows: { label: string; value: string }[] = [];
    if (d.avg != null) {
      rows.push({ label: "打率", value: formatAvgDisplay(d.avg) });
    }
    rows.push({ label: "本塁打", value: String(c.hr ?? 0) });
    rows.push({ label: "打点", value: String(c.rbi ?? 0) });
    rows.push({ label: "安打", value: String(c.h ?? 0) });
    rows.push({ label: "盗塁", value: String(c.sb ?? 0) });
    if (d.obp != null) {
      rows.push({ label: "出塁率", value: formatAvgDisplay(d.obp) });
    }
    if (d.ops != null) {
      rows.push({ label: "OPS", value: formatAvgDisplay(d.ops) });
    }
    return rows;
  }

  const c = line.counting;
  const d = line.derived;
  const rows: { label: string; value: string }[] = [];
  if (d.era != null) {
    rows.push({ label: "防御率", value: d.era.toFixed(2) });
  }
  rows.push({ label: "登板", value: String(c.g ?? 0) });
  rows.push({ label: "勝", value: String(c.w ?? 0) });
  rows.push({ label: "敗", value: String(c.l ?? 0) });
  if (d.winPct != null) {
    rows.push({ label: "勝率", value: formatWinPctDisplay(d.winPct) });
  }
  if (d.ipDisplay) {
    rows.push({ label: "投球回", value: d.ipDisplay });
  }
  rows.push({ label: "奪三振", value: String(c.so ?? 0) });
  if (d.whip != null) {
    rows.push({ label: "WHIP", value: formatWhipDisplay(d.whip) });
  }
  return rows;
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
