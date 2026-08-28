import type { TeamStatColumn } from "@/data/seasonViews";
import type { TeamId } from "@/data/teams";

/**
 * 個人成績（ペナント / 交流戦で共通UI、データはスコープ別に保持）。
 * 項目は過去Excel基準の最低限。プロスピ画面確認後に追加可能な構造。
 */

export type StatsScope = "pennant" | "interleague";
export type PlayerRole = "batter" | "pitcher";
export type LeagueSide = "central" | "pacific";

export type PlayerStatRow = {
  id: string;
  name: string;
  team: string;
  league: LeagueSide;
  /** 選手詳細への導線用（登録データがある場合） */
  playerId?: string;
  /** 規定到達判定用（登録行） */
  teamId?: TeamId;
  /** 打席数（野手）。values.pa と同値だが明示 */
  paCount?: number | null;
  /** 投球回 outs（投手）。野球表記比較用 */
  ipOuts?: number | null;
  paQualifiedFlag?: boolean | null;
  ipQualifiedFlag?: boolean | null;
  /** null = データなし（0とは区別） */
  values: Record<string, number | null>;
};

/** 野手：正式30項目（プロスピ個人打撃成績／シーズン順） */
export const batterColumns: TeamStatColumn[] = [
  { key: "avg", label: "打率" },
  { key: "g", label: "試合" },
  { key: "pa", label: "打席" },
  { key: "ab", label: "打数" },
  { key: "h", label: "安打" },
  { key: "doubles", label: "二塁打" },
  { key: "triples", label: "三塁打" },
  { key: "hr", label: "本塁打" },
  { key: "tb", label: "塁打" },
  { key: "slg", label: "長打率" },
  { key: "rbi", label: "打点" },
  { key: "rispAvg", label: "得点圏打率" },
  { key: "rispAb", label: "得点圏打数" },
  { key: "rispH", label: "得点圏安打" },
  { key: "r", label: "得点" },
  { key: "bb", label: "四球" },
  { key: "hbp", label: "死球" },
  { key: "sac", label: "犠打" },
  { key: "sf", label: "犠飛" },
  { key: "sb", label: "盗塁" },
  { key: "cs", label: "盗塁死" },
  { key: "obp", label: "出塁率" },
  { key: "hitStreak", label: "連続安打" },
  { key: "onBaseStreak", label: "連続出塁" },
  { key: "multiHit", label: "猛打賞" },
  { key: "ops", label: "OPS" },
  { key: "csAttempted", label: "被盗塁企図数" },
  { key: "csAllowed", label: "許盗塁数" },
  { key: "csCaught", label: "盗塁刺" },
  { key: "csRate", label: "盗塁阻止率" },
];

/** 捕手系4項目（保存はするが、野手ランキングでは盗塁阻止率選択時のみ表示） */
export const BATTER_CATCHER_STAT_KEYS = [
  "csAttempted",
  "csAllowed",
  "csCaught",
  "csRate",
] as const;

export type BatterCatcherStatKey = (typeof BATTER_CATCHER_STAT_KEYS)[number];

export function isBatterCatcherStatKey(key: string): key is BatterCatcherStatKey {
  return (BATTER_CATCHER_STAT_KEYS as readonly string[]).includes(key);
}

/** 投手：個人成績表示項目（ゲーム画面順に近い表示ラベル） */
export const pitcherColumns: TeamStatColumn[] = [
  { key: "era", label: "防御率", lowerIsBetter: true },
  { key: "ip", label: "投球回" },
  { key: "winPct", label: "勝率" },
  { key: "w", label: "勝" },
  { key: "l", label: "敗", lowerIsBetter: true },
  { key: "sv", label: "セーブ" },
  { key: "hp", label: "HP" },
  { key: "hld", label: "H" },
  { key: "g", label: "登板" },
  { key: "gs", label: "先発" },
  { key: "sho", label: "完封" },
  { key: "cg", label: "完投" },
  { key: "qs", label: "QS" },
  { key: "qsRate", label: "QS率" },
  { key: "hqs", label: "HQS" },
  { key: "hqsRate", label: "HQS率" },
  { key: "so", label: "奪三振" },
  { key: "soRate", label: "奪三振率" },
  { key: "bb", label: "与四球" },
  { key: "bbRate", label: "四球率" },
  { key: "hbp", label: "与死球" },
  { key: "h", label: "被安打" },
  { key: "hr", label: "被本塁打" },
  { key: "kbb", label: "K/BB" },
  { key: "whip", label: "WHIP", lowerIsBetter: true },
  { key: "r", label: "失点", lowerIsBetter: true },
  { key: "er", label: "自責点", lowerIsBetter: true },
];
export const playerStatTeams = [
  { id: "阪神", league: "central" as const },
  { id: "広島", league: "central" as const },
  { id: "DeNA", league: "central" as const },
  { id: "巨人", league: "central" as const },
  { id: "ヤクルト", league: "central" as const },
  { id: "中日", league: "central" as const },
  { id: "オリックス", league: "pacific" as const },
  { id: "ソフトバンク", league: "pacific" as const },
  { id: "ロッテ", league: "pacific" as const },
  { id: "楽天", league: "pacific" as const },
  { id: "西武", league: "pacific" as const },
  { id: "日本ハム", league: "pacific" as const },
] as const;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function n(seed: string, min: number, max: number, digits = 0): number {
  const r = (hash(seed) % 10000) / 10000;
  const v = min + r * (max - min);
  if (digits === 0) return Math.round(v);
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

/** チーム別撮影→選手単位保存を想定したダミー生成（公式結果の転記ではない） */
function buildBatters(scope: StatsScope): PlayerStatRow[] {
  const factor = scope === "interleague" ? 0.35 : 1;
  return playerStatTeams.flatMap((t, ti) =>
    [1, 2, 3].map((slot) => {
      const id = `${scope}-b-${t.id}-${slot}`;
      const ab = Math.max(20, Math.round(n(id + "ab", 280, 520) * factor));
      const h = Math.round(ab * n(id + "avg", 0.22, 0.32, 3));
      const hr = Math.round(n(id + "hr", 3, 35) * factor);
      const doubles = Math.round(n(id + "2b", 5, 30) * factor);
      const triples = Math.round(n(id + "3b", 0, 6) * factor);
      const avg = ab > 0 ? h / ab : 0;
      const bb = Math.round(n(id + "bb", 10, 80) * factor);
      const hbp = Math.round(n(id + "hbp", 0, 12) * factor);
      const sf = Math.round(n(id + "sf", 0, 8) * factor);
      const sac = Math.round(n(id + "sac", 0, 20) * factor);
      const singles = Math.max(0, h - doubles - triples - hr);
      const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
      const pa = ab + bb + hbp + sf + sac;
      const sb = Math.round(n(id + "sb", 0, 35) * factor);
      const cs = Math.round(n(id + "cs", 0, 12) * factor);
      const rispAb = Math.round(n(id + "rispAb", 40, 160) * factor);
      const rispH = Math.round(rispAb * n(id + "risp", 0.2, 0.38, 3));
      const obp = Math.min(0.45, avg + n(id + "obp", 0.04, 0.1, 3));
      const slg = ab > 0 ? tb / ab : 0;
      // 捕手項目はサンプル野手ではデータなし（null）
      return {
        id,
        name: `サンプル野手${ti + 1}-${slot}`,
        team: t.id,
        league: t.league,
        values: {
          avg: Number(avg.toFixed(3)),
          g: Math.round(n(id + "g", 40, 143) * factor),
          pa,
          ab,
          h,
          doubles,
          triples,
          hr,
          tb,
          slg: Number(slg.toFixed(3)),
          rbi: Math.round(n(id + "rbi", 10, 100) * factor),
          rispAvg: rispAb > 0 ? Number((rispH / rispAb).toFixed(3)) : null,
          rispAb,
          rispH,
          r: Math.round(n(id + "r", 10, 90) * factor),
          bb,
          hbp,
          sac,
          sf,
          sb,
          cs,
          obp: Number(obp.toFixed(3)),
          hitStreak: Math.round(n(id + "hs", 0, 20) * factor),
          onBaseStreak: Math.round(n(id + "obs", 0, 25) * factor),
          multiHit: Math.round(n(id + "mh", 0, 40) * factor),
          ops: Number((obp + slg).toFixed(3)),
          csAttempted: null,
          csAllowed: null,
          csCaught: null,
          csRate: null,
        },
      };
    }),
  );
}

function buildPitchers(scope: StatsScope): PlayerStatRow[] {
  const factor = scope === "interleague" ? 0.35 : 1;
  return playerStatTeams.flatMap((t, ti) =>
    [1, 2].map((slot) => {
      const id = `${scope}-p-${t.id}-${slot}`;
      const g = Math.max(3, Math.round(n(id + "g", 15, 28) * factor));
      const gs = Math.max(1, Math.round(n(id + "gs", 8, 28) * factor));
      const qs = Math.min(gs, Math.round(n(id + "qs", 2, 18) * factor));
      const hqs = Math.min(qs, Math.round(qs * n(id + "hqs", 0.4, 0.8, 2)));
      const w = Math.round(n(id + "w", 1, 15) * factor);
      const l = Math.round(n(id + "l", 1, 12) * factor);
      const ip = Number((n(id + "ip", 30, 180) * factor).toFixed(1));
      const so = Math.round(n(id + "so", 20, 180) * factor);
      const bb = Math.round(n(id + "bb", 10, 70) * factor);
      const h = Math.round(n(id + "h", 40, 180) * factor);
      const er = Math.round(n(id + "er", 5, 70) * factor);
      return {
        id,
        name: `サンプル投手${ti + 1}-${slot}`,
        team: t.id,
        league: t.league,
        values: {
          era: ip > 0 ? Number(((er * 9) / ip).toFixed(2)) : 0,
          ip,
          winPct: w + l > 0 ? Number((w / (w + l)).toFixed(3)) : 0,
          w,
          l,
          sv: Math.round(n(id + "sv", 0, 30) * factor),
          hp: Math.round(n(id + "hp", 0, 40) * factor),
          hld: Math.round(n(id + "hld", 0, 35) * factor),
          g,
          gs,
          sho: Math.round(n(id + "sho", 0, 3) * factor),
          cg: Math.round(n(id + "cg", 0, 4) * factor),
          qs,
          qsRate: gs > 0 ? Number((qs / gs).toFixed(3)) : 0,
          hqs,
          hqsRate: gs > 0 ? Number((hqs / gs).toFixed(3)) : 0,
          so,
          soRate: ip > 0 ? Number(((so * 9) / ip).toFixed(2)) : 0,
          bb,
          bbRate: ip > 0 ? Number(((bb * 9) / ip).toFixed(2)) : 0,
          hbp: Math.round(n(id + "hbp", 0, 12) * factor),
          h,
          hr: Math.round(n(id + "hr", 2, 25) * factor),
          kbb: bb > 0 ? Number((so / bb).toFixed(2)) : 0,
          whip: ip > 0 ? Number(((h + bb) / ip).toFixed(2)) : 0,
          r: Math.round(n(id + "r", er, er + 20) * factor),
          er,
        },
      };
    }),
  );
}

const registry: Record<
  StatsScope,
  { batters: PlayerStatRow[]; pitchers: PlayerStatRow[] }
> = {
  pennant: {
    batters: buildBatters("pennant"),
    pitchers: buildPitchers("pennant"),
  },
  interleague: {
    batters: buildBatters("interleague"),
    pitchers: buildPitchers("interleague"),
  },
};

export function getPlayerStats(
  scope: StatsScope,
  role: PlayerRole,
): PlayerStatRow[] {
  return role === "batter"
    ? registry[scope].batters
    : registry[scope].pitchers;
}

export function formatPlayerStatValue(
  key: string,
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return "—";

  if (
    key === "avg" ||
    key === "rispAvg" ||
    key === "risp" ||
    key === "basesLoadedAvg" ||
    key === "hrRate" ||
    key === "sbRate" ||
    key === "obp" ||
    key === "slg" ||
    key === "ops" ||
    key === "winPct" ||
    key === "qsRate" ||
    key === "hqsRate" ||
    key === "csRate"
  ) {
    return value.toFixed(3).replace(/^0\./, ".");
  }
  // 野手三振率は 0〜1、投手奪三振率は K/9
  if (key === "soRate") {
    return value < 1
      ? value.toFixed(3).replace(/^0\./, ".")
      : value.toFixed(2);
  }
  if (
    key === "era" ||
    key === "bbRate" ||
    key === "kbb" ||
    key === "whip"
  ) {
    return value.toFixed(2);
  }
  if (key === "ip") {
    // 登録データは outs/3 の実数。野球表記へ戻す。
    const outs = Math.round(value * 3);
    const whole = Math.floor(outs / 3);
    const rem = outs % 3;
    return rem === 0 ? String(whole) : `${whole}.${rem}`;
  }
  return String(Math.round(value));
}
