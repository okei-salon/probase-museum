"use client";

import type { ImportPipelineDebug } from "@/lib/import/pipelineDebug";
import { cn } from "@/lib/cn";

type ImportDebugPanelProps = {
  debug: ImportPipelineDebug;
  defaultOpen?: boolean;
};

const statusStyle: Record<string, string> = {
  ok: "text-emerald-300",
  warn: "text-amber-200",
  fail: "text-red-300",
  skip: "text-white/45",
};

export function ImportDebugPanel({
  debug,
  defaultOpen = true,
}: ImportDebugPanelProps) {
  const first = debug.stages.find((s) => s.id === debug.firstFailureId);

  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-white/12 bg-black/50 p-3 text-[12px] text-white/80"
    >
      <summary className="cursor-pointer select-none text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
        OCRパイプライン診断
        {first ? (
          <span className="ml-2 font-normal tracking-normal text-amber-200">
            — 最初の弱点: {first.label}
          </span>
        ) : (
          <span className="ml-2 font-normal tracking-normal text-emerald-300">
            — 致命的失敗なし
          </span>
        )}
      </summary>

      <ol className="mt-3 space-y-2">
        {debug.stages.map((s) => (
          <li
            key={s.id}
            className="rounded-md border border-white/8 bg-black/40 px-2.5 py-2"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={cn("font-medium", statusStyle[s.status])}>
                [{s.status.toUpperCase()}]
              </span>
              <span className="text-white/90">{s.label}</span>
            </div>
            <p className="mt-1 text-white/65 whitespace-pre-wrap">{s.detail}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] tracking-wide text-emerald-300/90">
            OCRで取得できた項目
          </p>
          <ul className="mt-1 space-y-0.5 text-white/75">
            {debug.fieldsGot.length ? (
              debug.fieldsGot.map((f) => (
                <li key={f.key}>
                  {f.label}: {f.value}
                </li>
              ))
            ) : (
              <li className="text-white/45">なし</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[11px] tracking-wide text-amber-200/90">
            取得できなかった項目
          </p>
          <ul className="mt-1 space-y-0.5 text-white/75">
            {debug.fieldsMissing.length ? (
              debug.fieldsMissing.map((f) => (
                <li key={f.key}>{f.label}</li>
              ))
            ) : (
              <li className="text-white/45">なし</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] tracking-wide text-white/45">
          キーワード ヒット / 未検出
        </p>
        <p className="mt-1 text-white/70">
          ✓ {debug.keywordsFound.join(", ") || "なし"}
        </p>
        <p className="mt-0.5 text-white/50">
          ✗ {debug.keywordsMissing.join(", ") || "なし"}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[11px] tracking-wide text-white/45">
          OCR生テキスト（採用バリアント: {debug.bestVariantId || "—"}）
        </p>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-white/8 bg-black/60 p-2 text-[11px] text-white/65">
          {debug.rawText || "（空）"}
        </pre>
      </div>
    </details>
  );
}
