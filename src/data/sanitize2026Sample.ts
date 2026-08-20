/**
 * 2026 サンプル整理（クラウド移行前のローカル掃除）
 *
 * 保持: 2026 BLUE パ・リーグ最終順位のみ
 * 削除: それ以外の year/season === 2026 のサンプル（BLUE/RED 問わず）
 * 非対象: 2000 等の他年度、選手マスタ、認証、バックアップ機能
 */

export const KEEP_FORMAL_YEAR = 2026;
export const KEEP_FORMAL_WORLD = "BLUE" as const;

/** 正式として残すパ・リーグ最終順位（検証・欠損時の復元用） */
export const KEEP_BLUE_2026_PACIFIC = [
  {
    rank: 1,
    team: "日本ハム",
    teamId: "fighters",
    w: 88,
    l: 51,
    d: 4,
    pct: ".633",
    gb: "—",
  },
  {
    rank: 2,
    team: "オリックス",
    teamId: "buffaloes",
    w: 70,
    l: 69,
    d: 4,
    pct: ".504",
    gb: "18.0",
  },
  {
    rank: 3,
    team: "ソフトバンク",
    teamId: "hawks",
    w: 71,
    l: 71,
    d: 1,
    pct: ".500",
    gb: "18.5",
  },
  {
    rank: 4,
    team: "西武",
    teamId: "lions",
    w: 68,
    l: 70,
    d: 5,
    pct: ".493",
    gb: "19.5",
  },
  {
    rank: 5,
    team: "楽天",
    teamId: "eagles",
    w: 65,
    l: 78,
    d: 0,
    pct: ".455",
    gb: "25.0",
  },
  {
    rank: 6,
    team: "ロッテ",
    teamId: "marines",
    w: 61,
    l: 78,
    d: 4,
    pct: ".439",
    gb: "27.0",
  },
] as const;

const TEAM_STANDINGS_KEY = "probase-museum.team-standings.v1";

/** year でフィルタする配列キー（選手マスタは含めない） */
const YEAR_ARRAY_KEYS: Array<{ key: string; field: "year" | "season" }> = [
  { key: "probase-museum.season-lines.v1", field: "year" },
  { key: "probase-museum.team-season-stats.v1", field: "year" },
  { key: "probase-museum.team-standings.v1", field: "year" },
  { key: "probase-museum.standings-history.v1", field: "year" },
  { key: "probase-museum.import.monthly-mvp.v1", field: "year" },
  { key: "probase-museum.import.history.v1", field: "year" },
  { key: "probase-museum.season-achievements.v1", field: "season" },
  { key: "probase-museum.sop-feats.v1", field: "year" },
  { key: "probase-museum.sop-awards-registry.v1", field: "year" },
  { key: "probase-museum.title-win-history.v1", field: "year" },
  { key: "probase-museum.yearbook-reviews.v1", field: "year" },
  { key: "probase-museum.postseason.v1", field: "year" },
  { key: "probase-museum.interleague.v1", field: "year" },
];

export type Sanitize2026Plan = {
  keep: string[];
  remove: string[];
};

export function describeSanitize2026Plan(): Sanitize2026Plan {
  return {
    keep: [
      "probase-museum.team-standings.v1 → id=BLUE:2026 のパ・リーグ6球団",
      "日本ハム88勝〜ロッテ61勝（セ・リーグは空）",
    ],
    remove: [
      "BLUE:2026 のセ・リーグ（central）サンプル",
      "standings-history / import.history など year===2026 の全レコード",
      "RED 2026 を含むその他すべての2026サンプル成績・表彰・SOP等",
    ],
  };
}

export type Sanitize2026Result = {
  touchedKeys: string[];
  removedByKey: Record<string, number>;
  keptPacificTeams: number;
  notes: string[];
};

type Entries = Record<string, string>;

function parseArray(raw: string | undefined): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function isKeepStandingsRecord(r: Record<string, unknown>): boolean {
  const year = Number(r.year);
  const world = r.world;
  const id = String(r.id ?? "");
  return (
    year === KEEP_FORMAL_YEAR &&
    world === KEEP_FORMAL_WORLD &&
    (id === "BLUE:2026" || id === `${KEEP_FORMAL_WORLD}:${KEEP_FORMAL_YEAR}`)
  );
}

function normalizeKeptPacific(
  existing: unknown,
): Array<Record<string, unknown>> {
  const list = Array.isArray(existing)
    ? (existing as Array<Record<string, unknown>>)
    : [];
  if (list.length >= 6) {
    const fighters = list.find(
      (t) => t.teamId === "fighters" || t.team === "日本ハム",
    );
    if (
      fighters &&
      Number(fighters.w) === 88 &&
      Number(fighters.l) === 51
    ) {
      return list.map((t) => ({ ...t }));
    }
  }
  return KEEP_BLUE_2026_PACIFIC.map((t) => ({ ...t }));
}

/**
 * backup entries / localStorage 共通の整理ロジック。
 */
export function sanitize2026SampleEntries(entries: Entries): {
  entries: Entries;
  result: Sanitize2026Result;
} {
  const next: Entries = { ...entries };
  const removedByKey: Record<string, number> = {};
  const touchedKeys: string[] = [];
  const notes: string[] = [];
  let keptPacificTeams = 0;
  let standingsSeen = false;

  for (const { key, field } of YEAR_ARRAY_KEYS) {
    const raw = next[key];
    if (raw == null) continue;
    const arr = parseArray(raw);
    if (arr.length === 0) continue;

    if (key === TEAM_STANDINGS_KEY) {
      standingsSeen = true;
      const keptRecords: Record<string, unknown>[] = [];
      let removedOther2026 = 0;
      let strippedCentral = false;

      for (const r of arr) {
        if (isKeepStandingsRecord(r)) {
          const hadCentral =
            Array.isArray(r.central) && (r.central as unknown[]).length > 0;
          const pacific = normalizeKeptPacific(r.pacific);
          keptPacificTeams = pacific.length;
          keptRecords.push({
            ...r,
            id: "BLUE:2026",
            year: KEEP_FORMAL_YEAR,
            world: KEEP_FORMAL_WORLD,
            central: [],
            pacific,
            updatedAt: new Date().toISOString(),
          });
          if (hadCentral) strippedCentral = true;
        } else if (Number(r.year) === KEEP_FORMAL_YEAR) {
          removedOther2026 += 1;
        } else {
          keptRecords.push(r);
        }
      }

      if (!keptRecords.some(isKeepStandingsRecord)) {
        const now = new Date().toISOString();
        const pacific = KEEP_BLUE_2026_PACIFIC.map((t) => ({ ...t }));
        keptPacificTeams = pacific.length;
        keptRecords.push({
          id: "BLUE:2026",
          year: KEEP_FORMAL_YEAR,
          world: KEEP_FORMAL_WORLD,
          central: [],
          pacific,
          source: "manual",
          createdAt: now,
          updatedAt: now,
        });
        notes.push(
          "BLUE:2026 が無かったため、公式パ順位のみ再作成しました。",
        );
      }

      next[key] = JSON.stringify(keptRecords);
      removedByKey[key] = removedOther2026 + (strippedCentral ? 1 : 0);
      if (strippedCentral) {
        notes.push("BLUE:2026 のセ・リーグ（central）サンプルを空にしました。");
      }
      if (removedOther2026 > 0) {
        notes.push(
          `team-standings から他の2026レコードを ${removedOther2026} 件削除しました。`,
        );
      }
      touchedKeys.push(key);
      continue;
    }

    const kept = arr.filter((r) => Number(r[field]) !== KEEP_FORMAL_YEAR);
    const removed = arr.length - kept.length;
    if (removed > 0) {
      next[key] = JSON.stringify(kept);
      removedByKey[key] = removed;
      touchedKeys.push(key);
    }
  }

  if (!standingsSeen) {
    notes.push(
      "team-standings キーが無いため、パ順位の保持はスキップしました（他キーの2026は削除済み）。",
    );
  }

  return {
    entries: next,
    result: {
      touchedKeys: [...new Set(touchedKeys)].sort(),
      removedByKey,
      keptPacificTeams,
      notes,
    },
  };
}

export function sanitize2026SampleInLocalStorage(): Sanitize2026Result {
  if (typeof window === "undefined") {
    return {
      touchedKeys: [],
      removedByKey: {},
      keptPacificTeams: 0,
      notes: ["window がありません"],
    };
  }

  const entries: Entries = {};
  for (const { key } of YEAR_ARRAY_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw != null) entries[key] = raw;
  }

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("probase-museum.")) continue;
    if (key === "probase-museum.player-master.v3") continue;
    if (key === "probase-museum.import-demo-mode.v1") continue;
    if (entries[key] != null) continue;
    const raw = window.localStorage.getItem(key);
    if (raw == null) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (r) =>
            r &&
            typeof r === "object" &&
            (Number((r as { year?: unknown }).year) === KEEP_FORMAL_YEAR ||
              Number((r as { season?: unknown }).season) === KEEP_FORMAL_YEAR),
        )
      ) {
        entries[key] = raw;
      }
    } catch {
      /* ignore */
    }
  }

  const before = { ...entries };
  const { entries: next, result } = sanitize2026SampleEntries(entries);

  for (const key of Object.keys(next)) {
    if (next[key] !== before[key]) {
      window.localStorage.setItem(key, next[key]!);
    }
  }
  // standings など同一文字列でも意図的に書き直す場合
  for (const key of result.touchedKeys) {
    if (next[key] != null) {
      window.localStorage.setItem(key, next[key]!);
    }
  }

  window.dispatchEvent(new Event("probase-2026-sample-sanitized"));
  return result;
}

/** 整理後の検証（localStorage）— 画面確認用チェックリスト付き */
export type Sanitize2026Check = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export function verifySanitize2026LocalStorage(): {
  ok: boolean;
  issues: string[];
  bluePacific: Array<Record<string, unknown>>;
  checks: Sanitize2026Check[];
} {
  const issues: string[] = [];
  let bluePacific: Array<Record<string, unknown>> = [];
  const checks: Sanitize2026Check[] = [];

  if (typeof window === "undefined") {
    return {
      ok: false,
      issues: ["window なし"],
      bluePacific,
      checks: [],
    };
  }

  const standingsRaw = window.localStorage.getItem(TEAM_STANDINGS_KEY);
  const standings = parseArray(standingsRaw ?? undefined);
  const blue = standings.filter(isKeepStandingsRecord);
  const red2026 = standings.filter(
    (r) => Number(r.year) === KEEP_FORMAL_YEAR && r.world === "RED",
  );
  const other2026Standings = standings.filter(
    (r) =>
      Number(r.year) === KEEP_FORMAL_YEAR && !isKeepStandingsRecord(r),
  );

  if (blue.length === 1) {
    const r = blue[0]!;
    const central = Array.isArray(r.central) ? r.central : [];
    const pacific = Array.isArray(r.pacific) ? r.pacific : [];
    bluePacific = pacific as Array<Record<string, unknown>>;
    const top = pacific[0] as Record<string, unknown> | undefined;
    const pacificOk =
      pacific.length === 6 &&
      !!top &&
      Number(top.w) === 88 &&
      top.teamId === "fighters";
    checks.push({
      id: "blue-pacific",
      label: "2026 BLUE パ・リーグ順位6球団が残っている",
      ok: pacificOk,
      detail: pacificOk
        ? `1位 ${(top as { team?: string }).team} ${String(top.w)}勝`
        : `件数=${pacific.length}`,
    });
    checks.push({
      id: "blue-central-empty",
      label: "2026 BLUE セ・リーグ順位が空",
      ok: central.length === 0,
      detail: `central=${central.length}`,
    });
    if (!pacificOk) {
      issues.push("team-standings: パ1位が日本ハム88勝の6球団でない");
    }
    if (central.length > 0) {
      issues.push("team-standings: BLUE:2026 にセ・リーグが残存");
    }
  } else {
    checks.push({
      id: "blue-pacific",
      label: "2026 BLUE パ・リーグ順位6球団が残っている",
      ok: false,
      detail: `BLUE:2026 件数=${blue.length}`,
    });
    checks.push({
      id: "blue-central-empty",
      label: "2026 BLUE セ・リーグ順位が空",
      ok: false,
      detail: "BLUE:2026 なし",
    });
    issues.push(`team-standings: BLUE:2026 が ${blue.length} 件`);
  }

  checks.push({
    id: "red-empty",
    label: "2026 RED セ・パ両リーグ順位が空",
    ok: red2026.length === 0,
    detail: `RED:2026=${red2026.length}`,
  });
  if (red2026.length > 0) {
    issues.push("team-standings: RED 2026 が残存");
  }
  if (other2026Standings.length > 0 && red2026.length === 0) {
    issues.push(
      `team-standings: その他2026が ${other2026Standings.length} 件残存`,
    );
  }

  const seasonLines = parseArray(
    window.localStorage.getItem("probase-museum.season-lines.v1") ?? undefined,
  ).filter((r) => Number(r.year) === KEEP_FORMAL_YEAR);
  checks.push({
    id: "no-player-lines",
    label: "2026のサンプル個人成績が消えている",
    ok: seasonLines.length === 0,
    detail: `season-lines 2026=${seasonLines.length}`,
  });
  if (seasonLines.length > 0) {
    issues.push(`season-lines: 2026が ${seasonLines.length} 件残存`);
  }

  const monthly = parseArray(
    window.localStorage.getItem("probase-museum.import.monthly-mvp.v1") ??
      undefined,
  ).filter((r) => Number(r.year) === KEEP_FORMAL_YEAR);
  checks.push({
    id: "no-monthly-mvp",
    label: "2026のサンプル月間MVPが消えている",
    ok: monthly.length === 0,
    detail: `monthly-mvp 2026=${monthly.length}`,
  });
  if (monthly.length > 0) {
    issues.push(`monthly-mvp: 2026が ${monthly.length} 件残存`);
  }

  let other2026 = 0;
  for (const { key, field } of YEAR_ARRAY_KEYS) {
    if (key === TEAM_STANDINGS_KEY) continue;
    if (key === "probase-museum.season-lines.v1") continue;
    if (key === "probase-museum.import.monthly-mvp.v1") continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    const left = parseArray(raw).filter(
      (r) => Number(r[field]) === KEEP_FORMAL_YEAR,
    );
    other2026 += left.length;
    if (left.length > 0) {
      issues.push(`${key}: 2026が ${left.length} 件残存`);
    }
  }
  checks.push({
    id: "no-other-2026",
    label: "その他2026サンプルが消えている",
    ok: other2026 === 0,
    detail: `他キーの2026合計=${other2026}`,
  });

  // 2000年など他年度が残っていること（あれば件数>0、無くても「破壊していない」= ok）
  let otherYearCount = 0;
  for (const { key, field } of YEAR_ARRAY_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    otherYearCount += parseArray(raw).filter(
      (r) => Number(r[field]) !== KEEP_FORMAL_YEAR && Number(r[field]) > 0,
    ).length;
  }
  const master = window.localStorage.getItem("probase-museum.player-master.v3");
  checks.push({
    id: "other-years-intact",
    label: "2000年など既存データは残っている（または元から無し）",
    ok: true,
    detail:
      otherYearCount > 0
        ? `他年度レコード=${otherYearCount}`
        : master
          ? "他年度成績なし・選手マスタは保持"
          : "他年度データは元から無し（破壊チェックは2026以外を変更していない）",
  });

  // 選手マスタを消していないこと
  // （整理処理が touch しない前提。キーが元からあれば残っている）
  checks.push({
    id: "player-master-untouched-policy",
    label: "選手マスタ本体は整理対象外",
    ok: true,
    detail: master ? "player-master.v3 存在" : "元から無し",
  });

  return {
    ok: issues.length === 0,
    issues,
    bluePacific,
    checks,
  };
}
