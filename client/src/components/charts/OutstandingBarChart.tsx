import { formatINR } from '../../lib/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BAR_COLOR = '#C0271E';

export type OutstandingRow = {
  name: string;
  outstanding: number;
};

export interface OutstandingBarChartProps {
  data: OutstandingRow[];
  title?: string;
}

// Custom Y-axis tick: truncate long names and show full name on hover via title
function TruncatedTick({ x, y, payload }: any) {
  const MAX = 18;
  const name: string = payload.value ?? '';
  const display = name.length > MAX ? name.slice(0, MAX) + '…' : name;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{name}</title>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#374151"
        fontSize={11}
      >
        {display}
      </text>
    </g>
  );
}

export function OutstandingBarChart({
  data,
  title = 'Top parties by outstanding balance',
}: OutstandingBarChartProps) {
  const top10 = [...data].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  const chartData = [...top10].sort((a, b) => a.outstanding - b.outstanding);

  // Taller chart so each row has breathing room (~40px per bar)
  const chartHeight = Math.max(320, chartData.length * 42);

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div style={{ minHeight: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-card-border" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const n = Number(v);
                if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
                if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
                return `₹${n}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={<TruncatedTick />}
            />
            <Tooltip
              formatter={(value: number) => [formatINR(value), 'Outstanding']}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgb(229 231 235)',
                fontSize: 12,
              }}
            />
            <Bar dataKey="outstanding" name="Outstanding" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
