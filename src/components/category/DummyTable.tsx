import { cn } from "@/lib/cn";

type DummyTableProps = {
  headers: string[];
  rows: string[][];
  className?: string;
};

export function DummyTable({ headers, rows, className }: DummyTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[520px] border-collapse text-left text-[12px] md:text-[13px]">
        <thead>
          <tr className="border-b border-museum-gold/30 text-museum-gold">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium tracking-[0.04em]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row[0]}-${i}`}
              className="border-b border-white/10 text-museum-ivory"
            >
              {row.map((cell, j) => (
                <td
                  key={`${i}-${j}`}
                  className={cn(
                    "px-2 py-2.5 tabular-nums",
                    j === 0 && "text-museum-gold-soft",
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
