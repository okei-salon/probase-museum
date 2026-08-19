"use client";

import { useMemo, useState } from "react";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import { ImportModeTabs, type ImportInputMode } from "@/components/import/ImportModeTabs";
import { ImportSubTabs } from "@/components/import/ImportSubTabs";
import { PartnerPastePanel } from "@/components/import/PartnerPastePanel";
import { TeamStatsReviewTable } from "@/components/import/TeamStatsReviewTable";
import {
  SEASON_IMPORT_SUBS,
  type SeasonImportSubId,
} from "@/data/import/categories";
import { parseNonSeasonPartnerPaste } from "@/lib/import/partnerPaste";
import {
  findConflictingTeamStats,
  saveTeamSeasonStatsRows,
} from "@/lib/import/saveTeamSeasonStatsRows";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  getDemoStandings,
  upsertDemoStandings,
} from "@/data/import/demoStore";
import { appendImportHistory } from "@/data/import/store";
import {
  formatSeasonLineLabel,
  FORMAL_SEASON_START_YEAR,
  listEntrySeasonIdentities,
  makeSeasonKey,
  parseSeasonKey,
  type SeasonWorld,
} from "@/data/seasons";
import {
  getStandingsForSeason,
  upsertYearStandings,
  yearStandingsKey,
  type StandingEntry,
} from "@/data/teamStandings";
import {
  STANDINGS_CHECKPOINTS,
  STANDINGS_CHECKPOINT_LABELS,
  getCheckpointStandingsForEdit,
  upsertStandingsHistory,
  type StandingsCheckpoint,
} from "@/data/standingsHistory";
import { npbTeams, type TeamId } from "@/data/teams";
import { runImageOcr } from "@/lib/import/ocr";
import {
  parseStandingsOcrText,
  parseTeamStatsOcrText,
  type TeamStatPartial,
} from "@/lib/import/parseTeamSeasonOcr";
import { normalizeTeamShort } from "@/lib/import/seasonBatchMerge";
import { cn } from "@/lib/cn";

const CENTRAL = npbTeams.filter((t) => t.league === "セ");
const PACIFIC = npbTeams.filter((t) => t.league === "パ");

function emptyStanding(teamShort: string, teamId: TeamId, rank: number): StandingEntry {
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

function defaultLeagueRows(
  league: "central" | "pacific",
): StandingEntry[] {
  const teams = league === "central" ? CENTRAL : PACIFIC;
  return teams.map((t, i) => emptyStanding(t.short, t.id, i + 1));
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

export function SeasonImportWorkspace() {
  const [sub, setSub] = useState<SeasonImportSubId>("standings");
  const [inputMode, setInputMode] = useState<ImportInputMode>("image");
  const [partnerText, setPartnerText] = useState("");
  const [seasonKey, setSeasonKey] = useState("BLUE_2026");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const entrySeasons = useMemo(() => listEntrySeasonIdentities(), []);
  const identity = useMemo(
    () => parseSeasonKey(seasonKey) ?? entrySeasons[0]!,
    [seasonKey, entrySeasons],
  );
  const year = identity.year;
  const world = identity.world;

  // standings
  const [checkpoint, setCheckpoint] =
    useState<StandingsCheckpoint>("final");
  const [central, setCentral] = useState<StandingEntry[]>(() =>
    defaultLeagueRows("central"),
  );
  const [pacific, setPacific] = useState<StandingEntry[]>(() =>
    defaultLeagueRows("pacific"),
  );
  const [activeLeague, setActiveLeague] = useState<"central" | "pacific">(
    "central",
  );

  // team stats
  const [teamRows, setTeamRows] = useState<TeamStatPartial[]>([]);

  const existingStandings = useMemo(() => {
    if (checkpoint === "final") {
      return getStandingsForSeason(identity);
    }
    return getCheckpointStandingsForEdit(identity, checkpoint);
  }, [identity, checkpoint, message]);

  function loadExistingStandings() {
    const ex =
      checkpoint === "final"
        ? getStandingsForSeason(identity)
        : getCheckpointStandingsForEdit(identity, checkpoint);
    if (ex) {
      setCentral(ex.central.length ? ex.central : defaultLeagueRows("central"));
      setPacific(ex.pacific.length ? ex.pacific : defaultLeagueRows("pacific"));
      setMessage(
        `${formatSeasonLineLabel({ year, world })} ${STANDINGS_CHECKPOINT_LABELS[checkpoint]}の既存順位を読み込みました`,
      );
    }
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
        if (parsed.kind !== "team_standings") {
          setError("チーム順位は TYPE=TEAM_STANDINGS を指定してください");
          return;
        }
        setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
        if (parsed.central.length) {
          setCentral(
            parsed.central.length >= 6
              ? parsed.central.slice(0, 6)
              : [
                  ...parsed.central,
                  ...defaultLeagueRows("central").slice(parsed.central.length),
                ].slice(0, 6),
          );
          setActiveLeague("central");
        }
        if (parsed.pacific.length) {
          setPacific(
            parsed.pacific.length >= 6
              ? parsed.pacific.slice(0, 6)
              : [
                  ...parsed.pacific,
                  ...defaultLeagueRows("pacific").slice(parsed.pacific.length),
                ].slice(0, 6),
          );
          if (!parsed.central.length) setActiveLeague("pacific");
        }
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
      if (parsed.kind !== "team_pitching") {
        setError("チーム投手は TYPE=TEAM_PITCHING を指定してください");
        return;
      }
      setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
      setTeamRows(parsed.rows);
      setMessage(parsed.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
    }
  }

  async function handleStandingsFiles(files: File[]) {
    setError(null);
    setMessage(null);
    const league = activeLeague;
    let merged = league === "central" ? [...central] : [...pacific];

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
          const entry: StandingEntry = {
            rank: p.rank,
            team: short,
            teamId: p.teamId,
            w: p.w,
            l: p.l,
            d: p.d,
            pct: p.pct,
            gb: p.gb,
          };
          if (idx >= 0) merged[idx] = { ...merged[idx]!, ...entry, team: short };
          else if (merged.length < 6) merged.push(entry);
        }
        merged = merged
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 6)
          .map((r, i) => ({ ...r, rank: r.rank || i + 1 }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "OCRに失敗しました");
      }
    }
    if (league === "central") setCentral(merged);
    else setPacific(merged);
    setProgress("");
    setMessage(
      `${league === "central" ? "セ" : "パ"}・リーグ順位候補を更新しました。確認後に登録してください。`,
    );
  }

  async function handleTeamStatFiles(files: File[]) {
    setError(null);
    setMessage(null);
    const kind = sub === "team_batting" ? "batting" : "pitching";
    let merged = [...teamRows];

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

  function patchStanding(
    league: "central" | "pacific",
    index: number,
    patch: Partial<StandingEntry>,
  ) {
    const setter = league === "central" ? setCentral : setPacific;
    setter((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function saveStandings(force: boolean) {
    const useSandbox = shouldUseIsolatedDemoStore(year);
    const ex =
      checkpoint === "final"
        ? useSandbox
          ? getDemoStandings()
          : getStandingsForSeason(identity)
        : getCheckpointStandingsForEdit(identity, checkpoint);
    if (ex && !force) {
      setConfirmOpen(true);
      return;
    }

    const label = `${formatSeasonLineLabel({ year, world })} ${STANDINGS_CHECKPOINT_LABELS[checkpoint]}`;

    if (checkpoint === "final") {
      // 最終: team-standings 本体 + history(final) を同時更新（二重手入力回避）
      const id = yearStandingsKey(year, world);
      const existingFinal = useSandbox
        ? getDemoStandings()
        : getStandingsForSeason(identity);
      const createdAt =
        existingFinal?.createdAt ?? new Date().toISOString();
      const payload = {
        id,
        year,
        world,
        central,
        pacific,
        source: "ocr" as const,
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (useSandbox) {
        upsertDemoStandings(payload);
      } else {
        upsertYearStandings({
          year,
          world,
          central,
          pacific,
          source: "ocr",
        });
      }
      upsertStandingsHistory({
        year,
        world,
        checkpoint: "final",
        central,
        pacific,
        source: useSandbox ? "ocr" : "sync",
      });
      const hist = {
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        year,
        fileName: "standings",
        screenType: "standings" as const,
        summary: `${label} チーム順位を登録`,
        recordIds: [id],
      };
      if (useSandbox) appendDemoImportHistory(hist);
      else appendImportHistory(hist);
    } else {
      // 月次: 順位推移ストアのみ（最終順位は変更しない）
      if (!useSandbox) {
        const rec = upsertStandingsHistory({
          year,
          world,
          checkpoint,
          central,
          pacific,
          source: "ocr",
        });
        appendImportHistory({
          id: `hist-${Date.now()}`,
          at: new Date().toISOString(),
          year,
          fileName: "standings-history",
          screenType: "standings",
          summary: `${label} 順位推移を登録`,
          recordIds: [rec.id],
        });
      } else {
        // デモ分離領域に月次履歴は未対応 — 正式ストアへは書かない方針を維持し案内のみ
        setError(
          "月別順位推移の登録は正式ストア向けです。DEMO取込モードをオフにしてください（または最終を選択）。",
        );
        setConfirmOpen(false);
        return;
      }
    }

    if (!useSandbox) notifyImportStoreChanged();
    setConfirmOpen(false);
    setMessage(
      useSandbox
        ? `${label}のチーム順位を分離デモ領域に登録しました。`
        : `${label}の順位を登録しました。シーズン画面の順位推移へ反映されます。`,
    );
  }

  function saveTeamStats(force: boolean) {
    const kind = sub === "team_batting" ? "batting" : "pitching";
    const conflicts = findConflictingTeamStats(
      teamRows,
      year,
      world,
      "regular",
      kind,
    );
    if (conflicts.length && !force) {
      setError(
        `既存データあり: ${conflicts.join("、")}。「上書きして登録」で更新できます。`,
      );
      setConfirmOpen(true);
      return;
    }

    const { ids, message: msg } = saveTeamSeasonStatsRows({
      rows: teamRows,
      year,
      world,
      competition: "regular",
      kind,
      source: "ocr",
    });
    if (ids.length === 0) {
      setError("登録する数値が入力されていません");
      return;
    }
    setConfirmOpen(false);
    setError(null);
    setMessage(msg);
    setTeamRows([]);
  }

  return (
    <div className="space-y-5">
      <ImportSubTabs
        options={SEASON_IMPORT_SUBS}
        value={sub}
        onChange={(id) => {
          setSub(id as SeasonImportSubId);
          setTeamRows([]);
          setMessage(null);
          setError(null);
          setConfirmOpen(false);
        }}
      />

      <label className="block max-w-xs">
        <span className="mb-1 block text-[11px] text-white/55">シーズン</span>
        <select
          value={seasonKey}
          onChange={(e) => setSeasonKey(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
        >
          {entrySeasons.map((s) => (
            <option key={s.seasonKey} value={s.seasonKey}>
              {s.kind === "demo"
                ? `${s.year} DEMO SEASON`
                : s.world
                  ? `${s.year} ${s.world}`
                  : `${s.year}年`}
            </option>
          ))}
        </select>
      </label>

      <ImportModeTabs
        value={inputMode}
        onChange={setInputMode}
        modes={["image", "partner"]}
      />

      {inputMode === "partner" ? (
        <PartnerPastePanel
          value={partnerText}
          onChange={setPartnerText}
          onExpand={expandPartner}
          exampleKey={
            sub === "standings"
              ? "TEAM_STANDINGS"
              : sub === "team_batting"
                ? "TEAM_BATTING"
                : "TEAM_PITCHING"
          }
        />
      ) : null}

      {sub === "standings" ? (
        <>
          <label className="block max-w-xs">
            <span className="mb-1 block text-[11px] text-white/55">
              対象時点
            </span>
            <select
              value={checkpoint}
              onChange={(e) => {
                const next = e.target.value as StandingsCheckpoint;
                setCheckpoint(next);
                setMessage(null);
                setError(null);
              }}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[13px] text-white"
            >
              {STANDINGS_CHECKPOINTS.map((c) => (
                <option key={c} value={c}>
                  {STANDINGS_CHECKPOINT_LABELS[c]}
                  {c === "final" ? "（最終順位ストアと同期）" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[12px] text-white/55">
            セ・パそれぞれ6球団の順位を読み込みます。リーグを切り替えて画像を追加し、確認後に登録してください。
            {checkpoint === "final"
              ? " 「最終」は最終順位として保存し、順位推移の最終時点にも同期します。"
              : " 月次は順位推移専用ストアへ保存し、最終順位は変更しません。"}
            {existingStandings ? (
              <button
                type="button"
                onClick={loadExistingStandings}
                className="ml-2 text-[color:var(--museum-accent,#d4af37)] underline"
              >
                既存データを表示
              </button>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "central" as const, label: "セ・リーグ" },
                { id: "pacific" as const, label: "パ・リーグ" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLeague(l.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[12px]",
                  activeLeague === l.id
                    ? "border-[color:var(--museum-accent,#d4af37)] text-[color:var(--museum-accent,#d4af37)]"
                    : "border-white/15 text-white/70",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          {inputMode === "image" ? (
          <ImageDropzone
            onFiles={handleStandingsFiles}
            disabled={!!progress}
            maxFiles={6}
            hint={`${activeLeague === "central" ? "セ" : "パ"}・リーグ順位表の画像を選択`}
          />
          ) : null}
          <StandingsEditTable
            title={activeLeague === "central" ? "セ・リーグ" : "パ・リーグ"}
            rows={activeLeague === "central" ? central : pacific}
            onChange={(i, patch) => patchStanding(activeLeague, i, patch)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveStandings(false)}
              className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
            >
              順位を登録…
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12px] text-white/55">
            横スクロール撮影の複数枚を、球団＋年度で統合します。OCRは確認後に一括登録（自動保存なし）。
          </p>
          {inputMode === "image" ? (
          <ImageDropzone
            onFiles={handleTeamStatFiles}
            disabled={!!progress}
            maxFiles={12}
            hint="チーム成績画面の画像を複数枚追加できます"
          />
          ) : null}          <TeamStatsReviewTable
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
        </>
      )}

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
              既存データがある場合は上書き更新します。重複新規作成はしません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/70"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() =>
                  sub === "standings" ? saveStandings(true) : saveTeamStats(true)
                }
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

function StandingsEditTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: StandingEntry[];
  onChange: (index: number, patch: Partial<StandingEntry>) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <p className="border-b border-white/10 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <table className="min-w-full text-left text-[12px]">
        <thead>
          <tr className="text-white/50">
            {["順位", "球団", "勝", "敗", "分", "勝率", "差"].map((h) => (
              <th key={h} className="px-2 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.team} className="border-t border-white/5">
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
