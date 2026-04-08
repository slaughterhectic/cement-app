import { formatINR } from '../../lib/format';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const REVENUE_COLOR = '#2D7A1F';
const COST_COLOR = '#1E6FC0';

export type RevenuePoint = { date: string; revenue: number };
export type CostPoint = { date: string; cost: number };

export interface ProfitLineChartProps {
  revenue: RevenuePoint[];
  cost: CostPoint[];
  title?: string;
}

function mergeByDate(revenue: RevenuePoint[], cost: CostPoint[]) {
  const map = new Map<string, { date: string; revenue: number; cost: number }>();

  for (const r of revenue) {
    const cur = map.get(r.date) ?? { date: r.date, revenue: 0, cost: 0 };
    cur.revenue += r.revenue;
    map.set(r.date, cur);
  }
  for (const c of cost) {
    const cur = map.get(c.date) ?? { date: c.date, revenue: 0, cost: 0 };
    cur.cost += c.cost;
    map.set(c.date, cur);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function ProfitLineChart({
  revenue,
  cost,
  title = 'Daily revenue vs cost',
}: ProfitLineChartProps) {
  const chartData = mergeByDate(revenue, cost);

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-card-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-heading/70" />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-heading/70"
              tickFormatter={(v) => formatINR(Number(v))}
            />
            <Tooltip
              formatter={(value: number) => formatINR(value)}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgb(229 231 235)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={REVENUE_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              name="Cost"
              stroke={COST_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
