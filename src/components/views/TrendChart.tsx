type TrendSeries = {
  team: string;
  color: string;
  ranks: number[];
};

type TrendChartProps = {
  months: string[];
  series: TrendSeries[];
};

/** 順位推移の折れ線グラフ（SVG） */
export function TrendChart({ months, series }: TrendChartProps) {
  const width = 640;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 36, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxRank = 6;

  const x = (i: number) =>
    pad.left + (i / Math.max(months.length - 1, 1)) * innerW;
  const y = (rank: number) =>
    pad.top + ((rank - 1) / (maxRank - 1)) * innerH;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-label="順位推移グラフ"
      >
        {[1, 2, 3, 4, 5, 6].map((rank) => (
          <g key={rank}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(rank)}
              y2={y(rank)}
              stroke="rgba(255,255,255,0.08)"
            />
            <text
              x={pad.left - 10}
              y={y(rank) + 4}
              textAnchor="end"
              fill="rgba(245,240,230,0.55)"
              fontSize="11"
            >
              {rank}
            </text>
          </g>
        ))}

        {months.map((month, i) => (
          <text
            key={month}
            x={x(i)}
            y={height - 12}
            textAnchor="middle"
            fill="rgba(245,240,230,0.7)"
            fontSize="11"
          >
            {month}
          </text>
        ))}

        {series.map((s) => {
          const points = s.ranks
            .map((rank, i) => `${x(i)},${y(rank)}`)
            .join(" ");
          return (
            <g key={s.team}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                points={points}
              />
              {s.ranks.map((rank, i) => (
                <circle
                  key={`${s.team}-${i}`}
                  cx={x(i)}
                  cy={y(rank)}
                  r="3.2"
                  fill={s.color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-museum-ivory-muted">
        {series.map((s) => (
          <li key={s.team} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: s.color }}
            />
            {s.team}
          </li>
        ))}
      </ul>
    </div>
  );
}
