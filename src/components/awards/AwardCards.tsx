import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ResolvedAwardCard } from "@/data/awards";

export function AwardWinnerCard({
  card,
  badge,
  showStats = true,
}: {
  card: ResolvedAwardCard;
  badge?: string;
  showStats?: boolean;
}) {
  return (
    <article className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/55 p-4 md:p-5">
      {badge ? (
        <p className="text-[11px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
          {badge}
        </p>
      ) : null}
      {card.position ? (
        <p className="text-[11px] tracking-[0.12em] text-white/70">
          {card.position}
        </p>
      ) : null}
      <h3
        className={cn(
          "font-display text-xl text-white md:text-2xl",
          badge || card.position ? "mt-1" : undefined,
        )}
      >
        {card.playerName}
      </h3>
      <p className="mt-1 text-[13px] text-white/80">{card.teamName}</p>
      <HistoryBadge label={card.historyLabel} className="mt-2" />

      {showStats && card.stats && card.stats.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {card.stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2"
            >
              <dt className="text-[10px] text-white/65">{s.label}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function HistoryBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full border border-[color:var(--museum-accent,#d4af37)]/45 px-2 py-0.5 text-[10px] leading-snug text-[color:var(--museum-accent,#d4af37)] md:text-[11px]",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CompactStats({
  stats,
  dense = false,
  prominent = false,
}: {
  stats: { label: string; value: string }[] | null;
  dense?: boolean;
  /** 月間MVP一覧向け：数字の視認性を上げる */
  prominent?: boolean;
}) {
  if (!stats || stats.length === 0) {
    return <span className="text-white/40">—</span>;
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline",
        prominent
          ? "gap-x-3 gap-y-1"
          : dense
            ? "gap-x-2 gap-y-0.5"
            : "gap-x-2.5 gap-y-1",
      )}
    >
      {stats.map((s) => (
        <span
          key={s.label}
          className={cn(
            "whitespace-nowrap leading-snug",
            prominent
              ? "text-[13px] md:text-[14px]"
              : dense
                ? "text-[11px]"
                : "text-[11px] md:text-[12px]",
          )}
        >
          <span className="text-white/55">{s.label}</span>
          <span
            className={cn(
              "tabular-nums font-medium text-white",
              prominent ? "ml-1.5" : "ml-1",
            )}
          >
            {s.value}
          </span>
        </span>
      ))}
    </div>
  );
}

/** ベストナイン / GG 用の1選手1行（1リーグ分を1画面に収める密度） */
export function AwardListTable({
  rows,
  showStats,
  dense = false,
}: {
  rows: ResolvedAwardCard[];
  showStats: boolean;
  dense?: boolean;
}) {
  const cellY = dense ? "py-1.5" : "py-2";
  const headY = dense ? "py-1.5" : "py-2.5";

  return (
    <div className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50">
      <table className="w-full border-collapse text-left text-[12px] leading-snug md:text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] tracking-[0.08em] text-white/60">
            <th className={cn("px-2.5 font-medium md:px-3", headY)}>守備位置</th>
            <th className={cn("px-2.5 font-medium md:px-3", headY)}>選手名</th>
            <th className={cn("px-2.5 font-medium md:px-3", headY)}>球団</th>
            <th className={cn("px-2.5 font-medium md:px-3", headY)}>受賞履歴</th>
            {showStats ? (
              <th className={cn("px-2.5 font-medium md:px-3", headY)}>主要成績</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.playerId}-${row.position ?? i}`}
              className="border-b border-white/8 last:border-b-0"
            >
              <td
                className={cn(
                  "whitespace-nowrap px-2.5 text-white/75 md:px-3",
                  cellY,
                )}
              >
                {row.position}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-2.5 font-medium text-white md:px-3",
                  cellY,
                )}
              >
                {row.playerName}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-2.5 text-white/80 md:px-3",
                  cellY,
                )}
              >
                {row.teamName}
              </td>
              <td className={cn("px-2.5 md:px-3", cellY)}>
                <HistoryBadge label={row.historyLabel} />
              </td>
              {showStats ? (
                <td className={cn("px-2.5 md:px-3", cellY)}>
                  <CompactStats stats={row.stats} dense={dense} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueTwoColumn({
  central,
  pacific,
  centralLabel = "セ・リーグ",
  pacificLabel = "パ・リーグ",
  render,
}: {
  central: ResolvedAwardCard | ResolvedAwardCard[] | null;
  pacific: ResolvedAwardCard | ResolvedAwardCard[] | null;
  centralLabel?: string;
  pacificLabel?: string;
  render: (card: ResolvedAwardCard) => ReactNode;
}) {
  const cList =
    central == null ? [] : Array.isArray(central) ? central : [central];
  const pList =
    pacific == null ? [] : Array.isArray(pacific) ? pacific : [pacific];

  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      <LeagueColumn label={centralLabel} list={cList} render={render} />
      <LeagueColumn label={pacificLabel} list={pList} render={render} />
    </div>
  );
}

function LeagueColumn({
  label,
  list,
  render,
}: {
  label: string;
  list: ResolvedAwardCard[];
  render: (card: ResolvedAwardCard) => ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-[12px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
        {label}
      </p>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/35 px-4 py-8 text-center text-[13px] text-white/45">
          該当なし
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.playerId + (c.position ?? "")}>{render(c)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 月間MVP：ゲーム画面風の1行セル */
export function MonthlyWinnerCell({ card }: { card: ResolvedAwardCard }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 leading-relaxed">
      <span className="text-[15px] font-medium text-white md:text-[16px]">
        {card.playerName}
      </span>
      <span className="text-[13px] text-white/70 md:text-[14px]">
        {card.teamName}
      </span>
      <CompactStats stats={card.stats} dense prominent />
      <HistoryBadge
        label={card.historyLabel}
        className="text-[11px] md:text-[12px]"
      />
    </div>
  );
}
