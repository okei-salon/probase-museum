"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildYearSopRankings } from "@/data/sop";
import { parseSeasonKey } from "@/data/seasons";
import {
  groupSopItemsByCategory,
  SOP_CATEGORY_LABELS,
  type SopCategoryId,
  type SopRankEntry,
  type SopSeasonResult,
} from "@/lib/sop";
import { cn } from "@/lib/cn";

const CATEGORY_ORDER: SopCategoryId[] = [
  "annual_awards",
  "titles",
  "season_basic",
  "combo",
  "feats_streaks",
  "historic",
  "consecutive_year",
  "npb_record",
  "two_way",
];

type SeasonSopBoardProps = {
  year: number;
  /** ルート seasonKey（BLUE_2026 等）。指定時は WORLD 厳密 */
  seasonKey?: string;
};

function entryKey(entry: SopRankEntry): string {
  const r = entry.result;
  return `${r.world ?? ""}:${r.playerId}:${r.role}`;
}

export function SeasonSopBoard({ year, seasonKey }: SeasonSopBoardProps) {
  const { rankings, notes } = useMemo(() => {
    if (seasonKey) {
      const identity = parseSeasonKey(seasonKey);
      if (identity) return buildYearSopRankings(identity);
    }
    return buildYearSopRankings(year);
  }, [year, seasonKey]);
  const [selected, setSelected] = useState<SopRankEntry | null>(null);
  const detailRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [year, seasonKey]);

  useEffect(() => {
    if (!selected || !detailRef.current) return;
    detailRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selected]);

  function toggleEntry(entry: SopRankEntry) {
    setSelected((prev) => {
      if (
        prev &&
        prev.result.playerId === entry.result.playerId &&
        prev.result.role === entry.result.role
      ) {
        return null;
      }
      return entry;
    });
  }

  if (rankings.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-museum-ivory-soft">
          この年度のSOPを計算できる個人成績がまだありません。
        </p>
        <ul className="space-y-1 text-[11px] text-museum-ivory-soft/80">
          {notes.map((n) => (
            <li key={n}>・ {n}</li>
          ))}
        </ul>
        <p className="text-[12px]">
          <Link
            href="/import"
            className="text-[color:var(--museum-accent,#d4af37)] underline-offset-2 hover:underline"
          >
            手入力・画像取込で個人成績を登録
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[560px] border-collapse text-left text-[12px] md:text-[13px]">
          <thead>
            <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
              <th className="px-2.5 py-2 font-medium">順位</th>
              <th className="px-2.5 py-2 font-medium">選手</th>
              <th className="px-2.5 py-2 font-medium">球団</th>
              <th className="px-2.5 py-2 font-medium">区分</th>
              <th className="px-2.5 py-2 font-medium">SOP</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((entry) => {
              const r = entry.result;
              const active =
                selected != null &&
                selected.result.playerId === r.playerId &&
                selected.result.role === r.role;
              return (
                <Fragment key={entryKey(entry)}>
                  <tr
                    className={cn(
                      "border-b border-white/8 transition-colors",
                      active
                        ? "bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))]"
                        : "hover:bg-white/5",
                    )}
                  >
                    <td className="px-2.5 py-2 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                      {entry.rank}
                    </td>
                    <td className="px-2.5 py-2 font-medium text-museum-ivory">
                      <button
                        type="button"
                        onClick={() => toggleEntry(entry)}
                        className={cn(
                          "min-h-9 cursor-pointer text-left underline-offset-2",
                          "hover:text-[color:var(--museum-accent,#d4af37)] hover:underline",
                          active &&
                            "text-[color:var(--museum-accent,#d4af37)] underline",
                        )}
                      >
                        {r.playerName}
                      </button>
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {r.teamShort}
                    </td>
                    <td className="px-2.5 py-2 text-museum-ivory-soft">
                      {r.role === "batter" ? "野手" : "投手"}
                    </td>
                    <td className="px-2.5 py-2 tabular-nums font-medium text-museum-ivory">
                      {r.total}
                    </td>
                  </tr>
                  {active ? (
                    <tr
                      ref={detailRef}
                      className="border-b border-white/8 bg-black/55"
                    >
                      <td colSpan={5} className="px-2 py-3 sm:px-3">
                        <SopDetailPanel
                          result={selected!.result}
                          rank={selected!.rank}
                          onClose={() => setSelected(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!selected ? (
        <p className="text-[11px] text-museum-ivory-soft">
          選手名をクリックすると、その行の直下にSOP内訳を表示します。同点は同順位です。
        </p>
      ) : null}

      <ul className="space-y-0.5 text-[10px] text-museum-ivory-soft/70">
        {notes.map((n) => (
          <li key={n}>・ {n}</li>
        ))}
      </ul>
    </div>
  );
}

function SopDetailPanel({
  result,
  rank,
  onClose,
}: {
  result: SopSeasonResult;
  rank: number | null;
  onClose: () => void;
}) {
  const groups = groupSopItemsByCategory(result);

  return (
    <section className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/45 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-museum-ivory">
            {result.playerName}
            <span className="ml-2 text-[12px] text-museum-ivory-soft">
              {result.teamShort}・{result.role === "batter" ? "野手" : "投手"}
            </span>
          </h3>
          <p className="mt-1 text-[13px] text-[color:var(--museum-accent,#d4af37)]">
            順位 {rank ?? "—"}　SOP合計 {result.total}
          </p>
          {result.meta?.pitcherClass ? (
            <p className="mt-0.5 text-[11px] text-museum-ivory-soft">
              投手分類:{" "}
              {result.meta.pitcherClass === "starter"
                ? "先発型"
                : result.meta.pitcherClass === "reliever"
                  ? "救援型"
                  : result.meta.pitcherClass === "hybrid"
                    ? "混合型"
                    : "判定不可"}
              {result.meta.startRate != null
                ? `（先発率 ${(result.meta.startRate * 100).toFixed(1)}%）`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/players/${result.playerId}/yearly`}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-museum-ivory-soft hover:border-white/30"
          >
            選手詳細
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-museum-ivory-soft hover:border-white/30"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const items = groups.get(cat);
          if (!items || items.length === 0) return null;
          const sub = items.reduce((s, it) => s + it.points, 0);
          if (cat === "two_way") {
            const batterItems = items.filter((it) => it.detail === "野手側");
            const pitcherItems = items.filter((it) => it.detail === "投手側");
            const batterSub = batterItems.reduce((s, it) => s + it.points, 0);
            const pitcherSub = pitcherItems.reduce((s, it) => s + it.points, 0);
            return (
              <div key={cat}>
                <h4 className="text-[11px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
                  {SOP_CATEGORY_LABELS[cat]}
                  <span className="ml-2 text-museum-ivory-soft">{sub}pt</span>
                </h4>
                {batterItems.length > 0 ? (
                  <div className="mt-1.5">
                    <p className="text-[11px] text-museum-ivory-soft">
                      【野手側 {batterSub}pt】
                    </p>
                    <ul className="mt-0.5 space-y-0.5 text-[12px] text-museum-ivory-muted">
                      {batterItems.map((it) => (
                        <li
                          key={it.id}
                          className="flex justify-between gap-3 border-b border-white/5 py-1"
                        >
                          <span>{it.label}</span>
                          <span className="shrink-0 tabular-nums text-museum-ivory">
                            +{it.points}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {pitcherItems.length > 0 ? (
                  <div className="mt-1.5">
                    <p className="text-[11px] text-museum-ivory-soft">
                      【投手側 {pitcherSub}pt】
                    </p>
                    <ul className="mt-0.5 space-y-0.5 text-[12px] text-museum-ivory-muted">
                      {pitcherItems.map((it) => (
                        <li
                          key={it.id}
                          className="flex justify-between gap-3 border-b border-white/5 py-1"
                        >
                          <span>{it.label}</span>
                          <span className="shrink-0 tabular-nums text-museum-ivory">
                            +{it.points}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          }
          return (
            <div key={cat}>
              <h4 className="text-[11px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
                {SOP_CATEGORY_LABELS[cat]}
                <span className="ml-2 text-museum-ivory-soft">+{sub}</span>
              </h4>
              <ul className="mt-1 space-y-0.5 text-[12px] text-museum-ivory-muted">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex justify-between gap-3 border-b border-white/5 py-1"
                  >
                    <span>
                      {it.label}
                      {it.detail ? (
                        <span className="ml-1 text-[10px] text-museum-ivory-soft">
                          （{it.detail}）
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-museum-ivory">
                      +{it.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {result.items.length === 0 ? (
          <p className="text-[12px] text-museum-ivory-soft">
            加点項目はありません（判定に必要なデータが不足している可能性があります）。
          </p>
        ) : null}
      </div>
    </section>
  );
}
