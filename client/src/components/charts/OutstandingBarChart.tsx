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

export function OutstandingBarChart({
  data,
  title = 'Top parties by outstanding balance',
}: OutstandingBarChartProps) {
  const top10 = [...data].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
  const chartData = [...top10].sort((a, b) => a.outstanding - b.outstanding);

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-card-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-heading/70"
              tickFormatter={(v) => formatINR(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
              className="text-heading/70"
            />
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgb(229 231 235)',
              }}
            />
            <Bar dataKey="outstanding" name="Outstanding" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
