import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const BRAND_COLORS = ['#E8580A', '#1E6FC0', '#2D7A1F', '#B8620A', '#0F7A4B'] as const;

export type BrandPieRow = {
  name: string;
  bags: number;
};

export interface BrandPieChartProps {
  data: BrandPieRow[];
  title?: string;
}

export function BrandPieChart({ data, title = 'Top cement brands by volume' }: BrandPieChartProps) {
  const chartData = [...data]
    .sort((a, b) => b.bags - a.bags)
    .slice(0, 5)
    .filter((d) => d.bags > 0);

  const total = chartData.reduce((s, d) => s + d.bags, 0);

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="bags"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${total > 0 ? (percent * 100).toFixed(0) : 0}%`
              }
              labelLine={{ stroke: '#1A1A2E', strokeWidth: 1 }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString('en-IN')} bags`,
                'Volume',
              ]}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgb(229 231 235)',
              }}
            />
            <Legend verticalAlign="bottom" layout="horizontal" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
