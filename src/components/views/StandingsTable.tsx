import { cn } from "@/lib/cn";

export type StandingRow = {
  rank: number;
  team: string;
  w: number;
  l: number;
  d: number;
  pct: string;
  gb: string;
};

type StandingsTableProps = {
  title: string;
  rows: StandingRow[];
  className?: string;
};

export function StandingsTable({ title, rows, className }: StandingsTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <p className="mb-2 text-[12px] font-medium text-[color:var(--museum-accent,#d4af37)]">
        {title}
      </p>
      <table className="w-full min-w-[420px] border-collapse text-left text-[12px] md:text-[13px]">
        <thead>
          <tr className="border-b border-[color:var(--museum-accent-border,#d4af3773)] text-[color:var(--museum-accent,#d4af37)]">
            {["順位", "球団", "勝", "敗", "分", "勝率", "差"].map((h) => (
              <th key={h} className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team}
              className="border-b border-white/10 text-museum-ivory"
            >
              <td className="px-2 py-2.5 tabular-nums text-[color:var(--museum-accent,#d4af37)]">
                {row.rank}
              </td>
              <td className="px-2 py-2.5 font-medium">{row.team}</td>
              <td className="px-2 py-2.5 tabular-nums">{row.w}</td>
              <td className="px-2 py-2.5 tabular-nums">{row.l}</td>
              <td className="px-2 py-2.5 tabular-nums">{row.d}</td>
              <td className="px-2 py-2.5 tabular-nums">{row.pct}</td>
              <td className="px-2 py-2.5 tabular-nums">{row.gb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
