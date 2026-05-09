import { useEffect, useState, useCallback } from 'react';
import { Truck, Route, TrendingUp, IndianRupee, Calculator, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/format';
import { useToastStore } from '../../lib/store';
import { MonthPicker } from '../../components/MonthPicker';

interface DashboardData {
  totalTrucks: number;
  totalTrips: number;
  monthFreight: number;
  monthProfit: number;
  totalFixedExpense: number;
  totalUrea: number;
  fixedBreakdown: Array<{ category: string; total: number }>;
  perTruck: Array<{
    id: number;
    truck_number: string;
    trip_count: number;
    total_freight: number;
    net_freight: number;
    total_trip_expense: number;
    net_profit: number;
  }>;
}

function StatCard({ label, value, sub, icon: Icon, color, onClick }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card flex items-center gap-4 p-5 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-heading/60">{label}</p>
        <p className="text-2xl font-bold text-heading truncate">{value}</p>
        {sub && <p className="text-xs text-heading/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function TruckDashboard() {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFixedBreakdown, setShowFixedBreakdown] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.trucks.dashboard(filterMonth);
      setData(d);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const monthLabel = filterMonth
    ? new Date(filterMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : 'All time';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const totalFixedAndUrea = Number(data.totalFixedExpense) + Number(data.totalUrea);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">TruckBook Dashboard</h1>
          <p className="text-sm text-heading/60 mt-1">Fleet performance · {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-heading/70 whitespace-nowrap">Month:</label>
          <MonthPicker value={filterMonth} onChange={setFilterMonth} />
          {filterMonth && (
            <button
              type="button"
              onClick={() => setFilterMonth('')}
              className="text-sm text-orange-600 dark:text-orange-400 hover:underline font-medium whitespace-nowrap"
            >
              All time
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active Trucks"
          value={String(data.totalTrucks)}
          icon={Truck}
          color="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label={filterMonth ? 'Trips This Month' : 'Total Trips'}
          value={String(data.totalTrips)}
          sub={filterMonth ? undefined : 'all time'}
          icon={Route}
          color="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label={filterMonth ? `${monthLabel} Freight` : 'Total Freight'}
          value={formatINR(data.monthFreight)}
          icon={IndianRupee}
          color="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Fixed + Urea"
          value={formatINR(totalFixedAndUrea)}
          sub="Tap for breakdown"
          icon={Calculator}
          color="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          onClick={() => setShowFixedBreakdown(true)}
        />
        <StatCard
          label={filterMonth ? `${monthLabel} Profit` : 'Total Profit'}
          value={formatINR(data.monthProfit)}
          sub="Freight − Trip Exp − Fixed − Urea"
          icon={TrendingUp}
          color={data.monthProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
        />
      </div>

      {/* Per-Truck Performance */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-card-border px-5 py-4">
          <h2 className="font-semibold text-heading">Per-Truck Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-orange-50 dark:bg-orange-900/30 text-left">
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">Truck</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Trips</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Total Freight</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Trip Expense</th>
                <th className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.perTruck.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-heading/50">No trips for this period</td>
                </tr>
              ) : (
                data.perTruck.map((t) => (
                  <tr key={t.id} className="border-b border-card-border last:border-0 hover:bg-orange-50/40 dark:hover:bg-orange-900/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-orange-600 dark:text-orange-400">{t.truck_number}</td>
                    <td className="px-4 py-3 text-right">{t.trip_count}</td>
                    <td className="px-4 py-3 text-right">{formatINR(Number(t.total_freight))}</td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatINR(Number(t.total_trip_expense))}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${Number(t.net_profit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatINR(Number(t.net_profit))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.perTruck.length > 0 && (
              <tfoot>
                <tr className="bg-orange-50 dark:bg-orange-900/30 font-semibold border-t-2 border-orange-200 dark:border-orange-800">
                  <td className="px-4 py-3 text-orange-700 dark:text-orange-300">Total</td>
                  <td className="px-4 py-3 text-right">{data.perTruck.reduce((s, t) => s + Number(t.trip_count), 0)}</td>
                  <td className="px-4 py-3 text-right">{formatINR(data.perTruck.reduce((s, t) => s + Number(t.total_freight), 0))}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatINR(data.perTruck.reduce((s, t) => s + Number(t.total_trip_expense), 0))}</td>
                  <td className={`px-4 py-3 text-right ${data.monthProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatINR(data.monthProfit)}
                    {(Number(data.totalFixedExpense) > 0 || Number(data.totalUrea) > 0) && (
                      <span className="block text-[11px] font-normal text-heading/50">after fixed+urea</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Fixed + Urea Breakdown Modal */}
      {showFixedBreakdown && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onClick={() => setShowFixedBreakdown(false)}>
          <div className="flex min-h-full items-start justify-center px-4 py-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm rounded-xl bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                <div>
                  <h2 className="font-semibold text-heading">Fixed + Urea Breakdown</h2>
                  <p className="text-xs text-heading/60 mt-0.5">{monthLabel}</p>
                </div>
                <button type="button" onClick={() => setShowFixedBreakdown(false)} className="rounded-lg p-1.5 hover:bg-card-border/50">
                  <X className="h-5 w-5 text-heading/60" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-1 text-sm">
                {data.fixedBreakdown.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500 mb-1">Fixed Expenses</p>
                    {data.fixedBreakdown.map((item) => (
                      <div key={item.category} className="flex items-center justify-between py-1.5 border-b border-card-border/50">
                        <span className="text-heading/80">{item.category}</span>
                        <span className="font-medium text-red-600 dark:text-red-400">{formatINR(Number(item.total))}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1.5 border-b border-card-border/50 font-medium">
                      <span className="text-heading/80">Fixed Total</span>
                      <span className="text-red-600 dark:text-red-400">{formatINR(Number(data.totalFixedExpense))}</span>
                    </div>
                  </>
                )}
                {Number(data.totalUrea) > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-card-border/50">
                    <span className="text-heading/80">Monthly Urea</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{formatINR(Number(data.totalUrea))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-orange-200 dark:border-orange-800 font-semibold">
                  <span className="text-orange-700 dark:text-orange-300">Total</span>
                  <span className="text-red-600 dark:text-red-400">{formatINR(totalFixedAndUrea)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
