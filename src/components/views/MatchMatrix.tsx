import { cn } from "@/lib/cn";

type SquareMatrixProps = {
  title: string;
  teams: string[];
  cells: string[][];
  className?: string;
};

/** 同リーグ対戦マトリクス（縦横に球団名） */
export function MatchMatrix({
  title,
  teams,
  cells,
  className,
}: SquareMatrixProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <table className="border-collapse text-center text-[11px] md:text-[12px]">
        <thead>
          <tr>
            <th className="px-1.5 py-1.5 text-museum-ivory-soft" />
            {teams.map((team) => (
              <th
                key={team}
                className="px-1.5 py-1.5 font-medium text-[color:var(--museum-accent,#d4af37)]"
              >
                {team}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((rowTeam, ri) => (
            <tr key={rowTeam} className="border-t border-white/10">
              <th className="px-1.5 py-1.5 text-left font-medium text-museum-ivory">
                {rowTeam}
              </th>
              {cells[ri]?.map((cell, ci) => (
                <td
                  key={`${ri}-${ci}`}
                  className={cn(
                    "px-1.5 py-1.5 tabular-nums",
                    ri === ci
                      ? "bg-white/5 text-museum-ivory-soft"
                      : "text-museum-ivory",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CrossMatrixProps = {
  title: string;
  rowTeams: string[];
  colTeams: string[];
  cells: string[][];
  className?: string;
};

/** 交流戦マトリクス（セ×パ） */
export function CrossMatchMatrix({
  title,
  rowTeams,
  colTeams,
  cells,
  className,
}: CrossMatrixProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <table className="border-collapse text-center text-[11px] md:text-[12px]">
        <thead>
          <tr>
            <th className="px-1.5 py-1.5 text-museum-ivory-soft">セ＼パ</th>
            {colTeams.map((team) => (
              <th
                key={team}
                className="px-1.5 py-1.5 font-medium text-[color:var(--museum-accent,#d4af37)]"
              >
                {team}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowTeams.map((rowTeam, ri) => (
            <tr key={rowTeam} className="border-t border-white/10">
              <th className="px-1.5 py-1.5 text-left font-medium text-museum-ivory">
                {rowTeam}
              </th>
              {cells[ri]?.map((cell, ci) => (
                <td
                  key={`${ri}-${ci}`}
                  className="px-1.5 py-1.5 tabular-nums text-museum-ivory"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
