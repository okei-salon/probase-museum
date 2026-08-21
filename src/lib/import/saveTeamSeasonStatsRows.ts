/**
 * チーム打撃／投手の一括保存（ペナント / 交流戦 共通）。
 * competition 以外の変換・項目定義は同一。
 * デモ以外は localStorage + Neon（museum_documents / team_season_stats）へ同期。
 */

import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  listDemoTeamStats,
  upsertDemoTeamStats,
} from "@/data/import/demoStore";
import { appendImportHistory } from "@/data/import/store";
import { formatSeasonLineLabel, normalizeSeasonWorld, type SeasonWorld } from "@/data/seasons";
import {
  buildTeamSeasonPitching,
  getTeamSeasonStats,
  mergeTeamSeasonBatting,
  teamSeasonStatsKey,
  upsertTeamSeasonStatsAsync,
  type TeamBattingScreenRates,
  type TeamCompetition,
  type TeamSeasonStatsRecord,
} from "@/data/teamSeasonStats";
import { npbTeams } from "@/data/teams";
import {
  teamFieldsToBattingCounting,
  teamFieldsToPitchingCounting,
  type TeamStatPartial,
} from "@/lib/import/parseTeamSeasonOcr";

const BATTING_SCREEN_KEYS: Array<keyof TeamBattingScreenRates> = [
  "avg",
  "hrRate",
  "slg",
  "soRate",
  "gdpRate",
  "sbRate",
  "obp",
  "ops",
  "rispAvg",
  "rispAvgDiff",
  "basesLoadedAvg",
  "basesLoadedAvgDiff",
  "vsRhbAvg",
  "vsRhbAvgDiff",
  "vsLhbAvg",
  "vsLhbAvgDiff",
];

/** 貼り付けに含まれた率項目のみパッチ（未入力は既存維持） */
function battingScreenRatesPatch(
  fields: TeamStatPartial["fields"],
): TeamBattingScreenRates {
  const patch: TeamBattingScreenRates = {};
  for (const key of BATTING_SCREEN_KEYS) {
    if (fields[key] !== undefined) {
      patch[key] = fields[key]?.value ?? null;
    }
  }
  return patch;
}

function pitchingScreenRates(fields: TeamStatPartial["fields"]) {
  return {
    era: fields.era?.value ?? null,
    starterEra: fields.starterEra?.value ?? null,
    reliefEra: fields.reliefEra?.value ?? null,
    winPct: fields.winPct?.value ?? null,
    soRate: fields.soRate?.value ?? null,
    bbRate: fields.bbRate?.value ?? null,
    hbpRate: fields.hbpRate?.value ?? null,
    avgAgainst: fields.avgAgainst?.value ?? null,
    rispAvg: fields.rispAvg?.value ?? null,
    rispAvgDiff: fields.rispAvgDiff?.value ?? null,
    vsRhbAvg: fields.vsRhbAvg?.value ?? null,
    vsRhbAvgDiff: fields.vsRhbAvgDiff?.value ?? null,
    vsLhbAvg: fields.vsLhbAvg?.value ?? null,
    vsLhbAvgDiff: fields.vsLhbAvgDiff?.value ?? null,
    hrRateAllowed: fields.hrRateAllowed?.value ?? null,
    sbRateAgainst: fields.sbRateAgainst?.value ?? null,
  };
}

function findExistingTeamStats(
  year: number,
  teamId: TeamSeasonStatsRecord["teamId"],
  competition: TeamCompetition,
  world: SeasonWorld | null,
  useSandbox: boolean,
): TeamSeasonStatsRecord | undefined {
  if (useSandbox) {
    return listDemoTeamStats().find(
      (r) =>
        r.year === year &&
        r.teamId === teamId &&
        r.competition === competition &&
        normalizeSeasonWorld(r.world) === world,
    );
  }
  return getTeamSeasonStats(year, teamId, competition, world) ?? undefined;
}

export function findConflictingTeamStats(
  rows: TeamStatPartial[],
  year: number,
  world: SeasonWorld | null,
  competition: TeamCompetition,
  kind: "batting" | "pitching",
): string[] {
  const useSandbox = shouldUseIsolatedDemoStore(year);
  const conflicts: string[] = [];
  for (const row of rows) {
    if (!row.teamId) continue;
    const ex = findExistingTeamStats(
      year,
      row.teamId,
      competition,
      world,
      useSandbox,
    );
    if (
      ex &&
      ((kind === "batting" && ex.batting) ||
        (kind === "pitching" && ex.pitching))
    ) {
      conflicts.push(row.teamShort);
    }
  }
  return conflicts;
}

export async function saveTeamSeasonStatsRows(params: {
  rows: TeamStatPartial[];
  year: number;
  world: SeasonWorld | null;
  competition: TeamCompetition;
  kind: "batting" | "pitching";
  source?: "ocr" | "manual" | "import";
}): Promise<{ ids: string[]; message: string; cloudOk: boolean }> {
  const {
    rows,
    year,
    world,
    competition,
    kind,
    source = "ocr",
  } = params;
  const useSandbox = shouldUseIsolatedDemoStore(year);
  const ids: string[] = [];
  let cloudFail = 0;

  for (const row of rows) {
    if (!row.teamId) continue;
    const team = npbTeams.find((t) => t.id === row.teamId);
    if (!team) continue;
    if (Object.keys(row.fields).length === 0) continue;

    const existing = findExistingTeamStats(
      year,
      row.teamId,
      competition,
      world,
      useSandbox,
    );

    if (kind === "batting") {
      const countingPatch = teamFieldsToBattingCounting(row.fields);
      const batting = mergeTeamSeasonBatting(
        existing?.batting,
        countingPatch,
        battingScreenRatesPatch(row.fields),
      );
      if (useSandbox) {
        const now = new Date().toISOString();
        const rec = upsertDemoTeamStats({
          id: teamSeasonStatsKey(year, row.teamId, competition, world),
          year,
          world,
          teamId: row.teamId,
          teamName: team.name,
          competition,
          batting,
          pitching: existing?.pitching ?? null,
          source,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
        ids.push(rec.id);
      } else {
        const { record, cloud } = await upsertTeamSeasonStatsAsync({
          year,
          world,
          teamId: row.teamId,
          teamName: team.name,
          competition,
          batting,
          source,
        });
        ids.push(record.id);
        if (!cloud.ok) cloudFail += 1;
      }
    } else {
      const counting = teamFieldsToPitchingCounting(row.fields);
      const pitching = buildTeamSeasonPitching(
        counting,
        pitchingScreenRates(row.fields),
      );
      if (useSandbox) {
        const now = new Date().toISOString();
        const rec = upsertDemoTeamStats({
          id: teamSeasonStatsKey(year, row.teamId, competition, world),
          year,
          world,
          teamId: row.teamId,
          teamName: team.name,
          competition,
          batting: existing?.batting ?? null,
          pitching,
          source,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
        ids.push(rec.id);
      } else {
        const { record, cloud } = await upsertTeamSeasonStatsAsync({
          year,
          world,
          teamId: row.teamId,
          teamName: team.name,
          competition,
          pitching,
          source,
        });
        ids.push(record.id);
        if (!cloud.ok) cloudFail += 1;
      }
    }
  }

  const label = formatSeasonLineLabel({ year, world });
  const kindLabel = kind === "batting" ? "打撃" : "投手";
  const compLabel = competition === "interleague" ? "交流戦チーム" : "チーム";
  const hist = {
    id: `hist-${Date.now()}`,
    at: new Date().toISOString(),
    year,
    fileName: "team-stats",
    screenType:
      competition === "interleague"
        ? ("interleague" as const)
        : ("standings" as const),
    summary: `${label} ${compLabel}${kindLabel} ${ids.length}球団を登録`,
    recordIds: ids,
  };
  if (useSandbox) appendDemoImportHistory(hist);
  else appendImportHistory(hist);
  if (!useSandbox) notifyImportStoreChanged();

  const cloudOk = !useSandbox && cloudFail === 0;
  let message: string;
  if (useSandbox) {
    message = `${ids.length}球団分を分離デモ領域に登録しました。`;
  } else if (cloudFail > 0) {
    message = `${ids.length}球団分をこの端末に保存しました（クラウド未同期 ${cloudFail}件。SEASONS画面を開くと再送を試みます）。`;
  } else {
    message = `${ids.length}球団分を登録し共有DBへ同期しました。${competition === "interleague" ? "交流戦" : "SEASONS"}のチーム成績へ反映されます。`;
  }

  return { ids, message, cloudOk };
}
