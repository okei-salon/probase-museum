"use client";

import { useEffect, useMemo, useState } from "react";
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
 */
export function SeasonReviewSourceCopyPanel({ seasonKey, className }: Props) {
  const identity: SeasonIdentity | null = useMemo(
    () => parseSeasonKey(seasonKey),
    [seasonKey],
  );

  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
      if (cancelled || !identity) return;
      setText(buildSeasonReviewSourceText(identity));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const label = identity ? formatSeasonLineLabel(identity) : seasonKey;

  async function handleCopy() {
    setError(null);
    setMessage(null);
    if (!identity || !text) {
      setError("コピーする資料がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label}のシーズン資料をコピーしました`);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
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

  function handleRebuild() {
    if (!identity) return;
    setText(buildSeasonReviewSourceText(identity));
    setMessage("資料を再生成しました（保存はしていません）");
    setError(null);
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
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready || !text}
          onClick={() => void handleCopy()}
          className={cn(
            "rounded-md border px-3 py-2 text-[12px]",
            !ready || !text
              ? "border-white/10 text-white/30"
              : "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]",
          )}
        >
          シーズン資料をコピー
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setPreviewOpen((v) => !v)}
          className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/75"
        >
          {previewOpen ? "プレビューを閉じる" : "プレビューを表示"}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={handleRebuild}
          className="rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/55"
        >
          再生成
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-[12px] text-emerald-300/90">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[12px] text-amber-200">{error}</p>
      ) : null}

      {!ready ? (
        <p className="mt-3 text-[12px] text-white/45">資料を生成中…</p>
      ) : null}

      {previewOpen && text ? (
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
