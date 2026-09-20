"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSeasonReviewSourceText } from "@/data/seasonReviewSource";
import {
  formatSeasonLineLabel,
  parseSeasonKey,
  type SeasonIdentity,
} from "@/data/seasons";
import { hydrateSeasonReviewSources } from "@/data/seasonReview";
import { hydratePlayerMasterFromCloud } from "@/data/playerMaster";
import { hydrateSopAwardsFromCloud } from "@/data/sop";
import { hydrateTeamStandingsFromCloud } from "@/data/teamStandings";
import { hydratePostseasonFromCloud } from "@/data/postseason";
import { hydrateInterleagueFromCloud } from "@/data/interleague";
import { hydrateSeasonLinesFromCloud } from "@/data/playerSeasonLines";
import { hydrateSeasonAchievementsFromCloud } from "@/data/seasonAchievements";
import { cn } from "@/lib/cn";

type Props = {
  seasonKey: string;
  className?: string;
};

/**
 * 総評作成用ソースのプレビュー＋クリップボードコピー（読み取り専用）。
 * 重い生成はマウント時に走らせず、生成／コピー／プレビュー操作時のみ実行する。
 */
export function SeasonReviewSourceCopyPanel({ seasonKey, className }: Props) {
  const identity: SeasonIdentity | null = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );

  const [text, setText] = useState("");
  /** 生成済みテキストが属する seasonKey（YEAR/WORLD 切替で無効化） */
  const [generatedForKey, setGeneratedForKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const busyRef = useRef(false);

  // YEAR/WORLD 切替時は旧資料を破棄（誤流用防止）。生成は開始しない。
  useEffect(() => {
    setText("");
    setGeneratedForKey(null);
    setBusy(false);
    busyRef.current = false;
    setMessage(null);
    setError(null);
    setPreviewOpen(false);
  }, [seasonKey]);

  const label = identity ? formatSeasonLineLabel(identity) : seasonKey;
  const hasText =
    Boolean(text) && generatedForKey === seasonKey && Boolean(identity);

  async function ensureGenerated(opts?: {
    force?: boolean;
    openPreview?: boolean;
  }): Promise<string | null> {
    if (!identity) {
      setError("シーズンを特定できません");
      return null;
    }
    if (!opts?.force && hasText) {
      if (opts?.openPreview) setPreviewOpen(true);
      return text;
    }
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await Promise.allSettled([
        hydrateSeasonReviewSources(),
        hydratePlayerMasterFromCloud(),
        hydrateSopAwardsFromCloud(),
        hydrateTeamStandingsFromCloud(),
        hydratePostseasonFromCloud(),
        hydrateInterleagueFromCloud(),
        hydrateSeasonLinesFromCloud(),
        hydrateSeasonAchievementsFromCloud(),
      ]);
      const next = buildSeasonReviewSourceText(identity);
      setText(next);
      setGeneratedForKey(identity.seasonKey);
      if (opts?.openPreview) setPreviewOpen(true);
      return next;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "シーズン資料の生成に失敗しました",
      );
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleGenerate() {
    const wasGenerated = hasText;
    const next = await ensureGenerated({ force: true });
    if (next != null) {
      setMessage(
        wasGenerated
          ? "資料を再生成しました（保存はしていません）"
          : "資料を生成しました（保存はしていません）",
      );
    }
  }

  async function handleCopy() {
    setError(null);
    setMessage(null);
    const payload = await ensureGenerated();
    if (!payload) {
      if (!busyRef.current) setError("コピーする資料がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setMessage(`${label}のシーズン資料をコピーしました`);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setMessage(`${label}のシーズン資料をコピーしました`);
      } catch {
        setError("クリップボードへのコピーに失敗しました");
      }
    }
  }

  async function handlePreview() {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    await ensureGenerated({ openPreview: true });
  }

  if (!identity) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        シーズンを特定できません。
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-white/12 bg-black/50 px-4 py-4",
        className,
      )}
    >
      <p className="text-[10px] tracking-[0.18em] text-museum-gold/85">
        SEASON SOURCE EXPORT
      </p>
      <h3 className="mt-1 text-[15px] font-medium text-museum-ivory">
        シーズン資料をコピー
      </h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-museum-ivory-soft">
        選択中の YEAR / WORLD（{label}）のシーズン総評作成用データを
        1つのテキストにまとめてコピーします。既存データは変更しません。
        資料は「生成」またはコピー／プレビュー時にのみ作成します。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGenerate()}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            busy
              ? "border-white/10 text-white/30"
              : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
          )}
        >
          {hasText ? "再生成" : "生成"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCopy()}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            busy
              ? "border-white/10 text-white/30"
              : "border-white/20 text-white/80 hover:border-white/35",
          )}
        >
          シーズン資料をコピー
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePreview()}
          className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/75 disabled:border-white/10 disabled:text-white/30"
        >
          {previewOpen ? "プレビューを閉じる" : "プレビューを表示"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-[12px] text-emerald-300/90">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[12px] text-amber-200">{error}</p>
      ) : null}

      {busy ? (
        <p className="mt-3 text-[12px] text-white/45">資料を生成中…</p>
      ) : null}

      {previewOpen && hasText ? (
        <textarea
          readOnly
          value={text}
          rows={18}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/80"
        />
      ) : null}
    </div>
  );
}
