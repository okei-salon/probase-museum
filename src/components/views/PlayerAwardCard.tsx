type PlayerAwardCardProps = {
  player: string;
  team: string;
  awardCount?: number;
  stats: { label: string; value: string }[];
  note?: string;
  badge?: string;
};

/** 受賞・MVP用の大型選手カード */
export function PlayerAwardCard({
  player,
  team,
  awardCount = 1,
  stats,
  note,
  badge = "MVP",
}: PlayerAwardCardProps) {
  return (
    <article className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-[color:var(--museum-accent-soft,rgba(212,175,55,0.12))] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-[color:var(--museum-accent,#d4af37)]">
            {badge}
          </p>
          <h3 className="mt-1 font-display text-[clamp(1.5rem,3vw,2rem)] leading-none text-museum-ivory">
            {player}
          </h3>
          <p className="mt-2 text-sm text-museum-ivory-muted">{team}</p>
        </div>
        <div className="rounded-full border border-[color:var(--museum-accent-border,#d4af3773)] px-3 py-1 text-[11px] text-[color:var(--museum-accent,#d4af37)]">
          受賞 {awardCount} 回
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/10 bg-black/45 px-3 py-2.5"
          >
            <dt className="text-[10px] text-museum-ivory-soft">{stat.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-museum-ivory">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {note ? (
        <p className="mt-4 text-[12px] leading-relaxed text-museum-ivory-soft">
          {note}
        </p>
      ) : null}
    </article>
  );
}
