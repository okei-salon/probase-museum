"use client";

import { useState } from "react";
import { applyCatcherBatterRestore2026Blue } from "@/data/playerSeasonLines/restores/applyCatcherBatterRestore2026Blue";
import { notifyImportStoreChanged } from "@/data/import/demoMode";

/**
 * ユーザー提供済みの 2026 BLUE 捕手打撃を安全復元する。
 * 本番 Neon へは API、ローカルキャッシュへも同時反映。
 */
export function CatcherBatterRestore2026BluePanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRestore() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const local = applyCatcherBatterRestore2026Blue();
      notifyImportStoreChanged();

      const res = await fetch(
        "/api/museum/restore/catcher-batter-2026-blue",
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        restored?: unknown[];
        skippedNonCatcher?: string[];
        missingFromPaste?: string[];
        errors?: string[];
      } | null;

      if (!res.ok || !data?.ok) {
        setMessage(
          `ローカルへ ${local.restored.length} 人反映済み。クラウド: ${data?.error ?? `http_${res.status}`}（本番DB未設定時はローカルのみ）`,
        );
      } else {
        setMessage(
          `復元完了: ${data.restored?.length ?? 0} 人（スキップ非捕手: ${(data.skippedNonCatcher ?? []).join("、") || "なし"}）`,
        );
      }
      if (local.errors.length || data?.errors?.length) {
        setError([...(local.errors ?? []), ...(data?.errors ?? [])].join(" / "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "復元に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 p-4 md:p-5">
      <h2 className="text-[12px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        2026 BLUE 捕手打撃の安全復元
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed text-white/55">
        ユーザー提供の BATTER_SEASON を、明示マップ済み捕手のみへ適用します。既存の盗塁阻止（CS）は保持し、非捕手行は変更しません。
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runRestore()}
        className="mt-3 rounded-lg border border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent,#d4af37)]/15 px-3 py-2 text-[12px] tracking-[0.08em] text-[color:var(--museum-accent,#d4af37)] disabled:opacity-50"
      >
        {busy ? "復元中…" : "提供データを適用する"}
      </button>
      {message ? (
        <p className="mt-2 text-[12px] text-emerald-200/90">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-[12px] text-red-300/90">{error}</p> : null}
    </section>
  );
}
