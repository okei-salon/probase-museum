"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDropzone } from "@/components/import/ImageDropzone";
import { ImportDebugPanel } from "@/components/import/ImportDebugPanel";
import { FieldOcrDebugPanel } from "@/components/import/FieldOcrDebugPanel";
import { MonthlyMvpReview } from "@/components/import/MonthlyMvpReview";
import { listImportHistory } from "@/data/import/store";
import type { ImportJob, MonthlyMvpImportDraft } from "@/data/import/types";
import { hydratePlayerMasterFromStorage } from "@/data/playerMaster";
import { processImportImage } from "@/lib/import/processImage";
import {
  emptyMonthlyMvpDraft,
  normalizeMonthlyMvpDraft,
  parseMonthlyMvpBestEffort,
  parseMonthlyMvpFromOcrText,
} from "@/lib/import/parseMonthlyMvp";
import { emptyPipelineDebug } from "@/lib/import/pipelineDebug";
import { cn } from "@/lib/cn";

/** 月間MVP専用の画像取込＋確認パネル（既存フローを維持） */
export function MonthlyMvpImportPanel() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    hydratePlayerMasterFromStorage();
  }, []);

  const active = jobs.find((j) => j.id === activeId) ?? null;

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

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-white/55">
        月間MVP画面を読み取り、年度・月・リーグ・野手／投手受賞者を確認してから登録します。
      </p>
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
                  <p className="mt-0.5 text-white/55">{statusLabel(job.status)}</p>
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
            {active?.debug ? <ImportDebugPanel debug={active.debug} /> : null}

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
