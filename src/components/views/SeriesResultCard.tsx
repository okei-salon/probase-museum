type SeriesResultCardProps = {
  title: string;
  matchup: string;
  result: string;
  advances?: string[];
};

/** シリーズ勝敗・進出チームの結果カード */
export function SeriesResultCard({
  title,
  matchup,
  result,
  advances,
}: SeriesResultCardProps) {
  return (
    <article className="rounded-xl border border-[color:var(--museum-accent-border,#d4af3773)] bg-black/50 p-5">
      <p className="text-[11px] tracking-[0.14em] text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <h3 className="mt-2 font-display text-2xl text-museum-ivory">{matchup}</h3>
      <p className="mt-2 text-sm text-museum-ivory-muted">{result}</p>
      {advances?.length ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-[12px] text-museum-ivory-soft">
          {advances.map((line) => (
            <li key={line}>・ {line}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
