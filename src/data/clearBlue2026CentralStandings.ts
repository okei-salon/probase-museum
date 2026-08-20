/**
 * 本番向け一時修正: BLUE:2026 の central（セ）だけを空にする。
 *
 * - team-standings.v1 の BLUE:2026.central → []
 * - standings-history.v1 の BLUE:2026 各 checkpoint の central → []（ある場合のみ）
 * - pacific は一切書き換えない（参照をそのまま保持）
 * - RED / 他年度 / 他キーは触らない
 */

import {
  TEAM_STANDINGS_STORAGE_KEY,
  type StandingEntry,
  type YearStandingsRecord,
} from "@/data/teamStandings/store";
import { STANDINGS_HISTORY_STORAGE_KEY } from "@/data/standingsHistory/store";
import type { StandingsHistoryRecord } from "@/data/standingsHistory/types";
import { normalizeSeasonWorld } from "@/data/seasons";

const TARGET_ID = "BLUE:2026";
const TARGET_YEAR = 2026;
const TARGET_WORLD = "BLUE" as const;

export type ClearBlue2026CentralPreview = {
  teamStandingsKey: string;
  historyKey: string;
  blueFound: boolean;
  centralCount: number;
  pacificCount: number;
  pacificTop: string | null;
  historyRecordsTouchingBlue: number;
  historyCentralTotal: number;
  historyPacificTotal: number;
  notes: string[];
  canRun: boolean;
  blockReasons: string[];
};

export type ClearBlue2026CentralResult = {
  ok: boolean;
  teamStandingsTouched: boolean;
  historyRecordsUpdated: number;
  before: {
    centralCount: number;
    pacificCount: number;
  };
  after: {
    centralCount: number;
    pacificCount: number;
    fightersWins: number | null;
  };
  notes: string[];
  issues: string[];
};

function readJsonArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function isBlue2026Standings(r: {
  id?: string;
  year?: number;
  world?: unknown;
}): boolean {
  if (r.id === TARGET_ID) return true;
  return (
    Number(r.year) === TARGET_YEAR &&
    normalizeSeasonWorld(r.world) === TARGET_WORLD
  );
}

function pacificSnapshot(pacific: StandingEntry[] | undefined): string {
  return JSON.stringify(pacific ?? []);
}

function assertPacificPreserved(
  before: StandingEntry[] | undefined,
  after: StandingEntry[] | undefined,
): string | null {
  if (pacificSnapshot(before) !== pacificSnapshot(after)) {
    return "pacific が変更されてしまった（中止相当の検証失敗）";
  }
  return null;
}

function formalPacificOk(pacific: StandingEntry[] | undefined): string[] {
  const issues: string[] = [];
  if (!Array.isArray(pacific) || pacific.length !== 6) {
    issues.push(`pacific が6件ではない（${pacific?.length ?? "n/a"}）`);
    return issues;
  }
  const top = pacific[0];
  if (
    !top ||
    top.team !== "日本ハム" ||
    Number(top.w) !== 88 ||
    Number(top.l) !== 51 ||
    Number(top.d) !== 4
  ) {
    issues.push("1位が日本ハム 88勝51敗4分ではない（保護対象外の可能性）");
  }
  return issues;
}

/** 実行前プレビュー（読み取りのみ） */
export function inspectClearBlue2026Central(): ClearBlue2026CentralPreview {
  const notes: string[] = [];
  const blockReasons: string[] = [];
  const standings = readJsonArray<YearStandingsRecord>(TEAM_STANDINGS_STORAGE_KEY);
  const blue = standings.find(isBlue2026Standings) ?? null;

  const history = readJsonArray<StandingsHistoryRecord>(
    STANDINGS_HISTORY_STORAGE_KEY,
  );
  const histBlue = history.filter(isBlue2026Standings);

  if (!blue) {
    blockReasons.push("BLUE:2026 の team-standings レコードが無い");
  }

  const centralCount = blue?.central?.length ?? 0;
  const pacificCount = blue?.pacific?.length ?? 0;
  const pacificIssues = blue ? formalPacificOk(blue.pacific) : ["レコード無し"];
  if (pacificIssues.length > 0) {
    blockReasons.push(...pacificIssues);
  }

  const historyCentralTotal = histBlue.reduce(
    (n, r) => n + (Array.isArray(r.central) ? r.central.length : 0),
    0,
  );
  const historyPacificTotal = histBlue.reduce(
    (n, r) => n + (Array.isArray(r.pacific) ? r.pacific.length : 0),
    0,
  );

  notes.push(
    `変更対象: ${TEAM_STANDINGS_STORAGE_KEY} の ${TARGET_ID}.central のみを [] に`,
  );
  notes.push(
    `任意: ${STANDINGS_HISTORY_STORAGE_KEY} の BLUE:2026 各時点の central のみ []（pacific は維持）`,
  );
  notes.push("RED・他年度・選手マスタ・他キーは変更しません");

  const top = blue?.pacific?.[0];
  return {
    teamStandingsKey: TEAM_STANDINGS_STORAGE_KEY,
    historyKey: STANDINGS_HISTORY_STORAGE_KEY,
    blueFound: blue != null,
    centralCount,
    pacificCount,
    pacificTop: top
      ? `${top.team} ${top.w}勝${top.l}敗${top.d}分`
      : null,
    historyRecordsTouchingBlue: histBlue.length,
    historyCentralTotal,
    historyPacificTotal,
    notes,
    canRun: blockReasons.length === 0,
    blockReasons,
  };
}

/**
 * BLUE:2026 の central だけ空にする。pacific は同一内容のまま残す。
 */
export function clearBlue2026CentralOnly(): ClearBlue2026CentralResult {
  const notes: string[] = [];
  const issues: string[] = [];

  if (typeof window === "undefined") {
    return {
      ok: false,
      teamStandingsTouched: false,
      historyRecordsUpdated: 0,
      before: { centralCount: 0, pacificCount: 0 },
      after: { centralCount: 0, pacificCount: 0, fightersWins: null },
      notes,
      issues: ["window が無いため実行できません"],
    };
  }

  const preview = inspectClearBlue2026Central();
  if (!preview.canRun) {
    return {
      ok: false,
      teamStandingsTouched: false,
      historyRecordsUpdated: 0,
      before: {
        centralCount: preview.centralCount,
        pacificCount: preview.pacificCount,
      },
      after: {
        centralCount: preview.centralCount,
        pacificCount: preview.pacificCount,
        fightersWins: null,
      },
      notes: preview.notes,
      issues: preview.blockReasons,
    };
  }

  const standings = readJsonArray<YearStandingsRecord>(TEAM_STANDINGS_STORAGE_KEY);
  const idx = standings.findIndex(isBlue2026Standings);
  const existing = standings[idx]!;
  const pacificBefore = existing.pacific;
  const beforeCentral = existing.central?.length ?? 0;
  const beforePacific = pacificBefore?.length ?? 0;

  // pacific 配列オブジェクトをそのまま再利用（内容変更なし）
  const nextRecord: YearStandingsRecord = {
    ...existing,
    id: TARGET_ID,
    year: TARGET_YEAR,
    world: TARGET_WORLD,
    central: [],
    pacific: pacificBefore,
    updatedAt: new Date().toISOString(),
  };

  const pacificGuard = assertPacificPreserved(pacificBefore, nextRecord.pacific);
  if (pacificGuard) {
    return {
      ok: false,
      teamStandingsTouched: false,
      historyRecordsUpdated: 0,
      before: { centralCount: beforeCentral, pacificCount: beforePacific },
      after: {
        centralCount: beforeCentral,
        pacificCount: beforePacific,
        fightersWins: null,
      },
      notes,
      issues: [pacificGuard],
    };
  }

  const nextStandings = standings.map((r, i) => (i === idx ? nextRecord : r));
  window.localStorage.setItem(
    TEAM_STANDINGS_STORAGE_KEY,
    JSON.stringify(nextStandings),
  );
  notes.push(
    `${TEAM_STANDINGS_STORAGE_KEY}: BLUE:2026.central ${beforeCentral}件 → 0件`,
  );

  // standings-history: BLUE:2026 の central のみ空に（pacific 不変）
  let historyUpdated = 0;
  const history = readJsonArray<StandingsHistoryRecord>(
    STANDINGS_HISTORY_STORAGE_KEY,
  );
  if (history.length > 0) {
    let historyWriteOk = true;
    const nextHistory = history.map((r) => {
      if (!isBlue2026Standings(r)) return r;
      const centralLen = Array.isArray(r.central) ? r.central.length : 0;
      if (centralLen === 0) return r;
      const pacificHist = r.pacific;
      const cleared: StandingsHistoryRecord = {
        ...r,
        central: [],
        pacific: pacificHist,
        updatedAt: new Date().toISOString(),
      };
      const g = assertPacificPreserved(pacificHist, cleared.pacific);
      if (g) {
        issues.push(`history ${r.id}: ${g}`);
        historyWriteOk = false;
        return r;
      }
      historyUpdated += 1;
      return cleared;
    });
    if (historyUpdated > 0 && historyWriteOk) {
      window.localStorage.setItem(
        STANDINGS_HISTORY_STORAGE_KEY,
        JSON.stringify(nextHistory),
      );
      notes.push(
        `${STANDINGS_HISTORY_STORAGE_KEY}: BLUE:2026 の ${historyUpdated} 件で central を空に（pacific 維持）`,
      );
    }
  } else {
    notes.push("standings-history キー無し／空 → スキップ");
  }

  const verify = verifyClearBlue2026Central();
  notes.push(...verify.notes);
  issues.push(...verify.issues);

  const afterBlue =
    readJsonArray<YearStandingsRecord>(TEAM_STANDINGS_STORAGE_KEY).find(
      isBlue2026Standings,
    ) ?? null;

  return {
    ok: verify.ok && issues.length === 0,
    teamStandingsTouched: true,
    historyRecordsUpdated: historyUpdated,
    before: { centralCount: beforeCentral, pacificCount: beforePacific },
    after: {
      centralCount: afterBlue?.central?.length ?? -1,
      pacificCount: afterBlue?.pacific?.length ?? -1,
      fightersWins:
        afterBlue?.pacific?.[0] && afterBlue.pacific[0].team === "日本ハム"
          ? Number(afterBlue.pacific[0].w)
          : null,
    },
    notes,
    issues,
  };
}

export function verifyClearBlue2026Central(): {
  ok: boolean;
  notes: string[];
  issues: string[];
} {
  const notes: string[] = [];
  const issues: string[] = [];
  const blue =
    readJsonArray<YearStandingsRecord>(TEAM_STANDINGS_STORAGE_KEY).find(
      isBlue2026Standings,
    ) ?? null;
  if (!blue) {
    issues.push("検証: BLUE:2026 が無い");
    return { ok: false, notes, issues };
  }
  if ((blue.central?.length ?? 0) !== 0) {
    issues.push(`検証: central=${blue.central?.length}（0であるべき）`);
  } else {
    notes.push("検証: central = 0件");
  }
  const pacificIssues = formalPacificOk(blue.pacific);
  issues.push(...pacificIssues);
  if (pacificIssues.length === 0) {
    notes.push("検証: pacific = 6件 / 日本ハム 88勝");
  }
  const histBlue = readJsonArray<StandingsHistoryRecord>(
    STANDINGS_HISTORY_STORAGE_KEY,
  ).filter(isBlue2026Standings);
  for (const h of histBlue) {
    if ((h.central?.length ?? 0) > 0) {
      issues.push(`検証: history ${h.id} の central が空でない`);
    }
  }
  if (histBlue.length > 0) {
    notes.push(
      `検証: standings-history BLUE:2026 ${histBlue.length} 件の central は空`,
    );
  }
  return { ok: issues.length === 0, notes, issues };
}
