/** ペナント / 交流戦 / ポストシーズン用ダミー表示データ */

import { getTeamColorByShort } from "@/data/teams/colors";

export const centralTeams = ["阪神", "広島", "DeNA", "巨人", "ヤクルト", "中日"] as const;
export const pacificTeams = [
  "オリックス",
  "ソフトバンク",
  "ロッテ",
  "楽天",
  "西武",
  "日本ハム",
] as const;
export const all12Teams = [...centralTeams, ...pacificTeams] as const;

export const centralStandings = [
  { rank: 1, team: "阪神", w: 85, l: 53, d: 5, pct: ".616", gb: "—" },
  { rank: 2, team: "広島", w: 74, l: 65, d: 4, pct: ".532", gb: "11.5" },
  { rank: 3, team: "DeNA", w: 74, l: 66, d: 3, pct: ".529", gb: "12" },
  { rank: 4, team: "巨人", w: 71, l: 70, d: 2, pct: ".504", gb: "15.5" },
  { rank: 5, team: "ヤクルト", w: 57, l: 83, d: 3, pct: ".407", gb: "29" },
  { rank: 6, team: "中日", w: 56, l: 82, d: 5, pct: ".406", gb: "29" },
];

export const pacificStandings = [
  { rank: 1, team: "オリックス", w: 86, l: 53, d: 4, pct: ".619", gb: "—" },
  { rank: 2, team: "ソフトバンク", w: 71, l: 69, d: 3, pct: ".507", gb: "15.5" },
  { rank: 3, team: "ロッテ", w: 70, l: 68, d: 5, pct: ".507", gb: "15.5" },
  { rank: 4, team: "楽天", w: 70, l: 71, d: 2, pct: ".496", gb: "17" },
  { rank: 5, team: "西武", w: 65, l: 77, d: 1, pct: ".458", gb: "22.5" },
  { rank: 6, team: "日本ハム", w: 60, l: 82, d: 1, pct: ".423", gb: "27.5" },
];

export const interleagueStandings = [
  { rank: 1, team: "横浜DeNA", w: 13, l: 5, d: 0, pct: ".722", gb: "—" },
  { rank: 2, team: "オリックス", w: 12, l: 6, d: 0, pct: ".667", gb: "1" },
  { rank: 3, team: "ソフトバンク", w: 11, l: 7, d: 0, pct: ".611", gb: "2" },
  { rank: 4, team: "阪神", w: 10, l: 8, d: 0, pct: ".556", gb: "3" },
  { rank: 5, team: "巨人", w: 10, l: 8, d: 0, pct: ".556", gb: "3" },
  { rank: 6, team: "ロッテ", w: 9, l: 9, d: 0, pct: ".500", gb: "4" },
  { rank: 7, team: "広島", w: 9, l: 9, d: 0, pct: ".500", gb: "4" },
  { rank: 8, team: "楽天", w: 8, l: 10, d: 0, pct: ".444", gb: "5" },
  { rank: 9, team: "西武", w: 7, l: 11, d: 0, pct: ".389", gb: "6" },
  { rank: 10, team: "ヤクルト", w: 7, l: 11, d: 0, pct: ".389", gb: "6" },
  { rank: 11, team: "中日", w: 6, l: 12, d: 0, pct: ".333", gb: "7" },
  { rank: 12, team: "日本ハム", w: 6, l: 12, d: 0, pct: ".333", gb: "7" },
];

/** 月末順位推移（1位=上）。値が小さいほど上位 */
export const standingsTrend = {
  months: ["4月", "5月", "6月", "7月", "8月", "9月", "最終"],
  series: [
    { team: "阪神", color: getTeamColorByShort("阪神"), ranks: [2, 1, 1, 1, 1, 1, 1] },
    { team: "広島", color: getTeamColorByShort("広島"), ranks: [3, 3, 2, 2, 2, 2, 2] },
    { team: "DeNA", color: getTeamColorByShort("DeNA"), ranks: [1, 2, 3, 3, 3, 3, 3] },
    { team: "巨人", color: getTeamColorByShort("巨人"), ranks: [4, 4, 4, 4, 4, 4, 4] },
    { team: "ヤクルト", color: getTeamColorByShort("ヤクルト"), ranks: [5, 5, 5, 5, 5, 5, 5] },
    { team: "中日", color: getTeamColorByShort("中日"), ranks: [6, 6, 6, 6, 6, 6, 6] },
  ],
};

function buildMatrix(teams: readonly string[]) {
  return teams.map((rowTeam, ri) =>
    teams.map((colTeam, ci) => {
      if (ri === ci) return "—";
      const seed = (ri + 1) * 7 + (ci + 1) * 3;
      const w = 1 + (seed % 3);
      const l = 1 + ((seed * 2) % 3);
      return `${w}-${l}`;
    }),
  );
}

export const centralMatrix = {
  teams: [...centralTeams],
  cells: buildMatrix(centralTeams),
};

export const pacificMatrix = {
  teams: [...pacificTeams],
  cells: buildMatrix(pacificTeams),
};

export const interleagueMatrix = {
  rowTeams: [...centralTeams],
  colTeams: [...pacificTeams],
  cells: centralTeams.map((row, ri) =>
    pacificTeams.map((_, ci) => {
      const seed = (ri + 1) * 5 + (ci + 1) * 11;
      const w = seed % 3;
      const l = 2 - w;
      return `${w}-${l}`;
    }),
  ),
};

export const teamBattingRank = [
  { rank: 1, team: "阪神", value: ".262", label: "打率" },
  { rank: 2, team: "オリックス", value: ".258", label: "打率" },
  { rank: 3, team: "ヤクルト", value: ".255", label: "打率" },
  { rank: 4, team: "ソフトバンク", value: ".252", label: "打率" },
  { rank: 5, team: "巨人", value: ".249", label: "打率" },
  { rank: 6, team: "広島", value: ".247", label: "打率" },
];

export const teamPitchingRank = [
  { rank: 1, team: "オリックス", value: "2.71", label: "防御率" },
  { rank: 2, team: "阪神", value: "2.99", label: "防御率" },
  { rank: 3, team: "ソフトバンク", value: "3.12", label: "防御率" },
  { rank: 4, team: "DeNA", value: "3.28", label: "防御率" },
  { rank: 5, team: "巨人", value: "3.41", label: "防御率" },
  { rank: 6, team: "ロッテ", value: "3.55", label: "防御率" },
];

export const batterRank = [
  { rank: 1, player: "サンプル打者A", team: "阪神", value: ".312", note: "打率" },
  { rank: 2, player: "サンプル打者B", team: "オリックス", value: ".301", note: "打率" },
  { rank: 3, player: "サンプル打者C", team: "ソフトバンク", value: ".298", note: "打率" },
  { rank: 4, player: "サンプル打者D", team: "巨人", value: ".291", note: "打率" },
  { rank: 5, player: "サンプル打者E", team: "ヤクルト", value: ".288", note: "打率" },
];

export const pitcherRank = [
  { rank: 1, player: "サンプル投手A", team: "オリックス", value: "1.94", note: "防御率" },
  { rank: 2, player: "サンプル投手B", team: "阪神", value: "2.11", note: "防御率" },
  { rank: 3, player: "サンプル投手C", team: "ソフトバンク", value: "2.28", note: "防御率" },
  { rank: 4, player: "サンプル投手D", team: "巨人", value: "2.45", note: "防御率" },
  { rank: 5, player: "サンプル投手E", team: "DeNA", value: "2.62", note: "防御率" },
];

export const pennantSummary = {
  champions: [
    { league: "セ・リーグ", team: "阪神タイガース" },
    { league: "パ・リーグ", team: "オリックス・バファローズ" },
  ],
  highlights: [
    "セ・リーグは終盤まで上位争いが続いた",
    "パ・リーグはオリックスが独走で優勝",
    "交流戦を挟み順位が入れ替わる展開も",
  ],
};

/** ペナントレビュー用（レギュラーシーズン特化。シーズン大項目サマリーとは別） */
export const pennantReview = {
  central: {
    title: "セ・リーグの展開",
    body: "上位争いは終盤まで続き、複数球団が優勝戦線に残る展開となった（ダミー文章）。交流戦後の巻き返しや短期決戦を意識した采配が順位変動に影響した。",
  },
  pacific: {
    title: "パ・リーグの展開",
    body: "先頭を走る球団がゲーム差を広げ、中位〜下位ではCS進出をかけた争いが続いた（ダミー文章）。投手力と機動力の対比が各カードの勝敗を分けた。",
  },
  race: {
    title: "優勝争い",
    points: [
      "セは接戦のまま最終盤へ持ち越し（登録待ち）",
      "パはゲーム差を活かした守り勝ちが光った（登録待ち）",
      "直接対決の勝敗が順位を大きく動かした場面も",
    ],
  },
  movement: {
    title: "順位変動",
    points: [
      "序盤の出遅れから中位へ押し上げた球団があった",
      "交流戦前後で順位が大きく入れ替わる局面も",
      "月末時点の順位と最終順位に差が出た球団を確認できる",
    ],
  },
  traits: {
    title: "各球団の特徴",
    items: [
      { team: "登録待ち", note: "打撃・投手の特徴はデータ登録後に表示" },
      { team: "登録待ち", note: "攻撃型 / 投手力型などのタグを想定" },
      { team: "登録待ち", note: "球団別の戦い方メモを掲載予定" },
    ],
  },
  moments: {
    title: "印象的だった出来事",
    points: [
      "逆転優勝争いを象徴する一戦（登録待ち）",
      "連勝・連敗の波が順位表を揺らした期間",
      "シーズンを象徴する投手戦・打者の活躍シーン",
    ],
  },
};

export const pacificStandingsTrend = {
  months: ["4月", "5月", "6月", "7月", "8月", "9月", "最終"],
  series: [
    { team: "オリックス", color: getTeamColorByShort("オリックス"), ranks: [1, 1, 1, 1, 1, 1, 1] },
    { team: "ソフトバンク", color: getTeamColorByShort("ソフトバンク"), ranks: [2, 3, 2, 2, 2, 2, 2] },
    { team: "ロッテ", color: getTeamColorByShort("ロッテ"), ranks: [3, 2, 3, 3, 3, 3, 3] },
    { team: "楽天", color: getTeamColorByShort("楽天"), ranks: [4, 4, 4, 4, 4, 4, 4] },
    { team: "西武", color: getTeamColorByShort("西武"), ranks: [5, 5, 5, 5, 5, 5, 5] },
    { team: "日本ハム", color: getTeamColorByShort("日本ハム"), ranks: [6, 6, 6, 6, 6, 6, 6] },
  ],
};

export type TeamStatColumn = {
  key: string;
  label: string;
  /** true なら数値が小さいほど上位（防御率など） */
  lowerIsBetter?: boolean;
};

export type TeamStatRow = {
  team: string;
  league: "central" | "pacific";
  values: Record<string, number>;
};

export const teamBattingColumns: TeamStatColumn[] = [
  { key: "avg", label: "打率" },
  { key: "hr", label: "本塁打" },
  { key: "r", label: "得点" },
  { key: "h", label: "安打" },
  { key: "sb", label: "盗塁" },
  { key: "bb", label: "四球" },
  { key: "so", label: "三振", lowerIsBetter: true },
];

export const teamPitchingColumns: TeamStatColumn[] = [
  { key: "era", label: "防御率", lowerIsBetter: true },
  { key: "w", label: "勝利" },
  { key: "l", label: "敗戦", lowerIsBetter: true },
  { key: "sv", label: "セーブ" },
  { key: "hld", label: "ホールド" },
  { key: "so", label: "奪三振" },
  { key: "bb", label: "与四球", lowerIsBetter: true },
  { key: "hr", label: "被本塁打", lowerIsBetter: true },
  { key: "r", label: "失点", lowerIsBetter: true },
];

/** チーム打撃成績デモ（UI検証用。正式マスターには保存しない） */
export const teamBattingStats: TeamStatRow[] = [
  { team: "阪神", league: "central", values: { avg: 0.262, hr: 126, r: 617, h: 1280, sb: 88, bb: 480, so: 980 } },
  { team: "広島", league: "central", values: { avg: 0.247, hr: 118, r: 560, h: 1201, sb: 72, bb: 450, so: 1050 } },
  { team: "DeNA", league: "central", values: { avg: 0.251, hr: 140, r: 590, h: 1225, sb: 65, bb: 470, so: 1100 } },
  { team: "巨人", league: "central", values: { avg: 0.249, hr: 132, r: 575, h: 1210, sb: 55, bb: 460, so: 1080 } },
  { team: "ヤクルト", league: "central", values: { avg: 0.255, hr: 155, r: 605, h: 1240, sb: 48, bb: 490, so: 1120 } },
  { team: "中日", league: "central", values: { avg: 0.241, hr: 95, r: 510, h: 1175, sb: 60, bb: 420, so: 990 } },
  { team: "オリックス", league: "pacific", values: { avg: 0.258, hr: 110, r: 580, h: 1255, sb: 95, bb: 455, so: 960 } },
  { team: "ソフトバンク", league: "pacific", values: { avg: 0.252, hr: 148, r: 600, h: 1230, sb: 70, bb: 475, so: 1070 } },
  { team: "ロッテ", league: "pacific", values: { avg: 0.246, hr: 120, r: 545, h: 1195, sb: 80, bb: 440, so: 1030 } },
  { team: "楽天", league: "pacific", values: { avg: 0.244, hr: 105, r: 530, h: 1188, sb: 58, bb: 430, so: 1010 } },
  { team: "西武", league: "pacific", values: { avg: 0.239, hr: 98, r: 505, h: 1160, sb: 90, bb: 410, so: 1090 } },
  { team: "日本ハム", league: "pacific", values: { avg: 0.243, hr: 112, r: 520, h: 1170, sb: 75, bb: 425, so: 1040 } },
];

/** チーム投手成績デモ（UI検証用。正式マスターには保存しない） */
export const teamPitchingStats: TeamStatRow[] = [
  { team: "阪神", league: "central", values: { era: 2.99, w: 85, l: 53, sv: 38, hld: 90, so: 1120, bb: 380, hr: 95, r: 489 } },
  { team: "広島", league: "central", values: { era: 3.35, w: 74, l: 65, sv: 32, hld: 75, so: 1050, bb: 410, hr: 110, r: 540 } },
  { team: "DeNA", league: "central", values: { era: 3.28, w: 74, l: 66, sv: 30, hld: 80, so: 1080, bb: 400, hr: 105, r: 530 } },
  { team: "巨人", league: "central", values: { era: 3.41, w: 71, l: 70, sv: 28, hld: 70, so: 1020, bb: 420, hr: 115, r: 555 } },
  { team: "ヤクルト", league: "central", values: { era: 3.85, w: 57, l: 83, sv: 25, hld: 60, so: 990, bb: 450, hr: 130, r: 620 } },
  { team: "中日", league: "central", values: { era: 3.55, w: 56, l: 82, sv: 27, hld: 65, so: 1005, bb: 390, hr: 100, r: 580 } },
  { team: "オリックス", league: "pacific", values: { era: 2.71, w: 86, l: 53, sv: 40, hld: 95, so: 1180, bb: 350, hr: 85, r: 460 } },
  { team: "ソフトバンク", league: "pacific", values: { era: 3.12, w: 71, l: 69, sv: 33, hld: 78, so: 1100, bb: 370, hr: 98, r: 510 } },
  { team: "ロッテ", league: "pacific", values: { era: 3.55, w: 70, l: 68, sv: 29, hld: 72, so: 1040, bb: 405, hr: 108, r: 545 } },
  { team: "楽天", league: "pacific", values: { era: 3.48, w: 70, l: 71, sv: 31, hld: 68, so: 1010, bb: 415, hr: 112, r: 550 } },
  { team: "西武", league: "pacific", values: { era: 3.72, w: 65, l: 77, sv: 26, hld: 62, so: 970, bb: 430, hr: 120, r: 590 } },
  { team: "日本ハム", league: "pacific", values: { era: 3.9, w: 60, l: 82, sv: 24, hld: 58, so: 950, bb: 440, hr: 125, r: 610 } },
];

export function formatTeamStatValue(key: string, value: number): string {
  if (value < 0) return "---";
  if (
    key === "avg" ||
    key === "obp" ||
    key === "slg" ||
    key === "ops" ||
    key === "hrRate" ||
    key === "gdpRate" ||
    key === "sbRate" ||
    key === "winPct"
  ) {
    return value.toFixed(3).replace(/^0\./, ".");
  }
  // 打者三振率は 0.xxx、投手奪三振率は 9.xx 程度
  if (key === "soRate") {
    return value >= 1
      ? value.toFixed(2)
      : value.toFixed(3).replace(/^0\./, ".");
  }
  if (
    key === "era" ||
    key === "starterEra" ||
    key === "reliefEra" ||
    key === "bbRate"
  ) {
    return value.toFixed(2);
  }
  if (key === "ip") {
    const whole = Math.floor(value / 3);
    const rem = Math.round(value) % 3;
    return rem === 0 ? String(whole) : `${whole}.${rem}`;
  }
  return String(Math.round(value));
}
