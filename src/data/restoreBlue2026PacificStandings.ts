/**
 * 2026 BLUE パ・リーグ最終順位のみを外科的に復元する。
 *
 * 正本: ~/Downloads/probase-museum-backup-2026-blue-pacific-only.json
 * の entries["probase-museum.team-standings.v1"] 先頭レコード（構造そのまま）。
 *
 * - 触るキーは team-standings.v1 のみ
 * - 置換／挿入するのは id === "BLUE:2026" の1件のみ
 * - 他年度・RED・選手マスタ・他キーは一切変更しない
 * - 全体バックアップ復元はしない
 */

import type { YearStandingsRecord } from "@/data/teamStandings/store";
import { TEAM_STANDINGS_STORAGE_KEY } from "@/data/teamStandings/store";

/**
 * バックアップ JSON 内の生レコード文字列（配列の1要素）。
 * 手組みではなくバックアップ由来の構造をそのまま保持する。
 */
const CANONICAL_BLUE_2026_RECORD_JSON =
  '{"id":"BLUE:2026","year":2026,"world":"BLUE","central":[],"pacific":[{"rank":1,"team":"日本ハム","teamId":"fighters","w":88,"l":51,"d":4,"pct":".633","gb":"—"},{"rank":2,"team":"オリックス","teamId":"buffaloes","w":70,"l":69,"d":4,"pct":".504","gb":"18.0"},{"rank":3,"team":"ソフトバンク","teamId":"hawks","w":71,"l":71,"d":1,"pct":".500","gb":"18.5"},{"rank":4,"team":"西武","teamId":"lions","w":68,"l":70,"d":5,"pct":".493","gb":"19.5"},{"rank":5,"team":"楽天","teamId":"eagles","w":65,"l":78,"d":0,"pct":".455","gb":"25.0"},{"rank":6,"team":"ロッテ","teamId":"marines","w":61,"l":78,"d":4,"pct":".439","gb":"27.0"}],"source":"ocr","createdAt":"2026-08-19T13:04:54.088Z","updatedAt":"2026-08-19T14:45:55.201568Z"}';

const TARGET_ID = "BLUE:2026";

export type RestoreBlue2026PacificResult = {
  ok: boolean;
  action: "inserted" | "replaced" | "unchanged" | "aborted";
  previousPacificCount: number | null;
  nextPacificCount: number;
  otherRecordsPreserved: number;
  notes: string[];
  issues: string[];
};

export type RestoreBlue2026PacificPlan = {
  storageKey: string;
  targetId: string;
  touchesOtherKeys: false;
  replacesWholeStorage: false;
  keepsOtherStandingsRecords: true;
  central: "empty";
  pacificSummary: string[];
};

/** バックアップ由来の正式レコード（ディープコピー） */
export function getCanonicalBlue2026StandingsRecord(): YearStandingsRecord {
  return JSON.parse(CANONICAL_BLUE_2026_RECORD_JSON) as YearStandingsRecord;
}

export function describeRestoreBlue2026PacificPlan(): RestoreBlue2026PacificPlan {
  const record = getCanonicalBlue2026StandingsRecord();
  return {
    storageKey: TEAM_STANDINGS_STORAGE_KEY,
    targetId: TARGET_ID,
    touchesOtherKeys: false,
    replacesWholeStorage: false,
    keepsOtherStandingsRecords: true,
    central: "empty",
    pacificSummary: (record.pacific ?? []).map(
      (t) =>
        `${t.rank} ${t.team} ${t.w}勝${t.l}敗${t.d}分`,
    ),
  };
}

function assertCanonicalSafe(record: YearStandingsRecord): string[] {
  const issues: string[] = [];
  if (record.id !== TARGET_ID) issues.push(`id が ${TARGET_ID} ではない`);
  if (record.year !== 2026) issues.push("year が 2026 ではない");
  if (record.world !== "BLUE") issues.push("world が BLUE ではない");
  if (!Array.isArray(record.central) || record.central.length !== 0) {
    issues.push("central が空配列ではない（サンプル復活の危険）");
  }
  if (!Array.isArray(record.pacific) || record.pacific.length !== 6) {
    issues.push(`pacific 件数が 6 ではない（${record.pacific?.length ?? "n/a"}）`);
  }
  const top = record.pacific?.[0];
  if (
    !top ||
    top.team !== "日本ハム" ||
    top.teamId !== "fighters" ||
    Number(top.w) !== 88 ||
    Number(top.l) !== 51 ||
    Number(top.d) !== 4
  ) {
    issues.push("1位が日本ハム 88-51-4 ではない");
  }
  return issues;
}

function readStandingsList(): YearStandingsRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TEAM_STANDINGS_STORAGE_KEY);
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as YearStandingsRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * team-standings.v1 内の BLUE:2026 だけをバックアップ正本で upsert。
 * 他レコード・他キーは変更しない。
 */
export function restoreBlue2026PacificStandingsOnly(): RestoreBlue2026PacificResult {
  const notes: string[] = [];
  const issues: string[] = [];

  if (typeof window === "undefined") {
    return {
      ok: false,
      action: "aborted",
      previousPacificCount: null,
      nextPacificCount: 0,
      otherRecordsPreserved: 0,
      notes,
      issues: ["window が無いため実行できません"],
    };
  }

  const canonical = getCanonicalBlue2026StandingsRecord();
  const safety = assertCanonicalSafe(canonical);
  if (safety.length > 0) {
    return {
      ok: false,
      action: "aborted",
      previousPacificCount: null,
      nextPacificCount: 0,
      otherRecordsPreserved: 0,
      notes,
      issues: safety,
    };
  }

  const list = readStandingsList();
  const idx = list.findIndex(
    (r) =>
      r.id === TARGET_ID ||
      (Number(r.year) === 2026 && r.world === "BLUE"),
  );
  const previous =
    idx >= 0 ? list[idx]! : null;
  const previousPacificCount = previous?.pacific?.length ?? null;
  const others = list.filter((_, i) => i !== idx);

  // 念のため: 正本以外の2026サンプル順位をこの操作で増やさない（BLUE:2026 のみ）
  const nextRecord: YearStandingsRecord = {
    ...canonical,
    // 復元実行時刻だけ更新（中身は正本のまま）
    updatedAt: new Date().toISOString(),
    createdAt: previous?.createdAt ?? canonical.createdAt,
  };

  const nextList =
    idx >= 0
      ? list.map((r, i) => (i === idx ? nextRecord : r))
      : [...list, nextRecord];

  // 他レコード件数の不変を保証
  if (nextList.length !== others.length + 1) {
    return {
      ok: false,
      action: "aborted",
      previousPacificCount,
      nextPacificCount: 0,
      otherRecordsPreserved: others.length,
      notes,
      issues: ["内部整合性エラー: レコード件数が想定と不一致"],
    };
  }

  window.localStorage.setItem(
    TEAM_STANDINGS_STORAGE_KEY,
    JSON.stringify(nextList),
  );

  const verify = verifyBlue2026PacificStandingsOnly();
  notes.push(
    idx >= 0
      ? "既存の BLUE:2026 をバックアップ正本で置換しました。"
      : "BLUE:2026 を新規挿入しました。",
  );
  notes.push(
    `他の team-standings レコード ${others.length} 件は変更していません。`,
  );
  notes.push("他の localStorage キーには書き込んでいません。");

  return {
    ok: verify.ok,
    action: idx >= 0 ? "replaced" : "inserted",
    previousPacificCount,
    nextPacificCount: nextRecord.pacific.length,
    otherRecordsPreserved: others.length,
    notes: [...notes, ...verify.notes],
    issues: verify.issues,
  };
}

export type VerifyBlue2026PacificResult = {
  ok: boolean;
  notes: string[];
  issues: string[];
};

/** 復元後の検証（読み取りのみ） */
export function verifyBlue2026PacificStandingsOnly(): VerifyBlue2026PacificResult {
  const notes: string[] = [];
  const issues: string[] = [];
  const list = readStandingsList();
  const blue = list.find((r) => r.id === TARGET_ID);
  if (!blue) {
    issues.push("BLUE:2026 が存在しない");
    return { ok: false, notes, issues };
  }
  issues.push(...assertCanonicalSafe(blue));
  // central にサンプル球団が混入していないこと
  if ((blue.central?.length ?? 0) > 0) {
    issues.push("central が空ではない（サンプル復活の可能性）");
  }
  notes.push(
    `pacific=${blue.pacific.length} / 1位=${blue.pacific[0]?.team} ${blue.pacific[0]?.w}勝`,
  );
  return { ok: issues.length === 0, notes, issues };
}
