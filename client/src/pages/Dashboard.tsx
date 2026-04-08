import { useEffect, useState } from 'react';
import { AlertCircle, IndianRupee, Package, TrendingUp } from 'lucide-react';
import { BrandPieChart } from '../components/charts/BrandPieChart';
import { OutstandingBarChart } from '../components/charts/OutstandingBarChart';
import { ProfitLineChart } from '../components/charts/ProfitLineChart';
import { SalesBarChart } from '../components/charts/SalesBarChart';
import { KPICard } from '../components/ui/KPICard';
import { SkeletonCard, TableSkeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import { formatDate, formatINR, formatNumber } from '../lib/format';

interface DashboardStats {
  todaySales: { bags: number; amount: number };
  monthProfit: number;
  outstanding: number;
  stockValue: { bags: number; value: number };
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
      <div
        className={`w-full animate-pulse rounded-lg bg-card-border/40 ${tall ? 'min-h-[350px]' : 'min-h-[300px]'}`}
      />
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock < 100) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
        Critical
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
      Low
    </span>
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
        if (!cancelled) {
          setStats(null);
          setCharts(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const revenue = charts?.dailyRevenue?.map((r) => ({ date: r.date, revenue: Number(r.revenue) })) ?? [];
  const cost = charts?.dailyCost?.map((c) => ({ date: c.date, cost: Number(c.cost) })) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-heading/60">Welcome back. Here&apos;s your business overview.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !stats ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard
              title="Today's Sales"
              value={formatINR(stats.todaySales.amount)}
              subtitle={`${formatNumber(stats.todaySales.bags)} bags sold`}
              icon={TrendingUp}
              color="sale"
            />
            <KPICard
              title="This Month's Profit"
              value={formatINR(stats.monthProfit)}
              subtitle="Sale amount − purchase amount"
              icon={IndianRupee}
              color="profit"
            />
            <KPICard
              title="Outstanding Dues"
              value={formatINR(stats.outstanding)}
              subtitle="Total owed by all parties"
              icon={AlertCircle}
              color="outstanding"
            />
            <KPICard
              title="Current Stock Value"
              value={formatINR(stats.stockValue.value)}
              subtitle={`${formatNumber(stats.stockValue.bags)} bags × avg purchase rate`}
              icon={Package}
              color="purchase"
            />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {loading || !charts ? (
            <ChartSkeleton />
          ) : (
            <SalesBarChart data={charts.monthlySales} title="Monthly sales by cement type" />
          )}
        </div>
        <div className="lg:col-span-2">
          {loading || !charts ? (
            <ChartSkeleton />
          ) : (
            <BrandPieChart data={charts.topBrands} title="Top cement brands by volume" />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          {loading || !charts ? (
            <ChartSkeleton />
          ) : (
            <ProfitLineChart revenue={revenue} cost={cost} title="Daily revenue vs cost" />
          )}
        </div>
        <div>
          {loading || !charts ? (
            <ChartSkeleton tall />
          ) : (
            <OutstandingBarChart data={charts.topOutstanding} title="Top parties by outstanding balance" />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <h3 className="border-b border-card-border px-4 py-3 text-base font-semibold text-heading">
            Recent sales
          </h3>
          {loading || !charts ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
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
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatNumber(row.bags)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatINR(row.sale_rate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                        {formatINR(row.sale_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <h3 className="border-b border-card-border px-4 py-3 text-base font-semibold text-heading">
            Low stock alerts
          </h3>
          {loading || !charts ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-pulse gap-3 rounded-lg border border-card-border p-3">
                  <div className="h-4 flex-1 rounded bg-card-border/70" />
                  <div className="h-4 w-16 rounded bg-card-border/70" />
                  <div className="h-4 w-24 rounded bg-card-border/70" />
                </div>
              ))}
            </div>
          ) : charts.lowStock.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-heading/50">
              All active brands are at 200 bags or above.
            </p>
          ) : (
            <ul className="divide-y divide-card-border">
              {charts.lowStock.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm sm:flex-nowrap"
                >
                  <span className="min-w-0 flex-1 font-medium text-heading">{row.name}</span>
                  <span className="tabular-nums text-heading/70">{formatNumber(row.stock)} bags</span>
                  <span className="text-heading/60">
                    Last purchase:{' '}
                    {row.last_purchase ? formatDate(row.last_purchase) : '—'}
                  </span>
                  <StockBadge stock={row.stock} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
