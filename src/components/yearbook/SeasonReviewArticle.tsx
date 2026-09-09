"use client";

import { useMemo } from "react";
import { listPlayerMasters } from "@/data/playerMaster";
import { cn } from "@/lib/cn";
import {
  parseSeasonReviewDisplay,
  reconstructSeasonReviewText,
  type SeasonReviewInlinePart,
} from "./seasonReviewArticle/parseSeasonReviewDisplay";

type Props = {
  text: string;
  className?: string;
};

function InlineParts({ parts }: { parts: SeasonReviewInlinePart[] }) {
  return (
    <>
      {parts.map((p, idx) => {
        if (p.kind === "text") {
          return <span key={idx}>{p.text}</span>;
        }
        if (p.kind === "nickname") {
          return (
            <span
              key={idx}
              className="font-bold text-[1.05em] text-[color:var(--museum-accent,#d4af37)]"
            >
              {p.text}
            </span>
          );
        }
        if (p.kind === "player") {
          return (
            <span
              key={idx}
              className="font-semibold text-[color:var(--museum-accent,#d4af37)]"
            >
              {p.text}
            </span>
          );
        }
        return (
          <span key={idx} className="font-semibold text-sky-300">
            {p.text}
          </span>
        );
      })}
    </>
  );
}

/**
 * シーズン総評本文の表示専用コンポーネント。
 * 保存データは変更せず、レンダリング時のみ装飾する。
 */
export function SeasonReviewArticle({ text, className }: Props) {
  const playerNames = useMemo(() => {
    try {
      return listPlayerMasters().flatMap((p) => {
        const names = [p.fullName];
        if (p.gameDisplayName && p.gameDisplayName.length >= 3) {
          names.push(p.gameDisplayName);
        }
        return names;
      });
    } catch {
      return [] as string[];
    }
  }, [text]);

  const blocks = useMemo(
    () => parseSeasonReviewDisplay(text, playerNames),
    [text, playerNames],
  );

  // 開発時の欠落検知（本番でも軽量）
  if (process.env.NODE_ENV !== "production") {
    const back = reconstructSeasonReviewText(blocks);
    if (back !== text.replace(/\r\n/g, "\n")) {
      console.warn("[SeasonReviewArticle] display parse text mismatch");
    }
  }

  return (
    <article
      className={cn(
        "mx-auto w-full max-w-[900px] overflow-x-hidden break-words",
        "rounded-xl border border-white/10 bg-black/40",
        "px-4 py-6 md:px-8 md:py-8",
        className,
      )}
    >
      <div className="space-y-0">
        {blocks.map((b, i) => {
          if (b.type === "blank") {
            return <div key={i} className="h-4 md:h-5" aria-hidden />;
          }
          if (b.type === "title") {
            return (
              <h2
                key={i}
                className="text-[22px] font-extrabold leading-snug tracking-[0.02em] text-white md:text-[26px]"
              >
                {b.text.trim()}
              </h2>
            );
          }
          if (b.type === "subtitle") {
            return (
              <p
                key={i}
                className="mt-2 text-[15px] font-medium leading-relaxed text-[color:var(--museum-accent,#d4af37)]/90 md:text-[16px]"
              >
                {b.text.trim()}
              </p>
            );
          }
          if (b.type === "heading") {
            const prev = blocks[i - 1];
            const padTop =
              prev && prev.type !== "blank" ? "mt-8 md:mt-9" : "mt-5 md:mt-6";
            return (
              <h3
                key={i}
                className={cn(
                  padTop,
                  "mb-3 text-[17px] font-extrabold leading-snug text-white md:text-[18px]",
                )}
              >
                <InlineParts parts={b.parts} />
              </h3>
            );
          }
          // paragraph
          const prev = blocks[i - 1];
          const afterTitle =
            prev?.type === "title" || prev?.type === "subtitle";
          return (
            <p
              key={i}
              className={cn(
                afterTitle ? "mt-8 md:mt-10" : "mt-4 md:mt-5",
                "text-[14.5px] leading-[1.95] text-museum-ivory-muted md:text-[15px]",
              )}
            >
              <InlineParts parts={b.parts} />
            </p>
          );
        })}
      </div>
    </article>
  );
}
