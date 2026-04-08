import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const OPC_COLOR = '#1E6FC0';
const PPC_COLOR = '#2D7A1F';

export type SalesBarRow = {
  month: string;
  cement_type: string;
  bags: number;
  amount: number;
};

export interface SalesBarChartProps {
  data: SalesBarRow[];
  title?: string;
}

function pivotByMonth(rows: SalesBarRow[]): { month: string; OPC: number; PPC: number }[] {
  const byMonth = new Map<string, { OPC: number; PPC: number }>();
  for (const row of rows) {
    const t = row.cement_type.trim().toUpperCase();
    if (t !== 'OPC' && t !== 'PPC') continue;
    const cur = byMonth.get(row.month) ?? { OPC: 0, PPC: 0 };
    if (t === 'OPC') cur.OPC += row.bags;
    else cur.PPC += row.bags;
    byMonth.set(row.month, cur);
  }
  return Array.from(byMonth.entries()).map(([month, v]) => ({
    month,
    OPC: v.OPC,
    PPC: v.PPC,
  }));
}

export function SalesBarChart({ data, title = 'Monthly sales by cement type' }: SalesBarChartProps) {
  const chartData = pivotByMonth(data);

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-card-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-heading/70" />
            <YAxis tick={{ fontSize: 12 }} className="text-heading/70" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid rgb(229 231 235)',
              }}
              formatter={(value: number) => [value.toLocaleString('en-IN'), 'Bags']}
            />
            <Legend />
            <Bar dataKey="OPC" name="OPC" fill={OPC_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="PPC" name="PPC" fill={PPC_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
