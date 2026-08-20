"use client";

import { useMemo, useState } from "react";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import {
  ImportModeTabs,
  type ImportInputMode,
} from "@/components/import/ImportModeTabs";
import { ImportSubTabs } from "@/components/import/ImportSubTabs";
import { PartnerPastePanel } from "@/components/import/PartnerPastePanel";
import { TeamStatsReviewTable } from "@/components/import/TeamStatsReviewTable";
import { ManualEntryWorkspace } from "@/components/manualEntry";
import { SeasonBatchWorkspace } from "@/components/manualEntry/SeasonBatchWorkspace";
import {
  INTERLEAGUE_IMPORT_SUBS,
  type InterleagueImportSubId,
} from "@/data/import/categories";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import { appendImportHistory } from "@/data/import/store";
import {
  getStoredInterleagueForSeason,
  upsertInterleagueSeason,
  type InterleagueMatrix,
  type InterleagueStandingEntry,
} from "@/data/interleague";
import {
  formatSeasonLineLabel,
  FORMAL_SEASON_START_YEAR,
  listEntrySeasonIdentities,
  makeSeasonKey,
  normalizeSeasonWorld,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";
import { getTeamSeasonStats, ipOutsLabel } from "@/data/teamSeasonStats";
import {
  TEAM_BATTING_FIELD_KEYS,
  TEAM_PITCHING_FIELD_KEYS,
} from "@/data/teamSeasonStats/types";
import { npbTeams, type TeamId } from "@/data/teams";
import { parseNonSeasonPartnerPaste } from "@/lib/import/partnerPaste";
import { runImageOcr } from "@/lib/import/ocr";
import {
  parseStandingsOcrText,
  parseTeamStatsOcrText,
  type TeamStatPartial,
} from "@/lib/import/parseTeamSeasonOcr";
import {
  findConflictingTeamStats,
  saveTeamSeasonStatsRows,
} from "@/lib/import/saveTeamSeasonStatsRows";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { cn } from "@/lib/cn";

const CENTRAL = npbTeams.filter((t) => t.league === "セ");
const PACIFIC = npbTeams.filter((t) => t.league === "パ");

function emptyStanding(
  teamShort: string,
  teamId: TeamId,
  rank: number,
): InterleagueStandingEntry {
  return {
    rank,
    team: teamShort,
    teamId,
    w: 0,
    l: 0,
    d: 0,
    pct: ".000",
    gb: "—",
  };
}

function defaultStandings(): InterleagueStandingEntry[] {
  return npbTeams.map((t, i) => emptyStanding(t.short, t.id, i + 1));
}

function emptyMatrix(): InterleagueMatrix {
  return {
    rowTeams: CENTRAL.map((t) => t.short),
    colTeams: PACIFIC.map((t) => t.short),
    cells: CENTRAL.map(() => PACIFIC.map(() => "0-0")),
  };
}

function formatMatrixCell(w: number, l: number, d: number): string {
  if (d > 0) return `${w}-${l}-${d}`;
  return `${w}-${l}`;
}

function parseMatrixCell(raw: string): { w: number; l: number; d: number } {
  const parts = raw
    .trim()
    .split(/[-－—]/)
    .map((p) => Number(p.replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n));
  return {
    w: parts[0] ?? 0,
    l: parts[1] ?? 0,
    d: parts[2] ?? 0,
  };
}

function calcPct(w: number, l: number): string {
  if (w + l <= 0) return ".000";
  return (w / (w + l)).toFixed(3).replace(/^0/, "");
}

function seasonKeyFromYearHint(
  year: number,
  currentWorld: SeasonWorld | null,
): string {
  if (year >= FORMAL_SEASON_START_YEAR) {
    return makeSeasonKey(currentWorld ?? "BLUE", year);
  }
  return String(year);
}

function fieldNum(
  value: number | null | undefined,
  raw?: string,
): { raw: string; value: number | null } {
  if (value == null || !Number.isFinite(value)) {
    return { raw: raw ?? "", value: null };
  }
  return { raw: raw ?? String(value), value };
}

function teamRecordToPartial(
  teamShort: string,
  teamId: TeamId,
  kind: "batting" | "pitching",
  rec: ReturnType<typeof getTeamSeasonStats>,
): TeamStatPartial {
  const fields: TeamStatPartial["fields"] = {};
  if (kind === "batting" && rec?.batting) {
    const c = rec.batting.counting;
    const d = rec.batting.derived;
    const s = rec.batting.screenRates;
    const map: Record<string, number | null | undefined> = {
      avg: s?.avg ?? d.avg,
      g: c.g,
      pa: c.pa,
      ab: c.ab,
      h: c.h,
      singles: c.singles,
      doubles: c.doubles,
      triples: c.triples,
      hr: c.hr,
      hrRate: s?.hrRate ?? d.hrRate,
      tb: c.tb,
      slg: s?.slg ?? d.slg,
      rbi: c.rbi,
      r: c.r,
      so: c.so,
      soRate: s?.soRate ?? d.soRate,
      bb: c.bb,
      hbp: c.hbp,
      sac: c.sac,
      sf: c.sf,
      gdp: c.gdp,
      gdpRate: s?.gdpRate ?? d.gdpRate,
      sba: c.sba,
      sb: c.sb,
      sbRate: s?.sbRate ?? d.sbRate,
      obp: s?.obp ?? d.obp,
      multiHit: c.multiHit,
      ops: s?.ops ?? d.ops,
    };
    for (const key of TEAM_BATTING_FIELD_KEYS) {
      const v = map[key];
      if (v == null) continue;
      const raw =
        key === "avg" ||
        key === "obp" ||
        key === "ops" ||
        key === "slg" ||
        key === "hrRate" ||
        key === "soRate" ||
        key === "gdpRate" ||
        key === "sbRate"
          ? Number(v).toFixed(3)
          : String(v);
      fields[key] = fieldNum(v, raw);
    }
  }
  if (kind === "pitching" && rec?.pitching) {
    const c = rec.pitching.counting;
    const d = rec.pitching.derived;
    const s = rec.pitching.screenRates;
    const map: Record<string, number | null | undefined | string> = {
      era: s?.era ?? d.era,
      starterEra: s?.starterEra ?? d.starterEra,
      reliefEra: s?.reliefEra ?? d.reliefEra,
      ip: c.ipOuts / 3,
      winPct: s?.winPct ?? d.winPct,
      w: c.w,
      l: c.l,
      sv: c.sv,
      hp: c.hp,
      hld: c.hld,
      g: c.g,
      sho: c.sho,
      cg: c.cg,
      so: c.so,
      soRate: s?.soRate ?? d.soRate,
      bb: c.bb,
      bbRate: s?.bbRate ?? d.bbRate,
      starterEr: c.starterEr,
      reliefEr: c.reliefEr,
    };
    for (const key of TEAM_PITCHING_FIELD_KEYS) {
      const v = map[key];
      if (v == null) continue;
      if (key === "ip") {
        fields.ip = { raw: ipOutsLabel(c.ipOuts), value: c.ipOuts / 3 };
        continue;
      }
      const num = typeof v === "number" ? v : Number(v);
      const raw =
        key === "era" ||
        key === "starterEra" ||
        key === "reliefEra" ||
        key === "winPct" ||
        key === "soRate" ||
        key === "bbRate"
          ? Number(num).toFixed(key === "winPct" ? 3 : 2)
          : String(num);
      fields[key] = fieldNum(num, raw);
    }
  }
  return { teamShort, teamId, fields };
}

export function InterleagueImportWorkspace() {
  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const [sub, setSub] = useState<InterleagueImportSubId>("standings");
  const [inputMode, setInputMode] = useState<ImportInputMode>("image");
  const [partnerText, setPartnerText] = useState("");
  const [seasonKey, setSeasonKey] = useState(
    () => entrySeasons[0]?.seasonKey ?? "BLUE_2026",
  );
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = normalizeSeasonWorld(identity.world);

  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "standings" | "matrix" | "team" | null
  >(null);

  const [standings, setStandings] = useState<InterleagueStandingEntry[]>(
    () => defaultStandings(),
  );
  const [matrix, setMatrix] = useState<InterleagueMatrix>(() => emptyMatrix());
  const [teamRows, setTeamRows] = useState<TeamStatPartial[]>([]);
  const [playerMode, setPlayerMode] = useState<"batch" | "hand">("batch");
  /** 今回ユーザーが編集した交流戦順位／対戦表だけ保存する */
  const [touchedStandings, setTouchedStandings] = useState(false);
  const [touchedStandingTeams, setTouchedStandingTeams] = useState<string[]>(
    [],
  );
  const [touchedMatrix, setTouchedMatrix] = useState(false);

  const stored = useMemo(
    () => getStoredInterleagueForSeason(identity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity, message],
  );

  function standingTeamKey(row: {
    teamId?: string;
    team: string;
  }): string {
    return row.teamId || normalizeTeamShort(row.team);
  }

  function markStandingTeams(keys: string[]) {
    if (keys.length === 0) return;
    setTouchedStandings(true);
    setTouchedStandingTeams((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (k) next.add(k);
      }
      return [...next];
    });
  }

  function clearStandingTouch() {
    setTouchedStandings(false);
    setTouchedStandingTeams([]);
  }

  function mergeUpsert(partial: {
    standings?: InterleagueStandingEntry[];
    matrix?: InterleagueMatrix;
  }) {
    const existing = getStoredInterleagueForSeason(identity);
    return upsertInterleagueSeason({
      year,
      world,
      ...(partial.standings !== undefined
        ? { standings: partial.standings }
        : {}),
      ...(partial.matrix !== undefined ? { matrix: partial.matrix } : {}),
      champion: existing?.champion ?? null,
      championTeamId: existing?.championTeamId ?? null,
      source: "manual",
    });
  }

  function expandPartner() {
    setError(null);
    setMessage(null);
    try {
      const parsed = parseNonSeasonPartnerPaste(partnerText, year);
      if (parsed.kind === "unsupported") {
        setError(parsed.message);
        return;
      }
      if (sub === "standings") {
        if (parsed.kind === "interleague_standings") {
          setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
          const byShort = new Map(
            parsed.rows.map((r) => [normalizeTeamShort(r.team), r]),
          );
          const touched: string[] = [];
          setStandings(
            defaultStandings().map((row) => {
              const ex = byShort.get(normalizeTeamShort(row.team));
              if (!ex) return row;
              touched.push(standingTeamKey(row));
              return {
                ...row,
                rank: ex.rank,
                w: ex.w,
                l: ex.l,
                d: ex.d,
                pct: ex.pct,
                gb: ex.gb,
              };
            }),
          );
          markStandingTeams(touched);
          setMessage(parsed.message);
          return;
        }
        if (parsed.kind === "team_standings") {
          setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
          const all = [...parsed.central, ...parsed.pacific];
          const byShort = new Map(
            all.map((r) => [normalizeTeamShort(r.team), r]),
          );
          const touched: string[] = [];
          setStandings(
            defaultStandings().map((row) => {
              const ex = byShort.get(normalizeTeamShort(row.team));
              if (!ex) return row;
              touched.push(standingTeamKey(row));
              return {
                ...row,
                rank: ex.rank,
                w: ex.w,
                l: ex.l,
                d: ex.d,
                pct: ex.pct,
                gb: ex.gb,
              };
            }),
          );
          markStandingTeams(touched);
          setMessage(
            `${parsed.message}（交流戦表へ転記。TYPE=INTERLEAGUE_STANDINGS 推奨）`,
          );
          return;
        }
        setError(
          "交流戦順位は TYPE=INTERLEAGUE_STANDINGS（または TEAM_STANDINGS）を指定してください",
        );
        return;
      }
      if (sub === "matrix") {
        if (parsed.kind !== "interleague_matrix") {
          setError("交流戦対戦表は TYPE=INTERLEAGUE_MATRIX を指定してください");
          return;
        }
        setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
        setMatrix({
          rowTeams: parsed.rowTeams,
          colTeams: parsed.colTeams,
          cells: parsed.cells,
        });
        setTouchedMatrix(true);
        setMessage(parsed.message);
        return;
      }
      if (sub === "team_batting") {
        if (parsed.kind !== "team_batting") {
          setError("チーム打撃は TYPE=TEAM_BATTING を指定してください");
          return;
        }
        setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
        setTeamRows(parsed.rows);
        setMessage(parsed.message);
        return;
      }
      if (sub === "team_pitching") {
        if (parsed.kind !== "team_pitching") {
          setError("チーム投手は TYPE=TEAM_PITCHING を指定してください");
          return;
        }
        setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
        setTeamRows(parsed.rows);
        setMessage(parsed.message);
        return;
      }
      setError("このカテゴリでは相棒貼り付けを外側から扱いません（個人成績は下のフォーム内）");
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
    }
  }

  async function handleStandingsFiles(files: File[]) {
    setError(null);
    setMessage(null);
    let merged = [...standings];
    const touched: string[] = [];
    for (const file of files) {
      setProgress(`${file.name}: OCR中…`);
      try {
        const ocr = await runImageOcr(file, (p) =>
          setProgress(`${file.name}: ${p}%`),
        );
        const parsed = parseStandingsOcrText(ocr.text);
        for (const p of parsed) {
          const short = normalizeTeamShort(p.teamShort);
          const idx = merged.findIndex(
            (r) => normalizeTeamShort(r.team) === short,
          );
          const entry: InterleagueStandingEntry = {
            rank: p.rank,
            team: short,
            teamId: p.teamId,
            w: p.w,
            l: p.l,
            d: p.d,
            pct: p.pct,
            gb: p.gb,
          };
          if (idx >= 0) {
            merged[idx] = { ...merged[idx]!, ...entry, team: short };
            touched.push(standingTeamKey(merged[idx]!));
          }
        }
        merged = [...merged]
          .sort((a, b) => a.rank - b.rank)
          .map((r, i) => ({ ...r, rank: r.rank || i + 1 }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "OCRに失敗しました");
      }
    }
    setStandings(merged);
    markStandingTeams(touched);
    setProgress("");
    setMessage("交流戦順位候補を更新しました。確認後に登録してください。");
  }

  async function handleTeamStatFiles(files: File[]) {
    setError(null);
    setMessage(null);
    const kind = sub === "team_batting" ? "batting" : "pitching";
    const merged = [...teamRows];
    for (const file of files) {
      setProgress(`${file.name}: OCR中…`);
      try {
        const ocr = await runImageOcr(file, (p) =>
          setProgress(`${file.name}: ${p}%`),
        );
        const parsed = parseTeamStatsOcrText(ocr.text, kind);
        for (const p of parsed) {
          const short = normalizeTeamShort(p.teamShort);
          const idx = merged.findIndex(
            (r) => normalizeTeamShort(r.teamShort) === short,
          );
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx]!,
              fields: { ...merged[idx]!.fields, ...p.fields },
              teamId: p.teamId ?? merged[idx]!.teamId,
            };
          } else {
            merged.push({ ...p, teamShort: short });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "OCRに失敗しました");
      }
    }
    setTeamRows(merged);
    setProgress("");
    setMessage(
      `${merged.length}球団分を統合しました。確認後に一括登録してください（自動保存なし）。`,
    );
  }

  function loadStandings() {
    if (stored?.standings?.length) {
      const byId = new Map(
        stored.standings.map((r) => [r.teamId ?? r.team, r]),
      );
      setStandings(
        defaultStandings().map((row) => {
          const ex = byId.get(row.teamId!) ?? byId.get(row.team) ?? null;
          return ex
            ? { ...row, ...ex, teamId: row.teamId, team: row.team }
            : row;
        }),
      );
      clearStandingTouch();
      setMessage(
        `${formatSeasonLineLabel({ year, world })} の交流戦順位を読み込みました`,
      );
    } else {
      setStandings(defaultStandings());
      clearStandingTouch();
      setMessage("未登録のため空の順位表を表示しています");
    }
  }

  function loadMatrix() {
    if (stored?.matrix?.cells?.length) {
      setMatrix({
        rowTeams: stored.matrix.rowTeams.length
          ? stored.matrix.rowTeams
          : emptyMatrix().rowTeams,
        colTeams: stored.matrix.colTeams.length
          ? stored.matrix.colTeams
          : emptyMatrix().colTeams,
        cells: stored.matrix.cells.map((row) => [...row]),
      });
      setTouchedMatrix(false);
      setMessage(
        `${formatSeasonLineLabel({ year, world })} の交流戦対戦表を読み込みました`,
      );
    } else {
      setMatrix(emptyMatrix());
      setTouchedMatrix(false);
      setMessage("未登録のため空の対戦表を表示しています");
    }
  }

  function loadTeamStats(kind: "batting" | "pitching") {
    const rows = npbTeams.map((t) =>
      teamRecordToPartial(
        t.short,
        t.id,
        kind,
        getTeamSeasonStats(year, t.id, "interleague", world),
      ),
    );
    setTeamRows(rows.filter((r) => Object.keys(r.fields).length > 0));
    const filled = rows.filter((r) => Object.keys(r.fields).length > 0).length;
    setMessage(
      filled
        ? `${formatSeasonLineLabel({ year, world })} 交流戦チーム${kind === "batting" ? "打撃" : "投手"}（${filled}球団）を読み込みました`
        : "未登録です。画像または相棒データから読み込んでください",
    );
  }

  function patchStanding(
    index: number,
    patch: Partial<InterleagueStandingEntry>,
  ) {
    const row = standings[index];
    if (row) markStandingTeams([standingTeamKey(row)]);
    setStandings((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, ...patch };
        if (patch.w != null || patch.l != null) {
          next.pct = calcPct(next.w, next.l);
        }
        return next;
      }),
    );
  }

  function patchMatrixCell(
    ri: number,
    ci: number,
    part: "w" | "l" | "d",
    value: number,
  ) {
    setTouchedMatrix(true);
    setMatrix((prev) => {
      const cells = prev.cells.map((row) => [...row]);
      const cur = parseMatrixCell(cells[ri]?.[ci] ?? "0-0");
      cur[part] = value;
      if (!cells[ri]) cells[ri] = prev.colTeams.map(() => "0-0");
      cells[ri]![ci] = formatMatrixCell(cur.w, cur.l, cur.d);
      return { ...prev, cells };
    });
  }

  function saveStandings(force: boolean) {
    if (shouldUseIsolatedDemoStore(year)) {
      setError(
        "分離デモモード中は交流戦順位を正式ストアへ保存できません。デモモードをOFFにしてください。",
      );
      return;
    }
    if (!touchedStandings || touchedStandingTeams.length === 0) {
      setError(
        "交流戦順位を貼り付け／OCR／編集してから登録してください（未編集の球団は既存のまま残ります）。",
      );
      return;
    }
    const existing = getStoredInterleagueForSeason(identity);
    if (existing?.standings?.length && !force) {
      setPendingAction("standings");
      setConfirmOpen(true);
      return;
    }
    const touched = new Set(touchedStandingTeams);
    const existingByKey = new Map<string, InterleagueStandingEntry>();
    for (const r of existing?.standings ?? []) {
      existingByKey.set(standingTeamKey(r), r);
      if (r.teamId) existingByKey.set(r.teamId, r);
      existingByKey.set(normalizeTeamShort(r.team), r);
    }
    const uiByKey = new Map(
      standings.map((r) => [standingTeamKey(r), r] as const),
    );
    const merged = defaultStandings().map((base) => {
      const key = standingTeamKey(base);
      const ui = uiByKey.get(key);
      if (touched.has(key) || (base.teamId && touched.has(base.teamId))) {
        const src = ui ?? base;
        return {
          ...src,
          teamId: base.teamId,
          team: base.team,
          rank: src.rank || base.rank,
        };
      }
      const ex = existingByKey.get(key) ?? existingByKey.get(base.team);
      if (ex) {
        return { ...base, ...ex, teamId: base.teamId, team: base.team };
      }
      return ui ?? base;
    });
    const sorted = [...merged]
      .map((r, i) => ({ ...r, rank: r.rank || i + 1 }))
      .sort((a, b) => a.rank - b.rank);
    const rec = mergeUpsert({ standings: sorted });
    appendImportHistory({
      id: `hist-${Date.now()}`,
      at: new Date().toISOString(),
      year,
      fileName: "interleague-standings",
      screenType: "interleague",
      summary: `${formatSeasonLineLabel({ year, world })} 交流戦順位を登録（編集球団 ${touched.size}）`,
      recordIds: [rec.id],
    });
    notifyImportStoreChanged();
    setStandings(sorted);
    clearStandingTouch();
    setConfirmOpen(false);
    setPendingAction(null);
    setMessage(
      `${formatSeasonLineLabel({ year, world })} の交流戦順位を登録しました（編集した球団のみ更新）。`,
    );
  }

  function saveMatrix(force: boolean) {
    if (shouldUseIsolatedDemoStore(year)) {
      setError(
        "分離デモモード中は交流戦対戦表を正式ストアへ保存できません。デモモードをOFFにしてください。",
      );
      return;
    }
    if (!touchedMatrix) {
      setError(
        "対戦表を貼り付け／編集してから登録してください（未編集のままでは既存対戦表を上書きしません）。",
      );
      return;
    }
    const existing = getStoredInterleagueForSeason(identity);
    if (existing?.matrix?.cells?.length && !force) {
      setPendingAction("matrix");
      setConfirmOpen(true);
      return;
    }
    const rec = mergeUpsert({ matrix });
    appendImportHistory({
      id: `hist-${Date.now()}`,
      at: new Date().toISOString(),
      year,
      fileName: "interleague-matrix",
      screenType: "interleague",
      summary: `${formatSeasonLineLabel({ year, world })} 交流戦対戦表を登録`,
      recordIds: [rec.id],
    });
    notifyImportStoreChanged();
    setTouchedMatrix(false);
    setConfirmOpen(false);
    setPendingAction(null);
    setMessage(
      `${formatSeasonLineLabel({ year, world })} の交流戦対戦表を登録しました。`,
    );
  }

  function saveTeamStats(force: boolean) {
    const kind = sub === "team_batting" ? "batting" : "pitching";
    const conflicts = findConflictingTeamStats(
      teamRows,
      year,
      world,
      "interleague",
      kind,
    );
    if (conflicts.length && !force) {
      setError(
        `既存データあり: ${conflicts.join("、")}。「上書きして登録」で更新できます。`,
      );
      setPendingAction("team");
      setConfirmOpen(true);
      return;
    }
    const { ids, message: msg } = saveTeamSeasonStatsRows({
      rows: teamRows,
      year,
      world,
      competition: "interleague",
      kind,
      source: "ocr",
    });
    if (ids.length === 0) {
      setError("登録する数値が入力されていません");
      return;
    }
    setConfirmOpen(false);
    setPendingAction(null);
    setError(null);
    setMessage(msg);
    setTeamRows([]);
  }

  function confirmOverwrite() {
    if (pendingAction === "standings") saveStandings(true);
    else if (pendingAction === "matrix") saveMatrix(true);
    else if (pendingAction === "team") saveTeamStats(true);
  }

  const showOuterModes = sub !== "player";
  const partnerExampleKey =
    sub === "standings"
      ? "INTERLEAGUE_STANDINGS"
      : sub === "matrix"
        ? "INTERLEAGUE_MATRIX"
        : sub === "team_batting"
          ? "TEAM_BATTING"
          : sub === "team_pitching"
            ? "TEAM_PITCHING"
            : undefined;

  return (
    <div className="space-y-5">
      <ImportSubTabs
        options={INTERLEAGUE_IMPORT_SUBS}
        value={sub}
        onChange={(id) => {
          setSub(id as InterleagueImportSubId);
          setTeamRows([]);
          setError(null);
          setMessage(null);
          setConfirmOpen(false);
        }}
      />

      <label className="block max-w-xs">
        <span className="mb-1 block text-[11px] tracking-[0.1em] text-white/55">
          シーズン（SeasonIdentity）
        </span>
        <select
          value={seasonKey}
          onChange={(e) => {
            setSeasonKey(e.target.value);
            setError(null);
            setMessage(null);
            setStandings(defaultStandings());
            setMatrix(emptyMatrix());
            setTeamRows([]);
            clearStandingTouch();
            setTouchedMatrix(false);
          }}
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
        >
          {entrySeasons.map((s) => (
            <option key={s.seasonKey} value={s.seasonKey}>
              {s.kind === "demo"
                ? `${s.year} DEMO SEASON`
                : s.world
                  ? `${s.world} ${s.year}`
                  : `${s.year}`}
            </option>
          ))}
        </select>
      </label>

      {showOuterModes ? (
        <ImportModeTabs
          value={inputMode}
          onChange={setInputMode}
          modes={["image", "partner"]}
        />
      ) : null}

      {showOuterModes && inputMode === "partner" ? (
        <PartnerPastePanel
          value={partnerText}
          onChange={setPartnerText}
          onExpand={expandPartner}
          exampleKey={partnerExampleKey}
        />
      ) : null}

      {sub === "standings" ? (
        <section className="space-y-3">
          <p className="text-[12px] text-white/55">
            12球団の交流戦最終順位。BLUE / RED は別データとして保存されます。
            <button
              type="button"
              onClick={loadStandings}
              className="ml-2 text-[color:var(--museum-accent,#d4af37)] underline"
            >
              既存データを表示
            </button>
          </p>
          {inputMode === "image" ? (
            <ImageDropzone
              onFiles={handleStandingsFiles}
              disabled={!!progress}
              maxFiles={6}
              hint="交流戦順位表の画像を選択"
            />
          ) : null}
          <StandingsEditor rows={standings} onChange={patchStanding} />
          <button
            type="button"
            onClick={() => saveStandings(false)}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            交流戦順位を登録
          </button>
        </section>
      ) : null}

      {sub === "matrix" ? (
        <section className="space-y-3">
          <p className="text-[12px] text-white/55">
            セ×パ対戦表（勝・敗・分）。matrix 形式で保存します。
            <button
              type="button"
              onClick={loadMatrix}
              className="ml-2 text-[color:var(--museum-accent,#d4af37)] underline"
            >
              既存データを表示
            </button>
          </p>
          <MatrixEditor matrix={matrix} onChangeCell={patchMatrixCell} />
          <button
            type="button"
            onClick={() => saveMatrix(false)}
            className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
          >
            交流戦対戦表を登録
          </button>
        </section>
      ) : null}

      {sub === "team_batting" || sub === "team_pitching" ? (
        <section className="space-y-3">
          <p className="text-[12px] text-white/55">
            通常シーズンと同じ正式項目・順番・OCR／相棒貼り付けです。保存時のみ
            competition: interleague になります。
            <button
              type="button"
              onClick={() =>
                loadTeamStats(sub === "team_batting" ? "batting" : "pitching")
              }
              className="ml-2 text-[color:var(--museum-accent,#d4af37)] underline"
            >
              既存データを表示
            </button>
          </p>
          {inputMode === "image" ? (
            <ImageDropzone
              onFiles={handleTeamStatFiles}
              disabled={!!progress}
              maxFiles={12}
              hint="チーム成績画面の画像を複数枚追加できます"
            />
          ) : null}
          <TeamStatsReviewTable
            kind={sub === "team_batting" ? "batting" : "pitching"}
            rows={teamRows}
            onChangeField={(ti, key, raw) => {
              setTeamRows((prev) =>
                prev.map((r, i) => {
                  if (i !== ti) return r;
                  const n = Number(raw.replace(/[^\d.-]/g, ""));
                  return {
                    ...r,
                    fields: {
                      ...r.fields,
                      [key]: {
                        raw,
                        value: Number.isFinite(n) ? n : null,
                      },
                    },
                  };
                }),
              );
            }}
          />
          <button
            type="button"
            disabled={teamRows.length === 0}
            onClick={() => saveTeamStats(false)}
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              teamRows.length === 0
                ? "border-white/10 text-white/30"
                : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
            )}
          >
            {teamRows.length}球団を一括登録…
          </button>
        </section>
      ) : null}

      {sub === "player" ? (
        <section className="space-y-4">
          <p className="text-[12px] text-white/55">
            年度個人成績と同じ正式項目・画像／相棒／手入力です。保存時のみ
            scope: interleague になります。
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "batch" as const, label: "一括取込（画像／相棒）" },
                { id: "hand" as const, label: "手入力（1選手）" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlayerMode(opt.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[12px]",
                  playerMode === opt.id
                    ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                    : "border-white/15 text-white/70 hover:border-white/30",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {playerMode === "batch" ? (
            <SeasonBatchWorkspace
              embed
              fixedScope="interleague"
              seasonKey={seasonKey}
              onSeasonKeyChange={setSeasonKey}
            />
          ) : (
            <ManualEntryWorkspace
              embed
              fixedScope="interleague"
              seasonKey={seasonKey}
              onSeasonKeyChange={setSeasonKey}
            />
          )}
        </section>
      ) : null}

      {progress ? (
        <p className="text-[12px] text-[color:var(--museum-accent,#d4af37)]">
          {progress}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/70">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0c0c0c] p-5">
            <h3 className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              登録の確認
            </h3>
            <p className="mt-2 text-[12px] text-white/60">
              既存データがある場合は上書き更新します。BLUE / RED
              は互いに上書きしません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingAction(null);
                }}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={confirmOverwrite}
                className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/20 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
              >
                上書きして登録
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StandingsEditor({
  rows,
  onChange,
}: {
  rows: InterleagueStandingEntry[];
  onChange: (index: number, patch: Partial<InterleagueStandingEntry>) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <p className="border-b border-white/10 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        交流戦最終順位（12球団）
      </p>
      <table className="min-w-full text-left text-[12px]">
        <thead>
          <tr className="text-white/50">
            {["順位", "球団", "勝", "敗", "分", "試合", "勝率", "差"].map(
              (h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.teamId ?? row.team} className="border-t border-white/5">
              <td className="px-2 py-1">
                <input
                  className="w-12 rounded border border-white/10 bg-black/50 px-1 py-1 text-white"
                  value={row.rank}
                  onChange={(e) =>
                    onChange(i, { rank: Number(e.target.value) || 0 })
                  }
                />
              </td>
              <td className="px-2 py-1 text-white">{row.team}</td>
              {(["w", "l", "d"] as const).map((k) => (
                <td key={k} className="px-2 py-1">
                  <input
                    className="w-14 rounded border border-white/10 bg-black/50 px-1 py-1 text-white"
                    value={row[k]}
                    onChange={(e) =>
                      onChange(i, { [k]: Number(e.target.value) || 0 })
                    }
                  />
                </td>
              ))}
              <td className="px-2 py-1 tabular-nums text-white/60">
                {row.w + row.l + row.d}
              </td>
              <td className="px-2 py-1">
                <input
                  className="w-16 rounded border border-white/10 bg-black/50 px-1 py-1 text-white"
                  value={row.pct}
                  onChange={(e) => onChange(i, { pct: e.target.value })}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className="w-14 rounded border border-white/10 bg-black/50 px-1 py-1 text-white"
                  value={row.gb}
                  onChange={(e) => onChange(i, { gb: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatrixEditor({
  matrix,
  onChangeCell,
}: {
  matrix: InterleagueMatrix;
  onChangeCell: (
    ri: number,
    ci: number,
    part: "w" | "l" | "d",
    value: number,
  ) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2">
      <p className="mb-2 px-1 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        セ＼パ（各セル: 勝 / 敗 / 分）
      </p>
      <table className="border-collapse text-center text-[11px]">
        <thead>
          <tr>
            <th className="px-1 py-1 text-white/50">セ＼パ</th>
            {matrix.colTeams.map((t) => (
              <th
                key={t}
                className="px-1 py-1 font-medium text-[color:var(--museum-accent,#d4af37)]"
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rowTeams.map((rowTeam, ri) => (
            <tr key={rowTeam} className="border-t border-white/5">
              <th className="px-1 py-1 text-left font-medium text-white">
                {rowTeam}
              </th>
              {matrix.colTeams.map((_, ci) => {
                const cell = parseMatrixCell(matrix.cells[ri]?.[ci] ?? "0-0");
                return (
                  <td key={`${ri}-${ci}`} className="px-0.5 py-1">
                    <div className="flex min-w-[4.5rem] items-center justify-center gap-0.5">
                      {(["w", "l", "d"] as const).map((part) => (
                        <input
                          key={part}
                          aria-label={`${rowTeam} vs ${matrix.colTeams[ci]} ${part}`}
                          className="w-7 rounded border border-white/10 bg-black/50 px-0.5 py-0.5 text-center text-white"
                          value={cell[part]}
                          onChange={(e) =>
                            onChangeCell(
                              ri,
                              ci,
                              part,
                              Number(e.target.value) || 0,
                            )
                          }
                        />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
