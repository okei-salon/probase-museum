"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildYearbookSeasonContext,
  getSeasonReviewBody,
  hydrateSeasonReviewSources,
  upsertSeasonReview,
} from "@/data/yearbook";
import {
  parseSeasonKey,
  seasonDisplayTitle,
  type SeasonIdentity,
} from "@/data/seasons";

type Props = {
  /** seasonKey（BLUE_2026 / 2023 / 2000） */
  seasonKey: string;
  /** 互換: 数値 year のみ（world 無しレガシー） */
  year?: number;
  /** 編集 UI を出すか（サマリー経由の閲覧では false） */
  allowEdit?: boolean;
};

export function YearbookSeasonReviewBoard({
  seasonKey,
  year,
  allowEdit = true,
}: Props) {
  const identity: SeasonIdentity | null = useMemo(() => {
    const parsed = parseSeasonKey(seasonKey);
    if (parsed) return parsed;
    if (year != null) {
      return {
        seasonKey: String(year),
        year,
        world: null,
        kind: "legacy",
      };
    }
    return null;
  }, [seasonKey, year]);

  const [ready, setReady] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateSeasonReviewSources();
      if (cancelled || !identity) return;
      const text = getSeasonReviewBody(identity);
      setBody(text);
      setDraft(text ?? "");
      setEditing(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const context = useMemo(
    () => (ready && identity ? buildYearbookSeasonContext(identity) : null),
    [ready, identity],
  );

  const hasBody = Boolean(body?.trim());
  const titleLabel = identity ? seasonDisplayTitle(identity) : seasonKey;

  function handleSave() {
    if (!identity) return;
    setError(null);
    try {
      const next = upsertSeasonReview({
        identity,
        body: draft,
        source: "manual",
      });
      setBody(next.body);
      setDraft(next.body);
      setEditing(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  if (!identity) {
    return (
      <p className="text-[13px] text-museum-ivory-soft">
        シーズンを特定できません。
      </p>
    );
  }

  if (!ready) {
    return <p className="text-[13px] text-museum-ivory-soft">読み込み中…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2 border-b border-[color:var(--museum-accent,#d4af37)]/25 pb-4">
        <p className="text-[10px] tracking-[0.22em] text-[color:var(--museum-accent,#d4af37)]">
          SEASON REVIEW · {context?.seasonLabel ?? seasonKey}
        </p>
        <h3 className="font-display text-[24px] tracking-[0.04em] text-museum-ivory md:text-[28px]">
          {titleLabel} シーズン総評
        </h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-museum-ivory-soft">
          YEAR {identity.year}
          {identity.world ? ` · WORLD ${identity.world}` : null}
          。登録データに基づくそのシーズンの長文記録です。
          {identity.world
            ? `（${identity.world} のみ。他WORLDは含めません）`
            : null}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/yearbook/${identity.seasonKey}/timeline`}
          className="rounded-full border border-white/15 px-4 py-1.5 text-[12px] text-museum-ivory-soft hover:border-museum-gold/40 hover:text-museum-gold"
        >
          この年の年表を見る
        </Link>
        {allowEdit && !editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(body ?? "");
              setEditing(true);
              setError(null);
            }}
            className="rounded-full border border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] px-4 py-1.5 text-[12px] tracking-[0.06em] text-[color:var(--museum-accent,#d4af37)]"
          >
            {hasBody ? "総評を編集" : "総評を書く"}
          </button>
        ) : null}
        {allowEdit && editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full border border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.16))] px-4 py-1.5 text-[12px] tracking-[0.06em] text-[color:var(--museum-accent,#d4af37)]"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(body ?? "");
                setEditing(false);
                setError(null);
              }}
              className="rounded-full border border-white/15 px-4 py-1.5 text-[12px] text-museum-ivory-soft"
            >
              キャンセル
            </button>
          </>
        ) : null}
        {savedFlash ? (
          <span className="self-center text-[11px] text-emerald-300/90">
            保存しました
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {error}
        </p>
      ) : null}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={18}
          className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-[14px] leading-[1.85] text-museum-ivory outline-none focus:border-[color:var(--museum-accent,#d4af37)]/50"
          placeholder="そのシーズンの総評を記入…"
        />
      ) : hasBody ? (
        <article className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 px-4 py-5 text-[14px] leading-[1.9] text-museum-ivory-muted md:px-6 md:py-6 md:text-[15px]">
          {body}
        </article>
      ) : (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-8 text-center text-[13px] text-museum-ivory-soft">
          このシーズンの総評はまだ登録されていません
        </p>
      )}

      {context && allowEdit ? (
        <details className="rounded-xl border border-white/10 bg-black/40 p-4">
          <summary className="cursor-pointer text-[12px] tracking-[0.1em] text-white/55">
            総評の根拠データ（{context.seasonLabel}）
          </summary>
          <div className="mt-3 space-y-3 text-[12px] text-white/65">
            {context.available.length > 0 ? (
              <div>
                <p className="text-[11px] text-emerald-300/80">利用可能</p>
                <p className="mt-1">{context.available.join(" · ")}</p>
              </div>
            ) : null}
            {context.missing.length > 0 ? (
              <div>
                <p className="text-[11px] text-amber-200/80">未登録・未使用</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {context.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {context.factLines.length > 0 ? (
              <div>
                <p className="text-[11px] text-white/45">事実メモ</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {context.factLines.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
