import { cn } from "@/lib/cn";

export type GameResult = {
  game: string;
  date: string;
  home: string;
  away: string;
  score: string;
  note?: string;
  hr?: string;
  winner?: string;
};

type GameResultListProps = {
  title?: string;
  games: GameResult[];
  className?: string;
};

/** 試合ごとのスコア一覧 */
export function GameResultList({
  title,
  games,
  className,
}: GameResultListProps) {
  return (
    <div className={className}>
      {title ? (
        <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
          {title}
        </p>
      ) : null}
      <ul className="space-y-2">
        {games.map((g) => (
          <li
            key={`${g.game}-${g.date}`}
            className="rounded-lg border border-white/10 bg-black/45 px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-[color:var(--museum-accent,#d4af37)]">
                  {g.game}
                  <span className="ml-2 text-museum-ivory-soft">{g.date}</span>
                </p>
                <p className="mt-1 text-[14px] font-medium text-museum-ivory">
                  {g.away}
                  <span className="mx-2 text-museum-ivory-soft">@</span>
                  {g.home}
                </p>
              </div>
              <p className="font-display text-xl tabular-nums text-museum-ivory">
                {g.score}
              </p>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-museum-ivory-soft">
              {g.winner ? <span>勝者: {g.winner}</span> : null}
              {g.hr ? <span>本塁打: {g.hr}</span> : null}
              {g.note ? (
                <span className={cn(g.winner || g.hr ? "" : "")}>{g.note}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
