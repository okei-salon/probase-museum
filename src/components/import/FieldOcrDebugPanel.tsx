"use client";

import type { FieldOcrDebug } from "@/lib/import/layouts/types";

type FieldOcrDebugPanelProps = {
  fields: FieldOcrDebug[];
  defaultOpen?: boolean;
};

export function FieldOcrDebugPanel({
  fields,
  defaultOpen = true,
}: FieldOcrDebugPanelProps) {
  if (!fields.length) return null;

  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-white/12 bg-black/50 p-3 text-[12px] text-white/80"
    >
      <summary className="cursor-pointer select-none text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
        項目別OCRデバッグ（切り出し / raw / 補正 / 候補）
      </summary>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.fieldId}
            className="rounded-lg border border-white/10 bg-black/40 p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] text-white/90">{f.label}</p>
              <p className="text-[11px] text-white/45">
                conf {(f.confidence * 100).toFixed(0)}%
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.cropPreviewUrl}
              alt={`${f.label} crop`}
              className="mt-2 max-h-20 w-full rounded border border-white/10 object-contain bg-black/60"
            />
            <dl className="mt-2 space-y-1 text-[11px]">
              <div>
                <dt className="text-white/45">OCR raw</dt>
                <dd className="text-white/80 break-all">{f.rawText || "（空）"}</dd>
              </div>
              <div>
                <dt className="text-white/45">補正後</dt>
                <dd className="text-emerald-200/90">
                  {f.correctedText || "—"}
                  {f.correctedValue != null &&
                  String(f.correctedValue) !== f.correctedText
                    ? ` → ${String(f.correctedValue)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">最終採用値</dt>
                <dd className="text-[color:var(--museum-accent,#d4af37)]">
                  {f.finalValue != null && f.finalValue !== ""
                    ? String(f.finalValue)
                    : "—"}
                </dd>
              </div>
              {f.preprocess ? (
                <div>
                  <dt className="text-white/45">前処理 / 方式</dt>
                  <dd className="text-white/55">{f.preprocess}</dd>
                </div>
              ) : null}
              {f.candidates.length > 0 ? (
                <div>
                  <dt className="text-white/45">候補</dt>
                  <dd className="text-amber-100/90">
                    {f.candidates
                      .map((c) => `${c.label}(${c.score.toFixed(2)})`)
                      .join(" / ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ))}
      </div>
    </details>
  );
}
