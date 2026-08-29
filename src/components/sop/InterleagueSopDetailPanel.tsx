"use client";

import Link from "next/link";
import {
  interleagueSopPointDetailsFromResult,
  type InterleagueSopPointDetail,
} from "@/data/sop";
import { formatPlayerStatValue } from "@/data/playerStats";
import type { SopSeasonResult } from "@/lib/sop/types";
import { cn } from "@/lib/cn";

function formatDetailValue(detail: InterleagueSopPointDetail): string {
  const formatted = formatPlayerStatValue(detail.titleId, detail.value);
  switch (detail.titleId) {
    case "w":
      return `${detail.value}勝`;
    case "sv":
      return `${detail.value}セーブ`;
    case "hp":
      return `${detail.value}HP`;
    case "so":
      return `${detail.value}奪三振`;
    case "h":
      return `${detail.value}安打`;
    case "hr":
      return `${detail.value}本塁打`;
    case "rbi":
      return `${detail.value}打点`;
    case "sb":
      return `${detail.value}盗塁`;
    case "avg":
      return `打率 ${formatted}`;
    case "era":
      return `防御率 ${formatted}`;
    default:
      return formatted;
  }
}

type InterleagueSopDetailPanelProps = {
  result: SopSeasonResult;
  rank?: number | null;
  onClose: () => void;
  className?: string;
};

/**
 * 交流戦SOPの獲得ポイント内訳。
 * result.items（ランキング合計と同一ソース）のみを表示し、再計算しない。
 */
export function InterleagueSopDetailPanel({
  result,
  rank,
  onClose,
  className,
}: InterleagueSopDetailPanelProps) {
  const details = interleagueSopPointDetailsFromResult(result);
  const sum = details.reduce((s, d) => s + d.points, 0);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`${result.playerName}の交流戦SOP内訳`}
      className={cn(
        "rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/70 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-medium text-museum-ivory">
            {result.playerName}
          </h3>
          <p className="mt-0.5 text-[12px] text-museum-ivory-soft">
            {result.teamShort} · {result.role === "batter" ? "野手" : "投手"}
            {rank != null ? ` · 順位 ${rank}` : null}
          </p>
          <p className="mt-1.5 text-[14px] text-[color:var(--museum-accent,#d4af37)]">
            交流戦SOP：{result.total}pt
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/players/${result.playerId}/yearly`}
            className="min-h-9 rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-museum-ivory-soft hover:border-white/30"
          >
            選手詳細
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-museum-ivory-soft hover:border-white/30"
          >
            閉じる
          </button>
        </div>
      </div>

      <h4 className="mt-4 text-[11px] tracking-[0.12em] text-[color:var(--museum-accent,#d4af37)]">
        獲得ポイント内訳
      </h4>

      {details.length === 0 ? (
        <p className="mt-2 text-[12px] text-museum-ivory-soft">
          ポイント獲得部門はありません。
        </p>
      ) : (
        <ul className="mt-2 space-y-0">
          {details.map((d) => (
            <li
              key={`${d.titleId}-${d.rank}`}
              className="flex items-start justify-between gap-3 border-b border-white/8 py-2.5 text-[13px]"
            >
              <div className="min-w-0">
                <p className="font-medium text-museum-ivory">{d.category}</p>
                <p className="mt-0.5 text-[12px] text-museum-ivory-soft">
                  {d.rank}位 · {formatDetailValue(d)}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                {d.points}pt
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 pt-3 text-[13px]">
            <span className="font-medium text-museum-ivory">合計</span>
            <span className="tabular-nums font-medium text-[color:var(--museum-accent,#d4af37)]">
              {sum}pt
              {sum !== result.total ? (
                <span className="ml-2 text-[10px] text-rose-300">
                  （表示合計とSOP不一致）
                </span>
              ) : null}
            </span>
          </li>
        </ul>
      )}
    </section>
  );
}
