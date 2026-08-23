"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import { ImportDebugPanel } from "@/components/import/ImportDebugPanel";
import { FieldOcrDebugPanel } from "@/components/import/FieldOcrDebugPanel";
import {
  ImportModeTabs,
  type ImportInputMode,
} from "@/components/import/ImportModeTabs";
import { MonthlyMvpReview } from "@/components/import/MonthlyMvpReview";
import { PartnerPastePanel } from "@/components/import/PartnerPastePanel";
import {
  appendImportHistory,
  getSavedMonthlyMvpRecord,
  hydrateMonthlyMvpFromCloud,
  listImportHistory,
  upsertSavedMonthlyMvpRecordAsync,
} from "@/data/import/store";
import type { ImportJob, MonthlyMvpImportDraft } from "@/data/import/types";
import { monthlyMvpRecordKey } from "@/data/import/types";
import {
  notifyImportStoreChanged,
  shouldUseIsolatedDemoStore,
} from "@/data/import/demoMode";
import {
  appendDemoImportHistory,
  upsertDemoMonthlyMvp,
} from "@/data/import/demoStore";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import {
  formatSeasonLineLabel,
  FORMAL_SEASON_START_YEAR,
  makeSeasonKey,
  normalizeSeasonWorld,
  type SeasonWorld,
} from "@/data/seasons";
import { processImportImage } from "@/lib/import/processImage";
import {
  emptyMonthlyMvpDraft,
  normalizeImportMonth,
  normalizeImportYear,
  normalizeMonthlyMvpDraft,
  parseMonthlyMvpBestEffort,
  parseMonthlyMvpFromOcrText,
} from "@/lib/import/parseMonthlyMvp";
import { emptyPipelineDebug } from "@/lib/import/pipelineDebug";
import { parseMonthlyMvpPartner } from "@/lib/import/partnerPaste";
import { cn } from "@/lib/cn";

/** 月間MVP：画像取込 ＋ 相棒データ貼り付け（複数月・セパ一括） */
export function MonthlyMvpImportPanel() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<ImportInputMode>("image");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const [partnerText, setPartnerText] = useState("");
  const [partnerDrafts, setPartnerDrafts] = useState<MonthlyMvpImportDraft[]>(
    [],
  );
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  useEffect(() => {
    hydratePlayerMasterFromStorage();
    void hydrateMonthlyMvpFromCloud();
  }, []);

  const active = jobs.find((j) => j.id === activeId) ?? null;

  const partnerExistingCount = useMemo(() => {
    let n = 0;
    for (const d of partnerDrafts) {
      const year = normalizeImportYear(d.year);
      const month = normalizeImportMonth(d.month);
      const world = normalizeSeasonWorld(d.world);
      if (getSavedMonthlyMvpRecord(year, month, d.league, world)) n += 1;
    }
    return n;
  }, [partnerDrafts]);

  async function handleFiles(files: File[]) {
    hydratePlayerMasterFromStorage();
    const pairs = files.map((file) => ({
      file,
      job: {
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "queued" as const,
        screenType: "unknown" as const,
        draft: null,
        createdAt: new Date().toISOString(),
      } satisfies ImportJob,
    }));

    setJobs((prev) => [...pairs.map((p) => p.job), ...prev]);
    setActiveId(pairs[0]?.job.id ?? null);

    for (const { file, job } of pairs) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "ocr" } : j)),
      );
      setProgress(`${job.fileName}: 正規化・項目別OCR中…`);
      try {
        const result = await processImportImage(file, (pct) => {
          setProgress(`${job.fileName}: 解析 ${pct}%`);
        });
        const draft =
          result.draft.screenType === "monthly_mvp"
            ? normalizeMonthlyMvpDraft(result.draft)
            : result.draft;
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "needs_review",
                  screenType: result.screenType,
                  draft,
                  processedPreviewUrl: result.processedPreviewUrl,
                  debug: result.debug,
                  fieldDebug: result.fieldDebug,
                  error: result.message,
                }
              : j,
          ),
        );
      } catch (e) {
        const draft = emptyMonthlyMvpDraft();
        const debug = emptyPipelineDebug();
        debug.stages.push({
          id: "load_image",
          label: "① 画像ファイルの読み込み",
          status: "fail",
          detail: e instanceof Error ? e.message : "予期しない例外",
        });
        debug.firstFailureId = "load_image";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "needs_review",
                  screenType: "monthly_mvp",
                  draft,
                  debug,
                  error:
                    e instanceof Error
                      ? `${e.message} — 確認画面で手入力してください`
                      : "OCRに失敗しました。確認画面で手入力してください",
                }
              : j,
          ),
        );
      }
    }
    setProgress("");
  }

  function loadDemoDraft() {
    const demoText = `
2026年
月間MVP
4月
セ・リーグ
投手部門
村上
阪神
防御率 1.22
5勝0敗
野手部門
佐藤 輝
阪神
打率 .510
12本
41打点
4盗塁
`;
    const parsed =
      parseMonthlyMvpFromOcrText(demoText) ??
      parseMonthlyMvpBestEffort(demoText);
    const draft = normalizeMonthlyMvpDraft(parsed);
    const id = `job-demo-${Date.now()}`;
    const job: ImportJob = {
      id,
      fileName: "demo-monthly-mvp-2026-04.png",
      previewUrl: "",
      status: "needs_review",
      screenType: "monthly_mvp",
      draft,
      createdAt: new Date().toISOString(),
    };
    setJobs((prev) => [job, ...prev]);
    setActiveId(id);
  }

  function expandPartner() {
    setPartnerError(null);
    setPartnerMessage(null);
    setOverwriteOpen(false);
    try {
      hydratePlayerMasterFromStorage();
      const parsed = parseMonthlyMvpPartner(partnerText, 2026);
      const drafts = parsed.drafts.map((d) => {
        const synced = normalizeMonthlyMvpDraft(d);
        const world =
          normalizeSeasonWorld(synced.world) ??
          (synced.year >= FORMAL_SEASON_START_YEAR
            ? ("BLUE" as SeasonWorld)
            : null);
        return { ...synced, world };
      });
      setPartnerDrafts(drafts);
      setPartnerMessage(parsed.message);
    } catch (e) {
      setPartnerDrafts([]);
      setPartnerError(e instanceof Error ? e.message : "解析に失敗しました");
    }
  }

  function validatePartnerDraft(d: MonthlyMvpImportDraft): string | null {
    const year = normalizeImportYear(d.year);
    const month = normalizeImportMonth(d.month);
    if (!year || month < 4 || month > 9) {
      return "年度と月（4〜9月）を確認してください";
    }
    if (!d.pitcher.gameDisplayName.trim() || !d.batter.gameDisplayName.trim()) {
      return "投手名・野手名が必要です";
    }
    if (
      d.pitcher.era == null ||
      d.pitcher.wins == null ||
      d.pitcher.losses == null
    ) {
      return `${month}月: 投手の防御率・勝・敗が不足しています`;
    }
    if (
      d.batter.avg == null ||
      d.batter.hr == null ||
      d.batter.rbi == null ||
      d.batter.sb == null
    ) {
      return `${month}月: 野手の打率・本塁打・打点・盗塁が不足しています`;
    }
    return null;
  }

  async function savePartnerBatch(force: boolean) {
    setPartnerError(null);
    setPartnerMessage(null);
    if (partnerDrafts.length === 0) {
      setPartnerError("先に「データを展開」してください");
      return;
    }

    for (const d of partnerDrafts) {
      const v = validatePartnerDraft(d);
      if (v) {
        setPartnerError(v);
        return;
      }
    }

    const years = new Set(partnerDrafts.map((d) => normalizeImportYear(d.year)));
    if ([...years].some((y) => shouldUseIsolatedDemoStore(y))) {
      setPartnerError("正式月間MVPは DEMO モードをオフにしてください");
      return;
    }

    if (!force && partnerExistingCount > 0) {
      setOverwriteOpen(true);
      return;
    }

    setPartnerSaving(true);
    try {
      await hydrateMonthlyMvpFromCloud();
      const recordIds: string[] = [];
      let cloudFails = 0;
      const jobId = `partner-monthly-mvp-${Date.now()}`;

      for (const raw of partnerDrafts) {
        const d = normalizeMonthlyMvpDraft(raw);
        const year = normalizeImportYear(d.year);
        const month = normalizeImportMonth(d.month);
        const world = normalizeSeasonWorld(d.world);
        const pitcherId =
          d.pitcher.playerRef.status === "resolved"
            ? d.pitcher.playerRef.playerId
            : null;
        const batterId =
          d.batter.playerRef.status === "resolved"
            ? d.batter.playerRef.playerId
            : null;

        const payload = {
          id: monthlyMvpRecordKey(year, month, d.league, world),
          year,
          world,
          month,
          league: d.league,
          pitcher: {
            playerId: pitcherId,
            playerName:
              d.pitcher.resolvedName || d.pitcher.gameDisplayName,
            teamName: d.pitcher.teamName,
            era: d.pitcher.era!,
            wins: d.pitcher.wins!,
            losses: d.pitcher.losses!,
          },
          batter: {
            playerId: batterId,
            playerName: d.batter.resolvedName || d.batter.gameDisplayName,
            teamName: d.batter.teamName,
            avg: d.batter.avg!,
            hr: d.batter.hr!,
            rbi: d.batter.rbi!,
            sb: d.batter.sb!,
          },
          sourceJobId: jobId,
          updatedAt: new Date().toISOString(),
        };

        if (shouldUseIsolatedDemoStore(year)) {
          upsertDemoMonthlyMvp(payload);
          recordIds.push(payload.id);
        } else {
          const { record, cloud } =
            await upsertSavedMonthlyMvpRecordAsync(payload);
          recordIds.push(record.id);
          if (!cloud.ok) cloudFails += 1;
        }
      }

      const first = partnerDrafts[0]!;
      const year = normalizeImportYear(first.year);
      const world = normalizeSeasonWorld(first.world);
      const hist = {
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        year,
        screenType: "monthly_mvp" as const,
        fileName: "partner-monthly-mvp",
        summary: `${formatSeasonLineLabel({ year, world })} 月間MVP 相棒貼り付け ${recordIds.length}件`,
        recordIds,
      };
      if (shouldUseIsolatedDemoStore(year)) appendDemoImportHistory(hist);
      else {
        appendImportHistory(hist);
        notifyImportStoreChanged();
      }

      setOverwriteOpen(false);
      setPartnerMessage(
        cloudFails > 0
          ? `${recordIds.length}件をこの端末に保存しました（クラウド同期失敗 ${cloudFails}件）`
          : `${recordIds.length}件を共有DBへ保存しました`,
      );
      setPartnerDrafts([]);

      const destKey =
        world != null ? makeSeasonKey(world, year) : String(year);
      if (!shouldUseIsolatedDemoStore(year)) {
        router.push(`/seasons/${destKey}/awards/monthly`);
      }
    } catch (e) {
      setPartnerError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setPartnerSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-white/55">
        月間MVPを画像から読み取るか、相棒データ貼り付けで4〜9月・セパをまとめて登録できます。
      </p>

      <ImportModeTabs
        value={inputMode}
        onChange={(m) => {
          setInputMode(m);
          setPartnerError(null);
          setPartnerMessage(null);
        }}
        modes={["image", "partner"]}
      />

      {inputMode === "partner" ? (
        <div className="space-y-4">
          <PartnerPastePanel
            value={partnerText}
            onChange={setPartnerText}
            onExpand={expandPartner}
            exampleKey="MONTHLY_MVP"
            hint="YEAR / WORLD / TYPE=MONTHLY_MVP のあと、MONTH=4〜9 と PITCHER_* / BATTER_*（必要なら LEAGUE=central|pacific）を貼り付けます。セ・パ4〜9月を1回で一括展開できます。"
            disabled={partnerSaving}
          />

          {partnerMessage ? (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
              {partnerMessage}
            </p>
          ) : null}
          {partnerError ? (
            <p className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
              {partnerError}
            </p>
          ) : null}

          {partnerDrafts.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
                    展開結果の確認
                  </h3>
                  <p className="mt-1 text-[12px] text-white/60">
                    {partnerDrafts.length}件 · 該当の YEAR×WORLD×LEAGUE×MONTH
                    のみ upsert（他月は消しません）
                  </p>
                  {partnerExistingCount > 0 ? (
                    <p className="mt-1 text-[12px] text-amber-200/90">
                      既存データが {partnerExistingCount}{" "}
                      件あります。登録時に上書き確認します。
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={partnerSaving}
                  onClick={() => void savePartnerBatch(false)}
                  className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)] disabled:opacity-50"
                >
                  {partnerSaving ? "登録中…" : "この内容で登録"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[11px] text-white/85">
                  <thead>
                    <tr className="border-b border-white/15 text-white/55">
                      <th className="px-2 py-1.5 font-normal">年度</th>
                      <th className="px-2 py-1.5 font-normal">WORLD</th>
                      <th className="px-2 py-1.5 font-normal">リーグ</th>
                      <th className="px-2 py-1.5 font-normal">月</th>
                      <th className="px-2 py-1.5 font-normal">投手</th>
                      <th className="px-2 py-1.5 font-normal">球団</th>
                      <th className="px-2 py-1.5 font-normal">防御率</th>
                      <th className="px-2 py-1.5 font-normal">勝</th>
                      <th className="px-2 py-1.5 font-normal">敗</th>
                      <th className="px-2 py-1.5 font-normal">野手</th>
                      <th className="px-2 py-1.5 font-normal">球団</th>
                      <th className="px-2 py-1.5 font-normal">打率</th>
                      <th className="px-2 py-1.5 font-normal">本</th>
                      <th className="px-2 py-1.5 font-normal">点</th>
                      <th className="px-2 py-1.5 font-normal">盗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerDrafts.map((d, i) => (
                      <tr
                        key={`${d.year}-${d.world}-${d.league}-${d.month}-${i}`}
                        className="border-b border-white/8"
                      >
                        <td className="px-2 py-1.5">{d.year}</td>
                        <td className="px-2 py-1.5">
                          {normalizeSeasonWorld(d.world) ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {d.league === "central" ? "セ" : "パ"}
                        </td>
                        <td className="px-2 py-1.5">{d.month}</td>
                        <td className="px-2 py-1.5">
                          {d.pitcher.resolvedName || d.pitcher.gameDisplayName}
                        </td>
                        <td className="px-2 py-1.5">{d.pitcher.teamName}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.pitcher.era ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.pitcher.wins ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.pitcher.losses ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {d.batter.resolvedName || d.batter.gameDisplayName}
                        </td>
                        <td className="px-2 py-1.5">{d.batter.teamName}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.batter.avg != null
                            ? d.batter.avg.toFixed(3).replace(/^0/, "")
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.batter.hr ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.batter.rbi ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.batter.sb ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {overwriteOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="max-w-md space-y-3 rounded-xl border border-white/15 bg-[#121212] p-5">
                <p className="text-[14px] text-white">
                  既存の月間MVPが {partnerExistingCount}{" "}
                  件あります。該当月のみ上書きして登録しますか？（他月・他WORLDは削除しません）
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOverwriteOpen(false)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-[12px] text-white/70"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    disabled={partnerSaving}
                    onClick={() => void savePartnerBatch(true)}
                    className="rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-1.5 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
                  >
                    上書きして登録
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {inputMode === "image" ? (
        <>
          <ImageDropzone
            onFiles={handleFiles}
            disabled={!!progress}
            hint="月間MVP画面の画像を選択できます。"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadDemoDraft}
              className="rounded-md border border-white/15 px-3 py-1.5 text-[12px] text-white/75 hover:border-white/30"
            >
              月間MVPの読取例を入れる（確認フロー用）
            </button>
          </div>

          {progress ? (
            <p className="text-[13px] text-[color:var(--museum-accent,#d4af37)]">
              {progress}
            </p>
          ) : null}

          {jobs.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(job.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-[12px]",
                        activeId === job.id
                          ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/10"
                          : "border-white/10 bg-black/40",
                      )}
                    >
                      <p className="truncate text-white">{job.fileName}</p>
                      <p className="mt-0.5 text-white/55">
                        {statusLabel(job.status)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                {active?.previewUrl || active?.processedPreviewUrl ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {active.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={active.previewUrl}
                        alt={active.fileName}
                        className="max-h-56 w-full rounded-lg border border-white/10 object-contain bg-black/50"
                      />
                    ) : null}
                    {active.processedPreviewUrl ? (
                      <div>
                        <p className="mb-1 text-[11px] tracking-wide text-white/45">
                          正規化キャンバス（1920×1080）
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={active.processedPreviewUrl}
                          alt="正規化プレビュー"
                          className="max-h-56 w-full rounded-lg border border-white/10 object-contain bg-black/50"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {active?.error ? (
                  <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
                    {active.error}
                  </p>
                ) : null}

                {active?.fieldDebug ? (
                  <FieldOcrDebugPanel fields={active.fieldDebug} />
                ) : null}
                {active?.debug ? (
                  <ImportDebugPanel debug={active.debug} />
                ) : null}

                {active?.draft && active.draft.screenType === "monthly_mvp" ? (
                  <MonthlyMvpReview
                    draft={active.draft}
                    fileName={active.fileName}
                    jobId={active.id}
                    fieldsGot={active.debug?.fieldsGot}
                    fieldsMissing={active.debug?.fieldsMissing}
                    onChange={(next: MonthlyMvpImportDraft) => {
                      setJobs((prev) =>
                        prev.map((j) =>
                          j.id === active.id ? { ...j, draft: next } : j,
                        ),
                      );
                    }}
                    onCancel={() => setActiveId(null)}
                    onSaved={(href) => {
                      setJobs((prev) =>
                        prev.map((j) =>
                          j.id === active.id ? { ...j, status: "saved" } : j,
                        ),
                      );
                      listImportHistory();
                      router.push(href);
                    }}
                  />
                ) : active?.status === "needs_review" ? (
                  <p className="text-[13px] text-amber-100">
                    確認用フォームを開けませんでした。もう一度画像を選択してください。
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function statusLabel(status: ImportJob["status"]): string {
  switch (status) {
    case "queued":
      return "待機中";
    case "ocr":
      return "OCR中";
    case "needs_review":
      return "確認待ち";
    case "saved":
      return "登録済み";
    case "error":
      return "エラー";
    default:
      return status;
  }
}
