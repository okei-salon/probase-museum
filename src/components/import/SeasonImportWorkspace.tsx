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
  upsertYearStandingsAsync,
  yearStandingsKey,
  type StandingEntry,
} from "@/data/teamStandings";
import {
  STANDINGS_TREND_CHECKPOINTS,
  STANDINGS_CHECKPOINT_LABELS,
  getCheckpointStandingsForEdit,
  upsertStandingsHistory,
  upsertStandingsHistoryAsync,
  type StandingsCheckpoint,
} from "@/data/standingsHistory";
import {
  cardPairKey,
  getPennantMatchups,
  normalizeMatchupCard,
  upsertPennantMatchupCardsAsync,
  type PennantLeague,
  type PennantMatchupDraft,
} from "@/data/pennantMatchups";
import { npbTeams, type TeamId } from "@/data/teams";
import { runImageOcr } from "@/lib/import/ocr";
import {
  parseStandingsOcrText,
  parseTeamStatsOcrText,
  type TeamStatPartial,
} from "@/lib/import/parseTeamSeasonOcr";
import { parsePennantMatchupsOcrText } from "@/lib/import/parsePennantMatchupsOcr";
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
  /** 今回の編集で更新するリーグだけ true（未タッチのリーグは既存を維持） */
  const [touchedCentral, setTouchedCentral] = useState(false);
  const [touchedPacific, setTouchedPacific] = useState(false);

  // team stats
  const [teamRows, setTeamRows] = useState<TeamStatPartial[]>([]);

  // pennant matchups（対戦表）
  const [matchupLeague, setMatchupLeague] =
    useState<PennantLeague>("central");
  const [matchupDrafts, setMatchupDrafts] = useState<PennantMatchupDraft[]>(
    [],
  );

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
      // 表示用読み込み。保存対象にはしない（未編集リーグの上書き防止）
      setTouchedCentral(false);
      setTouchedPacific(false);
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
        const nextKey = seasonKeyFromYearHint(parsed.year, world);
        setSeasonKey(nextKey);
        const nextIdentity = parseSeasonKey(nextKey);
        const existingForYear =
          checkpoint === "final" && nextIdentity
            ? getStandingsForSeason(nextIdentity)
            : nextIdentity
              ? getCheckpointStandingsForEdit(nextIdentity, checkpoint)
              : null;

        if (parsed.central.length) {
          setCentral(
            parsed.central.length >= 6
              ? parsed.central.slice(0, 6)
              : [
                  ...parsed.central,
                  ...defaultLeagueRows("central").slice(parsed.central.length),
                ].slice(0, 6),
          );
          setTouchedCentral(true);
          setActiveLeague("central");
        } else if (existingForYear?.central.length) {
          // CL未入力時は既存CLを表示用に載せる（保存対象にはしない）
          setCentral(existingForYear.central);
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
          setTouchedPacific(true);
          if (!parsed.central.length) setActiveLeague("pacific");
        } else if (existingForYear?.pacific.length) {
          // PL未入力時は既存PLを表示用に載せる（保存対象にはしない）
          setPacific(existingForYear.pacific);
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
      if (sub === "matchups") {
        if (parsed.kind !== "team_matchups") {
          setError("対戦表は TYPE=TEAM_MATCHUPS を指定してください");
          return;
        }
        setSeasonKey(seasonKeyFromYearHint(parsed.year, world));
        setMatchupLeague(parsed.league);
        setMatchupDrafts(mergeMatchupDrafts([], parsed.cards));
        setMessage(parsed.message);
        return;
      }
      setError("このサブ項目では未対応のTYPEです");
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
    if (league === "central") {
      setCentral(merged);
      setTouchedCentral(true);
    } else {
      setPacific(merged);
      setTouchedPacific(true);
    }
    setProgress("");
    setMessage(
      `${league === "central" ? "セ" : "パ"}・リーグ順位候補を更新しました。確認後に登録してください。`,
    );
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

  async function handleMatchupFiles(files: File[]) {
    setError(null);
    setMessage(null);
    let merged = [...matchupDrafts];
    for (const file of files) {
      setProgress(`${file.name}: OCR中…`);
      try {
        const ocr = await runImageOcr(file, (p) =>
          setProgress(`${file.name}: ${p}%`),
        );
        const parsed = parsePennantMatchupsOcrText(ocr.text, matchupLeague);
        merged = mergeMatchupDrafts(merged, parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "OCRに失敗しました");
      }
    }
    setMatchupDrafts(merged);
    setProgress("");
    setMessage(
      `${matchupLeague === "central" ? "セ" : "パ"}・リーグ対戦カード ${merged.length}件を確認表へ載せました。確認後に登録してください（自動保存なし）。`,
    );
  }

  async function saveMatchups(force: boolean) {
    if (matchupDrafts.length === 0) {
      setError("対戦カードをOCR／貼り付けしてから登録してください");
      return;
    }
    const existing = getPennantMatchups(identity, matchupLeague);
    const incomingKeys = new Set(
      matchupDrafts
        .map((d) => normalizeMatchupCard(d))
        .filter(Boolean)
        .map((c) => cardPairKey(c!)),
    );
    const overlap =
      existing?.cards.some((c) => incomingKeys.has(cardPairKey(c))) ?? false;
    if (existing && overlap && !force) {
      setConfirmOpen(true);
      return;
    }
    setProgress("対戦表を保存・同期中…");
    try {
      const { record: rec, cloud } = await upsertPennantMatchupCardsAsync({
        year,
        world,
        league: matchupLeague,
        cards: matchupDrafts,
        source: inputMode === "partner" ? "partner" : "ocr",
      });
      appendImportHistory({
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        year,
        fileName: `pennant-matchups-${matchupLeague}`,
        screenType: "pennant_matchups",
        summary: `${formatSeasonLineLabel({ year, world })} ${matchupLeague === "central" ? "セ" : "パ"}対戦表 ${matchupDrafts.length}カード upsert（合計 ${rec.cards.length}${cloud.ok ? " / クラウド同期OK" : " / クラウド同期失敗・ローカル保持"}）`,
        recordIds: [rec.id],
      });
      notifyImportStoreChanged();
      setConfirmOpen(false);
      setError(null);
      setMessage(
        cloud.ok
          ? `${formatSeasonLineLabel({ year, world })} ${matchupLeague === "central" ? "セ" : "パ"}対戦表を登録・クラウド同期しました（今回 ${matchupDrafts.length} / 合計 ${rec.cards.length}カード）。`
          : `${formatSeasonLineLabel({ year, world })} ${matchupLeague === "central" ? "セ" : "パ"}対戦表をこの端末に保存しました（クラウド同期は後で再試行: ${cloud.error ?? "error"}）。合計 ${rec.cards.length}カード。`,
      );
      setMatchupDrafts([]);
    } finally {
      setProgress("");
    }
  }

  function patchStanding(
    league: "central" | "pacific",
    index: number,
    patch: Partial<StandingEntry>,
  ) {
    const setter = league === "central" ? setCentral : setPacific;
    if (league === "central") setTouchedCentral(true);
    else setTouchedPacific(true);
    setter((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  async function saveStandings(force: boolean) {
    if (!touchedCentral && !touchedPacific) {
      setError(
        "セまたはパの順位を貼り付け／OCR／編集してから登録してください（未編集のリーグは既存データのまま残ります）。",
      );
      return;
    }

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
    const updatedLeaguesLabel = [
      touchedCentral ? "セ" : null,
      touchedPacific ? "パ" : null,
    ]
      .filter(Boolean)
      .join("・");
    const existingFinal = useSandbox
      ? getDemoStandings()
      : getStandingsForSeason(identity);

    // 触ったリーグだけ更新。未タッチのリーグは入力payloadに含めない。
    const leaguePatch = {
      ...(touchedCentral ? { central } : {}),
      ...(touchedPacific ? { pacific } : {}),
    };

    if (checkpoint === "final") {
      // 最終: team-standings 本体 + history(final) を同時更新（二重手入力回避）
      const id = yearStandingsKey(year, world);
      const createdAt =
        existingFinal?.createdAt ?? new Date().toISOString();
      if (useSandbox) {
        const mergedDemo = {
          id,
          year,
          world,
          central: touchedCentral
            ? central
            : (existingFinal?.central ?? []),
          pacific: touchedPacific
            ? pacific
            : (existingFinal?.pacific ?? []),
          source: "ocr" as const,
          createdAt,
          updatedAt: new Date().toISOString(),
        };
        upsertDemoStandings(mergedDemo);
      } else {
        const { cloud, record } = await upsertYearStandingsAsync({
          year,
          world,
          source: "ocr",
          createdAt,
          ...leaguePatch,
        });
        if (!cloud.ok) {
          setMessage(
            `${label}の順位をこの端末に保存しました（クラウド同期は後で再試行: ${cloud.error ?? "error"}）。`,
          );
          await upsertStandingsHistoryAsync({
            year,
            world,
            checkpoint: "final",
            source: "sync",
            ...leaguePatch,
          });
          appendImportHistory({
            id: `hist-${Date.now()}`,
            at: new Date().toISOString(),
            year,
            fileName: "standings",
            screenType: "standings",
            summary: `${label} チーム順位を登録（ローカルのみ / ${updatedLeaguesLabel}）`,
            recordIds: [id],
          });
          notifyImportStoreChanged();
          setTouchedCentral(false);
          setTouchedPacific(false);
          setConfirmOpen(false);
          // 保存後の表示を実データに合わせる
          setCentral(
            record.central.length
              ? record.central
              : defaultLeagueRows("central"),
          );
          setPacific(
            record.pacific.length
              ? record.pacific
              : defaultLeagueRows("pacific"),
          );
          return;
        }
      }
      if (useSandbox) {
        upsertStandingsHistory({
          year,
          world,
          checkpoint: "final",
          source: "ocr",
          ...leaguePatch,
        });
      } else {
        const histCloud = await upsertStandingsHistoryAsync({
          year,
          world,
          checkpoint: "final",
          source: "sync",
          ...leaguePatch,
        });
        if (!histCloud.cloud.ok) {
          setMessage(
            `${label}の最終順位は共有DBへ保存しましたが、順位推移(final)の同期に失敗しました（${histCloud.cloud.error ?? "error"}）。ページ再読み込みで再送します。`,
          );
          const hist = {
            id: `hist-${Date.now()}`,
            at: new Date().toISOString(),
            year,
            fileName: "standings",
            screenType: "standings" as const,
            summary: `${label} チーム順位を登録（順位推移同期失敗 / ${updatedLeaguesLabel}）`,
            recordIds: [id],
          };
          appendImportHistory(hist);
          notifyImportStoreChanged();
          setTouchedCentral(false);
          setTouchedPacific(false);
          setConfirmOpen(false);
          const savedPartial = getStandingsForSeason(identity);
          if (savedPartial) {
            setCentral(
              savedPartial.central.length
                ? savedPartial.central
                : defaultLeagueRows("central"),
            );
            setPacific(
              savedPartial.pacific.length
                ? savedPartial.pacific
                : defaultLeagueRows("pacific"),
            );
          }
          return;
        }
      }
      const hist = {
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        year,
        fileName: "standings",
        screenType: "standings" as const,
        summary: `${label} チーム順位を登録（${updatedLeaguesLabel}）`,
        recordIds: [id],
      };
      if (useSandbox) appendDemoImportHistory(hist);
      else appendImportHistory(hist);

      const saved = useSandbox
        ? getDemoStandings()
        : getStandingsForSeason(identity);
      if (saved) {
        setCentral(
          saved.central.length ? saved.central : defaultLeagueRows("central"),
        );
        setPacific(
          saved.pacific.length ? saved.pacific : defaultLeagueRows("pacific"),
        );
      }
      setTouchedCentral(false);
      setTouchedPacific(false);
    } else {
      // 月次: 順位推移ストアのみ（最終順位は変更しない）
      if (!useSandbox) {
        const { record: rec, cloud } = await upsertStandingsHistoryAsync({
          year,
          world,
          checkpoint,
          source: "ocr",
          ...leaguePatch,
        });
        appendImportHistory({
          id: `hist-${Date.now()}`,
          at: new Date().toISOString(),
          year,
          fileName: "standings-history",
          screenType: "standings",
          summary: `${label} 順位推移を登録（${updatedLeaguesLabel}）`,
          recordIds: [rec.id],
        });
        setCentral(
          rec.central.length ? rec.central : defaultLeagueRows("central"),
        );
        setPacific(
          rec.pacific.length ? rec.pacific : defaultLeagueRows("pacific"),
        );
        setTouchedCentral(false);
        setTouchedPacific(false);
        if (!useSandbox) notifyImportStoreChanged();
        setConfirmOpen(false);
        setMessage(
          cloud.ok
            ? `${label}の順位推移を登録し共有DBへ同期しました（${updatedLeaguesLabel}）。`
            : `${label}の順位推移をこの端末に保存しましたが、共有DBへの同期に失敗しました（${cloud.error ?? "error"}）。ページを再読み込みすると再送を試みます。`,
        );
        return;
      }
      // デモ分離領域に月次履歴は未対応 — 正式ストアへは書かない方針を維持し案内のみ
      setError(
        "月別順位推移の登録は正式ストア向けです。DEMO取込モードをオフにしてください（または最終を選択）。",
      );
      setConfirmOpen(false);
      return;
    }

    if (!useSandbox) notifyImportStoreChanged();
    setConfirmOpen(false);
    setMessage(
      useSandbox
        ? `${label}のチーム順位を分離デモ領域に登録しました（${updatedLeaguesLabel}）。`
        : `${label}の順位を登録しました（この端末＋共有クラウド / ${updatedLeaguesLabel}を更新、他リーグは維持）。シーズン画面へ反映されます。`,
    );
  }

  async function saveTeamStats(force: boolean) {
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

    const { ids, message: msg } = await saveTeamSeasonStatsRows({
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
          setMatchupDrafts([]);
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
                : sub === "team_pitching"
                  ? "TEAM_PITCHING"
                  : "TEAM_MATCHUPS"
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
              {STANDINGS_TREND_CHECKPOINTS.map((c) => (
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
              onClick={() => void saveStandings(false)}
              className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
            >
              順位を登録…
            </button>
          </div>
        </>
      ) : sub === "matchups" ? (
        <>
          <p className="text-[12px] text-white/55">
            同一リーグ6球団の球団別対戦成績を登録します。入力されたカードだけ更新し、未入力カード・他リーグ・他YEAR/WORLDは保持します。
            {(() => {
              const ex = getPennantMatchups(identity, matchupLeague);
              if (!ex?.cards.length) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setMatchupDrafts(
                      ex.cards.map((c) => ({
                        teamA: c.teamA,
                        teamB: c.teamB,
                        teamAId: c.teamAId,
                        teamBId: c.teamBId,
                        wins: c.wins,
                        losses: c.losses,
                        draws: c.draws,
                      })),
                    );
                    setMessage(
                      `既存 ${ex.cards.length}カードを確認表に読み込みました（保存はしません）`,
                    );
                  }}
                  className="ml-2 text-[color:var(--museum-accent,#d4af37)] underline"
                >
                  既存データを表示
                </button>
              );
            })()}
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
                onClick={() => {
                  setMatchupLeague(l.id);
                  setMatchupDrafts([]);
                  setMessage(null);
                  setError(null);
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[12px]",
                  matchupLeague === l.id
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
              onFiles={handleMatchupFiles}
              disabled={!!progress}
              maxFiles={6}
              hint={`${matchupLeague === "central" ? "セ" : "パ"}・リーグ対戦表の画像を選択`}
            />
          ) : null}
          <MatchupsReviewTable
            drafts={matchupDrafts}
            onChange={(index, patch) => {
              setMatchupDrafts((prev) =>
                prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
              );
            }}
          />
          <button
            type="button"
            disabled={matchupDrafts.length === 0}
            onClick={() => void saveMatchups(false)}
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              matchupDrafts.length === 0
                ? "border-white/10 text-white/30"
                : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
            )}
          >
            {matchupDrafts.length}カードを登録…
          </button>
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
            onClick={() => void saveTeamStats(false)}
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
              {sub === "matchups"
                ? "入力カードだけ更新します。未入力の既存カード・他リーグ・他YEAR/WORLDは保持されます。"
                : "既存データがある場合は上書き更新します。重複新規作成はしません。"}
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
                  sub === "standings"
                    ? void saveStandings(true)
                    : sub === "matchups"
                      ? void saveMatchups(true)
                      : void saveTeamStats(true)
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

/** 向きを正規化したうえで同一カードを畳む（確認表用） */
function mergeMatchupDrafts(
  prev: PennantMatchupDraft[],
  next: PennantMatchupDraft[],
): PennantMatchupDraft[] {
  const map = new Map<string, PennantMatchupDraft>();
  for (const d of [...prev, ...next]) {
    const n = normalizeMatchupCard(d);
    if (!n) continue;
    map.set(cardPairKey(n), {
      teamA: n.teamA,
      teamB: n.teamB,
      teamAId: n.teamAId,
      teamBId: n.teamBId,
      wins: n.wins,
      losses: n.losses,
      draws: n.draws,
    });
  }
  return [...map.values()];
}

function MatchupsReviewTable({
  drafts,
  onChange,
}: {
  drafts: PennantMatchupDraft[];
  onChange: (index: number, patch: Partial<PennantMatchupDraft>) => void;
}) {
  if (drafts.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/40 px-3 py-4 text-[12px] text-white/45">
        まだ対戦カードがありません。画像OCRまたは相棒データ貼り付けで読み込んでください。
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
      <p className="border-b border-white/10 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]">
        確認表（{drafts.length}カード）
      </p>
      <table className="min-w-full text-left text-[12px]">
        <thead>
          <tr className="text-white/50">
            {["球団A", "球団B", "Aの勝", "Aの敗", "分"].map((h) => (
              <th key={h} className="px-2 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.map((row, i) => (
            <tr
              key={`${row.teamAId ?? row.teamA}-${row.teamBId ?? row.teamB}-${i}`}
              className="border-t border-white/5"
            >
              <td className="px-2 py-1 text-white">{row.teamA}</td>
              <td className="px-2 py-1 text-white">{row.teamB}</td>
              {(["wins", "losses", "draws"] as const).map((k) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
