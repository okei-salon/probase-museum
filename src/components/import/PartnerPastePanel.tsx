"use client";

import { PARTNER_PASTE_EXAMPLES } from "@/lib/import/partnerPaste";

type PartnerPastePanelProps = {
  value: string;
  onChange: (v: string) => void;
  onExpand: () => void;
  exampleKey?: keyof typeof PARTNER_PASTE_EXAMPLES;
  disabled?: boolean;
  hint?: string;
};

/** 共通：大きなテキストエリア + データを展開 */
export function PartnerPastePanel({
  value,
  onChange,
  onExpand,
  exampleKey,
  disabled,
  hint,
}: PartnerPastePanelProps) {
  const example = exampleKey ? PARTNER_PASTE_EXAMPLES[exampleKey] : undefined;

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
          相棒データ貼り付け
        </h3>
        {example ? (
          <button
            type="button"
            onClick={() => onChange(example)}
            className="text-[11px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
          >
            サンプルを入れる
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-white/50">
        {hint ??
          "ChatGPT等で変換したMuseum用テキストを貼り付け、「データを展開」で確認画面へ進めます。直接保存はしません。"}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        className="w-full rounded-lg border border-white/15 bg-black/55 px-3 py-2 font-mono text-[12px] leading-relaxed text-white/90 placeholder:text-white/30"
        placeholder={"YEAR=2026\nTYPE=...\n..."}
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onExpand}
        className={
          value.trim() && !disabled
            ? "rounded-md border border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] text-[color:var(--museum-accent,#d4af37)]"
            : "cursor-not-allowed rounded-md border border-white/10 px-3 py-2 text-[12px] text-white/35"
        }
      >
        データを展開
      </button>
    </div>
  );
}
