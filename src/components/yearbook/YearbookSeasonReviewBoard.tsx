"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildYearbookSeasonContext,
  getAllSeasonReviewSections,
  hydrateSeasonReviewSources,
  SEASON_REVIEW_KIND_LABELS,
  upsertSeasonReviewSection,
  type SeasonReviewKind,
} from "@/data/yearbook";
import {
  parseSeasonKey,
  seasonDisplayTitle,
  type SeasonIdentity,
} from "@/data/seasons";
import { hydratePlayerMasterFromCloud } from "@/data/playerMaster";
import { SeasonReviewArticle } from "@/components/yearbook/SeasonReviewArticle";
import { SeasonReviewSourceCopyPanel } from "@/components/yearbook/SeasonReviewSourceCopyPanel";
import { cn } from "@/lib/cn";

type Props = {
  /** seasonKey（BLUE_2026 / 2023 / 2000） */
  seasonKey: string;
  /** 互換: 数値 year のみ（world 無しレガシー） */
  year?: number;
  /** 編集 UI を出すか（サマリー経由の閲覧では false） */
  allowEdit?: boolean;
};

const TAB_ORDER: SeasonReviewKind[] = [
  "general",
  "central",
  "pacific",
  "teams",
];

const TAB_SHORT: Record<SeasonReviewKind, string> = {
  general: "総評",
  central: "セ・リーグ",
  pacific: "パ・リーグ",
  teams: "12球団",
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
  const [bodies, setBodies] = useState<Record<SeasonReviewKind, string | null>>(
    {
      general: null,
      central: null,
      pacific: null,
      teams: null,
    },
  );
  const [tab, setTab] = useState<SeasonReviewKind>("general");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.allSettled([
        hydrateSeasonReviewSources(),
        hydratePlayerMasterFromCloud(),
      ]);
      if (cancelled || !identity) return;
      const next = getAllSeasonReviewSections(identity);
      setBodies(next);
      setDraft(next[tab] ?? "");
      setEditing(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // tab intentionally omitted — reload on identity only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const context = useMemo(
    () => (ready && identity ? buildYearbookSeasonContext(identity) : null),
    [ready, identity],
  );

  const body = bodies[tab];
  const hasBody = Boolean(body?.trim());
  const titleLabel = identity ? seasonDisplayTitle(identity) : seasonKey;

  function selectTab(next: SeasonReviewKind) {
    setTab(next);
    setDraft(bodies[next] ?? "");
    setEditing(false);
    setError(null);
  }

  function handleSave() {
    if (!identity) return;
    setError(null);
    try {
      upsertSeasonReviewSection({
        identity,
        kind: tab,
        body: draft,
        source: "manual",
      });
      const next = getAllSeasonReviewSections(identity);
      setBodies(next);
      setDraft(next[tab] ?? "");
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
    <div className="mx-auto w-full max-w-[960px] space-y-6">
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
          。総評・セ・パ・12球団を分けて閲覧します。
          {identity.world
            ? `（${identity.world} のみ。他WORLDは含めません）`
            : null}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="総評カテゴリ"
        className="flex flex-wrap gap-2"
      >
        {TAB_ORDER.map((k) => {
          const filled = Boolean(bodies[k]?.trim());
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => selectTab(k)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12px] tracking-[0.04em]",
                tab === k
                  ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/15 text-[color:var(--museum-accent,#d4af37)]"
                  : "border-white/15 text-museum-ivory-soft hover:border-white/30",
              )}
            >
              {TAB_SHORT[k]}
              {filled ? (
                <span className="ml-1.5 text-[10px] opacity-70">●</span>
              ) : null}
            </button>
          );
        })}
      </div>

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
            {hasBody
              ? `${SEASON_REVIEW_KIND_LABELS[tab]}を編集`
              : `${SEASON_REVIEW_KIND_LABELS[tab]}を書く`}
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

      <p className="text-[12px] tracking-[0.08em] text-white/45">
        {SEASON_REVIEW_KIND_LABELS[tab]}
      </p>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
          className="mx-auto block w-full max-w-[900px] rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-[14px] leading-[1.85] text-museum-ivory outline-none focus:border-[color:var(--museum-accent,#d4af37)]/50"
          placeholder={`${SEASON_REVIEW_KIND_LABELS[tab]}を記入…`}
        />
      ) : hasBody && body ? (
        <SeasonReviewArticle text={body} />
      ) : (
        <p className="mx-auto max-w-[900px] rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-8 text-center text-[13px] text-museum-ivory-soft">
          この項目の総評はまだ登録されていません
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

      {allowEdit ? (
        <SeasonReviewSourceCopyPanel seasonKey={seasonKey} />
      ) : null}
    </div>
  );
}
