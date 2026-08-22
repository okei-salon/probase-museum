/**
 * 順位推移グラフ用に履歴スナップショットを系列へ変換。
 * 正式データが無い場合は呼び出し側で静的ダミーへフォールバックする。
 *
 * 表示地点は常に 04→05→06→07→08→final（最大6）。
 * checkpoint=09 はグラフに出さない（DB への作成・削除もしない）。
 */

import type { SeasonIdentity } from "@/data/seasons";
import { resolveTeamColor } from "@/data/teams/colors";
import { getStandingsForSeason } from "@/data/teamStandings/store";
import type { StandingEntry } from "@/data/teamStandings";
import {
  listStandingsHistoryForSeason,
  getStandingsHistoryCheckpoint,
} from "./store";
import {
  STANDINGS_CHECKPOINT_LABELS,
  STANDINGS_TREND_CHECKPOINTS,
  type StandingsCheckpoint,
  type StandingsTrendCheckpoint,
} from "./types";

export type StandingsTrendSeries = {
  team: string;
  color: string;
  ranks: number[];
};

export type StandingsTrendBoardData = {
  months: string[];
  series: StandingsTrendSeries[];
  /** 正式履歴（または final の最終順位同期）があるか */
  official: boolean;
};

function leagueEntries(
  record: { central: StandingEntry[]; pacific: StandingEntry[] } | null,
  league: "central" | "pacific",
): StandingEntry[] {
  if (!record) return [];
  return league === "central" ? record.central : record.pacific;
}

/**
 * identity の順位推移を構築。
 * - 月次は standings-history（04〜08）
 * - final は history があればそれを使い、無ければ Step6 team-standings を参照
 * - 09 は表示しない（final の複製表示もしない）
 * - 色は teamId（なければ short）固定。出現順では変わらない。
 */
export function buildStandingsTrendBoard(
  identity: SeasonIdentity,
  league: "central" | "pacific",
): StandingsTrendBoardData {
  const history = listStandingsHistoryForSeason(identity);
  const finalFromStandings = getStandingsForSeason(identity);

  const byCheckpoint = new Map<StandingsCheckpoint, StandingEntry[]>();
  for (const h of history) {
    // グラフ対象外の 09 は読み飛ばす（データ自体は消さない）
    if (h.checkpoint === "09") continue;
    byCheckpoint.set(h.checkpoint, leagueEntries(h, league));
  }

  // final: history 優先、なければ最終順位ストア
  if (!byCheckpoint.has("final") || (byCheckpoint.get("final")?.length ?? 0) === 0) {
    const fromFinal = leagueEntries(finalFromStandings, league);
    if (fromFinal.length > 0) {
      byCheckpoint.set("final", fromFinal);
    }
  }

  const activeCheckpoints = STANDINGS_TREND_CHECKPOINTS.filter(
    (c) => (byCheckpoint.get(c)?.length ?? 0) > 0,
  );

  if (activeCheckpoints.length === 0) {
    return { months: [], series: [], official: false };
  }

  const months = activeCheckpoints.map(
    (c) => STANDINGS_CHECKPOINT_LABELS[c],
  );

  // チーム集合（表示順は出現順のまま。色は teamId/short で固定）
  const teamOrder: string[] = [];
  const teamIdByShort = new Map<string, string | undefined>();
  for (const c of activeCheckpoints) {
    for (const row of byCheckpoint.get(c) ?? []) {
      if (!teamOrder.includes(row.team)) teamOrder.push(row.team);
      if (row.teamId && !teamIdByShort.get(row.team)) {
        teamIdByShort.set(row.team, row.teamId);
      }
    }
  }

  const series: StandingsTrendSeries[] = teamOrder.map((team) => ({
    team,
    color: resolveTeamColor({
      teamId: teamIdByShort.get(team),
      short: team,
      team,
    }),
    ranks: activeCheckpoints.map((c: StandingsTrendCheckpoint) => {
      const rows = byCheckpoint.get(c) ?? [];
      const hit = rows.find((r) => r.team === team);
      return hit?.rank ?? 6;
    }),
  }));

  return { months, series, official: true };
}

/** 入力UI用: 指定時点の既存データを取得（final は最終順位ストアへフォールバック） */
export function getCheckpointStandingsForEdit(
  identity: SeasonIdentity,
  checkpoint: StandingsCheckpoint,
): { central: StandingEntry[]; pacific: StandingEntry[] } | null {
  const hist = getStandingsHistoryCheckpoint(
    identity.year,
    checkpoint,
    identity.world,
  );
  if (hist && (hist.central.length || hist.pacific.length)) {
    return { central: hist.central, pacific: hist.pacific };
  }
  if (checkpoint === "final") {
    const final = getStandingsForSeason(identity);
    if (final && (final.central.length || final.pacific.length)) {
      return { central: final.central, pacific: final.pacific };
    }
  }
  return null;
}
