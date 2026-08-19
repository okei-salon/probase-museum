import { cn } from "@/lib/cn";

type TeamRankRow = {
  rank: number;
  team: string;
  value: string;
  label?: string;
};

type PlayerRankRow = {
  rank: number;
  player: string;
  team: string;
  value: string;
  note?: string;
};

type RankingListProps = {
  title?: string;
  rows: TeamRankRow[] | PlayerRankRow[];
  mode?: "team" | "player";
  className?: string;
};

export function RankingList({
  title,
  rows,
  mode = "team",
  className,
}: RankingListProps) {
  return (
    <div className={className}>
      {title ? (
        <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
          {title}
        </p>
      ) : null}
      <ol className="space-y-2">
        {rows.map((row) => {
          const isPlayer = mode === "player" && "player" in row;
          return (
            <li
              key={
                isPlayer
                  ? `${row.rank}-${(row as PlayerRankRow).player}`
                  : `${row.rank}-${(row as TeamRankRow).team}`
              }
              className={cn(
                "flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5",
              )}
            >
              <span className="font-display text-lg tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                {row.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-museum-ivory">
                  {isPlayer
                    ? (row as PlayerRankRow).player
                    : (row as TeamRankRow).team}
                </span>
                <span className="block text-[11px] text-museum-ivory-soft">
                  {isPlayer
                    ? (row as PlayerRankRow).team
                    : ((row as TeamRankRow).label ?? "")}
                  {isPlayer && (row as PlayerRankRow).note
                    ? ` / ${(row as PlayerRankRow).note}`
                    : ""}
                </span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-museum-ivory">
                {row.value}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
