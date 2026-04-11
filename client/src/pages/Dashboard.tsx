import { useEffect, useState } from 'react';
import { AlertCircle, Building2, IndianRupee, Package, TrendingUp, Wallet } from 'lucide-react';
import { OutstandingBarChart } from '../components/charts/OutstandingBarChart';
import { ProfitLineChart } from '../components/charts/ProfitLineChart';
import { SalesBarChart } from '../components/charts/SalesBarChart';
import { KPICard } from '../components/ui/KPICard';
import { SkeletonCard } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import { formatDate, formatINR, formatNumber } from '../lib/format';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardStats {
  todaySales: { bags: number; amount: number };
  monthProfit: number;
  outstanding: number;
  stockValue: { bags: number; value: number };
  totalCapital: number;
  bankBalance: number;
  cashBalance: number;
  bankReceived: number;
  cashReceived: number;
  bankPaid: number;
  cashPaid: number;
}

interface DashboardCharts {
  monthlySales: { month: string; cement_type: string; bags: number; amount: number }[];
  topBrands: { name: string; bags: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  dailyCost: { date: string; cost: number }[];
  topOutstanding: { name: string; outstanding: number }[];
  recentSales: {
    id: number;
    date: string;
    party_name: string;
    brand_name: string;
    bags: number;
    sale_rate: number;
    sale_amount: number;
  }[];
  lowStock: {
    id: number;
    name: string;
    stock: number;
    last_purchase: string | null;
  }[];
}

function ChartSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="h-5 w-48 animate-pulse rounded-md bg-card-border/70" />
      <div className={`w-full animate-pulse rounded-lg bg-card-border/40 ${tall ? 'min-h-[350px]' : 'min-h-[300px]'}`} />
    </div>
  );
}

const DONUT_COLORS = ['#E8580A', '#1E6FC0', '#2D7A1F', '#B8620A', '#0F7A4B', '#7C3AED'];

function BrandDonutChart({ data, title }: { data: { name: string; bags: number }[]; title: string }) {
  const sorted = [...data].sort((a, b) => b.bags - a.bags).slice(0, 6).filter((d) => d.bags > 0);
  const total = sorted.reduce((s, d) => s + d.bags, 0);

  if (sorted.length === 0) {
    return (
      <div className="card flex items-center justify-center min-h-[320px]">
        <p className="text-sm text-gray-400">No data for this month</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3 min-h-[380px]">
      <h3 className="text-base font-semibold text-heading">{title}</h3>
      <div className="flex flex-col gap-4">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="bags"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${formatNumber(value)} bags`, 'Volume']}
              contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend as rows with percentage bar */}
        <div className="space-y-2">
          {sorted.map((d, i) => {
            const pct = total > 0 ? (d.bags / total) * 100 : 0;
            return (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate font-medium text-gray-700">{d.name}</span>
                <span className="tabular-nums text-gray-500">{formatNumber(d.bags)}</span>
                <div className="w-16 shrink-0">
                  <div className="h-1.5 rounded-full bg-gray-200">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  </div>
                </div>
                <span className="w-8 text-right tabular-nums text-gray-400">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.dashboard.stats(), api.dashboard.charts()])
      .then(([s, c]) => {
        if (!cancelled) {
          setStats(s as DashboardStats);
          setCharts(c as DashboardCharts);
        }
      })
      .catch(() => {
        if (!cancelled) { setStats(null); setCharts(null); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const revenue = charts?.dailyRevenue?.map((r) => ({ date: r.date, revenue: Number(r.revenue) })) ?? [];
  const cost = charts?.dailyCost?.map((c) => ({ date: c.date, cost: Number(c.cost) })) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-heading/60">Welcome back. Here&apos;s your business overview.</p>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading || !stats ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</>
        ) : (
          <>
            <KPICard title="Today's Sales" value={formatINR(stats.todaySales.amount)} subtitle={`${formatNumber(stats.todaySales.bags)} bags sold`} icon={TrendingUp} color="sale" />
            <KPICard title="This Month's Profit" value={formatINR(stats.monthProfit)} subtitle="Sales − purchases" icon={IndianRupee} color="profit" />
            <KPICard title="Outstanding Dues" value={formatINR(stats.outstanding)} subtitle="Total owed by all parties" icon={AlertCircle} color="outstanding" />
            <KPICard title="Stock Value" value={formatINR(stats.stockValue.value)} subtitle={`${formatNumber(stats.stockValue.bags)} bags`} icon={Package} color="purchase" />
            <KPICard title="Total Capital" value={formatINR(stats.totalCapital)} subtitle="Cash + bank" icon={Wallet} color="profit" />
          </>
        )}
      </section>

      {/* Bank & Cash Breakdown */}
      {!loading && stats && (
        <section className="grid gap-4 sm:grid-cols-2">
          {/* Bank summary */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-heading">Bank Balance</h3>
              <span className="ml-auto text-xl font-bold tabular-nums text-blue-700">{formatINR(stats.bankBalance)}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total received (bank)</span>
                <span className="tabular-nums font-medium text-green-700">+{formatINR(stats.bankReceived)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total expenses (bank)</span>
                <span className="tabular-nums font-medium text-red-700">−{formatINR(stats.bankPaid)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">Net bank</span>
                <span className={`tabular-nums ${stats.bankBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatINR(stats.bankBalance)}</span>
              </div>
            </div>
          </div>
          {/* Cash summary */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-heading">Cash in Hand</h3>
              <span className="ml-auto text-xl font-bold tabular-nums text-amber-700">{formatINR(stats.cashBalance)}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total received (cash)</span>
                <span className="tabular-nums font-medium text-green-700">+{formatINR(stats.cashReceived)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Imprest debits</span>
                <span className="tabular-nums font-medium text-red-700">−{formatINR(stats.cashPaid)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">Net cash</span>
                <span className={`tabular-nums ${stats.cashBalance >= 0 ? 'text-amber-700' : 'text-red-700'}`}>{formatINR(stats.cashBalance)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Charts row 1 */}
      <section className="grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="h-full">
          {loading || !charts ? <ChartSkeleton /> : (
            <SalesBarChart data={charts.monthlySales} title="Monthly sales by cement type" />
          )}
        </div>
        <div className="h-full">
          {loading || !charts ? <ChartSkeleton /> : (
            <BrandDonutChart data={charts.topBrands} title="Top brands this month" />
          )}
        </div>
      </section>

      {/* Charts row 2 */}
      <section className="grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="h-full">
          {loading || !charts ? <ChartSkeleton /> : (
            <ProfitLineChart revenue={revenue} cost={cost} title="Daily revenue vs cost" />
          )}
        </div>
        <div className="h-full">
          {loading || !charts ? <ChartSkeleton /> : (
            <OutstandingBarChart data={charts.topOutstanding} title="Top parties by outstanding balance" />
          )}
        </div>
      </section>

      {/* Recent Sales */}
      <section>
        <div className="card overflow-hidden p-0">
          <h3 className="border-b border-card-border px-4 py-3 text-base font-semibold text-heading">
            Recent sales
          </h3>
          {loading || !charts ? (
            <div className="p-4">
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-4">
                    <div className="h-4 flex-1 rounded bg-gray-200" />
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="h-4 w-32 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          ) : charts.recentSales.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-heading/50">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-card-border bg-surface/50 text-xs font-medium uppercase tracking-wide text-heading/60">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-right">Bags</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-heading">
                  {charts.recentSales.map((row) => (
                    <tr key={row.id} className="hover:bg-surface/30">
                      <td className="whitespace-nowrap px-4 py-3 text-heading/80">{formatDate(row.date)}</td>
                      <td className="max-w-[140px] truncate px-4 py-3">{row.party_name}</td>
                      <td className="max-w-[120px] truncate px-4 py-3">{row.brand_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatNumber(row.bags)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatINR(row.sale_rate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatINR(row.sale_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
